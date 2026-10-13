"use client";

/**
 * AI 工作台（专利撰写室 / AI 写作共用）。
 *
 * **打开就是 Collabora 编辑器**，不需要任何切换：进页面即
 * 「草稿导出 docx → 等内核就绪 → 挂会话」，中栏直接是 Word 编辑器。
 * 右侧 AI 面板照常对话；AI 改完稿会**直接写进这个已打开的文档**（全选+粘贴
 * 整篇替换 + WOPI 保存），你眼看着文档变成新版，全程不重载 iframe。
 *
 * 为什么是这种形态：
 * - agent 就是个「坐在同一份文档里的协作者」：它写完落盘你看到，你 Ctrl+S
 *   落盘它下轮读盘（发指令前会先 flush 再回读），两边串行、不需要锁
 * - Collabora 按文档键（WOPISrc）缓存会话，服务端改文件它看不见，所以 AI 的
 *   稿子走 postMessage 桥粘进活会话，而不是换文件重载——协议要点见
 *   utils/editor/collabora.ts 顶部注释
 *
 * 栏目差异（技能包、模板、顶栏导航）全部由 props 注入，这里不放任何栏目特有
 * 的东西——「模板即入口，会话即案卷」对专利和公文写作是同一套道理。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import { ArrowLeft, Check, Loader2, RotateCcw, Save, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useResolvedLanguage } from "@/store";
import {
  alignCollaboraHost,
  announceHostReady,
  fetchCollaboraSession,
  fetchCollaboraStatus,
  flushCollabora,
  hideCollaboraChrome,
  hideCollaboraSidebar,
  hideCollaboraWelcomeScreen,
  pasteIntoCollabora,
  saveCollabora,
  sendUnoCommand,
  waitForCollaboraDocumentLoaded,
} from "@/utils/editor/collabora";
import { toCollaboraLang } from "@/utils/editor/locale";
import { AgentPanel } from "./agent-panel";
import { DocCanvas } from "./doc-canvas";
import { vp } from "./visual-spec";

/** Collabora 冷启动的最长等待（与编辑器页口径一致：首启约 1 分钟） */
const ENGINE_WAIT_MS = 150_000;
const ENGINE_POLL_MS = 3_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 栏目页交接文稿用的 sessionStorage key（如写作栏「在 Word 里微调」）。
 *
 * 一次性：灌进本会话草稿后立刻抹掉——刷新不会重复灌，也不会冲掉别处存的东西。
 */
const HANDOFF_KEY = "ai-studio:handoff";

/** 模板：决定技能包、会话线与起手话术 */
export interface AiStudioTemplate {
  id: string;
  name: string;
  /** 技能包名（如 patent-disclosure / writing） */
  skill: string;
  /** 成文结构（模板字段清单），用于给 agent 一句起手话术 */
  outline: string;
}

export interface AiStudioNavItem {
  href: string;
  label: string;
  active: boolean;
}

export interface AiStudioProps {
  /** 会话用的技能包名 */
  skill: string;
  /** 会话标题（决定落盘 docx 的文件名） */
  title: string;
  /** 会话线的 localStorage key（每个模板一条独立会话线） */
  persistKey: string;
  /** 从栏目页点进来的模板（决定技能包与会话线） */
  template?: AiStudioTemplate | null;
  /** 浏览器标签标题 */
  pageTitle: string;
  /** 顶栏标题（模板没匹配上时的兜底） */
  defaultTitle: string;
  /** 顶栏副标题 */
  subtitle: string;
  /** 顶栏返回链接（回栏目首页） */
  backHref: string;
  /** 栏目内导航（没有就不显示导航段） */
  nav?: AiStudioNavItem[];
  /** 顶栏图标 */
  icon: LucideIcon;
  /** 右侧 AI 对话面板宽度（Tailwind 宽度类）；不传用默认 23rem */
  panelWidth?: string;
}

