"use client";

/**
 * 右侧 Agent 对话：消息、思考、执行步骤、输入框。
 *
 * 只做工作台需要的最小集合，不承载写作模块的文档编辑能力。
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Maximize2, Paperclip, Square } from "lucide-react";
import type { ChatMessage, UseAiChat } from "@/hooks/use-ai-chat";

interface ChatPanelProps {
  chat: UseAiChat;
  modelLabel: string;
  onToggleWidth: () => void;
  /** 未开始办理时禁用输入，避免提前建出空会话 */
  disabled?: boolean;
  disabledHint?: string;
}

export function ChatPanel({
  chat,
  modelLabel,
  onToggleWidth,
  disabled = false,
  disabledHint = "填写信息并开始办理后，可在这里继续对话",
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.messages, chat.streaming]);

  const send = () => {
    const value = text.trim();
    if (!value || chat.streaming) return;
    setText("");
    void chat.send(value);
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
    <aside className="flex h-full min-w-0 flex-none flex-col bg-[#FAFAFB]">
      <div className="flex h-14 flex-none items-center gap-2.5 border-b border-[#EAEAEC] bg-white px-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#151517] text-[10px] font-semibold text-white">
          P
        </span>
        <span className="text-[13px] font-semibold text-[#151517]">PI 助手</span>
        <span className="ml-0.5 flex items-center gap-1 text-[10.5px] text-[#9A9BA1]">
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

      <div className="flex-none border-t border-[#EAEAEC] bg-white p-3">
        <div className="rounded-[10px] border border-[#E2E2E5] bg-white px-3 py-2.5 transition focus-within:border-[#C9C9CF]">
          <textarea
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
            placeholder={disabled ? disabledHint : "继续和 PI 说…"}
            className="max-h-32 w-full resize-none bg-transparent text-[12.5px] leading-relaxed text-[#151517] outline-none placeholder:text-[#9A9BA1] disabled:cursor-not-allowed"
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
              {uploading ? "上传中…" : "Enter 发送 · Shift+Enter 换行"}
            </span>
            {chat.streaming ? (
              <button
                type="button"
                onClick={chat.stop}
                title="停止生成"
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md bg-[#151517] text-white transition hover:bg-black"
              >
                <Square className="h-3 w-3 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={!text.trim() || disabled}
                title="发送"
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md bg-[#151517] text-white transition hover:bg-black disabled:bg-[#D8D8DC]"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {uploadError ? (
          <p className="mt-1.5 text-[11px] text-[#C0392B]">{uploadError}</p>
        ) : null}
      </div>
    </aside>
  );
}

function Message({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[86%] whitespace-pre-wrap rounded-[10px] bg-[#151517] px-3 py-2 text-[12.5px] leading-[1.7] text-white">
          {message.text}
        </p>
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
          <p className="whitespace-pre-wrap text-[12.5px] leading-[1.8] text-[#3A3B40]">
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
