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
import { ArrowLeft, AlertCircle, Check, CheckCircle2, FileText, Loader2, MessageSquare, RotateCcw, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import { clearPersistedSession, readPersistedSession, useAiChat, type UseAiChat } from "@/hooks/use-ai-chat";
import { getAiState } from "@/utils/ai/client";
import { useResolvedLanguage } from "@/store";
import {
  alignCollaboraHost,
  announceHostReady,
  followCollaboraEnd,
  fetchCollaboraSession,
  fetchCollaboraStatus,
  flushCollabora,
  hideCollaboraChrome,
  hideCollaboraSidebar,
  hideCollaboraWelcomeScreen,
  readCollaboraSelection,
  waitForCollaboraDocumentLoaded,
  watchCollaboraSelection,
} from "@/utils/editor/collabora";
import { toCollaboraLang } from "@/utils/editor/locale";
import { listStoredFiles } from "@/utils/vos/storage";
import { AgentPanel } from "./agent-panel";
import { DocCanvas } from "./doc-canvas";
import { vp } from "./visual-spec";

/** Collabora 冷启动的最长等待（与编辑器页口径一致：首启约 1 分钟） */
const ENGINE_WAIT_MS = 150_000;
const ENGINE_POLL_MS = 3_000;

/**
 * 自动捕获选区的字数下限。
 *
 * 双击选词、误拖一下都会产生小选区：不设门槛的话 chip 会跟着双击频繁闪烁，
 * 「可能要改的地方」也变得廉价。4 字以下不当成作用域（手动「改这里」同样
 * 走这条判断，读到的选区太短就当作没选中，给原有提示）。
 */
const MIN_SELECTION_CHARS = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 宽屏阈值：≥1280px 时 AI 面板常驻右栏，之下改用浮层抽屉 */
const WIDE_QUERY = "(min-width: 1280px)";

/**
 * 是否宽屏。
 *
 * 初始按 true 渲染（与服务端一致，避免 hydration 不匹配），挂载后再按实际宽度纠正。
 * 监听断点变化：从宽拖到窄时自动切到抽屉形态，反之亦然。
 */
function useIsWide(): boolean {
  const [isWide, setIsWide] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(WIDE_QUERY);
    const sync = () => setIsWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isWide;
}

/**
 * 栏目页交接文稿用的 sessionStorage key（如写作栏「在 Word 里微调」）。
 *
 * 一次性：灌进本会话草稿后立刻抹掉——刷新不会重复灌，也不会冲掉别处存的东西。
 */
const HANDOFF_KEY = "ai-studio:handoff";

/**
 * 记住「这份稿子叫什么」（按会话线分开存）。
 *
 * 存的是用户起的名字本身，不是会话 id：会话会过期、会被清理，名字不该跟着失效。
 */
function readRememberedFileName(persistKey?: string): string {
  if (!persistKey) return "";
  try {
    return (localStorage.getItem(`${persistKey}:name`) ?? "").trim();
  } catch {
    return "";  // 无痕模式
  }
}

function rememberFileName(persistKey: string | undefined, name: string): void {
  if (!persistKey) return;
  try {
    localStorage.setItem(`${persistKey}:name`, name);
  } catch {
    // 无痕模式：这次不记住，下次再问
  }
}

/**
 * 给「重开会话」开出来的新稿子起一个名字：**不能和已有文件重名**。
 *
 * 重名是这里的头号危险，也是这个入口以前踩过的坑：文件名 = 会话标题，两条会话线
 * 落到同一份 docx 上就互相覆盖（编辑器开着旧文档、服务端却是新空草稿）。所以默认名
 * 一律带序号，并跳过「我的文档」里已占用的那些；用户自己输入的名字由调用方再查一次。
 */
function nextDraftName(base: string, taken: string[]): string {
  // 已经带序号了就先剥掉，从原始名字往后递增（"交底书 (2)" → 交底书）
  const stem = base.replace(/\s*\(\d+\)\s*$/, "").trim() || base.trim() || "Draft";
  const used = new Set(taken.map((n) => n.trim().toLowerCase()));
  for (let i = 2; i <= 999; i += 1) {
    const candidate = `${stem} (${i})`;
    if (!used.has(`${candidate}.docx`.toLowerCase())) return candidate;
  }
  return `${stem} (${Date.now()})`;
}

/** 模板：决定技能包、会话线与起手话术 */
export interface AiStudioTemplate {
  id: string;
  name: string;
  /** 技能包名（如 patent-disclosure / writing） */
  skill: string;
  /** 产出契约（agent 最后要落哪几个文件） */
  outputs?: string[];
  /**
   * 会话标题（英文）——它是落盘 docx 的文件名来源。界面上显示的是 `name`，
   * 两者分开：中文界面里显示中文，切英文时 Collabora 里也不该开中文名文档。
   */
  sessionTitle?: string;
  /** 类型备注：这一类方案长什么样 */
  note?: string;
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
  /**
   * 进来先问「这份稿子叫什么」。
   *
   * 文件名就是会话标题，进页面那一刻问一次最省事：晚问（已经在编辑器里写了几
   * 段）就得把导出的 docx 改名，还容易和编辑器里开着的那份对不上。问过就记住，
   * 同一条会话线不再问。
   */
  askFileName?: boolean;
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
  askFileName = false,
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
  // 标签标题带上构建标记（runtime-config.js 由容器启动时注入）：
  // 浏览器标签页一眼就能看出当前跑的是哪次构建，省得每次都怀疑缓存
  const buildTag =
    typeof window !== "undefined"
      ? ((window as unknown as { __VOS_APP_VERSION__?: string }).__VOS_APP_VERSION__ || "").trim()
      : "";
  usePageTitle(buildTag ? `${pageTitle} · ${buildTag}` : pageTitle);
  const language = useResolvedLanguage();
  /** 宽屏常驻右栏 / 窄屏浮层抽屉，两者互斥，避免同时占屏 */
  const isWide = useIsWide();
  const [dockOpen, setDockOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [selectedAnchor, setSelectedAnchor] = useState<string | undefined>(undefined);
  /** 中栏显示哪个：默认就是编辑器；草稿只是「看变更卡/点段落定位」的辅助视图 */
  const [view, setView] = useState<"editor" | "draft">("editor");
  /**
   * 这份稿子的名字（= 会话标题 = 「我的文档」里那份 .docx 的文件名）。
   *
   * 初值优先取**上次问过的答案**：同一条会话线（模板+类型）复用同一个名字，
   * 用户不用每次进来都重新起名；没问过才用模板自带的默认标题。
   */
  const [fileName, setFileName] = useState<string>(
    () => readRememberedFileName(persistKey) || template?.sessionTitle || title,
  );
  /** 还没定文件名：此时不建会话、不开编辑器，先弹框问清楚 */
  const [askingName, setAskingName] = useState<boolean>(
    () => askFileName && !readRememberedFileName(persistKey),
  );
  /**
   * 这条稿子线**当前**在用的名字（从旧会话读回来）。
   *
   * 用它当命名框的默认值：用户直接回车就是「接着原来那份写」，名字和文件都对得上；
   * 只有当他真的改了名字，才换一条新线（旧文件仍在「我的文档」里，一个字节不动）。
   */
  const [existingTitle, setExistingTitle] = useState("");
  /** 「保存到我的文档」的结果横幅（几秒后自己消失；失败也在这儿给原因） */
  const [saveFlash, setSaveFlash] = useState<NonNullable<UseAiChat["lastSave"]> | null>(null);
  /**
   * 发指令前的 docx 回读失败了（静默失败改可见）。
   *
   * 为 true 时：这一轮 AI 看到的是旧稿，它改完注入编辑器会覆盖你手改的内容。
   * 顶栏给一条提示，让用户至少知道「AI 刚才没读到我的修改」。
   */
  const [readBackFailed, setReadBackFailed] = useState(false);
  /**
   * 「只改这里」：用户在编辑器里选中、等着 AI 动手的那一处。
   *
   * - `text`：选区原文（随指令进 prompt，服务端据此定位）
   * - `anchor`：选区命中的草稿段落编号（服务端 patch 的落点；空 = 没定位上）
   * - `preview`：面板 chip 上显示的截断预览
   *
   * 为 null = 不收窄，AI 照旧看整篇（原有行为）。
   */
  const [editorSelection, setEditorSelection] = useState<{
    text: string;
    anchor: string;
    preview: string;
  } | null>(null);
  /** 正在向编辑器读选区（按钮转圈用） */
  const [capturingSelection, setCapturingSelection] = useState(false);
  /** 「改这里」点了但文档里没有选区：给一句提示（几秒后自己消失） */
  const [selectionHint, setSelectionHint] = useState(false);
  /**
   * 选区作用域的回合：改完**不整篇注入**，改为从服务端带修订的 docx 重载
   * （整篇注入会把用户其他地方的格式冲掉；修订重载只动那一处，且可在 Word
   * 里逐条接受/拒绝）。值是发送时的草稿 updated_at，用来判断这一轮到底
   * 有没有落改动——没落就不重载，免得白闪一下。
   */
  const scopedTurnRef = useRef<number | null>(null);
  /** 上次已处理过的按段样式信号（与 chat.scopedStyleSeq 比对，变了才重载） */
  const scopedStyleSeenRef = useRef(0);
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
  /**
   * 过渡幕的阶段：导出文档 → 连接内核 → 加载文档。
   *
   * 打开编辑器要串过三件事，全程一个「正在准备编辑器」会让用户对着不变的
   * 转圈猜进度；按阶段换文案，体感上是「在动」，而不是「卡了」。
   */
  const [veilStage, setVeilStage] = useState<"export" | "engine" | "load">(
    "load",
  );
  const [engineError, setEngineError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  /** 会话版本：每次重载 +1，逼 Collabora 丢开内存里的旧文档、重新读盘 */
  /**
   * 会话版本：每次重载 +1，逼 Collabora 丢开内存里的旧文档、重新读盘。
   *
   * 初值必须**每次加载都不同**。coolwsd 是按 WOPISrc 缓存文档会话的：版本一旦
   * 回到同一个值（刷新后从 0 起 → 永远还是 `.v1`），它就认为「这文档我开着」，
   * 直接把内存里那份**旧文档**还给你——服务端刚写好的文件它看都不看。
   * 现象就是：注入、重载全都像没生效，内容一直是旧的，只有硬刷新（或等 coolwsd
   * 回收会话）才会从盘上重读。日志实测：189 次 WOPI 请求清一色 `.v1`，从无 `.v2`。
   */
  const versionRef = useRef(Date.now());
  const openingRef = useRef(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const chat = useAiChat({
    skill,
    // 会话标题取英文（文件名），中文只用于界面显示
    title: fileName,
    // 每个模板一条独立会话线，别让不同文种/类型的稿子互相串
    persistKey,
    // 文件名还没定就先别建会话：文件名来自会话标题，建错就得改名
    paused: askingName,
  });

  /** 定下文件名：记住它 → 放行建会话（编辑器随后按这个名字出 docx） */
  const confirmFileName = useCallback(
    (name: string) => {
      // 默认值优先取「这条线现在的名字」，其次才是模板自带的标题
      const fallback = existingTitle || template?.sessionTitle || title;
      const final = (name || "").trim() || fallback;
      setFileName(final);
      rememberFileName(persistKey, final);
      if (final !== fallback) {
        // 改了名字 = 换一条稿子线：忘掉旧会话 id，初始化才会按新名字建会话。
        // 刻意不做「把旧会话改名」——那要连草稿标题一起改，改完 updated_at 一变，
        // 启动时的注入 effect 会把编辑器里那份文档按 md 管线重贴一遍（版式重排），
        // 就为了改个名字，不值。
        clearPersistedSession(persistKey);
      }
      setAskingName(false);
    },
    [existingTitle, persistKey, template, title],
  );

  /**
   * 「重开会话」：非 null = 正在给**新稿子**起名（框里预填这个名字）。
   *
   * 与 `askingName` 分开：那个是「第一次进页面还没定过名」，默认值取这条线当前在用的
   * 名字（回车 = 接着原来那份写）；这里是「离开当前这份、另开一份」，默认值必须是
   * **还没被占用**的新名字。
   */
  const [newDraftName, setNewDraftName] = useState<string | null>(null);
  /** 新稿名字和旧稿撞了：同名会共享同一份 docx，必须挡住 */
  const [newDraftError, setNewDraftError] = useState(false);

  /**
   * 点「重开会话」：停掉在跑的回合，然后问新稿子叫什么。
   *
   * 默认名先同步给一个带序号的，再用「我的文档」的真实文件列表校正——不让用户
   * 白等一次网络往返。
   */
  const startNewDraft = useCallback(() => {
    chat.stop();
    setNewDraftError(false);
    setNewDraftName(nextDraftName(fileName, []));
    void (async () => {
      try {
        const files = await listStoredFiles();
        setNewDraftName((current) =>
          current === null ? current : nextDraftName(fileName, files.map((f) => f.name)),
        );
      } catch {
        // 取不到列表（独立部署 / 存储不可用）：就用带序号的默认名，用户还能自己改
      }
    })();
  }, [chat, fileName]);

  /**
   * 定下新稿的名字：先把当前这份落盘，再记下新名字、忘掉旧会话，然后整页重载。
   *
   * 重载是刻意的：新稿走的就是「首次进入 + 新名字」那条现成路径——按新名字建新会话、
   * 导出一份新的空白 docx。不重载就得在本端手工重置会话、草稿、材料、产物、编辑器
   * 一大串状态，漏一个就是把两份稿子串在一起（历史上串过）。
   */
  const confirmNewDraft = useCallback(
    async (name: string) => {
      const final = (name || "").trim() || newDraftName || "";
      if (!final) return;
      if (final === fileName) {
        // 同名 = 两份稿子共享同一份 docx：挡住，让用户换个名字
        setNewDraftError(true);
        return;
      }
      try {
        // 先让 Collabora 把编辑器里的手改写回 docx（等同 Ctrl+S），
        // 否则刷新会把用户刚写的那几段丢掉
        if (frameRef.current) await flushCollabora(frameRef.current, 8000);
      } catch {
        // 落盘失败也放行：旧稿在「我的文档」里那一版还在，不至于丢文件
      }
      rememberFileName(persistKey, final);
      // 忘掉旧会话 id：重载后初始化会按新名字建会话（旧会话与旧 docx 原样留在服务端）
      clearPersistedSession(persistKey);
      setNewDraftName(null);
      window.location.reload();
    },
    [fileName, newDraftName, persistKey],
  );

  /**
   * 问名字期间，把这条线当前在用的名字读回来当默认值。
   *
   * 没有旧会话（第一次进 / 上次改名开了新线）就什么也不做，用模板默认标题。
   */
  useEffect(() => {
    if (!askingName) return;
    const remembered = readPersistedSession(persistKey);
    if (!remembered) return;
    let alive = true;
    (async () => {
      try {
        const state = await getAiState(remembered);
        if (alive && state.draft?.title) setExistingTitle(state.draft.title);
      } catch {
        // 会话已经没了：按模板默认名走
      }
    })();
    return () => {
      alive = false;
    };
  }, [askingName, persistKey]);

  /**
   * 「保存到我的文档」的结果横幅。
   *
   * 每次保存换一个新对象 → effect 重跑 → 重新计时 6 秒。做成横幅而不是按钮上的
   * 一行小字：保存是这个工作台最关键的动作，用户点完必须一眼看到「成了、成的是
   * 哪个文件」，否则就会再点一次（甚至以为没存上）。
   */
  useEffect(() => {
    if (!chat.lastSave) return;
    setSaveFlash(chat.lastSave);
    const timer = window.setTimeout(() => setSaveFlash(null), 6000);
    return () => window.clearTimeout(timer);
  }, [chat.lastSave]);

  const saveOk = !!saveFlash && !saveFlash.error;
  const saveErr = !!saveFlash?.error;

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
    async (reexport = true): Promise<boolean> => {
      // 并发只跑一个；被挡掉的那次如实回 false，调用方据此决定要不要重试
      if (openingRef.current) return false;
      openingRef.current = true;
      setOpening(true);
      setEngineError(null);
      cancelRef.current = false;
      const zh = language.toLowerCase().startsWith("zh");
      try {
        // reexport=false：docx 已由后端写好（可能带 AI 修订），只换会话重新读盘，
        // 千万不能重新导出——那会把未审完的修订覆盖成干净稿。
        //
        // blank=true：这里是**载体的活**（撰写室一进来就是 Collabora），空稿也得
        // 有个文件才能起内核，所以向服务端要一份空白 docx；有内容时它与普通导出
        // 完全等价。用户在 UI 上主动「出稿」走的是另一条路（不传 blank），空稿
        // 会被明确拒绝——那份只有标题的 docx 就是从那条兜底里来的。
        let name = editorDoc ?? "";
        const needExport = reexport || !name;
        setVeilStage(needExport ? "export" : "load");
        // 导出与内核探活**并行**：两者互不依赖，串行只是白等一个往返；
        // 内核冷启动等待期间导出照常进行，总耗时取两者的最大值而不是相加。
        const exporting = needExport
          ? chat.exportDocx(true)
          : Promise.resolve(name);
        // 内核不可用会提前抛错，先给导出挂一个空 catch：拒绝不能没人接
        exporting.catch(() => {});
        setVeilStage("engine");
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
        // 会话要用文件名：等并行的导出落地（内核若在冷启动，这里早已导完）
        name = await exporting;
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
          name = await chat.exportDocx(true);
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
        setVeilStage("load");
        setEditorDoc(name);
        setEditorUrl(alignCollaboraHost(session.editorUrl));
        setView("editor");
        return true;
      } catch (err) {
        setEngineError(String(err instanceof Error ? err.message : err));
        return false;
      } finally {
        setWaitSeconds(null);
        openingRef.current = false;
        setOpening(false);
      }
    },
    [chat, editorDoc, language],
  );

  /**
   * 注入用的三个 ref + 一个 state，声明在 boot effect **之前**：boot 要顺手把
   * 「编辑器里已经对齐的那一版草稿」标记成已注入，否则进页面/刷新后紧接着会再
   * 注入一遍（理由见 boot effect 里的注释）。
   */
  const injectedDraftAtRef = useRef<number | null>(null);
  const injectSeqRef = useRef(0);
  /** 注入进行中：粘贴→保存这段窗口里不接受新的注入 */
  const injectBusyRef = useRef(false);
  /** 注入中禁用发送（理由见注入 effect 的注释） */
  const [injecting, setInjecting] = useState(false);
  /**
   * 最近一次编辑器加载，是不是「把 AI 的稿子写进去」引起的。
   *
   * `injecting` 在 `openEditor` 返回时就落回 false，而新文档往往还在加载——过渡幕
   * 要一直盖到 `docReady`，文案也得跟着它走，否则会中途跳成「正在准备编辑器」。
   */
  const [reloadForDraft, setReloadForDraft] = useState(false);

  /** 进页面就开编辑器：不做任何「先看草稿再切」的中间态 */
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current || !chat.draft || chat.blocked || askingName) return;
    bootRef.current = true;
    // 编辑器这一份就是按当前草稿来的（有稿直接读盘、空稿先导出），内容已经对齐，
    // 所以**必须标记成「已注入」**：注入是「全选 + 粘贴替换」，这一轮粘贴一旦不完整，
    // 刚加载好的完整文档就会被残缺内容当面替掉 —— 用户看到的正是「F5 了也没用，
    // 后面还是没了」。
    injectedDraftAtRef.current = chat.draft.updated_at ?? null;
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

  /** 新文档就绪 = 这一轮「写进文档」结束，过渡幕上的文案可以复位了 */
  useEffect(() => {
    if (docReady) setReloadForDraft(false);
  }, [docReady]);

  /**
   * AI 落文 → 写进**已经打开着的** Collabora 文档（整篇替换，零刷新）。
   *
   * 「把 agent 当成一个协作者」就是这个意思：它不整篇重载你的编辑器，而是把
   * 稿子粘进你眼前的活文档——全选后粘 = 整篇替换，你眼看着文档变成新版；
   * 随后一次 WOPI 保存写回存储，agent 下一轮先读盘再改。
   *
   * 粘的 HTML 由服务端用「md→docx→mammoth」单一管线渲染（`fetchDraftHtml`）：
   * 前端不自己渲染 Markdown，粘进去的长相与 apply 写盘的那份 docx 完全一致。
   *
   * ── 粘贴协议（2026-10-14 playwright + 本地 Collabora 26.04 重新实测）──
   *   **分块**整篇替换：`.uno:SelectAll` → 等 700ms → 粘第一块 → 其余块
   *   `.uno:GoToEndOfDoc` 后粘到光标处（文末追加），每块之间等粘贴安静 →
   *   `Action_Save`（等落盘）→ **核对落盘字数**
   *
   * 四条都是真金白银换来的，改之前先读：
   * 1) **整篇一次性粘会被截断，必须分块。** `Action_Paste` 把整段 HTML 经
   *    WebSocket 一次性推给 coolwsd，体量一大就被截断——40KB 上下的稿子
   *    落盘只剩前面一小段（本地样张「粘贴容量测试.docx」落盘后只剩标题），
   *    改格式（字体调大、行距变化）让文档变大后必现。分块后每块 ≤24KB，
   *    三块连粘落盘字数 = 各块之和（实测 16390/16390 一字不差）。
   * 2) **`Action_Paste` 是异步的，保存必须等它贴完。** 曾经的实现是「粘贴后立刻
   *    保存」，32KB 的稿子落盘只剩 793 字（3%）——保存把贴到一半的文档写成了文件，
   *    服务端那份完整 docx 反被这次不完整的保存盖掉。判据是粘贴后
   *    `Doc_PartChanged` / `Doc_ModifiedStatus` 安静 500ms（`waitForCollaboraQuiet`，
   *    带 300ms 下限与 15s 上限，信号不来也不卡死）。
   * 3) **存完必须数字数，短了先重导出再重载。** 落盘正文明显短于草稿就重贴一次；
   *    再短必须**先从服务端完整重导出**（`chat.exportDocx()`）再让编辑器重读
   *    （`openEditor(false)`）——截断的那次保存已经把盘上的 docx 覆盖成残缺版，
   *    直接重载加载的就是残缺文件，用户看到的就是「只显示前面一点」。
   * 4) 第一块之前必须 SelectAll，否则变成「追加」（实测多出上一次的残留字符）。
   *
   * 另外：注入期间禁用发送——否则发指令前的 docx 回读会读到半截文档，草稿被
   * 残缺内容覆盖，断点会越滚越靠前。
   */

  /**
   * 把 AI 写好的稿子送进编辑器：**服务端写成完整 docx + 编辑器换版本重读**。
   *
   * 不再走 postMessage 粘贴（`replaceDocumentWithHtml`）那条路：它要穿过
   * postMessage 的结构化克隆 → iframe 内转 Blob → WebSocket 帧 → coolwsd 解析 →
   * LibreOffice 的 HTML 导入器，体量一大就丢。现场实录：草稿 6940 字（1704 字
   * 权利要求书 + 4927 字说明书），编辑器里只剩约 500 字。块大小、等待判据、块间隔
   * 都逐个调过一遍，在这个环境里依然不可靠 —— 不再赌它。
   *
   * 重载没有「容量通道」这回事：Collabora 通过 WOPI 读整份文件，多大都进得来
   * （跟用户自己打开一个大 docx 没区别）。前提是 WOPISrc 每次必须不同——见
   * `versionRef` 的注释，那正是「重载像没生效」的根源，已经修掉了。
   */
  const injectDraft = useCallback(
    async (seq: number) => {
      if (injectBusyRef.current || injectSeqRef.current !== seq) {
        // 关键：标记是「先置后干活」的，忙着/过期的时候必须**回滚标记**，
        // 否则这一版被标记成已处理却没注入，AI 这轮改动就永远丢了
        // （实测症状：正文停在上一版的一半）。
        injectedDraftAtRef.current = null;
        return;
      }
      injectBusyRef.current = true;
      setInjecting(true);
      // 过渡幕的文案：这一轮是「把稿子写进文档」，不是「第一次打开编辑器」
      setReloadForDraft(true);
      try {
        // openEditor(true)：先从服务端重新导出草稿为 docx（md→docx 管线确定且完整），
        // 再换一个会话版本让编辑器重读盘。导出或加载失败会回 false 并置 engineError。
        const ok = await openEditor(true);
        if (!ok) injectedDraftAtRef.current = null;
      } catch {
        // 同样回滚标记：失败不能被当成「已注入」
        injectedDraftAtRef.current = null;
      } finally {
        injectBusyRef.current = false;
        setInjecting(false);
      }
    },
    [openEditor],
  );

  useEffect(() => {
    // 切到草稿视图再切回来：清掉标记，让编辑器重新同步成最新稿
    if (view !== "editor") {
      injectedDraftAtRef.current = null;
      return;
    }
    // 选区作用域的回合（「只改这里」）：**不整篇注入**。整篇注入会把用户
    // 其他地方的格式一并冲掉，而这一轮只该动选中的那一处——改完后由下面
    // 的 scoped-turn effect 从服务端带修订的 docx 重载，改动以 Word 修订
    // 呈现，其余部分原样保留。
    if (scopedTurnRef.current !== null) return;
    if (!docReady || chat.streaming || !chat.draft || !frameRef.current) return;
    // 「只有标题、没有正文」的草稿**绝不注入**：注入是「全选 + 粘贴整篇替换」，
    // 而空稿转出来的 HTML 只有一行标题——粘进去等于把编辑器里活着的内容整篇清掉，
    // 看起来就是「AI 写的东西被截断成只剩一点」。
    //
    // 判据不能只看 block 个数：新建会话的草稿常常就是 1 个「只有 heading、text 为空」
    // 的标题块，而它的文件名一旦和盘上某个已有文档撞了（服务端有空稿不覆盖的护栏），
    // 编辑器打开的就是那份**旧文档**——此时一注入，完整的旧文档当场被清成一行标题。
    // 现场实录：`注入不完整（落盘 9 字 / 草稿 19 字）`。
    const blocks = chat.draft.blocks ?? [];
    const hasBody = blocks.some((b) => (b.text || "").trim().length > 0);
    if (!hasBody) return;
    const at = chat.draft.updated_at ?? 0;
    if (!at || injectedDraftAtRef.current === at) return;

    // 草稿连着更新时去抖 600ms，一轮只注入一次
    const timer = window.setTimeout(() => {
      // 标记在**定时器里**置，不在 effect 里置：去抖窗口内任何一次重渲染
      // （流式出字一秒好几次）都会取消定时器；若标记已提前置好，这一版就被当成
      // 「注入过了」而永远丢失——实测症状正是「正文停在上一版的一半」。
      if (injectedDraftAtRef.current === at) return;
      injectedDraftAtRef.current = at;
      void injectDraft(++injectSeqRef.current);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [chat, docReady, injectDraft, view]);

  /**
   * 选区作用域回合的「送回去」：等这一轮结束，若草稿真被改了（updated_at
   * 变了），从服务端**带修订的 docx** 重载编辑器。
   *
   * 为什么是重载而不是粘贴：服务端已经把 AI 的改动以 Word 修订
   * （w:ins/w:del）写进了那份 docx（`_save_draft_docx_revised`），重载后
   * 用户看到的是「自己排版原样保留 + 选中处一条可接受/拒绝的修订」——正是
   * Word 里审阅 AI 改动的样子。整篇粘贴做不到这一点（格式全被 md 管线重排）。
   *
   * 没落改动（模型没给 patch / 落空）就不重载：别为一声回答白闪一次编辑器。
   */
  useEffect(() => {
    if (scopedTurnRef.current === null || chat.streaming) return;
    const sentAt = scopedTurnRef.current;
    scopedTurnRef.current = null;
    // 两条触发线：
    // - 草稿变了（updated_at ≠ 发送时）→ patch 落了，带修订的 docx 已写盘；
    // - scopedStyleSeq 变了 → 按段样式（<doc-style anchor="N"/>）直接改了 docx。
    //   样式不动草稿，updated_at 不变，只靠上一条会漏——「选中一段说字体变大」
    //   恰好就是这条线，漏了的话文档重载不出来，用户以为没生效。
    const changed =
      (chat.draft?.updated_at ?? 0) !== sentAt ||
      scopedStyleSeenRef.current !== chat.scopedStyleSeq;
    scopedStyleSeenRef.current = chat.scopedStyleSeq;
    if (changed && view === "editor" && editorDoc) {
      // 标记这一版已经「送回去」：不标记的话，重载完成后注入 effect 会发现
      // 这一版没注入过，把整篇再粘一遍——刚载入的修订视图立刻被冲掉。
      injectedDraftAtRef.current = chat.draft?.updated_at ?? null;
      void openEditor(false);
    }
  }, [chat.streaming, chat.draft?.updated_at, chat.scopedStyleSeq, view, editorDoc, openEditor]);

  /** 用户显式撤过的作用域文本（点 X）：记住它，轮询才不会把 chip 请回来 */
  const dismissedSelectionRef = useRef<string | null>(null);
  /** 最近一次落成作用域的选区文本：轮询读到和它一样就跳过，省掉无谓重渲染 */
  const lastSelectionTextRef = useRef("");

  /**
   * 把一次读到的选区文本落成作用域——按钮手动捕获与轮询自动捕获共用。
   *
   * 两步：① 归一化后按包含匹配，定位选区落在草稿哪一段（先整段、再退到
   * 选区前 30 字——用户常只选半句）；② 定位上了就把段落编号一并带上，服务端
   * 的 patch 落点以它为准，不靠模型猜。
   *
   * 返回是否形成了作用域：太短的选取（双击选词、误拖）返回 false，由调用方
   * 决定要不要提示。
   */
  const applySelection = useCallback(
    (raw: string): boolean => {
      const text = (raw || "").trim();
      if (text.length < MIN_SELECTION_CHARS) return false;
      const norm = (s: string) => s.replace(/\s+/g, "");
      const want = norm(text);
      const blocks = chat.draft?.blocks ?? [];
      let hit = blocks.findIndex((b) => norm(b.text || "").includes(want));
      if (hit < 0 && want.length > 30) {
        // 选区可能跨了段或与草稿有细微差异：用前 30 字再试
        hit = blocks.findIndex((b) => norm(b.text || "").includes(want.slice(0, 30)));
      }
      const anchor = hit >= 0 ? String(hit + 1) : ""; // public_draft 的 anchor 从 1 开始
      setEditorSelection({
        text,
        anchor,
        preview: text.length > 60 ? `${text.slice(0, 60)}…` : text,
      });
      // 选区命中段落时，同步给草稿视图的高亮（两边看到的是同一处）
      if (anchor) setSelectedAnchor(anchor);
      lastSelectionTextRef.current = text;
      // 手动捕获 = 显式要这个作用域：撤回过守卫随之解除
      dismissedSelectionRef.current = null;
      return true;
    },
    [chat.draft],
  );

  /**
   * 「改这里」按钮：读一回编辑器选区，落成作用域。
   *
   * 读不到选区（没选 / 跨源 / 超时 / 太短）就如实提示——手动路径必须给反馈；
   * 轮询路径读到空只是「用户没选中」，不提示（见下面的自动捕获 effect）。
   */
  const captureSelection = useCallback(async () => {
    const frame = frameRef.current;
    if (!frame?.isConnected) return;
    setCapturingSelection(true);
    try {
      const text = (await readCollaboraSelection(frame)).trim();
      if (!applySelection(text)) setSelectionHint(true);
    } finally {
      setCapturingSelection(false);
    }
  }, [applySelection]);

  /** 撤掉作用域（chip 上的 X）：iframe 里的选区还在，得记住「这一处撤过」 */
  const clearSelection = useCallback(() => {
    dismissedSelectionRef.current = editorSelection?.text ?? null;
    lastSelectionTextRef.current = "";
    setEditorSelection(null);
  }, [editorSelection]);

  // 「没有选区」的提示只露几面：用户看到就去选了，别常驻
  useEffect(() => {
    if (!selectionHint) return;
    const timer = window.setTimeout(() => setSelectionHint(false), 3500);
    return () => window.clearTimeout(timer);
  }, [selectionHint]);

  /**
   * 选中即在右侧亮出作用域（Claude Code 式「选中即引用」）。
   *
   * 用户在左边文档里按住左键框选一段，右侧对话框上方就出现那一行——agent
   * 由此知道「可能要改的地方」是哪一处；用户接着输入指令即可，不必再点
   * 「改这里」（按钮保留作手动刷新）。
   *
   * 为什么是轮询：鼠标事件发生在 iframe 内部，父页面监听不到，COOL 也不向
   * 宿主推送选区变化——唯一跨源/同源通吃的手段就是定时 `Action_Copy`，
   * 细节见 `watchCollaboraSelection` 的注释。
   *
   * 撤回过守卫：点 X 撤掉后 iframe 里的选区仍在，不记住「这一处撤过」的
   * 话，下一轮轮读到同一处又会把 chip 请回来，X 等于白点。撤过之后重新
   * 选中别处照常亮出；超时导致的空读不清守卫——否则一次慢读会让撤掉的
   * chip 在下一轮读取后又弹回来。
   */
  useEffect(() => {
    const frame = frameRef.current;
    // 三个条件缺一个都不盯：
    // - 文档没就绪：发了指令也被 COOL 的门卫丢掉（not loaded yet）
    // - 不在编辑视图：草稿视图里没有选区可读
    // - AI 正在出字：用户在读输出，不会同时去框选
    if (!docReady || view !== "editor" || chat.streaming || !frame || !editorUrl) return;
    let alive = true;
    const stop = watchCollaboraSelection(frame, (text) => {
      if (!alive) return;
      if (text === lastSelectionTextRef.current) return; // 选区没变
      if (!text) {
        // 选区没了（用户在文档里点掉了 / 这一轮回合后文档重载过）：撤掉
        // 作用域。anchor 一并清掉——sendInstruction 在 editorSelection 为
        // 空时会回落到 selectedAnchor，不清就会把「已撤作用域」的这一轮
        // 又变成 anchored 回合。
        lastSelectionTextRef.current = "";
        setEditorSelection(null);
        setSelectedAnchor(undefined);
        return;
      }
      if (text === dismissedSelectionRef.current) {
        // 撤过的那一处：记下文本免得每轮比对，但不加回 chip
        lastSelectionTextRef.current = text;
        return;
      }
      applySelection(text);
    });
    return () => {
      alive = false;
      stop();
    };
  }, [applySelection, chat.streaming, docReady, editorUrl, view]);

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
          setReadBackFailed(false);
        } catch {
          // 回读失败不阻塞对话（可能是还没保存过：WOPI 只在保存时写回），
          // 但**必须让用户知道**：这一轮 AI 拿的是旧稿，改完注入编辑器时会把
          // 你手改的内容覆盖掉（本地日志实录过 docx→md 转换 502）。静默的
          // 代价是用户的手改无声消失，所以置标记并在顶栏给出提示。
          setReadBackFailed(true);
        }
      }
      // 选区作用域：记下发送时的稿子版本，回合结束后据此判断要不要重载
      scopedTurnRef.current = editorSelection ? (chat.draft?.updated_at ?? 0) : null;
      // 同步按段样式信号的基线：只认**这一轮**新落地的样式，别把上一轮没处理的
      // 旧信号也算进来（否则会凭空多一次重载）
      scopedStyleSeenRef.current = chat.scopedStyleSeq;
      await chat.send(text, {
        ...options,
        anchor: options?.anchor ?? editorSelection?.anchor ?? selectedAnchor,
        selection: options?.selection ?? editorSelection?.text ?? "",
      });
      setSelectedAnchor(undefined);
    },
    [chat, docReady, editorDoc, editorSelection, selectedAnchor],
  );


  /**
   * 视口跟随 AI：出字时编辑器跟着往下走。
   *
   * `.uno:GoToEndOfDoc` 会移动光标，所以只在**AI 正在生成**时做（用户此时在读）；
   * 用户手改阶段不抢光标。一次回合能触发几十次 delta，因此节流到 ~0.9s 一次。
   */
  useEffect(() => {
    if (view !== "editor" || !docReady || !chat.streaming) return;
    const last = chat.messages[chat.messages.length - 1];
    if (!last?.text) return;
    const timer = window.setTimeout(() => {
      const frame = frameRef.current;
      if (frame?.isConnected) followCollaboraEnd(frame);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [chat.messages, chat.streaming, docReady, view]);

  const editing = view === "editor";
  /** 编辑器过渡幕：打开、重载、以及「文档还没就绪」都要盖住 */
  const veilVisible = editing && (opening || waitSeconds !== null || !docReady);
  /** 幕上那行字：写稿 / 生成文档 / 启动内核 / 准备编辑器，按阶段走 */
  const veilTitle = reloadForDraft
    ? t({ id: "Applying draft", message: "Writing the AI draft into the document…" })
    : waitSeconds !== null || veilStage === "engine"
      ? t({ id: "Starting Collabora", message: "Starting the Collabora engine…" })
      : veilStage === "export"
        ? t({ id: "Preparing document", message: "Preparing the document…" })
        : t({ id: "Preparing editor", message: "Preparing the editor…" });

  // 文件名还没定 / 正在给新稿起名：只弹这一个框，别的都不渲染（会话都没建，渲染了也是空壳）
  if (askingName || newDraftName !== null) {
    const fresh = newDraftName;
    const isFresh = fresh !== null;
    return (
      <div className={vp.shell}>
        <NameDraftDialog
          defaultName={
            isFresh ? fresh : existingTitle || template?.sessionTitle || title
          }
          onConfirm={
            isFresh ? (name) => void confirmNewDraft(name) : confirmFileName
          }
          hint={
            isFresh
              ? t({
                  id: "New draft hint",
                  message:
                    "A separate file for this new draft. The one you leave stays in My Documents.",
                })
              : undefined
          }
          error={
            isFresh && newDraftError
              ? t({
                  id: "Draft name taken",
                  message:
                    "That is the draft you are leaving — pick a different name.",
                })
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className={cn(vp.shell, "flex flex-col")}>
      {/* 「保存到我的文档」的结果横幅：屏幕顶部居中，最显眼的位置 */}
      {saveFlash ? (
        <div className="pointer-events-none fixed left-1/2 top-6 z-[60] -translate-x-1/2">
          <div
            className={cn(
              "pointer-events-auto flex max-w-[min(30rem,92vw)] items-start gap-3 rounded-2xl border px-5 py-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.06),0_18px_44px_-20px_rgba(0,0,0,0.35)] backdrop-blur",
              saveOk
                ? "border-[#BBF7D0] bg-[#ECFDF3] text-[#15803D]"
                : "border-[#F2B8B5] bg-[#FEF2F2] text-[#B42318]",
            )}
            role="status"
          >
            {saveOk ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">
                {saveOk
                  ? saveFlash.already
                    ? t({
                        id: "Already in My Documents",
                        message: "Already in My Documents",
                      })
                    : t({
                        id: "Saved to My Documents",
                        message: "Saved to My Documents",
                      })
                  : t({ id: "Save failed", message: "Save failed" })}
              </p>
              <p className="mt-0.5 break-all text-[12.5px] opacity-90">
                {saveOk
                  ? saveFlash.already
                    ? t({
                        id: "Already in My Documents hint",
                        message: "{name} — nothing changed, the file was already there",
                        values: { name: saveFlash.name },
                      })
                    : saveFlash.name
                  : saveFlash.error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSaveFlash(null)}
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              aria-label={t({ id: "Dismiss", message: "Dismiss" })}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* 回读失败提示：AI 没读到你刚才在编辑器里的修改，它改完会覆盖手改内容 */}
      {readBackFailed ? (
        <div className="pointer-events-none fixed left-1/2 top-6 z-[60] -translate-x-1/2">
          <div
            className="pointer-events-auto flex max-w-[min(30rem,92vw)] items-start gap-3 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-5 py-3.5 text-[#9A3412] shadow-[0_2px_6px_rgba(0,0,0,0.06),0_18px_44px_-20px_rgba(0,0,0,0.35)] backdrop-blur"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">
                {t({
                  id: "Read back failed",
                  message: "Your edits were not read",
                })}
              </p>
              <p className="mt-0.5 text-[12.5px] opacity-90">
                {t({
                  id: "Read back failed hint",
                  message:
                    "The AI worked on the previous version this turn — its changes may overwrite what you just edited in the document. Re-send after a moment, or save the document first.",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReadBackFailed(false)}
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              aria-label={t({ id: "Dismiss", message: "Dismiss" })}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#E7EAF0] bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0b0b]/70">
        <Link href={backHref} className={cn(vp.btnGhost, "shrink-0 gap-1.5 px-2.5")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-[14px]">{t({ id: "Back", message: "Back" })}</span>
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#007AFF] shadow-[0_1px_2px_rgba(16,24,40,0.08),0_8px_20px_-10px_rgba(37,99,235,0.9)]">
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

          {/* 中栏视图：默认编辑器，草稿是辅助（看变更卡与段落定位），
              多文件任务（四件套）额外有「产物」视图 */}
          <div className={vp.segGroup}>
            <button
              type="button"
              onClick={() => setView("editor")}
              className={cn(vp.segOff, view === "editor" && vp.segOn)}
            >
              {t({ id: "Editor view", message: "Editor" })}
            </button>
            <button
              type="button"
              onClick={() => setView("draft")}
              className={cn(vp.segOff, view === "draft" && vp.segOn)}
            >
              {t({ id: "Draft view", message: "Draft" })}
            </button>
          </div>

          <button
            type="button"
            onClick={startNewDraft}
            className={cn(vp.btnGhost, "hidden sm:inline-flex")}
            title={t({
              id: "New draft tooltip",
              message:
                "Start a new draft: a new file and a fresh conversation. This one stays in My Documents.",
            })}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t({ id: "New draft", message: "New draft" })}
          </button>
          <button
            type="button"
            onClick={() => void chat.saveNow()}
            className={cn(
              vp.btnGhost,
              "hidden sm:inline-flex",
              // 保存结果直接写在按钮上：成功变绿、失败变红，且只亮几秒。
              // 以前只有角落里一个永远亮着的小字（还只在 lg 以上才显示），
              // 用户点完根本不知道成没成。
              saveOk && "border-[#BBF7D0] bg-[#ECFDF3] text-[#16A34A]",
              saveErr && "border-[#F2B8B5] bg-[#FEF2F2] text-[#DC2626]",
            )}
            title={t({ id: "Save to docs", message: "Save to My Documents" })}
          >
            {saveOk ? (
              <Check className="h-3.5 w-3.5" />
            ) : saveErr ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saveOk
              ? t({ id: "Saved", message: "Saved" })
              : saveErr
                ? t({ id: "Save failed", message: "Save failed" })
                : t({ id: "Save to docs", message: "Save to My Documents" })}
          </button>
          {/* AI 对话面板的开关：宽屏是常驻右栏（可收起），窄屏是浮层抽屉。
              之前整栏挂在 xl 断点上，窗口一窄就什么都不剩——材料、模板、对话全找不到了。 */}
          <button
            type="button"
            onClick={() => (isWide ? setDockOpen((v) => !v) : setSheetOpen((v) => !v))}
            className={cn(
              vp.btnGhost,
              "px-2.5",
              (isWide ? dockOpen : sheetOpen) && "border-[#CFE3FF] bg-[#007AFF]/8 text-[#007AFF]",
            )}
            title={t({ id: "Toggle AI panel", message: "Toggle the AI panel" })}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden md:inline">
              {t({ id: "AI panel", message: "AI panel" })}
            </span>
          </button>

          {chat.streaming ? (
            <span className={cn(vp.chip, "border-[#EAF4FF] bg-[#EAF4FF] text-[#007AFF]")}>
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

          {/* 编辑器上的一层过渡幕：打开 / 重载都盖住 iframe 那张白脸。
              关键是**一直盖到文档真正就绪**（docReady）——只跟 `opening` 走的话，
              `openEditor` 一返回幕就撤，而这时新文档还在加载，用户看到的就是一闪
              而过的空白。淡入淡出让它是「淡走」，而不是「啪」地换一屏。 */}
          <div
            className={cn(
              "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm transition-opacity duration-300",
              veilVisible ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={!veilVisible}
          >
            {veilVisible ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin text-[#007AFF]" />
                <p className="text-sm font-medium">{veilTitle}</p>
                {waitSeconds !== null && !reloadForDraft ? (
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
              </>
            ) : null}
          </div>

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
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center gap-0.5 rounded-2xl bg-black/60 px-3.5 py-1.5 text-center text-[12.5px] leading-relaxed text-white/90">
              <p>
                {t({
                  id: "Editor save hint",
                  message:
                    "The AI's draft is written into this document and the editor refreshes once. Press Ctrl+S so the AI can pick up your edits.",
                })}
              </p>
              {/* 选中即引用：把「选中文字 → 右侧亮出一行」这条路子写在编辑器常驻提示里，
                  免得用户不知道框选完该干什么（手动「改这里」按钮保留作刷新） */}
              <p className="text-white/70">
                {t({
                  id: "Selection auto hint",
                  message:
                    "Select text in the document — it shows up as a line in the AI panel, and the AI then only changes that part.",
                })}
              </p>
            </div>
          ) : null}
        </main>

      {/* AI 面板：宽屏常驻右栏，窄屏浮层抽屉。两者互斥渲染，不会同时占屏 */}
      {isWide ? (
        <AgentPanel
          messages={chat.messages}
          materials={chat.materials}
          template={chat.template}
          streaming={chat.streaming}
          blocked={chat.blocked}
          sessionReady={!!chat.sessionId && !injecting}
          modelLabel={modelLabel}
          lastSaved={chat.lastSaved}
          onSend={(text, options) => void sendInstruction(text, options)}
          onStop={chat.stop}
          onUpload={chat.upload}
          onUploadTemplate={(file) => chat.uploadTemplate(file)}
          onRemoveTemplate={() => void chat.removeTemplate()}
          onRemoveMaterial={(name) => void chat.removeMaterial(name)}
          onAcceptChange={(key) => void chat.acceptChange(key)}
          onRejectChange={chat.rejectChange}
          onAcceptAll={() => void chat.acceptAll()}
          onSave={() => void chat.saveNow()}
          selection={editorSelection}
          onCaptureSelection={() => void captureSelection()}
          onClearSelection={clearSelection}
          capturingSelection={capturingSelection}
          selectionHint={selectionHint}
          panelWidth={panelWidth}
          className={dockOpen ? "flex" : "hidden"}
        />
      ) : null}
      </div>

      {/* 窄屏抽屉：浮在编辑器之上，点遮罩关闭。之前这个形态压根不存在。 */}
      {!isWide && sheetOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 cursor-default bg-black/25 backdrop-blur-[2px]"
            onClick={() => setSheetOpen(false)}
          />
          <AgentPanel
            messages={chat.messages}
            materials={chat.materials}
            template={chat.template}
            streaming={chat.streaming}
            blocked={chat.blocked}
            sessionReady={!!chat.sessionId && !injecting}
            modelLabel={modelLabel}
            lastSaved={chat.lastSaved}
            onSend={(text, options) => void sendInstruction(text, options)}
            onStop={chat.stop}
            onUpload={chat.upload}
            onUploadTemplate={(file) => chat.uploadTemplate(file)}
            onRemoveTemplate={() => void chat.removeTemplate()}
            onRemoveMaterial={(name) => void chat.removeMaterial(name)}
            onAcceptChange={(key) => void chat.acceptChange(key)}
            onRejectChange={chat.rejectChange}
            onAcceptAll={() => void chat.acceptAll()}
            onSave={() => void chat.saveNow()}
            selection={editorSelection}
            onCaptureSelection={() => void captureSelection()}
            onClearSelection={clearSelection}
            capturingSelection={capturingSelection}
            selectionHint={selectionHint}
            className="relative z-10 flex h-full w-[min(26rem,88vw)] shadow-[-24px_0_60px_-24px_rgba(0,0,0,0.35)]"
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * 进撰写室的第一步：给这份稿子起个名字。
 *
 * 为什么非得先问：**文件名就是会话标题**（`server/ai.py` 用会话标题拼 docx 名）。
 * 先让它按默认标题建会话、导出 docx、打开编辑器，再让用户改名，就得把已导出的
 * 文件改名，还容易和编辑器里开着的那份对不上；在一开始问，后面全链路都是这个名字。
 *
 * 输入框预填默认标题（模板自带），用户可以直接回车；「用默认名」等同于点确认，
 * 不存在「卡在这儿进不去」的死路。
 *
 * 「重开会话」也复用这个框（另开一份新稿子）：那时默认名换成没被占用的新名字，
 * 由 `hint` 说明旧稿还在，`error` 挡住重名。
 */
function NameDraftDialog({
  defaultName,
  onConfirm,
  hint,
  error,
}: {
  defaultName: string;
  onConfirm: (name: string) => void;
  /** 换一个场景说明（「重开会话」时要告诉用户旧稿会留在「我的文档」里） */
  hint?: string;
  /** 名字不合规的提示（如与正要离开的那份重名） */
  error?: string;
}) {
  const t = useExtracted();
  const [value, setValue] = useState(defaultName);
  /** 用户是否已经手动改过输入框：改过就不再被外部默认值覆盖 */
  const touched = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 默认名可能是异步取回来的（这条线当前在用的名字）：没被手动改过就跟着它走
  useEffect(() => {
    if (!touched.current) setValue(defaultName);
  }, [defaultName]);

  useEffect(() => {
    // 自动聚焦并全选：用户多数情况下只是想改两个字，不想从头敲
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const submit = () => onConfirm(value);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <form
        className={cn(vp.card, "w-[min(30rem,94vw)] p-7")}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="mb-1 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#007AFF]">
            <FileText className="h-4.5 w-4.5" />
          </span>
          <h2 className={vp.h1}>
            {t({ id: "Name this draft", message: "Name this draft" })}
          </h2>
        </div>
        <p className={cn(vp.body, "mt-2")}>
          {hint ??
            t({
              id: "Name this draft hint",
              message:
                "It becomes the file name in My Documents (.docx). You can keep the default and change it later.",
            })}
        </p>
        <label className="mt-5 block">
          <span className={vp.label}>
            {t({ id: "File name", message: "File name" })}
          </span>
          <input
            ref={inputRef}
            className={cn(vp.input, "mt-2")}
            value={value}
            onChange={(e) => {
              touched.current = true;
              setValue(e.target.value);
            }}
            placeholder={defaultName}
            maxLength={80}
            aria-label={t({ id: "File name", message: "File name" })}
          />
        </label>
        {error ? (
          <p className="mt-2 text-[13px] font-medium text-[#DC2626] dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className={vp.btnGhost}
            onClick={() => onConfirm(defaultName)}
          >
            {t({ id: "Use default name", message: "Use default" })}
          </button>
          <button type="submit" className={vp.btnPrimary}>
            {t({ id: "Start writing", message: "Start writing" })}
          </button>
        </div>
      </form>
    </div>
  );
}
