"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  FolderOpen,
  History,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { formatFileSize, formatRelativeTime } from "@/utils/recent-files";
import {
  exportSourceHistory,
  listSourceHistory,
  restoreSourceHistory,
  type SharedFileVersion,
} from "@/utils/vos/storage";

interface SourceHistoryDialogProps {
  language: string;
  /** 共享源 id（NAS 之类的授权目录） */
  source: string;
  /** 源内相对路径 */
  path: string;
  /** 文件名，仅用于标题展示 */
  name: string;
  /** 回退成功后通知外层刷新列表（时间、大小都变了） */
  onRestored: () => void;
  /**
   * 打开某一版看内容。由外层负责取字节并交给编辑器（它才知道怎么开文件）：
   * 打开的是"本地文件"语义，保存只会另存或下载，不会写回共享盘。
   */
  onOpen: (version: SharedFileVersion) => Promise<void> | void;
  /** 某一版被存进「我的文档」之后：让外层把那份列表也刷新一下 */
  onSavedToMine?: () => void;
  onClose: () => void;
}

/** 绝对时间：一眼能对上"什么时候"的版本，比"5 分钟前"更好认。 */
function formatStamp(seconds: number): string {
  const at = new Date(seconds * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ` +
    `${pad(at.getHours())}:${pad(at.getMinutes())}`
  );
}

/**
 * 「版本」对话框：这份文件被覆盖时留下的旧版本。
 *
 * 每一版给两条出路：**回退**（把公共盘上的文件换成这一版）和**保存到我的文档**
 * （先把旧版本取回自己名下，不动公共盘）。留底与回退都是服务端做的，前端不碰目录结构。
 * 回退本身也会先给"当前版本"留底，所以回退错了还能再回退回来。
 */
export default function SourceHistoryDialog({
  language,
  source,
  path,
  name,
  onRestored,
  onOpen,
  onSavedToMine,
  onClose,
}: SourceHistoryDialogProps) {
  const zh = language.toLowerCase().startsWith("zh");
  const [versions, setVersions] = useState<SharedFileVersion[] | null>(null);
  const [keep, setKeep] = useState(0);
  const [writable, setWritable] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<{
    id: string;
    what: "restore" | "export" | "open";
  } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const data = await listSourceHistory(source, path);
      setVersions(data.versions);
      setKeep(data.keep);
      setWritable(data.writable);
    } catch (caught) {
      console.error("[history] unable to read versions", caught);
      setVersions([]);
      setLoadFailed(true);
    }
  }, [source, path]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (id: string) => {
    setBusy({ id, what: "restore" });
    setError("");
    try {
      await restoreSourceHistory(source, path, id);
      setConfirmId(null);
      // 回退后列表里会多出"被回退掉的那一版"，重新拉一遍才看得见
      await load();
      onRestored();
      toast.success(
        zh ? `已回退「${name}」到这一版` : `Restored an earlier version of “${name}”`,
      );
    } catch (caught) {
      console.error("[history] restore failed", caught);
      setError(
        (caught as Error)?.message === "READ_ONLY"
          ? zh
            ? "这个目录是只读的，无法回退。"
            : "This folder is read-only; it cannot be restored."
          : zh
            ? "回退失败，请稍后重试。"
            : "Restore failed. Try again in a moment.",
      );
    } finally {
      setBusy(null);
    }
  };

  const open = async (version: SharedFileVersion) => {
    setBusy({ id: version.id, what: "open" });
    setError("");
    try {
      await onOpen(version);
    } catch (caught) {
      console.error("[history] open failed", caught);
      setError(
        zh
          ? "打开这一版失败，请稍后重试。"
          : "Could not open this version. Try again in a moment.",
      );
    } finally {
      setBusy(null);
    }
  };

  const saveToMine = async (id: string) => {
    setBusy({ id, what: "export" });
    setError("");
    try {
      const saved = await exportSourceHistory(source, path, id);
      // 「我的文档」那份列表是挂载时加载的：不通知外层刷新，用户切过去会看不到
      // 刚存下来的文件，以为没成功。
      onSavedToMine?.();
      toast.success(
        zh
          ? `已保存到「我的文档」：${saved.name}`
          : `Saved to My Documents: ${saved.name}`,
      );
    } catch (caught) {
      console.error("[history] export failed", caught);
      setError(
        zh
          ? "保存到「我的文档」失败，请稍后重试。"
          : "Could not save it to My Documents. Try again in a moment.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-[620px] max-w-[94vw] rounded-2xl bg-popover p-7 shadow-2xl ring-1 ring-foreground/10">
        <div className="flex items-start gap-3">
          <History className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {zh ? "历史版本" : "Version history"}
            </h2>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {zh
                ? `「${name}」被覆盖时，旧内容会自动留底，最近 ${keep || 5} 个可以回退或另存。`
                : `When “${name}” is overwritten the previous content is archived; the latest ${keep || 5} can be restored or saved aside.`}
            </p>
          </div>
        </div>

        <div className="mt-5 max-h-[48vh] overflow-y-auto">
          {versions === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {zh ? "读取中…" : "Loading…"}
            </div>
          ) : versions.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-muted-foreground">
                {loadFailed
                  ? zh
                    ? "读取历史版本失败，请稍后重试。"
                    : "Could not read the version history. Try again later."
                  : zh
                    ? "还没有历史版本。这份文件还没有被覆盖过（或被覆盖时留底是关闭的）。"
                    : "No versions yet. This file has not been overwritten (or archiving is disabled)."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {versions.map((item, index) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tabular-nums text-foreground">
                          {item.modified
                            ? formatStamp(item.modified)
                            : zh
                              ? "历史版本"
                              : "Earlier version"}
                        </span>
                        {index === 0 && (
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {zh ? "上一个版本" : "previous"}
                          </span>
                        )}
                        {item.modified && (
                          <span className="text-muted-foreground">
                            {formatRelativeTime(item.modified * 1000)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {[
                          item.size !== undefined
                            ? formatFileSize(item.size)
                            : "",
                          // 提交人是这一版被覆盖时记下来的。在这之前留下的版本没这份记录，
                          // 与其空着让人以为是坏了，不如明说"没记录到"。
                          item.by
                            ? zh
                              ? `由 ${item.by} 提交`
                              : `submitted by ${item.by}`
                            : zh
                              ? "提交人未记录"
                              : "author not recorded",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void open(item)}
                        disabled={busy !== null}
                        title={
                          zh
                            ? "打开这一版看看内容（按本地文件打开，不会改到共享盘）"
                            : "Open this version to read it (opened as a local file; the share is untouched)"
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 font-medium text-foreground transition-colors hover:bg-sidebar-hover disabled:opacity-50"
                      >
                        {busy?.id === item.id && busy.what === "open" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FolderOpen className="h-3.5 w-3.5" />
                        )}
                        {zh ? "打开" : "Open"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveToMine(item.id)}
                        disabled={busy !== null}
                        title={
                          zh
                            ? "把这一版存到「我的文档」，公共盘上的文件不动"
                            : "Copy this version into My Documents; the file on the share is untouched"
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 font-medium text-foreground transition-colors hover:bg-sidebar-hover disabled:opacity-50"
                      >
                        {busy?.id === item.id && busy.what === "export" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        {zh ? "保存到我的文档" : "Save to My Documents"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          confirmId === item.id
                            ? void restore(item.id)
                            : setConfirmId(item.id)
                        }
                        disabled={busy !== null || !writable}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors disabled:opacity-50 ${
                          confirmId === item.id
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-foreground hover:bg-sidebar-hover"
                        }`}
                      >
                        {busy?.id === item.id && busy.what === "restore" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {confirmId === item.id
                          ? zh
                            ? "确认回退"
                            : "Confirm"
                          : zh
                            ? "还原"
                            : "Restore"}
                      </button>
                    </div>
                  </div>
                  {confirmId === item.id && (
                    <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 leading-relaxed text-amber-700 dark:text-amber-300">
                      {zh
                        ? "公共盘上的文件会被换成这一版；当前内容会先留底（之后还能再换回来）。"
                        : "The file on the share will be replaced by this version. The current content is archived first, so you can switch back."}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy !== null}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar-hover disabled:opacity-50"
          >
            {zh ? "关闭" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
