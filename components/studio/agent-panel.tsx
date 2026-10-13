"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useExtracted } from "next-intl";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CornerDownLeft,
  FileText,
  Loader2,
  Paperclip,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChangeLike } from "@/hooks/use-ai-chat";
import type { AiMaterial, AiTemplate } from "@/utils/ai/client";
import { vp } from "./visual-spec";

/** 把 <patch>/<final-doc> 等契约标记从展示文本里去掉（改动会以变更卡呈现） */
export function visibleText(raw: string): string {
  return (raw || "")
    .replace(/<patch\s+[^>]*>[\s\S]*?<\/patch>/gi, "")
    .replace(/<\/?final-doc>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const OP_CLS: Record<string, string> = {
  insert: "bg-[#ECFDF3] text-[#16A34A]",
  replace: "bg-[#EAF4FF] text-[#007AFF]",
  delete: "bg-[#FEF2F2] text-[#DC2626]",
};

function OperationLabel({ operation }: { operation: ChangeLike["operation"] }) {
  const t = useExtracted();
  switch (operation) {
    case "insert":
      return <>{t({ id: "Insert", message: "Insert" })}</>;
    case "delete":
      return <>{t({ id: "Delete", message: "Delete" })}</>;
    default:
      return <>{t({ id: "Replace", message: "Replace" })}</>;
  }
}

/**
 * 撰写室右栏：AI 面板。
 *
 * 数据全部来自 `useAiChat`（真实 SSE）；这里的「接受」会把变更交给服务端落文，
 * 落文成功后草稿由父组件刷新——所以界面上的稿子始终是服务端那份，不会漂。
 */
export function AgentPanel({
  messages,
  materials,
  template,
  streaming,
  blocked,
  sessionReady,
  modelLabel,
  lastSaved,
  onSend,
  onStop,
  onUpload,
  onUploadTemplate,
  onRemoveTemplate,
  onAcceptChange,
  onRejectChange,
  onAcceptAll,
  onSave,
  onRemoveMaterial,
  initialPrompt,
  panelWidth,
  className,
}: {
  messages: ChatMessage[];
  materials: AiMaterial[];
  /** 当前会话的成稿模板（null = 未上传，按技能包默认结构写） */
  template?: AiTemplate | null;
  streaming: boolean;
  blocked: string | null;
  sessionReady: boolean;
  modelLabel?: string;
  lastSaved: string | null;
  onSend: (text: string, options?: { anchor?: string; selection?: string; save?: boolean }) => void;
  onStop: () => void;
  onUpload?: (file: File) => Promise<AiMaterial>;
  onUploadTemplate?: (file: File) => Promise<AiTemplate>;
  onRemoveTemplate?: () => void;
  onAcceptChange: (key: string) => void;
  onRejectChange: (key: string) => void;
  onAcceptAll: () => void;
  onSave: () => void;
  onRemoveMaterial?: (name: string) => void;
  /** 起手话术（模板带进来的），只在输入框还空着时填入 */
  initialPrompt?: string;
  /** 面板宽度（Tailwind 宽度类，如 `w-[32rem]`）；不传用默认 23rem */
  panelWidth?: string;
  className?: string;
}) {
  const t = useExtracted();
  const [tab, setTab] = useState<"agent" | "analysis">("agent");
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** 「参考资料」弹层开关：左模板 / 右材料，两块都不是必须的 */
  const [refsOpen, setRefsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLInputElement>(null);

  // ── 消息流跟随（DeepSeek 那种）────────────────────────────────────────
  // 默认贴着底部：模型吐字就往下走。用户一旦手动上滑就"接管"，不再拉回；
  // 滑回底部（或点回到底部）恢复跟随。少了这个，视线会卡在中间跟不上输出。
  const listRef = useRef<HTMLDivElement>(null);
  /** 是否处于跟随态（用户没接管） */
  const stickRef = useRef(true);
  /** 程序滚动中：别把自己的滚动当成用户上滑 */
  const autoScrollRef = useRef(false);
  const [stuck, setStuck] = useState(true);

  const lastText = messages[messages.length - 1]?.text ?? "";

  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickRef.current) return;
    autoScrollRef.current = true;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      autoScrollRef.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [messages.length, lastText, tab]);

  /** 用户滚一下：距底 80px 内算"仍在跟随"，否则判定为接管 */
  const onListScroll = () => {
    const el = listRef.current;
    if (!el || autoScrollRef.current) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickRef.current = atBottom;
    setStuck(atBottom);
  };

  /** 点"回到底部"：交还控制权给自动跟随 */
  const jumpToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = true;
    setStuck(true);
    autoScrollRef.current = true;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      autoScrollRef.current = false;
    });
  };

  // 起手话术只在输入框还空着时填入，绝不覆盖用户已经打的字
  useEffect(() => {
    if (!initialPrompt) return;
    setDraft((current) => (current.trim() ? current : initialPrompt));
  }, [initialPrompt]);

  const submit = () => {
    const text = draft.trim();
    if (!text || streaming || !sessionReady) return;
    setDraft("");
    onSend(text);
  };

  /** 选完文件先收起弹层；材料与模板走同一套「上传中」提示 */
  const resetInput = (input: HTMLInputElement | null) => {
    if (input) input.value = "";
  };

  const pickFile = async (file: File | undefined, kind: "material" | "template") => {
    if (!file) return;
    setUploading(file.name);
    setNotice(null);
    try {
      if (kind === "template") {
        if (!onUploadTemplate) return;
        const uploaded = await onUploadTemplate(file);
        setNotice(
          uploaded.parseError
            ? uploaded.parseError
            : `模板已生效：之后每轮都按《${uploaded.name}》的栏目成文`,
        );
      } else {
        if (!onUpload) return;
        const parsed = await onUpload(file);
        setNotice(
          parsed.parseError
            ? `${parsed.name}：${parsed.parseError}`
            : `${t({ id: "Material parsed", message: "Material parsed" })}：${parsed.name} · ${parsed.chars} ${t({ id: "chars", message: "chars" })}`,
        );
      }
    } catch (err) {
      setNotice(`上传失败：${String(err)}`);
    } finally {
      setUploading(null);
      resetInput(kind === "template" ? templateRef.current : fileRef.current);
    }
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-[#E7EAF0] bg-white dark:border-white/10 dark:bg-[#101010]",
        panelWidth ?? "w-[23rem]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-[#E7EAF0] px-3 py-2.5 dark:border-white/10">
        <div className={cn(vp.segGroup, "flex-1 justify-center bg-transparent dark:bg-transparent")}>
          <button
            type="button"
            onClick={() => setTab("agent")}
            className={cn("flex-1 text-center", tab === "agent" ? vp.segOn : vp.segOff)}
          >
            <span className={tab === "agent" ? "text-[#007AFF]" : undefined}>
              {t({ id: "Agent", message: "Agent" })}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("analysis")}
            className={cn("flex-1 text-center", tab === "analysis" ? vp.segOn : vp.segOff)}
          >
            <span className={tab === "analysis" ? "text-[#007AFF]" : undefined}>
              {t({ id: "Analysis", message: "Analysis" })}
            </span>
          </button>
        </div>
      </div>

      {blocked ? (
        <div className="m-3 flex items-start gap-2 rounded-xl border border-[#FBE3C0] bg-[#FFF9F0] p-3">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706]" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-relaxed text-[#8A5A12]">{blocked}</p>
            <Link href="/settings" className={cn(vp.btnText, "mt-1.5 text-[#8A5A12] underline")}>
              {t({ id: "Go to settings", message: "Go to settings" })}
            </Link>
          </div>
        </div>
      ) : null}

      {tab === "agent" ? (
        <>
          <div
              ref={listRef}
              onScroll={onListScroll}
              className="relative flex-1 space-y-4 overflow-y-auto px-4 py-4 custom-scrollbar"
            >
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E7EAF0] p-4 text-[14px] leading-relaxed text-[#94A3B8] dark:border-white/10">
                {t({
                  id: "Studio empty hint",
                  message:
                    "Describe the invention, or upload drawings and test records. The agent reads them and drafts step by step.",
                })}
              </div>
            ) : null}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex flex-col items-end gap-1">
                  {m.anchor ? (
                    <span className={cn(vp.chip, "text-[12.5px]")}>
                      {t({ id: "Clause", message: "Clause" })} {m.anchor}
                    </span>
                  ) : null}
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#007AFF] px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-white">
                    {m.text}
                    <span className="mt-1 block text-right text-[12px] text-white/70">{m.at}</span>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EAF4FF]">
                      <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
                    </span>
                    <span className="text-[14px] font-medium text-[#0F172A] dark:text-white">
                      {t({ id: "Patent Agent", message: "Patent Agent" })}
                    </span>
                    {m.streaming ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#007AFF]" />
                    ) : null}
                    {m.error ? (
                      <span className="rounded-full bg-[#FEF2F2] px-1.5 py-0.5 text-[12px] font-medium text-[#DC2626]">
                        {t({ id: "Error", message: "Error" })}
                      </span>
                    ) : null}
                  </div>

                  {visibleText(m.text) ? (
                    <div
                      className={cn(
                        "rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap",
                        m.error
                          ? "border-[#F6D5D5] bg-[#FEF6F6] text-[#8A2A22]"
                          : "border-[#E7EAF0] bg-[#F9FAFC] text-[#334155] dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                      )}
                    >
                      {visibleText(m.text)}
                    </div>
                  ) : m.streaming ? (
                    <div className="rounded-2xl rounded-tl-md border border-[#E7EAF0] bg-[#F9FAFC] px-3.5 py-2.5 text-[15px] text-[#94A3B8]">
                      {t({ id: "Thinking…", message: "Thinking…" })}
                    </div>
                  ) : null}

                  {m.notes?.length ? (
                    <ul className="space-y-1 pl-1">
                      {m.notes.map((note, i) => (
                        <li key={i} className="text-[13px] text-[#94A3B8]">
                          · {note}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {m.changes?.length ? (
                    <div className="space-y-2 rounded-2xl border border-[#E7EAF0] bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-medium text-[#0F172A] dark:text-white">
                          {t({
                            id: "N Proposed Changes",
                            message: "{count} Proposed Changes",
                            values: { count: String(m.changes.length) },
                          })}
                        </span>
                        {m.changes.some((c) => c.status === "proposed") ? (
                          <button
                            type="button"
                            onClick={onAcceptAll}
                            className="rounded-lg bg-[#16A34A] px-2.5 py-1.5 text-[13.5px] font-medium text-white transition hover:bg-[#15803D] active:scale-[0.98]"
                          >
                            {t({ id: "Accept All", message: "Accept All" })}
                          </button>
                        ) : null}
                      </div>

                      {m.changes.map((c) => {
                        const key = c.key ?? c.id;
                        return (
                          <div
                            key={c.id}
                            className={cn(
                              "rounded-xl border p-2.5 transition-colors",
                              c.status === "accepted"
                                ? "border-[#BBF7D0] bg-[#F6FEF9]"
                                : c.status === "rejected"
                                  ? "border-[#E7EAF0] bg-[#F9FAFC] opacity-70"
                                  : "border-[#E7EAF0] bg-white dark:border-white/10 dark:bg-transparent",
                            )}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-1.5 py-0.5 text-[12px] font-medium",
                                  OP_CLS[c.operation] ?? OP_CLS.replace,
                                )}
                              >
                                <OperationLabel operation={c.operation} />
                              </span>
                              <span className="text-[13px] text-[#94A3B8]">
                                {t({ id: "Clause", message: "Clause" })} {c.anchor}
                              </span>
                              {c.status === "accepted" ? (
                                <Check className="ml-auto h-3.5 w-3.5 text-[#16A34A]" />
                              ) : null}
                            </div>

                            {c.before ? (
                              <p className="mb-1.5 max-h-24 overflow-hidden text-[14px] leading-relaxed text-[#94A3B8] line-through">
                                {c.before}
                              </p>
                            ) : null}
                            <p className="max-h-40 overflow-y-auto text-[14px] leading-relaxed text-[#0F172A] dark:text-white">
                              {c.after}
                            </p>

                            {c.status === "proposed" ? (
                              <div className="mt-2 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onAcceptChange(key)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#007AFF] px-2.5 py-1.5 text-[13.5px] font-medium text-white transition hover:bg-[#0062CC] active:scale-[0.98]"
                                >
                                  <Check className="h-3 w-3" />
                                  {t({ id: "Accept", message: "Accept" })}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRejectChange(key)}
                                  className={cn(vp.btnGhost, "px-2.5 py-1.5 text-[13.5px]")}
                                >
                                  <X className="h-3 w-3" />
                                  {t({ id: "Reject", message: "Reject" })}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ),
            )}

            {/* 用户接管后（手动上滑）给一个回来的入口；跟随中不打扰 */}
            {!stuck ? (
              <button
                type="button"
                onClick={jumpToBottom}
                className="sticky bottom-2 ml-auto flex w-8 items-center justify-end gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-[12px] font-medium text-[#475569] shadow-[0_2px_8px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06] backdrop-blur transition hover:bg-white dark:bg-[#2C2C2E]/95 dark:text-slate-200"
                title={t({ id: "Jump to latest", message: "Jump to latest" })}
              >
                {t({ id: "Latest", message: "Latest" })}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* 输入区 */}
          <div className="relative border-t border-black/[0.06] bg-white/90 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#101010]/90">
            {refsOpen ? (
              <ReferenceSheet
                materials={materials}
                template={template}
                uploading={uploading}
                canUpload={!!(onUpload || onUploadTemplate)}
                canRemoveMaterial={!!onRemoveMaterial}
                onPick={(kind) => (kind === "template" ? templateRef.current : fileRef.current)?.click()}
                onRemoveMaterial={onRemoveMaterial}
                onRemoveTemplate={onRemoveTemplate}
                onClose={() => setRefsOpen(false)}
              />
            ) : null}

            {lastSaved ? (
              <p className="mb-2 truncate text-[13px] text-[#16A34A]" title={lastSaved}>
                {t({
                  id: "Saved to my documents",
                  message: "Saved to My Documents: {name}",
                  values: { name: lastSaved },
                })}
              </p>
            ) : null}
            {notice ? (
              <p className="mb-2 line-clamp-2 text-[13px] text-[#64748B]" title={notice}>
                {notice}
              </p>
            ) : null}

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={2}
                  placeholder={t({
                    id: "Ask for changes, or describe the next step…",
                    message: "Ask for changes, or describe the next step…",
                  })}
                  className={cn(vp.input, "resize-none")}
                />
                <div className="mt-2 flex items-center gap-2">
                  {/* 参考资料：一个独立按钮，点开是「左模板 / 右材料」两块。
                      两块都不是必须的——没传也能直接开写，传了 agent 才有结构与依据。 */}
                  {onUpload || onUploadTemplate ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => void pickFile(e.target.files?.[0], "material")}
                      />
                      <input
                        ref={templateRef}
                        type="file"
                        className="hidden"
                        accept=".docx,.doc,.md,.markdown,.txt"
                        onChange={(e) => void pickFile(e.target.files?.[0], "template")}
                      />
                      <button
                        type="button"
                        onClick={() => setRefsOpen((v) => !v)}
                        disabled={!!uploading}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[14px] font-medium transition active:scale-[0.98]",
                          refsOpen
                            ? "border-[#007AFF]/30 bg-[#007AFF]/10 text-[#007AFF]"
                            : "border-black/[0.07] bg-white text-[#475569] hover:border-[#CFE3FF] hover:text-[#007AFF]",
                        )}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                        {uploading
                          ? t({ id: "Uploading…", message: "Uploading…" })
                          : t({ id: "References", message: "References" })}
                        {/* 有多少东西就直接写在按钮上，不用点开才知道 */}
                        {template || materials.length ? (
                          <span className="rounded-full bg-[#007AFF]/12 px-1.5 text-[12px] font-semibold text-[#007AFF]">
                            {(template ? 1 : 0) + materials.length}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  ) : null}
                  <button type="button" onClick={onSave} className={cn(vp.btnText, "gap-1")}>
                    {t({ id: "Save to my documents", message: "Save to My Documents" })}
                  </button>
                  <span className={cn(vp.meta, "ml-auto truncate text-[12.5px]")}>
                    {modelLabel || ""}
                  </span>
                </div>
              </div>

              {streaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E7EAF0] text-[#475569] transition hover:bg-[#F5F7FB] dark:border-white/10 dark:hover:bg-white/10"
                  title={t({ id: "Stop", message: "Stop" })}
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!draft.trim() || !sessionReady}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition",
                    draft.trim() && sessionReady
                      ? "bg-[#007AFF] hover:bg-[#0062CC] active:scale-[0.97]"
                      : "bg-[#CBD5E1]",
                  )}
                  title={t({ id: "Send", message: "Send" })}
                >
                  <CornerDownLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <AnalysisTab
          messages={messages}
          materials={materials}
          template={template}
          onRemoveMaterial={onRemoveMaterial}
          onRemoveTemplate={onRemoveTemplate}
        />
      )}
    </aside>
  );
}

/**
 * 参考资料弹层（iOS 底部 sheet）。
 *
 * 左「专利模板」= 按什么结构写；右「参考材料」= 写什么、依据是什么。
 * 两块**都不是必须的**：空着也能直接让 agent 开写，所以这里只提示、不拦人。
 * 已传的文件直接在栏内列出并可单个撤掉——材料传上去要能收回，所以移除接到了
 * 后端 `DELETE /sessions/{sid}/materials/{name}`。
 */
function ReferenceSheet({
  materials,
  template,
  uploading,
  canUpload,
  canRemoveMaterial,
  onPick,
  onRemoveMaterial,
  onRemoveTemplate,
  onClose,
}: {
  materials: AiMaterial[];
  template?: AiTemplate | null;
  /** 正在上传的文件名（非空时按钮显示进度态） */
  uploading: string | null;
  canUpload: boolean;
  canRemoveMaterial: boolean;
  onPick: (kind: "material" | "template") => void;
  onRemoveMaterial?: (name: string) => void;
  onRemoveTemplate?: () => void;
  onClose: () => void;
}) {
  const t = useExtracted();

  /** 一栏（模板 / 材料共用的骨架）：图标 + 标题 + 说明 + 内容 */
  const column = (
    key: "template" | "material",
    icon: React.ReactNode,
    title: string,
    hint: string,
    children: React.ReactNode,
  ) => (
    <section
      key={key}
      className="flex min-w-0 flex-col rounded-2xl border border-black/[0.05] bg-[#F7F7FA] p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#007AFF] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-white/10">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-[#0F172A] dark:text-white">{title}</h3>
          <p className="text-[12.5px] leading-tight text-[#94A3B8]">{hint}</p>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );

  return (
    <>
      {/* 透明底：点弹层外面收起（iOS sheet 的 dismiss 手势位） */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="fixed inset-0 z-20 cursor-default"
        onClick={onClose}
      />
      <div className="absolute bottom-2 left-2 right-2 z-30 animate-[sheet-up_180ms_ease-out] rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.28)] dark:border-white/10 dark:bg-[#1C1C1E]">
        <style>{`@keyframes sheet-up{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}`}</style>

        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-white">
            {t({ id: "References", message: "References" })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.05] text-[#64748B] transition hover:bg-black/[0.08] dark:bg-white/10 dark:text-slate-300"
            title={t({ id: "Close", message: "Close" })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {column(
            "template",
            <FileText className="h-4.5 w-4.5" strokeWidth={1.9} />,
            t({ id: "Patent template", message: "Patent template" }),
            t({
              id: "Template column hint",
              message: "The agent writes by its clauses.",
            }),
            <>
              {template ? (
                <div className="mb-2 rounded-xl border border-[#BBF7D0] bg-[#F6FEF9] px-2.5 py-2 dark:border-[#16A34A]/30 dark:bg-[#16A34A]/10">
                  <p className="truncate text-[13.5px] font-medium text-[#15803D] dark:text-[#4ADE80]">
                    {template.name}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] text-[#94A3B8]">
                      {template.parseError
                        ? template.parseError
                        : `${template.chars} ${t({ id: "chars", message: "chars" })}${template.truncated ? " · 已截断" : ""}`}
                    </p>
                    {onRemoveTemplate ? (
                      <button
                        type="button"
                        onClick={() => onRemoveTemplate()}
                        className="shrink-0 text-[12.5px] font-medium text-[#007AFF]"
                      >
                        {t({ id: "Remove", message: "Remove" })}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => onPick("template")}
                disabled={!canUpload || !!uploading}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/[0.07] bg-white px-3 py-2.5 text-[14px] font-medium text-[#007AFF] transition hover:bg-[#007AFF]/5 active:scale-[0.98] disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t({ id: "Upload template", message: "Upload template" })}
              </button>
            </>,
          )}

          {column(
            "material",
            <Paperclip className="h-4.5 w-4.5" strokeWidth={1.9} />,
            t({ id: "Materials", message: "Materials" }),
            t({
              id: "Material column hint",
              message: "Anything the agent should read.",
            }),
            <>
              {materials.length ? (
                <ul className="mb-2 space-y-1.5">
                  {materials.map((m) => (
                    <li
                      key={m.name}
                      className="flex items-center gap-2 rounded-xl border border-black/[0.05] bg-white px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] text-[#334155] dark:text-slate-200">
                          {m.name}
                        </p>
                        <p className="truncate text-[12px] text-[#94A3B8]">
                          {m.parseError
                            ? m.parseError
                            : `${m.chars} ${t({ id: "chars", message: "chars" })}${m.truncated ? " · 已截断" : ""}`}
                        </p>
                      </div>
                      {canRemoveMaterial && onRemoveMaterial ? (
                        <button
                          type="button"
                          onClick={() => onRemoveMaterial(m.name)}
                          className="shrink-0 text-[12.5px] font-medium text-[#007AFF]"
                        >
                          {t({ id: "Remove", message: "Remove" })}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={() => onPick("material")}
                disabled={!canUpload || !!uploading}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/[0.07] bg-white px-3 py-2.5 text-[14px] font-medium text-[#007AFF] transition hover:bg-[#007AFF]/5 active:scale-[0.98] disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t({ id: "Upload material", message: "Upload material" })}
              </button>
            </>,
          )}
        </div>

        {/* 两块都可空：把「不是必须」说清楚，免得用户以为漏了一步 */}
        <p className="mt-3 text-center text-[12.5px] text-[#94A3B8]">
          {t({
            id: "References optional hint",
            message: "Both are optional — the agent can start without them.",
          })}
        </p>
      </div>
    </>
  );
}

/** 分析页：材料（已解析）+ 工具调用，方便判断「它到底依据什么在写」 */
function AnalysisTab({
  messages,
  materials,
  template,
  onRemoveMaterial,
  onRemoveTemplate,
}: {
  messages: ChatMessage[];
  materials: AiMaterial[];
  /** 当前会话的成稿模板（null = 未上传） */
  template?: AiTemplate | null;
  onRemoveMaterial?: (name: string) => void;
  onRemoveTemplate?: () => void;
}) {
  const t = useExtracted();
  const notes = messages.flatMap((m) => m.notes ?? []);
  const toolCalls = notes.filter((n) => n.includes("调用工具"));

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 custom-scrollbar">
      <p className={vp.body}>
        {t({
          id: "Analysis intro",
          message: "Analysis tracks stage progress, tool calls and materials used by the skill.",
        })}
      </p>

      <div className={cn(vp.subCard, "p-3")}>
        <span className={vp.label}>{t({ id: "Materials", message: "Materials" })}</span>
        {template ? (
          <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-[#BBF7D0] bg-[#F6FEF9] px-2.5 py-2">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-[#15803D]">{template.name}</p>
              <p className="text-[12.5px] text-[#94A3B8]">
                {template.parseError
                  ? template.parseError
                  : `${t({ id: "Draft template", message: "Draft template" })} · ${template.chars} ${t({ id: "chars", message: "chars" })}${template.truncated ? " · 已截断" : ""}`}
              </p>
            </div>
            {onRemoveTemplate ? (
              <button
                type="button"
                onClick={() => onRemoveTemplate()}
                className={vp.btnText}
              >
                {t({ id: "Remove", message: "Remove" })}
              </button>
            ) : null}
          </div>
        ) : null}
        {materials.length ? (
          <ul className="mt-1.5 space-y-1.5">
            {materials.map((m) => (
              <li key={m.name} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-[#475569] dark:text-slate-300">{m.name}</p>
                  <p className="text-[12.5px] text-[#94A3B8]">
                    {m.parseError
                      ? m.parseError
                      : `${m.chars} ${t({ id: "chars", message: "chars" })}${m.truncated ? " · 已截断" : ""}`}
                  </p>
                </div>
                {onRemoveMaterial ? (
                  <button
                    type="button"
                    onClick={() => onRemoveMaterial(m.name)}
                    className={vp.btnText}
                  >
                    {t({ id: "Remove", message: "Remove" })}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn(vp.meta, "mt-1.5")}>
            {t({ id: "No materials yet", message: "No materials yet" })}
          </p>
        )}
      </div>

      <div className={cn(vp.subCard, "p-3")}>
        <span className={vp.label}>{t({ id: "Tools", message: "Tools" })}</span>
        {toolCalls.length ? (
          <ul className="mt-1.5 space-y-1">
            {toolCalls.map((n, i) => (
              <li key={i} className="text-[13.5px] text-[#475569] dark:text-slate-300">
                · {n}
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn(vp.meta, "mt-1.5")}>
            {t({
              id: "No tool calls yet",
              message: "No tool calls yet — the agent reads skills and writes text only.",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