export function AiStudio({
  skill,
  title,
  persistKey,
  template,
  pageTitle,
  defaultTitle,
  subtitle,
  backHref,
  nav,
  icon: Icon,
  panelWidth,
}: AiStudioProps) {
  const t = useExtracted();
  usePageTitle(pageTitle);
  const language = useResolvedLanguage();

  const [selectedAnchor, setSelectedAnchor] = useState<string | undefined>(undefined);
  /** 中栏显示哪个：默认就是编辑器；草稿只是「看变更卡/点段落定位」的辅助视图 */
  const [view, setView] = useState<"editor" | "draft">("editor");
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  /** 编辑器里打开的那份 docx（回读/重载都按它） */
  const [editorDoc, setEditorDoc] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  /** COOL 文档是否已就绪（握手 + Document_Loaded）；就绪前注入会被 COOL 丢弃 */
  const [docReady, setDocReady] = useState(false);
  /** 内核压根没连上时的可操作提示（代理/IPv6 导致连不到 9980） */
  const [engineHint, setEngineHint] = useState<string | null>(null);
  /** 内核冷启动已等待秒数；null = 没在等 */
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  /** 会话版本：每次重载 +1，逼 Collabora 丢开内存里的旧文档、重新读盘 */
  const versionRef = useRef(0);
  const openingRef = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const chat = useAiChat({
    skill,
    title,
    // 每个模板一条独立会话线，别让不同文种/类型的稿子互相串
    persistKey,
  });

  const modelLabel = chat.health ? `pi ${chat.health.pi.version ?? ""}`.trim() : undefined;
  const blockCount = chat.draft?.blocks.length ?? 0;
  const pendingAnchors = chat.messages
    .flatMap((m) => m.changes ?? [])
    .filter((c) => c.status === "proposed")
    .map((c) => String(c.anchor));

  /**
   * 打开/重载编辑器。
   *
   * 顺序不能颠倒：先把草稿导出成 docx（保证读到最新那一版），再等内核就绪，
   * 最后换一个会话版本取 WOPI 地址挂 iframe。任一步失败都给出原因（不白屏）。
   */
  const openEditor = useCallback(
    async (reexport = true) => {
      if (openingRef.current) return;
      openingRef.current = true;
      setOpening(true);
      setEngineError(null);
      cancelRef.current = false;
      const zh = language.toLowerCase().startsWith("zh");
      try {
        // reexport=false：docx 已由后端写好（可能带 AI 修订），只换会话重新读盘，
        // 千万不能重新导出——那会把未审完的修订覆盖成干净稿。
        let name = editorDoc ?? "";
        if (reexport || !name) {
          name = await chat.exportDocx();
        }
        let state = await fetchCollaboraStatus().catch(() => "unknown" as const);
        if (state === "warming_up") {
          setWaitSeconds(0);
          const startedAt = Date.now();
          while (Date.now() - startedAt < ENGINE_WAIT_MS) {
            await sleep(ENGINE_POLL_MS);
            if (cancelRef.current) throw new Error(zh ? "已取消" : "Cancelled");
            state = await fetchCollaboraStatus().catch(() => "unknown" as const);
            setWaitSeconds(Math.floor((Date.now() - startedAt) / 1000));
            if (state !== "warming_up") break;
          }
        }
        if (state === "unavailable") {
          throw new Error(
            zh ? "Collabora 内核当前不可用" : "The Collabora engine is unavailable",
          );
        }
        versionRef.current += 1;
        let session = await fetchCollaboraSession(
          name,
          true,
          null,
          toCollaboraLang(language),
          true,
          versionRef.current,
        );
        if (!session && !reexport) {
          // 本地还没有这份 docx（比如刚换过标题）：补一次导出再开
          name = await chat.exportDocx();
          versionRef.current += 1;
          session = await fetchCollaboraSession(
            name,
            true,
            null,
            toCollaboraLang(language),
            true,
            versionRef.current,
          );
        }
        if (!session) {
          throw new Error(zh ? "取 Collabora 会话失败" : "Could not open a Collabora session");
        }
        setEditorDoc(name);
        setEditorUrl(alignCollaboraHost(session.editorUrl));
        setView("editor");
      } catch (err) {
        setEngineError(String(err instanceof Error ? err.message : err));
      } finally {
        setWaitSeconds(null);
        openingRef.current = false;
        setOpening(false);
      }
    },
    [chat, editorDoc, language],
  );

  /** 进页面就开编辑器：不做任何「先看草稿再切」的中间态 */
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current || !chat.draft || chat.blocked) return;
    bootRef.current = true;
    // 有稿：直接打开现有 docx（可能带未审完的 AI 修订，重导出会毁掉它们）
    // 空稿：先导出（生成只有标题的文档），让用户一进来就是编辑器
    void openEditor((chat.draft.blocks?.length ?? 0) === 0);
  }, [chat.blocked, chat.draft, openEditor]);

  /**
   * 接管栏目页交接过来的文稿（写作栏「在 Word 里微调」带过来的成稿）。
   *
   * 会话建立后灌一次、立刻抹掉 key：刷新不重复灌，隐私模式下存不下也不报错
   * （工作台按自己的会话起步，用户手动贴内容即可）。
   */
  const handoffRef = useRef(false);
  useEffect(() => {
    if (handoffRef.current || !chat.sessionId) return;
    handoffRef.current = true;
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) return;
      sessionStorage.removeItem(HANDOFF_KEY);
      const payload = JSON.parse(raw) as { markdown?: string; title?: string };
      if (payload.markdown?.trim()) {
        void chat.importDraft(payload.markdown, payload.title || "");
      }
    } catch {
      /* 交接数据损坏：忽略，按本会话原状走 */
    }
  }, [chat]);

  /**
   * iframe 加载完后再握手、并等文档真正就绪。
   *
   * 两步缺一个，后面的注入都会被 COOL 静默丢弃（门卫分别回
   * `PostMessage ignored: not ready` 和 `not loaded yet`）。协议细节见
   * utils/editor/collabora.ts 顶部的注释。
   *
   * 握手必须等 `load`：挂载瞬间发出去的消息会丢在 iframe 导航前的
   * about:blank 窗口上，COOL 的监听器根本没加载——现象就是「文档明明开着，
   * 注入却毫无反应」（实测踩过）。
   */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !editorUrl) return;
    setDocReady(false);
    setEngineHint(null);
    let alive = true;
    const onLoad = () => {
      if (!alive) return;
      // COOL 版本升级时会弹「体验新版本」欢迎层，正压在文档上。它在 iframe 内的
      // COOL 源里，跨源时我们改不到 DOM，postMessage/UNO 也关不掉（都试过），只能
      // 用户点一次 X——COOL 会记进本地偏好，同一版本不再弹。所以这里保留尝试：
      // 万一哪天把编辑器改成同源代理，它就自动生效了。
      hideCollaboraWelcomeScreen(frame);
      announceHostReady(frame);
      // 菜单栏/标尺/状态栏：iframe ref 里已抢在前面发过几次，这里再兜一次
      hideCollaboraChrome(frame);
      // 12 秒等不到 Document_Loaded 就认定「内核没连上」：本地开发时浏览器
      // 走代理/IPv6 会连不到 localhost:9980（COOL 只听 IPv4），这时别让用户
      // 对着一帧「拒绝连接」发呆，直接告诉他换哪个地址打开。
      void waitForCollaboraDocumentLoaded(12_000).then((ok) => {
        if (!alive) return;
        setDocReady(ok);
        // 侧边栏（样式/图库面板）是就绪后才建的，所以它要在这里单独藏
        if (ok) hideCollaboraSidebar(frame);
        if (!ok) {
          const here = window.location;
          const alt = here.hostname === "localhost" ? "127.0.0.1" : "localhost";
          const zh = language.toLowerCase().startsWith("zh");
          setEngineHint(
            zh
              ? `编辑器内核没连上（${here.hostname}:9980）。浏览器若走了代理或 IPv6，改用 http://${alt}${here.port ? `:${here.port}` : ""}${here.pathname}${here.search} 打开本页。`
              : `The editor engine (${here.hostname}:9980) is unreachable. If your browser uses a proxy or IPv6, reopen this page at http://${alt}${here.port ? `:${here.port}` : ""}${here.pathname}${here.search}.`,
          );
        }
      });
    };
    frame.addEventListener("load", onLoad);
    return () => {
      alive = false;
      frame.removeEventListener("load", onLoad);
    };
  }, [editorUrl, language]);

  /**
   * AI 改完稿 → 直接写进**已经打开着的** Collabora 文档（零刷新）。
   *
   * 「把 agent 当成一个协作者」就是这个意思：它不整篇重载你的编辑器，而是把
   * 稿子粘进你眼前的活文档——全选后粘 = 整篇替换，你眼看着文档变成新版；
   * 随后一次 WOPI 保存写回存储，agent 下一轮先读盘再改。两边永远不并排写
   * 同一段，也就不存在「你一保存把它盖回去」。
   *
   * 粘的 HTML 由服务端用「md→docx→mammoth」单一管线渲染（`fetchDraftHtml`）：
   * 前端不自己渲染 Markdown，粘进去的长相与 apply 写盘的那份 docx 完全一致。
   *
   * 就绪前不注入（会被丢弃）；等 docReady 翻真再补注入——打开时加载的内容
   * 本来就是最新导出的稿子，所以慢一步也不会看到旧内容。
   *
   * 并发口径用**序号**而不是 effect 的清理标志：草稿可能连着变两次（导入 + 刷新），
   * 后一次 effect 重跑会让前一次的清理标志置假——曾经就是这样把到站的注入白白
   * 丢弃的（日志显示「HTML 取到了，粘贴没发」）。序号只保证「最新一次意图获胜」，
   * 卸载与否看 iframe 是否还挂在文档上。
   */
  const injectedDraftAtRef = useRef<number | null>(null);
  const injectSeqRef = useRef(0);
  useEffect(() => {
    // 切到草稿视图再切回来：清掉标记，让编辑器重新同步成最新稿
    if (view !== "editor") {
      injectedDraftAtRef.current = null;
      return;
    }
    if (!docReady || chat.streaming || !chat.draft || !frameRef.current) return;
    const at = chat.draft.updated_at ?? 0;
    if (injectedDraftAtRef.current === at) return;
    injectedDraftAtRef.current = at;
    const seq = ++injectSeqRef.current;
    void (async () => {
      try {
        const html = await chat.fetchDraftHtml();
        // 取 HTML 期间可能又有了更新的注入意图：只认最新那次，旧的到站就丢
        if (!html || injectSeqRef.current !== seq) return;
        // 全选与粘贴之间留一点间隔：SelectAll 是 UNO 往返，不等它就粘会变成
        // 「插在光标处」而不是「替换全文」（实测 450ms 稳妥）。
        sendUnoCommand(frameRef.current!, ".uno:SelectAll");
        window.setTimeout(() => {
          const frame = frameRef.current;
          if (!frame?.isConnected || injectSeqRef.current !== seq) {
            return;
          }
          pasteIntoCollabora(frame, html);
          saveCollabora(frame);
        }, 450);
      } catch {
        /* 取 HTML 失败：编辑器里仍是打开时的内容，不会白屏；下一轮草稿变化会重试 */
      }
    })();
  }, [chat, docReady, view]);

  /**
   * 发指令前先把编辑器里的内容回读进草稿。
   *
   * 两步顺序不能反：
   * 1) **先落盘**（flush）：用户在 Word 里手改的内容 agent 看不见（草稿是 AI
   *    的工作面），不先 Ctrl+S 式地冲一次，下一轮 AI 拿旧稿改，用户刚敲的
   *    内容就被覆盖了——协作者的规矩：你保存，我才动手
   * 2) **再回读**（import）：把盘上的 docx 转成草稿，agent 才知道当前稿子
   *    长什么样
   */
  const sendInstruction = useCallback(
    async (text: string, options?: { anchor?: string; selection?: string }) => {
      if (editorDoc && docReady && frameRef.current) {
        await flushCollabora(frameRef.current);
      }
      if (editorDoc) {
        try {
          await chat.importDocx(editorDoc);
        } catch {
          // 回读失败不阻塞对话：可能是还没保存过（WOPI 只在保存时写回）
        }
      }
      await chat.send(text, { ...options, anchor: options?.anchor ?? selectedAnchor });
      setSelectedAnchor(undefined);
    },
    [chat, docReady, editorDoc, selectedAnchor],
  );

  const importDraftFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      await chat.importDraft(text, file.name.replace(/\.[^.]+$/, ""));
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const editing = view === "editor";

  return (
    <div className={cn(vp.shell, "flex flex-col")}>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#E7EAF0] bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0b0b]/70">
        <Link href={backHref} className={cn(vp.btnGhost, "shrink-0 gap-1.5 px-2.5")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-[12.5px]">{t({ id: "Back", message: "Back" })}</span>
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] shadow-[0_1px_2px_rgba(16,24,40,0.08),0_8px_20px_-10px_rgba(37,99,235,0.9)]">
            <Icon className="h-4.5 w-4.5 text-white" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h1 className={cn(vp.h1, "truncate leading-tight")}>
              {template?.name ?? defaultTitle}
            </h1>
            <p className={cn(vp.meta, "truncate mt-0.5")}>{subtitle}</p>
          </div>
        </div>

        {nav?.length ? (
          <nav className={cn(vp.segGroup, "ml-2 hidden md:inline-flex")}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={item.active ? vp.segOn : vp.segOff}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <span className={cn(vp.chip, "hidden md:inline-flex")}>
            {t({
              id: "N blocks and materials",
              message: "{blocks} clauses · {materials} materials",
              values: { blocks: String(blockCount), materials: String(chat.materials.length) },
            })}
          </span>
          {chat.lastSaved ? (
            <span
              className={cn(vp.chip, "hidden border-[#BBF7D0] bg-[#F6FEF9] text-[#16A34A] lg:inline-flex")}
              title={chat.lastSaved}
            >
              <Check className="h-3 w-3" />
              {t({ id: "Saved", message: "Saved" })}
            </span>
          ) : null}

          <input
            ref={importRef}
            type="file"
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={(e) => void importDraftFile(e.target.files?.[0])}
          />

          {/* 中栏视图：默认编辑器，草稿是辅助（看变更卡与段落定位） */}
          <div className={vp.segGroup}>
            <button
              type="button"
              onClick={() => setView("editor")}
              className={cn(vp.segOff, editing && vp.segOn)}
            >
              {t({ id: "Editor view", message: "Editor" })}
            </button>
            <button
              type="button"
              onClick={() => setView("draft")}
              className={cn(vp.segOff, !editing && vp.segOn)}
            >
              {t({ id: "Draft view", message: "Draft" })}
            </button>
          </div>

          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className={cn(vp.btnGhost, "hidden lg:inline-flex")}
            title={t({
              id: "Import draft hint",
              message: "Import the current draft (e.g. after editing it in the editor)",
            })}
          >
            <Upload className="h-3.5 w-3.5" />
            {t({ id: "Import draft", message: "Import draft" })}
          </button>
          <button
            type="button"
            onClick={chat.reset}
            className={cn(vp.btnGhost, "hidden sm:inline-flex")}
            title={t({ id: "Reset session", message: "Reset session" })}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t({ id: "Reset session", message: "Reset session" })}
          </button>
          <button
            type="button"
            onClick={() => void chat.saveNow()}
            className={cn(vp.btnGhost, "hidden sm:inline-flex")}
            title={t({ id: "Save to docs", message: "Save to My Documents" })}
          >
            <Save className="h-3.5 w-3.5" />
            {t({ id: "Save", message: "Save" })}
          </button>

          {chat.streaming ? (
            <span className={cn(vp.chip, "border-[#EFF4FF] bg-[#EFF4FF] text-[#2563EB]")}>
              <Loader2 className="h-3 w-3 animate-spin" />
              {t({ id: "Generating", message: "Generating" })}
            </span>
          ) : chat.pendingChanges > 0 ? (
            <span className={cn(vp.chip, "border-[#FFF7ED] bg-[#FFF7ED] text-[#B45309]")}>
              {t({
                id: "N pending",
                message: "{count} pending",
                values: { count: String(chat.pendingChanges) },
              })}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative flex min-w-0 flex-1 bg-white dark:bg-[#0e0e0e]">
          {/* 编辑器一直挂着（切到草稿只是藏起来）：会话不白扔，切回来是秒回 */}
          {editorUrl ? (
            <iframe
              ref={(el) => {
                frameRef.current = el;
                // 握手 + 瘦身必须**趁早、且握手在前**：COOL 有两道门卫——没收到
                // Host_PostmessageReady 之前所有指令都丢弃（not ready），而 Hide_*
                // 只在 UI 组件建好之前设置标志位才生效（晚发只置标志不动已建好的
                // 菜单栏）。两个条件都只在加载初期成立，所以一挂上就连发几轮。
                if (el) {
                  for (const d of [0, 300, 1000, 2000]) {
                    window.setTimeout(() => {
                      announceHostReady(el);
                      hideCollaboraChrome(el);
                    }, d);
                  }
                }
              }}
              title="document"
              src={editorUrl}
              className={cn(
                "absolute inset-0 h-full w-full border-0",
                !editing && "pointer-events-none opacity-0",
              )}
              allow="clipboard-read; clipboard-write; fullscreen"
            />
          ) : null}

          {!editing ? (
            <DocCanvas
              draft={chat.draft}
              selectedAnchor={selectedAnchor}
              onSelectBlock={setSelectedAnchor}
              pendingAnchors={pendingAnchors}
            />
          ) : null}

          {/* 打开/重载编辑器期间盖一层：说明进度，绝不出现「点了没反应」 */}
          {(opening || waitSeconds !== null) && editing ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
              <Loader2 className="h-7 w-7 animate-spin text-[#2563EB]" />
              <p className="text-sm font-medium">
                {waitSeconds === null
                  ? t({ id: "Preparing editor", message: "Preparing the editor…" })
                  : t({ id: "Starting Collabora", message: "Starting the Collabora engine…" })}
              </p>
              {waitSeconds !== null ? (
                <>
                  <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
                    {t({
                      id: "Collabora wait hint",
                      message:
                        "First boot takes about a minute. It will open automatically once ready.",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      cancelRef.current = true;
                    }}
                    className={vp.btnGhost}
                  >
                    {t({ id: "Cancel wait", message: "Cancel" })}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {engineHint && editing ? (
            <div className="absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 px-6">
              <div className="mx-auto max-w-md rounded-xl border border-[#FED7AA] bg-[#FFFBEB] px-4 py-3 text-center text-xs leading-relaxed text-[#B45309] shadow-lg">
                {engineHint}
              </div>
            </div>
          ) : null}

          {engineError && editing ? (
            <div className="absolute inset-x-0 bottom-0 z-20 border-t border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-xs text-[#B91C1C]">
              {t({
                id: "Engine error",
                message: "The editor engine could not be opened: {reason}",
                values: { reason: engineError },
              })}
            </div>
          ) : null}

          {editing && editorUrl && !opening ? (
            <p className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/90">
              {t({
                id: "Editor save hint",
                message:
                  "The AI writes straight into this document — no reloads. Press Ctrl+S so the AI can pick up your edits.",
              })}
            </p>
          ) : null}
        </main>

        <AgentPanel
          messages={chat.messages}
          materials={chat.materials}
          template={chat.template}
          streaming={chat.streaming}
          blocked={chat.blocked}
          sessionReady={!!chat.sessionId}
          modelLabel={modelLabel}
          lastSaved={chat.lastSaved}
          initialPrompt={seedPromptFor(template)}
          onSend={(text, options) => void sendInstruction(text, options)}
          onStop={chat.stop}
          onUpload={chat.upload}
          onUploadTemplate={(file) => chat.uploadTemplate(file)}
          onRemoveTemplate={() => void chat.removeTemplate()}
          onAcceptChange={(key) => void chat.acceptChange(key)}
          onRejectChange={chat.rejectChange}
          onAcceptAll={() => void chat.acceptAll()}
          onSave={() => void chat.saveNow()}
          panelWidth={panelWidth}
          className="hidden xl:flex"
        />
      </div>
    </div>
  );
}

/** 模板的起手话术：把「写什么、按什么结构」先说清楚，省一轮来回 */
function seedPromptFor(template?: AiStudioTemplate | null): string {
  if (!template) return "";
  return `按「${template.name}」起草。成文结构：${template.outline}。先告诉我需要哪些材料。`;
}
