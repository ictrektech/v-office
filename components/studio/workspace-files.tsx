"use client";

/**
 * 案件目录里的交付件（agent 用技能脚本写出来的 Word / Excel / 图）。
 *
 * 这批文件不走 artifacts 那套：agent 按技能包约定直接落到案件目录（`outputs/`），
 * 服务端只负责列出来。这里给四页共用：看得到、能下载、能收进「我的文档」。
 *
 * 「收进我的文档」为什么必须走服务端：agent 是按用户降权的，碰不到文档存储；
 * 而且那块目录里是用户**所有**文档，把路径交给它等于拆掉沙箱。
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import {
  aiFileObjectUrl,
  listAiFiles,
  saveFilesToDocs,
  type AiFile,
} from "@/utils/ai/client";

/** 批量收件的占用标记（和单个文件路径区分开） */
const ALL = "__all__";

function humanSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** 按扩展名给个图标与颜色，一眼能分出 Word / Excel / 图 */
function fileLook(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["docx", "doc"].includes(ext)) {
    return { Icon: FileText, tint: "text-[#2B579A]" };
  }
  if (["xlsx", "xls", "csv"].includes(ext)) {
    return { Icon: FileSpreadsheet, tint: "text-[#217346]" };
  }
  if (["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(ext)) {
    return { Icon: ImageIcon, tint: "text-[#2FA35C]" };
  }
  return { Icon: FileText, tint: "text-[#9A9AA0]" };
}

export function WorkspaceFiles({
  sessionId,
  refreshKey,
  className,
}: {
  sessionId: string | null;
  /** 变了就重新拉一次（产物刚生成、会话切换时用） */
  refreshKey?: string | number;
  className?: string;
}) {
  const t = useExtracted();
  const [files, setFiles] = useState<AiFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    try {
      setFiles(await listAiFiles(sessionId));
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const toDocs = async (paths: string[], marker: string) => {
    if (!sessionId || !paths.length) return;
    setBusy(marker);
    setNotice(null);
    setError(null);
    try {
      const results = await saveFilesToDocs(sessionId, paths);
      const ok = results.filter((r) => r.saved).length;
      const bad = results.filter((r) => r.error);
      if (ok) {
        setNotice(
          t(
            { id: "Saved to my docs", message: "已收进我的文档：{n} 份", values: { n: String(ok) } },
          ),
        );
      }
      if (bad.length) {
        setError(bad.map((b) => `${b.path}：${b.error}`).join("；"));
      }
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(null);
    }
  };

  const download = async (path: string) => {
    if (!sessionId) return;
    setBusy(path);
    setError(null);
    try {
      const url = await aiFileObjectUrl(sessionId, path);
      const a = document.createElement("a");
      a.href = url;
      a.download = path.split("/").pop() ?? "file";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={cn(
      "rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-white/10 dark:bg-[#171719]", "flex flex-col overflow-hidden", className)}>
      <h2 className={"flex items-center gap-2 border-b border-black/[0.05] px-4 py-3 text-[14px] font-semibold text-[#1A1A1A] dark:border-white/5 dark:text-white"}>
        <FileText className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
        {t({ id: "Workspace files", message: "交付件" })}
        <span className="ml-auto flex items-center gap-2 text-[11.5px] font-normal text-[#9A9AA0]">
          {files.length ? files.length : null}
          <button
            type="button"
            onClick={() => void load()}
            title={t({ id: "Refresh", message: "刷新" })}
            className="transition hover:text-[#E2562B]"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </span>
      </h2>

      <div className="p-3">
        {files.length ? (
          <>
            <ul className="space-y-1.5">
              {files.map((f) => {
                const { Icon, tint } = fileLook(f.path);
                const name = f.path.split("/").pop() ?? f.path;
                return (
                  <li
                    key={f.path}
                    className="flex items-center gap-2 rounded-lg border border-black/[0.05] px-2.5 py-2 dark:border-white/5"
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", tint)} strokeWidth={1.8} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-[#3C3C40] dark:text-slate-300">
                        {name}
                      </span>
                      <span className="block truncate text-[10.5px] text-[#B4B4BA]">
                        {f.path} · {humanSize(f.size)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void toDocs([f.path], f.path)}
                      disabled={busy !== null}
                      className="shrink-0 rounded-md border border-[#F2BBA3] px-2 py-0.5 text-[11px] font-medium text-[#E2562B] transition hover:bg-[#FBF2EE] disabled:opacity-40 dark:hover:bg-[#2A1A14]"
                    >
                      {busy === f.path ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        t({ id: "Save to docs", message: "存到我的文档" })
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void download(f.path)}
                      disabled={busy !== null}
                      title={t({ id: "Download", message: "下载" })}
                      className="shrink-0 rounded-md p-1 text-[#9A9AA0] transition hover:text-[#E2562B] disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => void toDocs(files.map((f) => f.path), ALL)}
              disabled={busy !== null}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/[0.12] px-3 py-2 text-[12px] text-[#6B6B70] transition hover:border-[#F2BBA3] hover:text-[#E2562B] disabled:opacity-40 dark:border-white/15 dark:text-slate-400"
            >
              {busy === ALL ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {t({ id: "Save all to docs", message: "全部收进我的文档" })}
            </button>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-black/[0.1] px-3 py-6 text-center text-[11.5px] leading-relaxed text-[#9A9AA0] dark:border-white/10">
            {t({
              id: "Workspace files empty",
              message:
                "还没有产出的文件。助手跑完技能脚本后，Word / Excel / 图会出现在这里。",
            })}
          </p>
        )}

        {notice ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[#28A05A]">
            <Check className="h-3 w-3" strokeWidth={3} />
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 flex items-start gap-1.5 break-all text-[11.5px] text-[#DC2626]">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default WorkspaceFiles;
