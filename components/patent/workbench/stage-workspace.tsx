"use client";

/**
 * 一个阶段的完整工作区：左案件页 / 文档预览，右 Agent 对话。
 *
 * 阶段切换由父级换 key 重挂本组件，所以这里的 useAiChat 只认一个技能包，
 * 不会出现「会话里换技能」这种不确定状态。
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { useAiChat } from "@/hooks/use-ai-chat";
import {
  aiFileObjectUrl,
  listAiFiles,
  type AiFile,
} from "@/utils/ai/client";
import {
  CHAT_DEFAULT_WIDTH,
  CHAT_MAX_WIDTH,
  CHAT_MIN_WIDTH,
  STAGES,
  baseName,
  fittedChatWidth,
  persistKeyFor,
  type OutputRow,
  type PreviewTarget,
  type StageKey,
} from "./config";
import { removeSlot, writeSlot, type SlotKey } from "./material-slots";
import { WorkbenchHeader } from "./workbench-header";
import { CaseOverview } from "./case-overview";
import { ChatPanel } from "./chat-panel";
import { DocPreview } from "./doc-preview";
import { KnowledgeDialog } from "./knowledge-dialog";

interface StageWorkspaceProps {
  mode: StageKey;
  /** 指定要恢复的会话；空串表示用本阶段上次那条 */
  caseId: string;
  onModeChange: (next: StageKey) => void;
  onPickCase: (sessionId: string) => void;
  onNewCase: () => void;
}

const DEFAULT_CHAT_WIDTH = CHAT_DEFAULT_WIDTH;

