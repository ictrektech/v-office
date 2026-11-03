"use client";

/**
 * 左侧文档预览：点产出物任意一行打开，返回键回到案件页。
 *
 * 草稿产物读 markdown 直接排版；案件文件里 md/txt 预览、图片显示、
 * Word 这类格式可下载，也可推给 Collabora 在线打开。
 *
 * 「在线打开」对**产物**同样可用：产物本身是 markdown，但打开时会先由
 * 服务端转成 docx 再交给编辑器。之前这里只判 Office 扩展名，技能产出的
 * 四件套全是 artifact，按钮于是永远不出现。
 */

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Download, ExternalLink, FileText, Loader2, PenLine, X } from "lucide-react";
import { fetchAiFile, saveAiFile, sha256Hex } from "@/utils/ai/client";
import { canOpenOnline, type PreviewTarget } from "./config";

interface DocPreviewProps {
  target: PreviewTarget;
  sessionId: string | null;
  onBack: () => void;
  onDownload: (target: PreviewTarget) => void;
  loadArtifact: (key: string) => Promise<string>;
  /** 交给编辑器内核打开；失败由上层统一提示，这里只管 loading */
  onOpenOnline: (target: PreviewTarget) => Promise<void>;
  /** md 源保存成功后通知上层刷新文件列表（「草稿已更新」提示随之亮起） */
  onFileSaved?: () => void;
}

type PreviewState =
  | { status: "loading" }
  | { status: "text"; content: string }
  | { status: "image"; url: string }
  | { status: "unsupported" }
  | { status: "error"; message: string };

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
const TEXT_EXT = /\.(md|markdown|txt|csv|json|ya?ml)$/i;
const OFFICE_EXT = /\.(docx?|xlsx|pptx)$/i;

