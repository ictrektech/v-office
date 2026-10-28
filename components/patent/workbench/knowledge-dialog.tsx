"use client";

/**
 * 知识库取材料：连接 WeKnora / HybRAG，选库、选文件、下载后作为材料导入当前案件。
 *
 * 本地开发没有登录态时接口会抛 HybragUnavailableError，这里只展示原因，不阻断页面。
 */

import { useEffect, useState } from "react";
import { Database, Loader2, X } from "lucide-react";
import {
  HybragAuthError,
  HybragUnavailableError,
  downloadKnowledgeFile,
  knowledgeFileLabel,
  listDocumentKnowledgeBases,
  listKnowledgeBaseFiles,
  type KnowledgeBase,
  type KnowledgeFile,
} from "@/utils/hybrag/client";

interface KnowledgeDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export function KnowledgeDialog({ open, onClose, onImport }: KnowledgeDialogProps) {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [activeId, setActiveId] = useState("");
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loadingBases, setLoadingBases] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError("");
    setChecked({});
    setFiles([]);
    setLoadingBases(true);
    listDocumentKnowledgeBases()
      .then((list) => {
        if (!alive) return;
        setBases(list);
        setActiveId(list[0]?.id ?? "");
        if (list.length === 0) setError("知识库里还没有文档库");
      })
      .catch((reason: unknown) => alive && setError(readError(reason)))
      .finally(() => alive && setLoadingBases(false));
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !activeId) return;
    let alive = true;
    setLoadingFiles(true);
    setFiles([]);
    setChecked({});
    listKnowledgeBaseFiles(activeId)
      .then((list) => alive && setFiles(list))
      .catch((reason: unknown) => alive && setError(readError(reason)))
      .finally(() => alive && setLoadingFiles(false));
    return () => {
      alive = false;
    };
  }, [open, activeId]);

  if (!open) return null;

  const selected = files.filter((file) => checked[file.id]);
  const activeBase = bases.find((base) => base.id === activeId);

  const importSelected = async () => {
    if (selected.length === 0) return;
    setImporting(true);
    setError("");
    try {
      for (const file of selected) {
        const downloaded = await downloadKnowledgeFile(file.id, knowledgeFileLabel(file));
        await onImport(downloaded);
      }
      onClose();
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,20,22,0.24)] p-6">
      <div className="flex h-[440px] w-[660px] max-w-full flex-col overflow-hidden rounded-[12px] border border-[#EAEAEC] bg-white shadow-[0_24px_60px_-24px_rgba(20,20,22,0.3)]">
        <div className="flex h-14 flex-none items-center gap-2 border-b border-[#EAEAEC] px-5">
          <Database className="h-4 w-4 text-[#5F6066]" />
          <span className="text-[13px] font-semibold text-[#151517]">从知识库获取材料</span>
          <span className="rounded border border-[#EAEAEC] px-1.5 py-0.5 text-[10px] text-[#9A9BA1]">
            WeKnora
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[#9A9BA1] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="w-[200px] flex-none overflow-y-auto border-r border-[#EAEAEC] p-2">
            {loadingBases ? (
              <p className="px-2 py-2 text-[11.5px] text-[#9A9BA1]">正在读取…</p>
            ) : (
              bases.map((base) => (
                <button
                  key={base.id}
                  type="button"
                  onClick={() => setActiveId(base.id)}
                  className={`mb-0.5 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[12px] transition ${
                    base.id === activeId
                      ? "bg-[#F1F1F3] text-[#151517]"
                      : "text-[#5F6066] hover:bg-[#F7F7F8]"
                  }`}
                >
                  <span className="truncate">{base.name}</span>
                  <span className="ml-2 flex-none text-[10px] text-[#9A9BA1]">
                    {base.knowledge_count ?? ""}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto p-3">
            {loadingFiles ? (
              <p className="py-8 text-center text-[11.5px] text-[#9A9BA1]">正在读取文件…</p>
            ) : files.length === 0 ? (
              <p className="py-8 text-center text-[11.5px] text-[#9A9BA1]">
                {error || (activeBase ? "这个库还没有文件" : "先选一个知识库")}
              </p>
            ) : (
              files.map((file) => (
                <label
                  key={file.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 transition hover:bg-[#F7F7F8]"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checked[file.id])}
                    onChange={(event) =>
                      setChecked((prev) => ({ ...prev, [file.id]: event.target.checked }))
                    }
                    className="mt-0.5 h-3.5 w-3.5 accent-[#151517]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] text-[#151517]">
                      {knowledgeFileLabel(file)}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] text-[#9A9BA1]">
                      {file.status === "completed" ? "已解析" : file.status || "未知状态"}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex h-14 flex-none items-center gap-3 border-t border-[#EAEAEC] px-5">
          <p className="min-w-0 flex-1 truncate text-[11px] text-[#9A9BA1]">
            {selected.length > 0 ? `已选 ${selected.length} 份，导入后成为当前案件材料` : ""}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md px-3 text-[12px] text-[#5F6066] transition hover:bg-[#F4F4F5]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={selected.length === 0 || importing}
            onClick={() => void importSelected()}
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#151517] px-3.5 text-[12px] font-medium text-white transition hover:bg-black disabled:bg-[#D8D8DC]"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            导入 {selected.length > 0 ? selected.length : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function readError(reason: unknown): string {
  if (reason instanceof HybragUnavailableError) {
    return "当前环境没有连接 WeKnora（本地开发不可用），部署后即可读取";
  }
  if (reason instanceof HybragAuthError) {
    return "知识库登录态失效，请重新授权后再试";
  }
  return reason instanceof Error ? reason.message : "知识库读取失败";
}
