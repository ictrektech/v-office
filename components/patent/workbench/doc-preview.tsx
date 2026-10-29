"use client";

/**
 * 左侧文档预览：点产出物任意一行打开，返回键回到案件页。
 *
 * 草稿产物读 markdown 直接排版；案件文件里 md/txt 预览、图片显示、
 * Word 这类格式可下载，也可推给 Collabora 在线打开。
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { useAppStore } from "@/store";
import { fetchAiFile } from "@/utils/ai/client";
import type { PreviewTarget } from "./config";

interface DocPreviewProps {
  target: PreviewTarget;
  sessionId: string | null;
  onBack: () => void;
  onDownload: (target: PreviewTarget) => void;
  loadArtifact: (key: string) => Promise<string>;
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
}: DocPreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState("");
  const officeFile = target.kind === "file" && OFFICE_EXT.test(target.path);
  const router = useRouter();
  const server = useAppStore((store) => store.server);

  /**
   * 在线打开：交给应用自己的编辑器页（`server.open(file)` + `/editor`）。
   *
   * 不自己拼编辑器地址：Collabora 在 VOS 里是网关注入前缀 `/app/<app-id>/cool/…`，
   * host/端口/前缀都随部署变；直接 `window.open` 一个会话地址等于把 URL 写死。
   * `/editor` 内部统一处理内核选择、推副本、首启浮层和保存，这里只负责交文件。
   * 文件名带上会话尾号，避免和用户「我的文档」里的同名文档互相覆盖。
   */
  const openInEditor = async () => {
    if (target.kind !== "file" || !sessionId) return;
    setOpening(true);
    setNotice("");
    try {
      const blob = await fetchAiFile(sessionId, target.path);
      const ext = target.path.match(/\.([a-z0-9]{2,5})$/i)?.[0] ?? ".docx";
      const name = `${target.name.replace(/\.[^.]+$/, "")}-${sessionId.slice(-6)}${ext}`;
      const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
      await server.open(file);
      router.push("/editor");
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
      <div className="sticky top-0 z-10 flex h-14 flex-none items-center gap-2 border-b border-[#EAEAEC] bg-white px-5">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex h-7 items-center gap-1 rounded-md px-2 text-[12.5px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <span className="h-[15px] w-px bg-[#EAEAEC]" />
        <span className="min-w-0 truncate text-[13px] font-semibold text-[#151517]">
          {target.name}
        </span>
        <span className="flex-none rounded bg-[#EAF6EF] px-1.5 py-0.5 text-[10.5px] text-[#3EA05C]">
          已生成
        </span>
        <div className="ml-auto flex items-center gap-1">
          {officeFile ? (
            <button
              type="button"
              disabled={opening}
              onClick={() => void openInEditor()}
              className="flex h-8 items-center gap-1.5 rounded-md border border-[#EAEAEC] px-2.5 text-[11.5px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517] disabled:opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {opening ? "打开中…" : "在线打开"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDownload(target)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#EAEAEC] px-2.5 text-[11.5px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
          >
            <Download className="h-3.5 w-3.5" />
            下载
          </button>
        </div>
      </div>

      {notice ? (
        <div className="flex-none border-b border-[#EAEAEC] bg-white px-5 py-2 text-[11.5px] text-[#8A8B91]">
          {notice}
        </div>
      ) : null}

      <div className="flex flex-1 justify-center px-6 py-8">
        <div className="w-[680px] max-w-full self-start rounded-[4px] border border-[#EAEAEC] bg-white px-14 py-12 shadow-[0_16px_40px_-32px_rgba(0,0,0,0.25)]">
          <h2 className="mb-7 text-center text-[19px] font-semibold leading-snug tracking-[-0.01em] text-[#151517]">
            {fileTitle(target.name)}
          </h2>
          <PreviewBody
            state={state}
            target={target}
            onDownload={onDownload}
            officeFile={officeFile}
            opening={opening}
            onOpen={() => void openInEditor()}
          />
        </div>
      </div>
    </div>
  );
}

function PreviewBody({
  state,
  target,
  onDownload,
  officeFile,
  opening,
  onOpen,
}: {
  state: PreviewState;
  target: PreviewTarget;
  onDownload: (target: PreviewTarget) => void;
  officeFile: boolean;
  opening: boolean;
  onOpen: () => void;
}) {
  if (state.status === "loading") {
    return <p className="py-16 text-center text-[12px] text-[#9A9BA1]">正在读取文件…</p>;
  }
  if (state.status === "error") {
    return <p className="py-16 text-center text-[12px] text-[#C0392B]">{state.message}</p>;
  }
  if (state.status === "unsupported") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <FileText className="h-5 w-5 text-[#9A9BA1]" />
        <p className="text-[12px] text-[#9A9BA1]">
          这种格式不便在网页预览，可以在线用 Collabora 打开，或下载后查看
        </p>
        {officeFile ? (
          <button
            type="button"
            disabled={opening}
            onClick={onOpen}
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#151517] px-3 text-[12px] font-medium text-white transition hover:bg-black disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {opening ? "打开中…" : "在线打开"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDownload(target)}
          className="flex h-8 items-center gap-1.5 rounded-md border border-[#EAEAEC] px-3 text-[12px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
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
          <li key={index} className="mb-1 text-[12.8px] leading-[1.9] text-[#3A3B40]">
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
      <p key={`p-${blocks.length}`} className="mb-3 text-[12.8px] leading-[1.95] text-[#3A3B40]">
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