export function DocPreview({
  target,
  sessionId,
  onBack,
  onDownload,
  loadArtifact,
  onOpenOnline,
  onFileSaved,
}: DocPreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState("");
  /* md/txt 源可以直接在网页上改：保存走 base_sha256 乐观锁，被助手改过就拒 */
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const onlineOpenable = canOpenOnline(target);
  const editable =
    target.kind === "file" && /\.(md|txt)$/i.test(target.path) && state.status === "text";

  const startEdit = () => {
    if (state.status !== "text") return;
    setDraft(state.content);
    setNotice("");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (state.status !== "text" || !sessionId || target.kind !== "file") return;
    setSaving(true);
    setNotice("");
    try {
      const baseSha = await sha256Hex(state.content);
      await saveAiFile(sessionId, target.path, draft, baseSha);
      setState({ status: "text", content: draft });
      setEditing(false);
      setNotice("已保存。回到案件页点「重新生成 Word」就能出新文档。");
      onFileSaved?.();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const openOnline = async () => {
    setOpening(true);
    setNotice("");
    try {
      await onOpenOnline(target);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "在线打开失败");
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    let alive = true;
    let objectUrl = "";

    const load = async () => {
      if (target.kind === "artifact") {
        const content = await loadArtifact(target.key);
        if (alive) setState({ status: "text", content });
        return;
      }
      if (IMAGE_EXT.test(target.path)) {
        objectUrl = URL.createObjectURL(await fetchAiFile(sessionId ?? "", target.path));
        if (alive) setState({ status: "image", url: objectUrl });
        return;
      }
      if (TEXT_EXT.test(target.path)) {
        const blob = await fetchAiFile(sessionId ?? "", target.path);
        if (alive) setState({ status: "text", content: await blob.text() });
        return;
      }
      if (OFFICE_EXT.test(target.path)) {
        // Word 用同名 Markdown 预览，正文照样能看到
        const mdPath = target.path.replace(/\.[^.]+$/, ".md");
        try {
          const blob = await fetchAiFile(sessionId ?? "", mdPath);
          if (alive) setState({ status: "text", content: await blob.text() });
        } catch {
          if (alive) setState({ status: "unsupported" });
        }
        return;
      }
      if (alive) setState({ status: "unsupported" });
    };

    load().catch((error: unknown) => {
      if (alive) {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "预览失败",
        });
      }
    });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [target, sessionId, loadArtifact]);

  return (
    <div className="flex min-h-full flex-col bg-[#F7F7F8]">
      <div className="sticky top-0 z-10 flex h-[60px] flex-none items-center gap-2 border-b border-[#ECECEF] bg-white px-5">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] text-[#3C3C43] transition hover:bg-[#F2F2F4] hover:text-[#111113]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <span className="h-4 w-px bg-[#ECECEF]" />
        <span className="min-w-0 truncate text-[13.5px] font-semibold text-[#111113]">
          {target.name}
        </span>
        <span className="flex-none rounded-full bg-[#EAF6EF] px-2 py-0.5 text-[11px] text-[#2E8B4F]">
          已生成
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {editable && !editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="flex h-8 items-center gap-1.5 rounded-full bg-[#111113] px-3.5 text-[12px] font-medium text-white transition hover:bg-black"
            >
              <PenLine className="h-3.5 w-3.5" />
              编辑
            </button>
          ) : null}
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex h-8 items-center gap-1.5 rounded-full border border-[#E7E7EA] px-3.5 text-[12px] text-[#3C3C43] transition hover:border-[#D6D6DA] hover:bg-[#F5F5F7] disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                取消
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEdit()}
                className="flex h-8 items-center gap-1.5 rounded-full bg-[#111113] px-3.5 text-[12px] font-medium text-white transition hover:bg-black disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {saving ? "保存中…" : "保存"}
              </button>
            </>
          ) : null}
          {onlineOpenable && !editing ? (
            <button
              type="button"
              disabled={opening}
              onClick={() => void openOnline()}
              className="flex h-8 items-center gap-1.5 rounded-full bg-[#111113] px-3.5 text-[12px] font-medium text-white transition hover:bg-black disabled:opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {opening ? "打开中…" : "在线打开"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDownload(target)}
            className="flex h-8 items-center gap-1.5 rounded-full border border-[#E7E7EA] px-3.5 text-[12px] text-[#3C3C43] transition hover:border-[#D6D6DA] hover:bg-[#F5F5F7]"
          >
            <Download className="h-3.5 w-3.5" />
            下载
          </button>
        </div>
      </div>

      {notice ? (
        <div className="flex-none border-b border-[#ECECEF] bg-white px-5 py-2 text-[12px] text-[#8E8E93]">
          {notice}
        </div>
      ) : null}

      <div className="flex flex-1 justify-center px-6 py-10">
        {editing ? (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            className="h-[calc(100dvh-160px)] w-full max-w-[900px] resize-y rounded-2xl border border-[#ECECEF] bg-white p-6 font-mono text-[13px] leading-[1.8] text-[#1C1C1E] shadow-[0_24px_60px_-40px_rgba(0,0,0,0.3)] outline-none focus:border-[#C9C9CF]"
          />
        ) : (
          <div className="w-[720px] max-w-full self-start rounded-2xl border border-[#ECECEF] bg-white px-14 py-12 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.3)]">
            <h2 className="mb-8 text-center text-[21px] font-semibold leading-snug tracking-[-0.015em] text-[#111113]">
              {fileTitle(target.name)}
            </h2>
            <PreviewBody
              state={state}
              target={target}
              onDownload={onDownload}
              onlineOpenable={onlineOpenable}
              opening={opening}
              onOpen={() => void openOnline()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewBody({
  state,
  target,
  onDownload,
  onlineOpenable,
  opening,
  onOpen,
}: {
  state: PreviewState;
  target: PreviewTarget;
  onDownload: (target: PreviewTarget) => void;
  onlineOpenable: boolean;
  opening: boolean;
  onOpen: () => void;
}) {
  if (state.status === "loading") {
    return <p className="py-16 text-center text-[13px] text-[#A1A1A6]">正在读取文件…</p>;
  }
  if (state.status === "error") {
    return <p className="py-16 text-center text-[13px] text-[#C0392B]">{state.message}</p>;
  }
  if (state.status === "unsupported") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <FileText className="h-5 w-5 text-[#A1A1A6]" />
        <p className="max-w-[320px] text-[13px] leading-relaxed text-[#8E8E93]">
          这种格式不便在网页预览，可以在线用 Collabora 打开，或下载后查看
        </p>
        {onlineOpenable ? (
          <button
            type="button"
            disabled={opening}
            onClick={onOpen}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#111113] px-4 text-[12.5px] font-medium text-white transition hover:bg-black disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {opening ? "打开中…" : "在线打开"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDownload(target)}
          className="flex h-9 items-center gap-1.5 rounded-full border border-[#E7E7EA] px-4 text-[12.5px] text-[#3C3C43] transition hover:border-[#D6D6DA] hover:bg-[#F5F5F7]"
        >
          <Download className="h-3.5 w-3.5" />
          下载文件
        </button>
      </div>
    );
  }
  if (state.status === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={state.url} alt="文档预览" className="mx-auto max-h-[640px] w-auto" />
    );
  }
  return <MarkdownView markdown={state.content} />;
}

function fileTitle(name: string): string {
  return name.replace(/\.(docx?|md|txt|pdf|svg|png|jpe?g)$/i, "");
}

/** 极简 Markdown：标题、列表、段落、加粗；够预览用，避免引入渲染库 */
function MarkdownView({ markdown }: { markdown: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let paragraph: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="mb-3 list-disc pl-5">
        {list.map((item, index) => (
          <li key={index} className="mb-1.5 text-[13.5px] leading-[1.9] text-[#3C3C43]">
            {inline(item)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className="mb-3 text-[13.5px] leading-[1.95] text-[#3C3C43]">
        {inline(paragraph.join(" "))}
      </p>,
    );
    paragraph = [];
  };

  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      flushParagraph();
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      flushList();
      flushParagraph();
      const level = (line.match(/^#+/)?.[0].length ?? 1);
      blocks.push(
        <h3
          key={`h-${blocks.length}`}
          className={
            level <= 2
              ? "mb-2 mt-6 text-[14px] font-semibold text-[#151517]"
              : "mb-1.5 mt-4 text-[13px] font-semibold text-[#151517]"
          }
        >
          {inline(line.replace(/^#+\s*/, ""))}
        </h3>,
      );
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^[-*]\s*/, ""));
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^\d+\.\s*/, ""));
      continue;
    }
    paragraph.push(line);
  }
  flushList();
  flushParagraph();

  return <div>{blocks}</div>;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[#151517]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
