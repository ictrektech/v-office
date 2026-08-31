"use client";

// 上传当前编辑文档到 HybRAG 知识库的保存弹窗。
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listDocumentKnowledgeBases,
  createKnowledgeBase,
  HybragUnavailableError,
  HybragAuthError,
  type KnowledgeBase,
} from "@/utils/hybrag/client";

interface KnowledgeBaseUploadDialogProps {
  language: string;
  /** 默认文件名（无后缀） */
  suggestedName: string;
  /** 文件扩展名（docx/xlsx/pptx/pdf） */
  extension: string;
  onCancel: () => void;
  /** 由页面执行「导出当前文档字节 + 上传」，成功返回、失败抛错 */
  onUpload: (fileName: string, knowledgeBaseId: string) => Promise<void>;
}

const NEW_KB_VALUE = "__new__";

export default function KnowledgeBaseUploadDialog({
  language,
  suggestedName,
  extension,
  onCancel,
  onUpload,
}: KnowledgeBaseUploadDialogProps) {
  const zh = language.toLowerCase().startsWith("zh");

  const [fileName, setFileName] = useState(
    suggestedName.replace(new RegExp(`\\.${extension}$`, "i"), ""),
  );
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [newKbName, setNewKbName] = useState(zh ? "我的文档" : "My Documents");
  const [loadingKbs, setLoadingKbs] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadKbs = async () => {
    setLoadingKbs(true);
    setLoadError("");
    try {
      const list = await listDocumentKnowledgeBases();
      setKnowledgeBases(list);
      // 没有可用知识库时默认让其新建一个
      setSelectedKb(list.length > 0 ? list[0]!.id : NEW_KB_VALUE);
      setCreating(list.length === 0);
    } catch (err) {
      const message = friendlyError(err, zh);
      setLoadError(message);
    } finally {
      setLoadingKbs(false);
    }
  };

  useEffect(() => {
    void loadKbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = fileName
      .trim()
      .replace(new RegExp(`\\.${extension}$`, "i"), "");
    if (!trimmed) {
      setError(zh ? "请输入文件名" : "Enter a file name");
      return;
    }
    if (/[\\/:*?"<>|]/.test(trimmed) || trimmed.length > 180) {
      setError(
        zh ? "文件名包含无效字符或过长" : "The file name is invalid or too long",
      );
      return;
    }

    let knowledgeBaseId = selectedKb;
    if (knowledgeBaseId === NEW_KB_VALUE) {
      const name = newKbName.trim() || (zh ? "我的文档" : "My Documents");
      setSubmitting(true);
      try {
        knowledgeBaseId = await createKnowledgeBase(name);
      } catch (err) {
        setError(friendlyError(err, zh));
        setSubmitting(false);
        return;
      }
    }
    if (!knowledgeBaseId) {
      setError(
        zh ? "请选择一个知识库" : "Please select a knowledge base",
      );
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onUpload(`${trimmed}.${extension}`, knowledgeBaseId);
      toast.success(
        zh
          ? "上传成功，文件正在后台解析"
          : "Uploaded. The file is being processed.",
      );
      onCancel();
    } catch (err) {
      const message = friendlyError(err, zh);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-[460px] rounded-2xl bg-popover p-7 shadow-2xl ring-1 ring-foreground/10"
      >
        <h2 className="text-lg font-semibold text-foreground">
          {zh ? "上传到知识库" : "Upload to knowledge base"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {zh
            ? "将当前编辑的文档上传到知识库，供检索与问答使用。"
            : "Upload the document being edited to a knowledge base."}
        </p>

        <div className="mt-5">
          <label className="text-sm font-medium text-foreground">
            {zh ? "文件名" : "File name"}
          </label>
          <div className="mt-1.5 flex items-center rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
            <input
              autoFocus
              value={fileName}
              onChange={(event) => {
                setFileName(event.target.value);
                setError("");
              }}
              aria-label={zh ? "文件名" : "File name"}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none"
            />
            <span className="pr-3 text-sm text-muted-foreground">.{extension}</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-foreground">
            {zh ? "知识库" : "Knowledge base"}
          </label>
          {loadingKbs ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {zh ? "加载中…" : "Loading…"}
            </p>
          ) : loadError ? (
            <div className="mt-1.5 flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <p className="text-sm text-red-500">{loadError}</p>
              <button
                type="button"
                onClick={loadKbs}
                className="text-sm text-primary hover:underline"
              >
                {zh ? "重试" : "Retry"}
              </button>
            </div>
          ) : (
            <div className="mt-1.5 space-y-2">
              {knowledgeBases.length > 0 && (
                <select
                  value={selectedKb}
                  onChange={(event) => {
                    setSelectedKb(event.target.value);
                    setCreating(event.target.value === NEW_KB_VALUE);
                    setError("");
                  }}
                  aria-label={zh ? "选择知识库" : "Select knowledge base"}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name}
                    </option>
                  ))}
                  <option value={NEW_KB_VALUE}>
                    {zh ? "＋ 新建知识库" : "＋ New knowledge base"}
                  </option>
                </select>
              )}
              {creating && (
                <input
                  value={newKbName}
                  onChange={(event) => {
                    setNewKbName(event.target.value);
                    setError("");
                  }}
                  placeholder={zh ? "输入知识库名称" : "Knowledge base name"}
                  aria-label={zh ? "知识库名称" : "Knowledge base name"}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            {zh ? "取消" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={submitting || loadingKbs || Boolean(loadError)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting
              ? zh
                ? "上传中…"
                : "Uploading…"
              : zh
                ? "上传"
                : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}

function friendlyError(err: unknown, zh: boolean): string {
  if (err instanceof HybragUnavailableError) {
    return zh
      ? "知识库服务不可用，请确认 HybRAG 已安装"
      : "Knowledge base service is unavailable. Make sure HybRAG is installed.";
  }
  if (err instanceof HybragAuthError) {
    return zh
      ? "登录态已过期，请刷新页面后重试"
      : "Your session expired. Refresh the page and try again.";
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/409|already exists/i.test(message)) {
    return zh
      ? "该文件已存在于知识库"
      : "The file already exists in the knowledge base.";
  }
  return err instanceof Error
    ? err.message
    : zh
      ? "操作失败，请重试"
      : "The operation failed. Try again.";
}