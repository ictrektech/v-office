"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Download,
  FolderOpen,
  HardDrive,
  Loader2,
} from "lucide-react";
import { DocumentIcon } from "@/components/document-icon";
import { formatFileSize, formatRelativeTime } from "@/utils/recent-files";
import {
  browseSharedSource,
  openSharedDocument,
  type SharedEntry,
  type SharedListing,
  type SharedSource,
  type SharedTarget,
} from "@/utils/vos/storage";

interface SharedSourceBrowserProps {
  language: string;
  source: SharedSource;
  /** 打开选中文档：由调用方交给编辑器，target 为保存落点（写回原文件） */
  onOpen: (file: File, target: SharedTarget) => void | Promise<void>;
}

/**
 * 共享文档源的列表视图，嵌在首页「我的文档」区块内。
 *
 * 与私有文档列表同一套视觉与交互：单击目录逐层进入，单击文档直接打开；
 * 保存由编辑器写回共享盘上的原文件（源可写时）。
 */
export function SharedSourceBrowser({
  language,
  source,
  onOpen,
}: SharedSourceBrowserProps) {
  const zh = language.toLowerCase().startsWith("zh");
  const [listing, setListing] = useState<SharedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const browse = useCallback(
    async (path: string) => {
      setLoading(true);
      setError("");
      try {
        setListing(await browseSharedSource(source.id, path));
      } catch (browseError) {
        console.error("Failed to browse shared source:", browseError);
        setListing(null);
        setError(
          zh
            ? "无法读取该目录，请检查挂载与权限。"
            : "Cannot read this directory. Check the mount and permissions.",
        );
      } finally {
        setLoading(false);
      }
    },
    [source.id, zh],
  );

  useEffect(() => {
    void browse("");
  }, [browse]);

  const crumbs = useMemo(() => {
    const current = listing?.path;
    if (!current) return [];
    let acc = "";
    return current
      .split("/")
      .filter(Boolean)
      .map((part) => {
        acc = acc ? `${acc}/${part}` : part;
        return { name: part, path: acc };
      });
  }, [listing]);

  const handleOpen = async (entry: SharedEntry) => {
    if (busyPath) return;
    setBusyPath(entry.path);
    setError("");
    try {
      const file = await openSharedDocument(source.id, entry.path);
      await onOpen(file, { source: source.id, path: entry.path });
    } catch (openError) {
      console.error("Failed to open shared document:", openError);
      setError(zh ? "打开文档失败。" : "Failed to open the document.");
    } finally {
      setBusyPath(null);
    }
  };

  const handleDownload = async (
    event: React.MouseEvent,
    entry: SharedEntry,
  ) => {
    event.stopPropagation();
    if (busyPath) return;
    setBusyPath(entry.path);
    setError("");
    try {
      const file = await openSharedDocument(source.id, entry.path);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (downloadError) {
      console.error("Failed to download shared document:", downloadError);
      setError(zh ? "下载失败。" : "Download failed.");
    } finally {
      setBusyPath(null);
    }
  };

  const isRoot = !listing?.path;

  return (
    <div>
      {/* 面包屑：定位当前目录，可点任意一级回退 */}
      {!isRoot && (
        <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-text-secondary">
          <button
            type="button"
            disabled={loading}
            onClick={() => void browse("")}
            className="rounded px-1.5 py-1 font-medium transition-colors hover:bg-muted disabled:opacity-40"
          >
            {source.kind === "nas" ? "NAS" : zh ? "共享目录" : "Shared"}
          </button>
          {crumbs.map((crumb, index) => (
            <span key={crumb.path} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 opacity-60" />
              {index === crumbs.length - 1 ? (
                <span className="max-w-[16rem] truncate font-medium text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void browse(crumb.path)}
                  className="max-w-[16rem] truncate rounded px-1.5 py-1 transition-colors hover:bg-muted"
                >
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

      {loading ? (
        <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
          <div className="text-center text-text-secondary">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm">
              {zh ? "正在加载共享目录…" : "Loading shared folder…"}
            </p>
          </div>
        </div>
      ) : !listing || listing.entries.length === 0 ? (
        <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
          <div className="text-center text-text-secondary">
            <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1">
              {zh ? "该目录下没有可打开的文档" : "No openable documents here"}
            </p>
            <p className="text-xs">
              {zh
                ? "只显示 Word / Excel / PPT / PDF；返回上级目录可继续浏览"
                : "Only Word / Excel / PPT / PDF files are listed; go up to browse further"}
            </p>
          </div>
        </div>
      ) : (
        <div className="">
          {listing.entries.map((entry) => (
            <div
              key={entry.path}
              onClick={() =>
                entry.isDir ? void browse(entry.path) : void handleOpen(entry)
              }
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-sidebar-hover border-b border-border last:border-0 transition-colors group cursor-pointer"
              title={
                entry.isDir
                  ? zh
                    ? "进入该文件夹"
                    : "Open this folder"
                  : zh
                    ? "点击打开并编辑原文档"
                    : "Click to open and edit the original"
              }
            >
              <div className="flex min-w-0 items-center gap-4">
                {entry.isDir ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <DocumentIcon
                    type={entry.name.split(".").pop()?.toLowerCase() || ""}
                    size="sm"
                  />
                )}
                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold text-sm">
                    {entry.name}
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    {entry.isDir
                      ? zh
                        ? "文件夹"
                        : "Folder"
                      : `${formatFileSize(entry.size)} · ${formatRelativeTime(
                          entry.modified * 1000,
                        )}`}
                  </p>
                </div>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-2">
                {!entry.isDir ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors group-hover:bg-primary/15">
                      {busyPath === entry.path ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FolderOpen className="h-4 w-4" />
                      )}
                      {zh ? "打开" : "Open"}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => handleDownload(event, entry)}
                      disabled={busyPath !== null}
                      title={zh ? "下载原文件" : "Download original"}
                      className="rounded-lg bg-muted p-2 text-foreground transition-colors hover:bg-sidebar-hover disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-secondary" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {listing?.truncated && (
        <p className="mt-2 text-[10px] text-text-secondary">
          {zh
            ? "目录内容过多，仅显示前一部分，请进入更具体的子目录。"
            : "This folder has too many entries; only the first part is shown. Open a narrower subfolder."}
        </p>
      )}
    </div>
  );
}

export default SharedSourceBrowser;
