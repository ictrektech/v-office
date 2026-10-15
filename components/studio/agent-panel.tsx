"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useExtracted } from "next-intl";
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  CornerDownLeft,
  FileText,
  Loader2,
  Paperclip,
  Sparkles,
  Square,
  Target,
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
    // 文字级替换的结果：整块去掉——它是给服务端落文用的，不是给用户读的说明；
    // 用户要看的是文档里改成了什么，把整段替换结果贴在对话里只会淹掉说明文字。
    .replace(/<replace-selection\b[^>]*>[\s\S]*?<\/replace-selection>/gi, "")
    // 自闭合的样式指令（可能带 anchor）：同样不是正文
    .replace(/<doc-style\b[^>]*\/?>/gi, "")
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
 * 秒级走字的等待计时。
 *
 * 一块**静止**的提示和一块会走字的提示，观感差很远：前者像卡死，后者至少
 * 证明进程活着。思考关掉时尤其需要——那时模型不产出推理文本，面板上真的
 * 只有这一块东西可看（实测：首段正文 1.3s 就到，但中间读技能包要 10s）。
 */
function Elapsed({ since }: { since?: number }) {
  const t = useExtracted();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!since) return null;
  const secs = Math.max(0, Math.round((now - since) / 1000));
  return (
    <span className="ml-1.5 text-[12.5px] text-[#B4BDC9]">
      {t({ id: "Elapsed seconds", message: "{count}s", values: { count: String(secs) } })}
    </span>
  );
}

/**
 * 工具名的中文动词（静态分支：next-intl 的提取器要求消息可静态分析）。
 */
function ToolVerb({ name }: { name: string }) {
  const t = useExtracted();
  switch (name) {
    case "read":
      return <>{t({ id: "Tool read", message: "reading" })}</>;
    case "write":
      return <>{t({ id: "Tool write", message: "writing" })}</>;
    case "edit":
      return <>{t({ id: "Tool edit", message: "editing" })}</>;
    case "bash":
      return <>{t({ id: "Tool bash", message: "running" })}</>;
    default:
      return <>{t({ id: "Tool other", message: "calling" })}</>;
  }
}

/**
 * 「正在做的事」——**一行**，就地更新。
 *
 * 以前每轮往附注里塞一条「调用工具：read、read」，一次写作能堆出二十几行
 * 一模一样的字（用户看到的就是一面墙）。现在只留最新一步，且带上对象：
 * 「正在读取 SKILL.md · 第 7 步」。
 */
function ActivityLine({ activity }: { activity: NonNullable<ChatMessage["activity"]> }) {
  const t = useExtracted();
  // 路径只留文件名：全路径又长又占地方，同名在技能包内可以忽略
  const base = activity.target.split(/[\\/]/).filter(Boolean).pop() || "";
  return (
    <div className="flex items-center gap-1.5 pl-1 text-[13px] text-[#94A3B8]">
      <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#007AFF]" />
      <span className="truncate">
        <ToolVerb name={activity.name} /> {base || activity.name}
        <span className="ml-1.5 text-[#B4BDC9]">
          {t({ id: "Step N", message: "step {count}", values: { count: String(activity.steps) } })}
        </span>
      </span>
    </div>
  );
}

/**
 * 模型的思考过程。
 *
 * 深度思考能持续几十秒，这段时间以前是**彻底空白**（也正是「连接中断」误杀的
 * 成因：没有任何事件可发）。把推理实时铺开，用户至少有东西读；正文一出现就
 * 自动收起，不跟交付物抢视线——用户手动开合过就尊重他的选择，不再自动折叠。
 *
 * 思考**不是正文**：它只在这里显示，绝不进草稿、不落盘。
 */
