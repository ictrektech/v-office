"use client";

/**
 * 右侧 Agent 对话：消息、思考、执行步骤、输入框。
 *
 * 只做工作台需要的最小集合，不承载写作模块的文档编辑能力。
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Maximize2, Paperclip, Square, X } from "lucide-react";
import type { ChatMessage, UseAiChat } from "@/hooks/use-ai-chat";
import type { StepKey } from "./copyright";

/** 从进度卡放进对话框的一步：系统指令，用户可补充后再发 */
export interface StagedStep {
  key: StepKey;
  title: string;
  prompt: string;
}

interface ChatPanelProps {
  chat: UseAiChat;
  modelLabel: string;
  onToggleWidth: () => void;
  /** 未开始办理时禁用输入，避免提前建出空会话 */
  disabled?: boolean;
  disabledHint?: string;
  /** 已放进对话框、还没发出去的步骤指令 */
  staged?: StagedStep | null;
  onClearStaged?: () => void;
  /** 带步骤的消息真正发成功后才回调（父级据此推进进度） */
  onStagedSent?: (key: StepKey) => void;
  /** 当前打开的案件文件：让助手知道在说哪个文件 */
  contextFile?: { path: string; name: string } | null;
}

export function ChatPanel({
  chat,
  modelLabel,
  onToggleWidth,
  disabled = false,
  disabledHint = "填写信息并开始办理后，可在这里继续对话",
  staged = null,
  onClearStaged,
  onStagedSent,
  contextFile = null,
}: ChatPanelProps) {
  const [text, setText] = useState("");
  /** 执行中先排队的消息：本轮结束后按顺序自动发送，不打断当前步骤 */
  const [queued, setQueued] = useState<Array<{ text: string; stepKey?: StepKey }>>([]);
  /** 用户手动关掉的当前文件：换文件（path 变了）自动重新亮出来 */
  const [dismissedFile, setDismissedFile] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** 上一渲染的 streaming：用来识别「本轮刚结束」这一次状态翻转 */
  const wasStreamingRef = useRef(chat.streaming);
  const activeFile = contextFile && contextFile.path !== dismissedFile ? contextFile : null;
  const canSend = Boolean(text.trim() || staged);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.messages, chat.streaming]);

  // 从左栏点「发送到对话框」后，光标直接落在输入框：想补一句就补，不想补直接回车
  useEffect(() => {
    if (!staged || disabled) return;
    textareaRef.current?.focus();
  }, [staged, disabled]);

  // 本轮结束后把排队的第一条发出去。这样用户在「执行」期间提的补充要求
  // （比如关注点转到别处）不会丢，也不会把正在跑的工作流步骤打断。
  useEffect(() => {
    const wasStreaming = wasStreamingRef.current;
    wasStreamingRef.current = chat.streaming;
    if (!wasStreaming || chat.streaming || queued.length === 0) return;
    const [next, ...rest] = queued;
    setQueued(rest);
    void chat.send(next.text).then((ok) => {
      // 发送失败（断网/新回合没起来）就放回队首，至少不丢用户这句话
      if (!ok) {
        setQueued((prev) => [next, ...prev]);
        return;
      }
      if (next.stepKey) onStagedSent?.(next.stepKey);
    });
  }, [chat, chat.streaming, queued, onStagedSent]);

  const send = () => {
    if (disabled) return;
    const supplement = text.trim();
    // 只有文件上下文、没有正文也没有步骤时不发
    if (!supplement && !staged) return;

    /* 一条消息 = 文件上下文 + 这一步的系统指令 + 用户补充；渲染时再拆开 */
    const parts: string[] = [];
    if (activeFile) parts.push(`[当前文件] ${activeFile.path}`);
    if (staged) {
      parts.push(`<v-office-step title="${staged.title}">\n${staged.prompt}\n</v-office-step>`);
    }
    if (supplement) parts.push(supplement);
    const payload = parts.join("\n\n");
    const stepKey = staged?.key;

    setText("");
    if (chat.streaming) {
      // 当前回合还没结束：先排队，等它收尾再发（见上面的 effect）
      setQueued((prev) => [...prev, { text: payload, stepKey }]);
      onClearStaged?.();
      return;
    }
    void chat.send(payload).then((ok) => {
      if (!ok) {
        // 发送失败不吞用户这句话：补回输入框，步骤卡也还在，直接重发
        setText((current) => current || supplement);
        return;
      }
      if (stepKey) onStagedSent?.(stepKey);
      onClearStaged?.();
    });
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await chat.upload(file);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <aside className="flex h-full min-w-0 flex-none flex-col bg-[#FBFBFC]">
      <div className="flex h-[60px] flex-none items-center gap-2.5 border-b border-[#ECECEF] bg-white px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#111113] text-[11px] font-semibold text-white">
          P
        </span>
        <span className="text-[14px] font-semibold text-[#111113]">PI 助手</span>
        <span className="ml-0.5 flex items-center gap-1 text-[11.5px] text-[#8E8E93]">
          <span
            className={`h-1 w-1 rounded-full ${chat.blocked ? "bg-[#C9C9CF]" : "bg-[#3EA05C]"}`}
          />
          {chat.blocked ? "未连接" : "在线"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <span className="rounded border border-[#EAEAEC] px-1.5 py-0.5 text-[10px] text-[#9A9BA1]">
            {modelLabel}
          </span>
          <button
            type="button"
            onClick={onToggleWidth}
            title="展开 / 收起"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#9A9BA1] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
        {chat.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="text-[13px] font-medium text-[#8A8B91]">
              上传材料，或直接说这一步要做什么
            </span>
          </div>
        ) : (
          <div className="space-y-5">
            {chat.messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {chat.blocked ? (
        <p className="mx-4 mb-2 rounded-md border border-[#F0DFC8] bg-[#FBF5EA] px-2.5 py-2 text-[11.5px] leading-relaxed text-[#8A6A3B]">
          {chat.blocked}
        </p>
      ) : null}

      <div className="flex-none border-t border-[#ECECEF] bg-white p-3">
        <div className="rounded-2xl border border-[#E7E7EA] bg-white px-3.5 py-3 transition focus-within:border-[#C9C9CF]">
          {activeFile || staged ? (
            <div className="mb-2 space-y-1.5">
              {activeFile ? (
                <span className="flex h-7 max-w-full items-center gap-1 rounded-full bg-[#F2F2F5] pl-2.5 pr-1 text-[11.5px] text-[#3C3C43]">
                  <span className="truncate" title={activeFile.path}>
                    当前文件 · {activeFile.name}
                  </span>
                  <button
                    type="button"
                    title="这条消息不再带上这个文件"
                    onClick={() => setDismissedFile(activeFile.path)}
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[#8E8E93] transition hover:bg-[#E2E2E7] hover:text-[#1C1C1E]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null}
              {staged ? (
                <div className="flex items-start gap-1.5 rounded-lg border border-[#EAEAEC] bg-[#F7F7F9] px-2.5 py-1.5">
                  <div className="min-w-0 flex-1 text-[11.5px] leading-[1.6] text-[#5F6066]">
                    系统指令 · {staged.title}
                    <details className="mt-0.5">
                      <summary className="cursor-pointer text-[10.5px] text-[#9A9BA1]">
                        查看内容
                      </summary>
                      <p className="mt-1 whitespace-pre-wrap text-[10.5px] leading-relaxed text-[#7A7B81]">
                        {staged.prompt}
                      </p>
                    </details>
                  </div>
                  <button
                    type="button"
                    onClick={onClearStaged}
                    title="移除这一步"
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[#8E8E93] transition hover:bg-[#E2E2E7] hover:text-[#1C1C1E]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            value={text}
            disabled={disabled}
            onChange={(event) => {
              setText(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={
              disabled
                ? disabledHint
                : staged
                  ? "可以补充这一步的要求（可留空直接发送）"
                  : "继续和 PI 说…"
            }
            className="max-h-32 w-full resize-none bg-transparent text-[13px] leading-relaxed text-[#111113] outline-none placeholder:text-[#A1A1A6] disabled:cursor-not-allowed"
          />
          <div className="mt-1.5 flex items-center gap-1">
            <button
              type="button"
              title="上传材料"
              disabled={uploading || disabled}
              onClick={() => fileRef.current?.click()}
              className="flex h-6 w-6 items-center justify-center rounded text-[#9A9BA1] transition hover:bg-[#F4F4F5] hover:text-[#151517] disabled:opacity-50"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                void upload(event.target.files);
                event.target.value = "";
              }}
            />
            <span className="text-[10.5px] text-[#9A9BA1]">
              {uploading
                ? "上传中…"
                : chat.streaming
                  ? queued.length
                    ? `已排队 ${queued.length} 条，本轮结束后自动发送`
                    : "Enter 排队，本轮结束后自动发送"
                  : staged
                    ? "Enter 发送这一步 · Shift+Enter 换行"
                    : "Enter 发送 · Shift+Enter 换行"}
            </span>
            {queued.length > 0 ? (
              <button
                type="button"
                onClick={() => setQueued([])}
                className="text-[10.5px] text-[#8E8E93] underline-offset-2 hover:underline"
              >
                取消排队
              </button>
            ) : null}
            <div className="ml-auto flex items-center gap-1">
              {chat.streaming ? (
                <>
                  {canSend ? (
                    <button
                      type="button"
                      onClick={send}
                      disabled={disabled}
                      title="排队发送（本轮结束后自动发送）"
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-[#151517] text-white transition hover:bg-black disabled:bg-[#D8D8DC]"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={chat.stop}
                    title="停止生成"
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-[#151517] text-white transition hover:bg-black"
                  >
                    <Square className="h-3 w-3 fill-current" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={send}
                  disabled={!canSend || disabled}
                  title="发送"
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-[#151517] text-white transition hover:bg-black disabled:bg-[#D8D8DC]"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        {uploadError ? (
          <p className="mt-1.5 text-[11px] text-[#C0392B]">{uploadError}</p>
        ) : null}
      </div>
    </aside>
  );
}

const FILE_PREFIX = /^\[当前文件\]\s*([^\n]+)\n*/;
const STEP_BLOCK = /<v-office-step title="([^"]*)">\n?([\s\S]*?)\n?<\/v-office-step>\n*/;

/** 把发出的那条消息拆回「文件上下文 / 步骤指令 / 用户原话」，只用于上屏 */
function parseUserText(raw: string) {
  let rest = raw;
  let file = "";
  const fileMatch = rest.match(FILE_PREFIX);
  if (fileMatch) {
    file = fileMatch[1].trim();
    rest = rest.slice(fileMatch[0].length);
  }
  const stepMatch = rest.match(STEP_BLOCK);
  const step = stepMatch
    ? { title: stepMatch[1], prompt: stepMatch[2].trim() }
    : null;
  if (stepMatch) rest = rest.replace(STEP_BLOCK, "");
  return { file, step, body: rest.trim() };
}

function Message({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    const parsed = parseUserText(message.text);
    if (!parsed.file && !parsed.step) {
      return (
        <div className="flex justify-end">
          <p className="max-w-[86%] whitespace-pre-wrap rounded-[10px] bg-[#151517] px-3 py-2 text-[12.5px] leading-[1.7] text-white">
            {message.text}
          </p>
        </div>
      );
    }
    return (
      <div className="flex justify-end">
        <div className="max-w-[86%] space-y-1.5 rounded-[10px] bg-[#151517] px-3 py-2 text-[12.5px] leading-[1.7] text-white">
          {parsed.file ? (
            <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/65">
              <span className="h-1 w-1 flex-none rounded-full bg-white/50" />
              当前文件 ·
              <span className="min-w-0 truncate" title={parsed.file}>
                {parsed.file.split("/").pop() || parsed.file}
              </span>
            </p>
          ) : null}
          {parsed.step ? (
            <details className="rounded-md bg-white/10 px-2 py-1">
              <summary className="cursor-pointer text-[11px] text-white/70">
                系统指令 · {parsed.step.title}
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-white/60">
                {parsed.step.prompt}
              </p>
            </details>
          ) : null}
          {parsed.body ? (
            <p className="whitespace-pre-wrap text-white">{parsed.body}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#E9E9EB] text-[10px] font-semibold text-[#5F6066]">
        P
      </span>
      <div className="min-w-0 flex-1">
        {message.activity && message.streaming ? (
          <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] text-[#9A9BA1]">
            <span className="h-1 w-1 animate-pulse rounded-full bg-[#9A9BA1]" />
            {message.activity.name}
            {message.activity.target ? ` · ${message.activity.target}` : ""}
            {message.activity.steps > 0 ? `（第 ${message.activity.steps} 步）` : ""}
          </p>
        ) : null}

        {message.text ? (
          <p className="whitespace-pre-wrap text-[13px] leading-[1.8] text-[#3C3C43]">
            {message.text}
          </p>
        ) : null}

        {message.streaming && !message.text ? (
          <span className="flex items-center gap-1 pt-1">
            <span className="h-1 w-1 animate-bounce rounded-full bg-[#9A9BA1]" />
            <span
              className="h-1 w-1 animate-bounce rounded-full bg-[#9A9BA1]"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="h-1 w-1 animate-bounce rounded-full bg-[#9A9BA1]"
              style={{ animationDelay: "240ms" }}
            />
          </span>
        ) : null}

        {message.thinking ? (
          <details className="mt-2 rounded-md bg-[#F4F4F5] px-2.5 py-1.5">
            <summary className="cursor-pointer text-[10.5px] text-[#9A9BA1]">
              思考过程
            </summary>
            <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-[#7A7B81]">
              {message.thinking}
            </p>
          </details>
        ) : null}

        {message.error ? (
          <p className="mt-1 text-[10.5px] text-[#C0392B]">这一轮生成失败，可以直接重发。</p>
        ) : null}
      </div>
    </div>
  );
}
