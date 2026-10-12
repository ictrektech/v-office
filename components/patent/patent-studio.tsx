"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useExtracted } from "next-intl";
import { Check, Loader2, RotateCcw, Save, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useResolvedLanguage } from "@/store";
import {
  alignCollaboraHost,
  fetchCollaboraSession,
  fetchCollaboraStatus,
  hideCollaboraWelcomeScreen,
} from "@/utils/editor/collabora";
import { toCollaboraLang } from "@/utils/editor/locale";
import { getPatentTemplate } from "@/utils/patent/templates";
import { AgentPanel } from "./agent-panel";
import { DocCanvas } from "./doc-canvas";
import { PatentHeader } from "./patent-header";
import { vp } from "./visual-spec";

/** Collabora 冷启动的最长等待（与编辑器页口径一致：首启约 1 分钟） */
const ENGINE_WAIT_MS = 150_000;
const ENGINE_POLL_MS = 3_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface StudioTemplate {
  id: string;
  name: string;
  /** 技能包名（从模板的 skillEntry 里取，如 skills/patent-disclosure/prompts/…） */
  skill: string;
  /** 成文结构（模板字段清单），用于给 agent 一句起手话术 */
  outline: string;
}

/**
 * 解析 URL 上的模板（`/patent/studio?template=disclosure-invention`）。
 *
 * 必须**在首次渲染**就拿到：它决定会话用哪个技能包（patent-application /
 * patent-oa …）与哪条会话线，晚一步就会用错技能建出会话来。所以走
 * `useSearchParams`（路由页包了 Suspense 边界）。
 */
function resolveTemplate(id: string): StudioTemplate | null {
  const tpl = id ? getPatentTemplate(id) : undefined;
  if (!tpl) return null;
  return {
    id: tpl.id,
    name: tpl.name,
    skill: (tpl.skillEntry || "").split("/")[1] || "patent-disclosure",
    outline: (tpl.fields ?? []).map((f) => f.label).join("、"),
  };
}

/**
 * AI 专利撰写室（核心）。
 *
 * **打开就是 Collabora 编辑器**，不需要任何切换：进页面即
 * 「草稿导出 docx → 等内核就绪 → 挂会话」，中栏直接是 Word 编辑器。
 * 右侧 AI 面板照常对话；AI 改完稿子后编辑器会自动重载，看到的就是新内容。
 *
 * 为什么是这种形态：
 * - 稿子的真值在服务端（Markdown 草稿），而人习惯在 Word 里改排版/批注/修订，
 *   所以两者各管一段，靠「导出 docx / 回读 docx」交接，全程串行、不需要锁
 * - Collabora 按文档键（WOPISrc）缓存会话，服务端改写文件后旧会话看不到新内容，
 *   所以每次重载都换一个会话版本（`?version=N`）逼它重新读盘
 *
 * 左侧不再有案件列表：模板即入口，会话即案卷。
 */
export function PatentStudio() {
  const t = useExtracted();
  usePageTitle(t({ id: "AI Patent Studio", message: "AI Patent Studio" }));
  const language = useResolvedLanguage();
  const searchParams = useSearchParams();
  /** 从栏目页点进来的模板（决定技能包、会话线与起手话术） */
  const templateId = searchParams.get("template") || "";
  const template = useMemo(() => resolveTemplate(templateId), [templateId]);

  const [selectedAnchor, setSelectedAnchor] = useState<string | undefined>(undefined);
  /** 中栏显示哪个：默认就是编辑器；草稿只是「看变更卡/点段落定位」的辅助视图 */
  const [view, setView] = useState<"editor" | "draft">("editor");
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  /** 编辑器里打开的那份 docx（回读/重载都按它） */
  const [editorDoc, setEditorDoc] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  /** 内核冷启动已等待秒数；null = 没在等 */
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const openingRef = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const chat = useAiChat({
    skill: template?.skill ?? "patent-disclosure",
    title: template?.name ?? t({ id: "Patent disclosure", message: "Patent disclosure" }),
    // 每个模板一条独立会话线，别让「发明交底书」的稿子串到「审查意见答复」里
    persistKey: `patent:studio:${template?.id ?? "default"}`,
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
  const openEditor = useCallback(async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setEngineError(null);
    cancelRef.current = false;
    const zh = language.toLowerCase().startsWith("zh");
    try {
      const name = await chat.exportDocx();
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
      const session = await fetchCollaboraSession(
        name,
        true,
        null,
        toCollaboraLang(language),
      );
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
  }, [chat, language]);

  /** 进页面就开编辑器：不做任何「先看草稿再切」的中间态 */
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    void openEditor();
  }, [openEditor]);

  /** 摘下 Collabora 首启的"What's new"浮层：它盖住正文，第一眼看到的是推广 */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    return hideCollaboraWelcomeScreen(frame);
  }, [editorUrl]);

  /** 模板的起手话术：把「写什么、按什么结构」先说清楚，省一轮来回 */
  const seedPrompt = template
    ? `按「${template.name}」起草。成文结构：${template.outline}。先告诉我需要哪些材料。`
    : "";

  /**
   * 发指令前先把编辑器里**已保存**的内容回读进草稿。
   *
   * 用户在 Word 里手改的内容 agent 看不见（草稿是 AI 的工作面），不回读的话
   * 下一轮 AI 会拿着旧稿改，把用户的修改覆盖掉。
   */
  const sendInstruction = useCallback(
    async (text: string, options?: { anchor?: string; selection?: string }) => {
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
    [chat, editorDoc, selectedAnchor],
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
      <PatentHeader
        active="studio"
        title={template?.name ?? t({ id: "AI Patent Studio", message: "AI Patent Studio" })}
        subtitle={t({
          id: "Studio subtitle",
          message: "Mine, search and draft — the patent skill drives every stage.",
        })}
      >
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
      </PatentHeader>

      <div className="flex min-h-0 flex-1">
        <main className="relative flex min-w-0 flex-1 bg-white dark:bg-[#0e0e0e]">
          {/* 编辑器一直挂着（切到草稿只是藏起来）：会话不白扔，切回来是秒回 */}
          {editorUrl ? (
            <iframe
              ref={frameRef}
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
                  "Save in the editor (Ctrl+S) so the AI can pick up your changes; the editor reloads itself after the AI edits.",
              })}
            </p>
          ) : null}
        </main>

        <AgentPanel
          messages={chat.messages}
          materials={chat.materials}
          streaming={chat.streaming}
          blocked={chat.blocked}
          sessionReady={!!chat.sessionId}
          modelLabel={modelLabel}
          lastSaved={chat.lastSaved}
          initialPrompt={seedPrompt}
          onSend={(text, options) => void sendInstruction(text, options)}
          onStop={chat.stop}
          onUpload={chat.upload}
          onAcceptChange={(key) => void chat.acceptChange(key)}
          onRejectChange={chat.rejectChange}
          onAcceptAll={() => void chat.acceptAll()}
          onSave={() => void chat.saveNow()}
          className="hidden xl:flex"
        />
      </div>
    </div>
  );
}
