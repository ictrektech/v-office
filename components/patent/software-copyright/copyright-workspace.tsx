"use client";

/**
 * 软著工作区：一条会话贯穿 8 个阶段。
 *
 * 这里只做三件事：
 * 1. 开始在会话里放入申请信息与材料，跑第 0 步；
 * 2. 按「当前未完成的第一步」把指令发给 agent；
 * 3. 把会话产物、预览、对话宽度交给页面组件。
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { useAiChat, readPersistedSession } from "@/hooks/use-ai-chat";
import {
  aiFileObjectUrl,
  getAiProject,
  listAiFiles,
  type AiFile,
  type AiProject,
} from "@/utils/ai/client";
import {
  CHAT_DEFAULT_WIDTH,
  CHAT_MAX_WIDTH,
  CHAT_MIN_WIDTH,
  baseName,
  fittedChatWidth,
  type OutputRow,
  type PreviewTarget,
} from "../workbench/config";
import { WorkbenchHeader } from "../workbench/workbench-header";
import { ChatPanel } from "../workbench/chat-panel";
import { DocPreview } from "../workbench/doc-preview";
import { KnowledgeDialog } from "../workbench/knowledge-dialog";
import { CopyrightOverview, type SlotFile } from "./copyright-overview";
import {
  COPYRIGHT_SLOTS,
  inferCopyrightSlot,
  readCopyrightSlots,
  removeCopyrightSlot,
  writeCopyrightSlot,
  type CopyrightSlot,
} from "./materials";
import {
  COPYRIGHT_PERSIST_KEY,
  PROMPTS,
  SHOT_PROMPTS,
  nextStep,
  readSoftwareInfo,
  readStepMarks,
  stageOf,
  writeSoftwareInfo,
  writeStepMark,
  type SoftwareInfo,
  type StepKey,
  type StepMark,
} from "./steps";

interface CopyrightWorkspaceProps {
  /** 指定要恢复的会话；空串表示新建 */
  caseId: string;
  onPickCase: (sessionId: string) => void;
  onNewCase: () => void;
}

const INFO_FILE = "软著申请信息.md";
const EMPTY_INFO: SoftwareInfo = {
  name: "",
  version: "V1.0",
  owner: "",
  finishDate: "",
  devEnv: "",
  runEnv: "",
};

function emptyDrafts(): Record<CopyrightSlot, File[]> {
  return { source: [], requirements: [], screens: [], other: [] };
}