function ThinkingBlock({ text, live }: { text: string; live: boolean }) {
  const t = useExtracted();
  const [open, setOpen] = useState(live);
  const pinned = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pinned.current) setOpen(live);
  }, [live]);

  // 思考在长，视线跟着走（只在展开时滚，收起后不动）
  useEffect(() => {
    const el = bodyRef.current;
    if (el && live) el.scrollTop = el.scrollHeight;
  }, [text, live]);

  const toggle = () => {
    pinned.current = true;
    setOpen((v) => !v);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E7EAF0] bg-white/70 dark:border-white/10 dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px] text-[#8B96A8] transition hover:bg-[#F7F9FC] dark:hover:bg-white/5"
      >
        <Brain className="h-3.5 w-3.5 shrink-0 text-[#007AFF]" />
        <span className="font-medium">
          {live
            ? t({ id: "Thinking…", message: "Thinking…" })
            : t({ id: "Reasoning", message: "Reasoning" })}
        </span>
        <ChevronDown
          className={cn("ml-auto h-3.5 w-3.5 shrink-0 transition", open ? "rotate-180" : "")}
        />
      </button>
      {open ? (
        <div
          ref={bodyRef}
          className="max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-[#F1F3F7] px-3 py-2 text-[13.5px] leading-relaxed text-[#7B8798] custom-scrollbar dark:border-white/10 dark:text-slate-400"
        >
          {text}
        </div>
      ) : null}
    </div>
  );
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
  selection,
  onCaptureSelection,
  onClearSelection,
  capturingSelection,
  selectionHint,
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
  /**
   * 「只改这里」：用户在编辑器里选中、等 AI 动手的那一处（null = 不收窄）。
   *
   * 由宿主（ai-studio）经 Collabora 桥读选区后给出；带上 anchor（草稿段落
   * 编号）时服务端的 patch 落点以它为准。改动送回后宿主会清掉它。
   */
  selection?: { text: string; anchor: string; preview: string } | null;
  /** 点「改这里」：让宿主去读编辑器选区（宿主持有 iframe 桥） */
  onCaptureSelection?: () => void;
  /** 撤掉作用域（X）：下一轮照旧看整篇 */
  onClearSelection?: () => void;
  /** 正在读选区（按钮转圈） */
  capturingSelection?: boolean;
  /** 读了但文档里没有选区：给一句提示 */
  selectionHint?: boolean;
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

                  {/* 正在做的事：一行，就地更新 */}
                  {m.streaming && m.activity ? <ActivityLine activity={m.activity} /> : null}

                  {/* 思考过程：正文一出现自动收起（用户手动开合过就听用户的） */}
                  {m.thinking ? (
                    <ThinkingBlock
                      text={m.thinking}
                      live={!!m.streaming && !visibleText(m.text)}
                    />
                  ) : null}

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
                  ) : m.streaming && !m.thinking ? (
                    // 既没有正文、也没有思考流（思考关掉时就一直是这样）：
                    // 不给一句静止的「思考中…」，而是会走字的「正在处理 … 8s」
                    <div className="flex items-center rounded-2xl rounded-tl-md border border-[#E7EAF0] bg-[#F9FAFC] px-3.5 py-2.5 text-[15px] text-[#94A3B8]">
                      {t({ id: "Working…", message: "Working…" })}
                      <Elapsed since={m.startedAt} />
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

            {/* 「只改这里」：选中区域的作用域条。有它 = 这一轮 AI 只动这一处，
                改完以 Word 修订送回（其他地方原样保留）；X 撤掉就回到整篇。 */}
            {selection ? (
              <div className="mb-2 flex items-start gap-2 rounded-xl border border-[#007AFF]/25 bg-[#007AFF]/8 px-3 py-2">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#007AFF]">
                    {t({ id: "Edit here only", message: "Editing here only" })}
                    {selection.anchor ? (
                      <span className="ml-1.5 font-normal text-[#007AFF]/80">
                        {t({ id: "Clause", message: "Clause" })} {selection.anchor}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#475569] dark:text-slate-300">
                    {selection.preview}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="-mr-1 -mt-0.5 shrink-0 rounded-lg p-1 text-[#007AFF]/60 transition hover:bg-[#007AFF]/10 hover:text-[#007AFF]"
                  aria-label={t({ id: "Clear scope", message: "Clear scope" })}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : selectionHint ? (
              <p className="mb-2 text-[13px] text-[#B45309]">
                {t({
                  id: "No selection hint",
                  message: "No text is selected in the document — select first, then tap Edit here.",
                })}
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
                  {/* 「改这里」：读编辑器选区，把这一轮的改动收窄到那一处。
                      编辑视图之外（草稿视图）没有选区可读，按钮不出现。 */}
                  {onCaptureSelection ? (
                    <button
                      type="button"
                      onClick={onCaptureSelection}
                      disabled={capturingSelection || !sessionReady}
                      className={cn(
                        vp.btnText,
                        "gap-1",
                        selection && "text-[#007AFF]",
                        (capturingSelection || !sessionReady) && "opacity-50",
                      )}
                      title={t({
                        id: "Edit here hint",
                        message: "Select text in the document first — the AI will only change that part",
                      })}
                    >
                      {capturingSelection ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Target className="h-3.5 w-3.5" />
                      )}
                      {t({ id: "Edit here", message: "Edit here" })}
                    </button>
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
  // 工具调用不再从 notes 里捞字符串（那种「调用工具：read」的堆积已经去掉了），
  // 直接读每条消息上的活动摘要：总共几步 + 最后一步在读什么。
  const toolSteps = messages.reduce((n, m) => n + (m.activity?.steps ?? 0), 0);
  const lastActivity = [...messages].reverse().find((m) => m.activity)?.activity;
  const lastTarget = (lastActivity?.target || "").split(/[\\/]/).filter(Boolean).pop();

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
        {toolSteps ? (
          <ul className="mt-1.5 space-y-1">
            <li className="text-[13.5px] text-[#475569] dark:text-slate-300">
              ·{" "}
              {t({
                id: "Tool call count",
                message: "{count} tool calls",
                values: { count: String(toolSteps) },
              })}
            </li>
            {lastTarget || lastActivity?.name ? (
              <li className="text-[13px] text-[#94A3B8]">
                ·{" "}
                {t({
                  id: "Last tool target",
                  message: "Latest: {what}",
                  values: { what: lastTarget || String(lastActivity?.name) },
                })}
              </li>
            ) : null}
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
