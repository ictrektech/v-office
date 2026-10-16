"use client";

/**
 * 任务工作台：左产物看板 + 右对话面板 —— **不放 Word 编辑器**。
 *
 * 四件套和答复这两个任务是「要件填全 → 分段生成 → 逐份过目」，内容视图就是
 * Markdown 全文本身，Collabora 在这里是多余的重量：多一次冷启动、多一份 docx
 * 往返，还让用户以为要先打开文档才能看内容。
 */

import { useState } from "react";
import { AgentPanel } from "./agent-panel";
import { ArtifactBoard, type ArtifactSpec } from "./artifact-board";
import { useAiChat } from "@/hooks/use-ai-chat";

export function TaskWorkbench({
  chat,
  specs,
  title,
  onGenerate,
  extraTitle,
}: {
  chat: ReturnType<typeof useAiChat>;
  specs: ArtifactSpec[];
  /** 任务名（无障碍/朗读用，工作台本体由看板与面板组成） */
  title: string;
  /** 生成某一份产物：发一轮指令 + 落成产物 */
  onGenerate: (spec: ArtifactSpec) => Promise<void>;
  /** 过程稿分区标题（交底/写作包用「过程稿」，申请包不传则沿用「问题清单」） */
  extraTitle?: string;
}) {
  const [preview, setPreview] = useState<{
    key: string;
    title: string;
    markdown: string;
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const modelLabel = chat.health ? `pi ${chat.health.pi.version ?? ""}`.trim() : undefined;

  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="relative flex min-h-[420px] min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/[0.04] dark:bg-[#141414] dark:ring-white/10">
        <ArtifactBoard
          specs={specs}
          artifacts={chat.artifacts}
          active={chat.activeArtifact}
          streaming={chat.streaming}
          busyKey={busyKey}
          onGenerate={(spec) => {
            setBusyKey(spec.key);
            void onGenerate(spec).finally(() => setBusyKey(null));
          }}
          onPreview={async (spec) => {
            setBusyKey(spec.key);
            try {
              setPreview({
                key: spec.key,
                title: spec.title,
                markdown: await chat.loadArtifact(spec.key),
              });
            } finally {
              setBusyKey(null);
            }
          }}
          onRemove={(spec) => void chat.removeArtifact(spec.key)}
          onSaveToDocs={async (spec) => {
            setBusyKey(spec.key);
            try {
              // 存进「我的文档」：把这份产物灌成当前稿，再走既有的 docx 出稿
              await chat.openArtifact(spec.key);
              await chat.saveNow();
            } finally {
              setBusyKey(null);
            }
          }}
          preview={preview}
          onClosePreview={() => setPreview(null)}
          extraTitle={extraTitle}
        />
      </div>

      <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/[0.04] xl:h-[calc(100vh-15rem)] xl:w-[26rem] dark:bg-[#141414] dark:ring-white/10">
        <AgentPanel
          messages={chat.messages}
          materials={chat.materials}
          template={chat.template}
          streaming={chat.streaming}
          blocked={chat.blocked}
          sessionReady={!!chat.sessionId}
          modelLabel={modelLabel}
          lastSaved={chat.lastSaved}
          onSend={(text) => void chat.send(text)}
          onStop={chat.stop}
          onUpload={chat.upload}
          onUploadTemplate={(file) => chat.uploadTemplate(file)}
          onRemoveTemplate={() => void chat.removeTemplate()}
          onRemoveMaterial={(name) => void chat.removeMaterial(name)}
          onAcceptChange={(key) => void chat.acceptChange(key)}
          onRejectChange={chat.rejectChange}
          onAcceptAll={() => void chat.acceptAll()}
          onSave={() => void chat.saveNow()}
          className="border-none"
        />
      </div>

      <span className="sr-only">{title}</span>
    </div>
  );
}