export function StageWorkspace({
  mode,
  caseId,
  onModeChange,
  onPickCase,
  onNewCase,
}: StageWorkspaceProps) {
  const config = STAGES[mode];
  const router = useRouter();
  const chat = useAiChat({
    skill: config.skill,
    title: config.sessionTitle,
    persistKey: persistKeyFor(mode),
    resumeFrom: caseId,
  });

  const [files, setFiles] = useState<AiFile[]>([]);
  const [width, setWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | null>(null);

  /* 大屏别让对话栏一直固定 408，首次进入按窗口比例给一个更均衡的宽度 */
  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(fittedChatWidth()));
    return () => cancelAnimationFrame(frame);
  }, []);

  const say = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2800);
  };

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!chat.sessionId) return;
    let alive = true;
    listAiFiles(chat.sessionId)
      .then((list) => alive && setFiles(list))
      .catch(() => alive && setFiles([]));
    return () => {
      alive = false;
    };
  }, [chat.sessionId, chat.artifacts.length, chat.streaming]);

  const rows = useMemo<OutputRow[]>(() => {
    const stage = config.label;
    const artifactRows: OutputRow[] = chat.artifacts.map((artifact) => ({
      id: `artifact:${artifact.key}`,
      name: artifact.title || artifact.key,
      stage,
      time: artifact.updated_at ?? null,
      kind: "artifact",
      artifactKey: artifact.key,
    }));
    const fileRows: OutputRow[] = files.map((file) => ({
      id: `file:${file.path}`,
      name: baseName(file.path),
      stage,
      time: file.mtime ?? null,
      kind: "file",
      path: file.path,
    }));
    return [...artifactRows, ...fileRows].sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
  }, [chat.artifacts, files, config.label]);

  const uploadToSlot = (slot: SlotKey, picked: FileList) => {
    const list = Array.from(picked);
    void (async () => {
      for (const file of list) {
        writeSlot(file.name, slot);
        try {
          await chat.upload(file);
        } catch (error) {
          removeSlot(file.name);
          say(error instanceof Error ? error.message : "上传失败");
        }
      }
    })();
  };

  const removeMaterial = (name: string) => {
    removeSlot(name);
    void chat.removeMaterial(name);
  };

  const downloadTarget = async (target: PreviewTarget) => {
    try {
      if (target.kind === "artifact") {
        const markdown = await chat.loadArtifact(target.key);
        const url = URL.createObjectURL(
          new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${target.name.replace(/\.md$/i, "")}.md`;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }
      if (!chat.sessionId) return;
      const url = await aiFileObjectUrl(chat.sessionId, target.path);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = baseName(target.path);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      say(error instanceof Error ? error.message : "下载失败");
    }
  };

  const save = async () => {
    try {
      await chat.saveNow();
      say("已保存到我的文档");
    } catch (error) {
      say(error instanceof Error ? error.message : "保存失败");
    }
  };

  const exportDocx = async () => {
    try {
      const name = await chat.exportDocx(false);
      say(`已导出 ${name}`);
    } catch (error) {
      say(error instanceof Error ? error.message : "导出失败");
    }
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    document.body.style.userSelect = "none";
    const move = (moveEvent: globalThis.PointerEvent) => {
      const next = startWidth - (moveEvent.clientX - startX);
      setWidth(Math.min(CHAT_MAX_WIDTH, Math.max(CHAT_MIN_WIDTH, next)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white">
      <WorkbenchHeader
        title={chat.draft?.title || config.sessionTitle}
        skill={config.skill}
        currentSessionId={chat.sessionId}
        onBack={() => {
          if (window.history.length > 1) router.back();
          else router.push("/");
        }}
        onPickCase={onPickCase}
        onNewCase={onNewCase}
        onSave={() => void save()}
        onExport={() => void exportDocx()}
        onHistory={() => router.push("/patent/history")}
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto custom-scrollbar">
          {preview ? (
            <DocPreview
              key={
                preview.kind === "artifact"
                  ? `artifact:${preview.key}`
                  : `file:${preview.path}`
              }
              target={preview}
              sessionId={chat.sessionId}
              onBack={() => setPreview(null)}
              onDownload={(target) => void downloadTarget(target)}
              loadArtifact={chat.loadArtifact}
            />
          ) : (
            <CaseOverview
              config={config}
              title={chat.draft?.title || config.sessionTitle}
              meta={
                chat.sessionId
                  ? `本地会话 ${chat.sessionId.slice(0, 8)}`
                  : "正在创建会话"
              }
              materials={chat.materials}
              rows={rows}
              onModeChange={onModeChange}
              onUpload={uploadToSlot}
              onRemoveMaterial={removeMaterial}
              onOpenKnowledge={() => setKnowledgeOpen(true)}
              onOpenPreview={setPreview}
              onDownload={(row) =>
                void downloadTarget(
                  row.kind === "artifact"
                    ? { kind: "artifact", key: row.artifactKey ?? "", name: row.name }
                    : { kind: "file", path: row.path ?? "", name: row.name },
                )
              }
            />
          )}
        </div>

        <div
          onPointerDown={startDrag}
          title="拖动调整对话宽度"
          className="group relative w-2 flex-none cursor-col-resize"
        >
          <span className="absolute inset-y-0 left-[3px] w-px bg-transparent transition group-hover:bg-[#CFCFD4]" />
        </div>

        <div className="flex-none" style={{ width }}>
          <ChatPanel
            chat={chat}
            modelLabel={
              chat.health?.pi.version ? `pi ${chat.health.pi.version}` : "pi"
            }
            onToggleWidth={() =>
              setWidth((current) =>
                current > (CHAT_MIN_WIDTH + CHAT_MAX_WIDTH) / 2
                  ? DEFAULT_CHAT_WIDTH
                  : 700,
              )
            }
          />
        </div>
      </div>

      <KnowledgeDialog
        open={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        onImport={async (file) => {
          await chat.upload(file);
        }}
      />

      {notice ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-[#EAEAEC] bg-white px-3.5 py-2 text-[11.5px] text-[#3A3B40] shadow-[0_12px_28px_-12px_rgba(20,20,22,0.22)]">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