export function CopyrightWorkspace({
  caseId,
  onPickCase,
  onNewCase,
}: CopyrightWorkspaceProps) {
  const router = useRouter();
  const [restoring, setRestoring] = useState(!caseId);
  const [started, setStarted] = useState(Boolean(caseId));
  const [info, setInfo] = useState<SoftwareInfo>(EMPTY_INFO);
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [project, setProject] = useState<AiProject | null>(null);
  const [marks, setMarks] = useState<Partial<Record<StepKey, StepMark>>>({});
  const [files, setFiles] = useState<AiFile[]>([]);
  const [busy, setBusy] = useState<StepKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [width, setWidth] = useState(CHAT_DEFAULT_WIDTH);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | null>(null);
  const bootRequested = useRef(false);
  const booted = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(fittedChatWidth()));
    return () => cancelAnimationFrame(frame);
  }, []);

  const title = info.name.trim()
    ? [info.name.trim(), info.version.trim()].filter(Boolean).join(" ")
    : "软件著作权申请";

  const chat = useAiChat({
    skill: "software-copyright",
    title,
    paused: !started,
    resumeFrom: caseId,
    persistKey: COPYRIGHT_PERSIST_KEY,
  });

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

  /* 刷新后没有 ?case 时，认领上次那条会话 */
  useEffect(() => {
    if (caseId) return;
    if (readPersistedSession(COPYRIGHT_PERSIST_KEY)) setStarted(true);
    setRestoring(false);
  }, [caseId]);

  /* 会话就绪后恢复申请信息、项目概况与本地进度 */
  useEffect(() => {
    const sid = chat.sessionId;
    if (!sid) return;
    setMarks(readStepMarks(sid));
    const saved = readSoftwareInfo(sid);
    if (saved) setInfo(saved);
    getAiProject(sid)
      .then((value) => setProject(value))
      .catch(() => setProject(null));
  }, [chat.sessionId]);

  /* 产物清单 */
  useEffect(() => {
    if (!chat.sessionId) return;
    let alive = true;
    listAiFiles(chat.sessionId)
      .then((list) => {
        if (alive) setFiles(list.filter((file) => !file.path.startsWith("materials/")));
      })
      .catch(() => alive && setFiles([]));
    return () => {
      alive = false;
    };
  }, [chat.sessionId, chat.artifacts.length, chat.streaming]);

  const mark = (key: StepKey) => {
    if (!chat.sessionId) return;
    writeStepMark(chat.sessionId, key);
    setMarks((current) => ({
      ...current,
      [key]: { done: true, at: Date.now() },
    }));
  };

  const run = async (key: StepKey, prompt: string) => {
    if (!chat.sessionId || busy) return;
    if (chat.streaming) {
      setError("助手还在回复，等本轮结束再执行下一步");
      return;
    }
    setBusy(key);
    setError(null);
    try {
      const ok = await chat.send(prompt);
      if (!ok) throw new Error("本轮没有完成，进度未推进，可重试当前步骤");
      mark(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  /* 点击开始：先建会话，再由下面的 effect 上传材料并跑第 0 步 */
  const start = () => {
    if (!info.name.trim()) return;
    setError(null);
    bootRequested.current = true;
    setStarted(true);
  };

  useEffect(() => {
    if (!started || !chat.sessionId || !bootRequested.current || booted.current) return;
    booted.current = true;
    const sid = chat.sessionId;
    void (async () => {
      setBusy("analyze");
      setError(null);
      try {
        writeSoftwareInfo(sid, info);
        await chat.upload(
          new File([`# 软著申请基本信息\n\n${brief(info)}\n`], INFO_FILE, {
            type: "text/markdown",
          }),
        );

        const source = drafts.source[0];
        if (source) {
          writeCopyrightSlot(source.name, "source");
          const uploaded = await chat.upload(source);
          if (uploaded.project) setProject(uploaded.project);
        }

        for (const slot of COPYRIGHT_SLOTS) {
          if (slot.key === "source") continue;
          for (const file of drafts[slot.key]) {
            writeCopyrightSlot(file.name, slot.key);
            await chat.upload(file);
          }
        }
        setDrafts(emptyDrafts());

        const ok = await chat.send(PROMPTS.analyze);
        if (!ok) throw new Error("第 0 步没有完成，进度未推进，可重试");
        writeStepMark(sid, "analyze");
        setMarks((current) => ({
          ...current,
          analyze: { done: true, at: Date.now() },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    })();
  }, [started, chat, info, drafts]);

  const addFiles = (slot: CopyrightSlot, picked: FileList) => {
    const list = Array.from(picked);
    if (!started) {
      setDrafts((current) =>
        slot === "source"
          ? { ...current, source: list.slice(0, 1) }
          : { ...current, [slot]: [...current[slot], ...list] },
      );
      return;
    }
    void (async () => {
      try {
        for (const file of list) {
          writeCopyrightSlot(file.name, slot);
          const uploaded = await chat.upload(file);
          if (slot === "source" && uploaded.project) setProject(uploaded.project);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  };

  const removeFile = (slot: CopyrightSlot, name: string) => {
    if (!started) {
      setDrafts((current) => ({
        ...current,
        [slot]: current[slot].filter((file) => file.name !== name),
      }));
      return;
    }
    removeCopyrightSlot(name);
    void chat.removeMaterial(name);
  };

  const uploadShots = async (picked: FileList) => {
    if (!chat.sessionId || busy) return;
    if (chat.streaming) {
      setError("助手还在回复，等本轮结束再上传截图");
      return;
    }
    setBusy("shots");
    setError(null);
    try {
      for (const file of Array.from(picked)) {
        writeCopyrightSlot(file.name, "screens");
        await chat.upload(file);
      }
      const ok = await chat.send(SHOT_PROMPTS.upload);
      if (!ok) throw new Error("截图整理没有完成，进度未推进，可重试");
      mark("shots");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const materialsBySlot = useMemo(() => {
    const result = { source: [], requirements: [], screens: [], other: [] } as Record<
      CopyrightSlot,
      SlotFile[]
    >;
    if (!started) {
      for (const slot of COPYRIGHT_SLOTS) {
        result[slot.key] = drafts[slot.key].map((file) => ({
          name: file.name,
          size: file.size,
        }));
      }
      return result;
    }
    const slotMap = readCopyrightSlots();
    for (const material of chat.materials) {
      if (material.name === INFO_FILE) continue;
      const slot = slotMap[material.name] ?? inferCopyrightSlot(material.name);
      result[slot].push({ name: material.name, size: material.size });
    }
    return result;
  }, [started, drafts, chat.materials]);

  const rows = useMemo<OutputRow[]>(() => {
    const artifacts: OutputRow[] = chat.artifacts.map((artifact) => ({
      id: `artifact:${artifact.key}`,
      name: artifact.title || artifact.key,
      stage: stageOf(artifact.title || artifact.key),
      time: artifact.updated_at ?? null,
      kind: "artifact",
      artifactKey: artifact.key,
    }));
    const outputs: OutputRow[] = files.map((file) => ({
      id: `file:${file.path}`,
      name: baseName(file.path),
      stage: stageOf(file.path),
      time: file.mtime ?? null,
      kind: "file",
      path: file.path,
    }));
    return [...artifacts, ...outputs].sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
  }, [chat.artifacts, files]);

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
    } catch (err) {
      say(err instanceof Error ? err.message : "下载失败");
    }
  };

  const save = async () => {
    if (!started) {
      say("先填写信息并开始办理");
      return;
    }
    try {
      await chat.saveNow();
      say("已保存到我的文档");
    } catch (err) {
      say(err instanceof Error ? err.message : "保存失败");
    }
  };

  const exportDocx = async () => {
    if (!started) {
      say("先填写信息并开始办理");
      return;
    }
    try {
      const name = await chat.exportDocx(false);
      say(`已导出 ${name}`);
    } catch (err) {
      say(err instanceof Error ? err.message : "导出失败");
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

  if (restoring) return <div className="h-full bg-white" />;

  const current = started ? nextStep(marks) : null;
  const shotsReady = materialsBySlot.screens.length > 0;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white">
      <WorkbenchHeader
        title={chat.draft?.title || title}
        skill="software-copyright"
        brandLabel="软著工作台"
        brandMark={<span className="text-[11px] font-semibold">C</span>}
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
            <CopyrightOverview
              started={started}
              info={info}
              onInfoChange={(patch) => setInfo((currentInfo) => ({ ...currentInfo, ...patch }))}
              meta={
                !started
                  ? "填写信息后开始办理"
                  : chat.sessionId
                    ? `会话 ${chat.sessionId.slice(0, 6)}`
                    : chat.blocked ?? "正在创建会话"
              }
              project={project}
              materialsBySlot={materialsBySlot}
              shotsReady={shotsReady}
              marks={marks}
              current={current}
              busy={busy}
              ready={Boolean(chat.sessionId)}
              uploadHint={
                chat.sessionId
                  ? "已送入会话目录"
                  : started
                    ? "等待会话连接"
                    : "开始办理时一并上传"
              }
              rows={rows}
              error={error}
              canStart={Boolean(info.name.trim())}
              onStart={start}
              onRun={(key) =>
                void run(
                  key,
                  key === "shots" ? SHOT_PROMPTS.upload : PROMPTS[key],
                )
              }
              onSkipShots={() => void run("shots", SHOT_PROMPTS.skip)}
              onUploadShots={(files) => void uploadShots(files)}
              onUpload={addFiles}
              onRemove={removeFile}
              onOpenPreview={setPreview}
              onDownload={(row) =>
                void downloadTarget(
                  row.kind === "artifact"
                    ? { kind: "artifact", key: row.artifactKey ?? "", name: row.name }
                    : { kind: "file", path: row.path ?? "", name: row.name },
                )
              }
              onOpenKnowledge={() => setKnowledgeOpen(true)}
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
            modelLabel={chat.health?.pi.version ? `pi ${chat.health.pi.version}` : "pi"}
            onToggleWidth={() =>
              setWidth((value) =>
                value > (CHAT_MIN_WIDTH + CHAT_MAX_WIDTH) / 2
                  ? CHAT_DEFAULT_WIDTH
                  : 700,
              )
            }
            disabled={!started}
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

function brief(info: SoftwareInfo): string {
  return [
    `- 软件全称：${info.name.trim()}`,
    `- 版本号：${info.version.trim() || "V1.0"}`,
    `- 著作权人：${info.owner.trim() || "（待确认）"}`,
    `- 开发完成日期：${info.finishDate.trim() || "（待确认）"}`,
    `- 开发环境：${info.devEnv.trim() || "（待确认）"}`,
    `- 运行环境：${info.runEnv.trim() || "（待确认）"}`,
  ].join("\n");
}
