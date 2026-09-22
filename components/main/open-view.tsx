"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  HardDrive,
  Clock,
  Download,
  X,
  Loader2,
  Pencil,
  PenLine,
  RotateCcw,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { getNewUrl } from "@/utils/editor/utils";
import { FilePickerCard } from "@/components/file-picker-card";
import { DocumentIcon } from "@/components/document-icon";
import { getDocConfig } from "@/lib/document-types";
import type { Template } from "@/utils/templates";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useNasDocuments,
  type NasDocument,
} from "@/hooks/use-nas-documents";
import { useAppStore, useResolvedLanguage } from "@/store";
import DocumentNameDialog from "@/components/document-name-dialog";
import { sitePath } from "@/utils/site-path";
import {
  getRecentFiles,
  openRecentFile,
  removeRecentFile,
  addRecentFile,
  formatRelativeTime,
  formatFileSize,
  type RecentFileRecord,
} from "@/utils/recent-files";
import {
  listStoredFiles,
  openStoredFile,
  deleteStoredFile,
  renameStoredFile,
  openSharedDocument,
  whoAmI,
  type StoredFile,
} from "@/utils/vos/storage";

/**
 * 首页「我的文档」的会话内快照。
 *
 * 从编辑器返回首页时（客户端路由）先用它秒开，再后台静默校验；否则每次返回
 * 都要等一次列表请求，界面上就是"又要重新加载"。
 */
let homeSnapshot: { user: string; files: StoredFile[] } | null = null;

export function OpenView({
  recommendedTemplates,
}: {
  recommendedTemplates: Template[];
}) {
  const t = useExtracted();
  usePageTitle(
    t("Free Online Office Editor — Word, Excel, PowerPoint | V-Office"),
  );
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  // Mapped documents (VOS deployment only): files from the shared host path.
  const [storedUser, setStoredUser] = useState<string | null>(null);
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
  const [storedState, setStoredState] = useState<"checking" | "off" | "ready">(
    "checking",
  );
  // 供 visibilitychange 监听读取最新判定（避免把 handler 挂到每次 state 变化上）
  const storedStateRef = useRef(storedState);
  useEffect(() => {
    storedStateRef.current = storedState;
  }, [storedState]);
  const [loadingStoredFile, setLoadingStoredFile] = useState<string | null>(null);
  const [downloadingStoredFile, setDownloadingStoredFile] = useState<
    string | null
  >(null);
  const [renamingStoredFile, setRenamingStoredFile] = useState<StoredFile | null>(
    null,
  );

    const router = useRouter();
  const server = useAppStore((state) => state.server);
  const language = useResolvedLanguage();
  const zh = language.toLowerCase().startsWith("zh");
  // VOS 镜像在构建期写入了 basePath：用它区分"独立部署"与"VOS 部署但没拿到登录态"
  const isVOSDeployment = Boolean(process.env.NEXT_PUBLIC_BASE_PATH);

  // 「NAS 数据」页签：平台授权挂进来的每个目录是一个分类（公共 / 用户），
  // 点分类就递归遍历该目录，把里面所有可打开的文档平铺出来。
  const {
    categories: nasCategories,
    activeCategory: nasCategory,
    selectCategory: selectNasCategory,
    documents: nasDocuments,
    scanning: nasScanning,
    error: nasError,
    truncated: nasTruncated,
    busyKey: nasBusyKey,
    setBusyKey: setNasBusyKey,
    downloadDocument: downloadNasDocument,
    rescan: rescanNas,
  } = useNasDocuments(language);
  const [view, setView] = useState<"mine" | "nas">("mine");

  // Load recent files on mount
  useEffect(() => {
    loadRecentFiles();
    initStoredFiles();
  }, []);

  // 页面重新可见时若仍判定为"无存储"，再探一次：门户注入令牌较晚、storage
  // 刚重启完等场景都能自动恢复，不需要用户刷新整页
  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        storedStateRef.current === "off"
      ) {
        void initStoredFiles();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // 列表变化（删除 / 重命名 / 保存回来）时同步快照，避免返回首页看到旧数据
  useEffect(() => {
    if (homeSnapshot && storedUser) {
      homeSnapshot = { user: storedUser, files: storedFiles };
    }
  }, [storedFiles, storedUser]);

  const loadRecentFiles = async () => {
    try {
      setIsLoading(true);
      const files = await getRecentFiles();
      setRecentFiles(files);
    } catch (error) {
      console.error("Failed to load recent files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecentFileClick = async (record: RecentFileRecord) => {
    try {
      const file = await openRecentFile(record);
      if (file) {
        await handleFileSelectWithHandle(file, record.handle);
      } else {
        // File couldn't be opened, refresh the list
        await loadRecentFiles();
      }
    } catch (error) {
      console.error("Failed to open recent file:", error);
      await loadRecentFiles();
    }
  };

  const handleTemplateClick = async (tpl: Template) => {
    if (loadingTemplate) return;
    setLoadingTemplate(tpl.name);
    try {
      const url = sitePath(`/files/${encodeURIComponent(tpl.filename)}`);
      await server.openUrl(url, { fileType: tpl.type, fileName: tpl.filename });
      router.push("/editor");
    } catch (err) {
      console.error("Failed to open template:", err);
    } finally {
      setLoadingTemplate(null);
    }
  };

  const handleRemoveRecentFile = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await removeRecentFile(id);
      await loadRecentFiles();
    } catch (error) {
      console.error("Failed to remove recent file:", error);
    }
  };

  const initStoredFiles = async () => {
    // 先用会话内快照秒开（从编辑器返回时不再空转一圈），再后台校验
    const cached = homeSnapshot;
    if (cached) {
      setStoredUser(cached.user);
      setStoredFiles(cached.files);
      setStoredState("ready");
    }
    // 失败一次就永久隐藏「我的文档」会让用户以为功能没了：门户注入令牌可能
    // 晚于首屏、storage 容器也可能刚好在重启，这里多探几次再判定不可用。
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const user = await whoAmI();
        if (user) {
          const files = await listStoredFiles();
          homeSnapshot = { user, files };
          setStoredUser(user);
          setStoredFiles(files);
          setStoredState("ready");
          return;
        }
      } catch (error) {
        console.error("Documents unavailable:", error);
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    // 有快照就继续用快照显示，不回退成"无存储"（避免返回首页时闪没）
    if (!cached) setStoredState("off");
  };

  const handleStoredFileClick = async (file: StoredFile) => {
    if (loadingStoredFile) return;
    setLoadingStoredFile(file.name);
    try {
      const downloaded = await openStoredFile(file.name);
      await server.open(downloaded);
      router.push("/editor");
    } catch (error) {
      console.error("Failed to open document:", error);
    } finally {
      setLoadingStoredFile(null);
    }
  };

  const handleStoredFileDelete = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    try {
      await deleteStoredFile(name);
      setStoredFiles((files) => files.filter((f) => f.name !== name));
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const handleStoredFileDownload = async (
    e: React.MouseEvent,
    file: StoredFile,
  ) => {
    e.stopPropagation();
    if (downloadingStoredFile) return;
    setDownloadingStoredFile(file.name);
    try {
      const downloaded = await openStoredFile(file.name);
      const url = URL.createObjectURL(downloaded);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      console.error("Failed to download document:", error);
    } finally {
      setDownloadingStoredFile(null);
    }
  };

  const handleStoredFileRename = async (newName: string) => {
    if (!renamingStoredFile) return;
    const oldName = renamingStoredFile.name;
    try {
      await renameStoredFile(oldName, newName);
    } catch (error) {
      if (
        language.toLowerCase().startsWith("zh") &&
        error instanceof Error &&
        error.message === "A file with that name already exists"
      ) {
        throw new Error("已存在同名文档");
      }
      throw error;
    }
    setStoredFiles((files) =>
      files.map((file) =>
        file.name === oldName ? { ...file, name: newName } : file,
      ),
    );
    setRenamingStoredFile(null);
  };

  /**
   * 打开 NAS 数据里的文档：整份下载到浏览器交给编辑器，同时记下保存落点，
   * 保存时写回盘上的原文件（即编辑原文档）。
   */
  const openNasDocument = async (doc: NasDocument) => {
    if (nasBusyKey) return;
    setNasBusyKey(doc.key);
    try {
      const file = await openSharedDocument(doc.sourceId, doc.path);
      await server.open(file, {
        sharedTarget: { source: doc.sourceId, path: doc.path },
      });
      router.push("/editor");
    } catch (error) {
      console.error("Failed to open NAS document:", error);
    } finally {
      setNasBusyKey(null);
    }
  };

  const handleFileSelectWithHandle = async (
    file: File,
    handle?: FileSystemFileHandle,
  ) => {
    // Only save files with FileHandle (can be reopened)
    if (handle) {
      try {
        await addRecentFile(handle);
        await loadRecentFiles();
      } catch (error) {
        console.error("Failed to add to recent files:", error);
      }
    }

    // Open the file and navigate to editor
    await server.open(file);
    router.push("/editor");
  };

  const newDocTypes = [
    {
      type: "docx",
      label: t({ id: "Document", message: "Document" }),
    },
    {
      type: "xlsx",
      label: t({ id: "Spreadsheet", message: "Spreadsheet" }),
    },
    {
      type: "pptx",
      label: t({ id: "Presentation", message: "Presentation" }),
    },
    { type: "pdf", label: t({ id: "PDF", message: "PDF" }) },
  ];

  return (
    <>
      {renamingStoredFile && (
        <DocumentNameDialog
          suggestedName={renamingStoredFile.name.replace(/\.[^.]+$/, "")}
          extension={renamingStoredFile.name.split(".").pop() || "docx"}
          language={language}
          mode="rename"
          onCancel={() => setRenamingStoredFile(null)}
          onSave={handleStoredFileRename}
        />
      )}
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        {/* File Picker Card for uploading files */}
        <FilePickerCard onFileSelectWithHandle={handleFileSelectWithHandle} />
      </section>

      {/* Quick Start Section with a more compact layout */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("New")}</h2>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-nowrap items-stretch gap-3 mb-4">
          {newDocTypes.map(({ type, label }) => {
            const doc = getDocConfig(type);
            return (
              <Link
                key={type}
                href={getNewUrl(type)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 bg-muted/40 dark:bg-white/5 border border-border rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all group overflow-hidden md:flex-1 md:min-w-0",
                  doc.hoverBorderColor,
                )}
              >
                <DocumentIcon
                  type={type}
                  className={cn(
                    "transition-all duration-300",
                    doc.hoverBgColor,
                  )}
                  iconClassName="group-hover:text-white"
                />
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {label}
                </span>
              </Link>
            );
          })}
          {/* AI 公文写作子页面入口（与新建文档卡片并列） */}
          <Link
            href="/writing"
            className="flex flex-col items-center justify-center gap-2 p-4 bg-muted/40 dark:bg-white/5 border border-border rounded-2xl hover:shadow-lg hover:-translate-y-0.5 hover:border-violet-300 dark:hover:border-violet-500/40 transition-all group overflow-hidden md:flex-1 md:min-w-0"
          >
            <span className="flex w-10 h-10 rounded-xl items-center justify-center bg-violet-50 dark:bg-violet-950/50 transition-all duration-300 group-hover:bg-violet-500">
              <PenLine className="w-5 h-5 text-violet-600 dark:text-violet-400 group-hover:text-white transition-colors" />
            </span>
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              {language.toLowerCase().startsWith("zh")
                ? "AI 公文写作"
                : "AI Writing"}
            </span>
          </Link>
        </div>
      </section>

      {/* Common Templates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("Recommended")}</h2>
          <button
            onClick={() => router.push("/template")}
            className="text-xs text-primary font-medium hover:underline"
          >
            {t("More templates")}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {recommendedTemplates.map((tpl, i) => (
            <button
              key={i}
              className="flex flex-col gap-2 group text-left focus:outline-none"
              onClick={() => handleTemplateClick(tpl)}
              disabled={!!loadingTemplate}
            >
              <div
                className={cn(
                  "aspect-16/10 rounded-lg border border-border dark:border-white/5 shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all relative overflow-hidden bg-white dark:bg-zinc-900",
                )}
              >
                <Image
                  width={480}
                  height={270}
                  src={sitePath(`/files/${encodeURIComponent(tpl.preview)}`)}
                  alt={tpl.name}
                  className="w-full min-h-full h-auto object-cover object-top group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />

                {loadingTemplate === tpl.name && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-20">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}

                <div
                  className={cn(
                    "absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase z-10",
                    getDocConfig(tpl.type).color,
                    "dark:text-white dark:bg-primary/80",
                    getDocConfig(tpl.type).lightBgColor,
                  )}
                >
                  {tpl.type}
                </div>
              </div>
              <span className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                {tpl.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 文档区：两个页签
          「我的文档」用户自己创建 / 上传的文档（应用私有目录）；
          「NAS 数据」平台授权挂进来的盘，进去后按分类（公共 / 用户）递归遍历。 */}
      {storedState !== "off" && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {view === "mine"
                ? t({ id: "myDocsTitle", message: "My Documents" })
                : zh
                  ? "NAS 数据"
                  : "NAS data"}
            </h2>
            {view === "mine" && storedUser && (
              <span
                className="inline-flex items-center gap-1.5 text-xs text-text-secondary"
                title={t({
                  id: "myDocsUserHint",
                  message: "Signed in via VOS — documents are stored in your private directory, visible only to you",
                })}
              >
                <HardDrive className="w-3.5 h-3.5" />
                {storedUser}
              </span>
            )}
            {view === "nas" && (
              <button
                type="button"
                onClick={() => rescanNas()}
                disabled={nasScanning}
                title={
                  zh ? "重新遍历当前分类" : "Rescan the current category"
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-muted disabled:opacity-50"
              >
                <RotateCcw
                  className={cn("h-3.5 w-3.5", nasScanning && "animate-spin")}
                />
                {zh ? "重新扫描" : "Rescan"}
              </button>
            )}
          </div>

          {/* 一级页签：我的文档 / NAS 数据 */}
          {nasCategories.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setView("mine")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  view === "mine"
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-muted",
                )}
              >
                <HardDrive className="h-3.5 w-3.5" />
                {zh ? "我的文档" : "My Documents"}
              </button>
              <button
                type="button"
                onClick={() => setView("nas")}
                title={
                  zh
                    ? "平台授权挂进来的盘，点开后遍历其中可编辑的文档"
                    : "Mounted drives from Data Access Authorization; scans for editable documents"
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  view === "nas"
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-muted",
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {zh ? "NAS 数据" : "NAS data"}
              </button>
            </div>
          )}

          {/* NAS 数据内的分类：公共 / 用户（<用户名>） */}
          {view === "nas" && (
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border pb-2">
              {nasCategories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => selectNasCategory(category)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    nasCategory?.key === category.key
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-muted",
                  )}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  {category.label}
                </button>
              ))}
              {nasScanning && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-text-secondary" />
              )}
            </div>
          )}

          {view === "nas" && nasError && (
            <p className="mb-3 text-xs text-red-500">{nasError}</p>
          )}

          {view === "nas" ? (
            nasScanning ? (
              <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
                <div className="text-center text-text-secondary">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">
                    {zh
                      ? `正在遍历「${nasCategory?.label ?? ""}」中的文档…`
                      : `Scanning “${nasCategory?.label ?? ""}” for documents…`}
                  </p>
                </div>
              </div>
            ) : nasDocuments.length === 0 ? (
              <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
                <div className="text-center text-text-secondary">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium mb-1">
                    {zh
                      ? "该分类下没有可打开的文档"
                      : "No openable documents in this category"}
                  </p>
                  <p className="text-xs">
                    {zh
                      ? "已递归遍历所有子目录，只识别 Word / Excel / PPT / PDF"
                      : "All subfolders were scanned; only Word / Excel / PPT / PDF are recognised"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="">
                {nasDocuments.map((doc) => (
                  <div
                    key={doc.key}
                    onClick={() => void openNasDocument(doc)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-sidebar-hover border-b border-border last:border-0 transition-colors group cursor-pointer"
                    title={
                      zh
                        ? "点击打开并编辑原文档，保存写回原文件"
                        : "Click to open and edit; saving writes back to the original"
                    }
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <DocumentIcon
                        type={doc.name.split(".").pop()?.toLowerCase() || ""}
                        size="sm"
                      />
                      <div className="min-w-0 text-left">
                        <p className="truncate font-semibold text-sm">
                          {doc.name}
                        </p>
                        <p className="text-[10px] text-text-secondary">
                          {[
                            doc.folder ? `${doc.folder}/` : null,
                            formatFileSize(doc.size),
                            formatRelativeTime(doc.modified * 1000),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openNasDocument(doc);
                        }}
                        disabled={nasBusyKey !== null}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 active:bg-primary/20 disabled:opacity-60"
                      >
                        {nasBusyKey === doc.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FolderOpen className="h-4 w-4" />
                        )}
                        {nasBusyKey === doc.key
                          ? zh
                            ? "打开中…"
                            : "Opening…"
                          : zh
                            ? "打开"
                            : "Open"}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void downloadNasDocument(doc);
                        }}
                        disabled={nasBusyKey !== null}
                        title={zh ? "下载原文件" : "Download original"}
                        className="rounded-lg bg-muted p-2 text-foreground transition-colors hover:bg-sidebar-hover disabled:opacity-50"
                      >
                        {nasBusyKey === doc.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                {nasTruncated && (
                  <p className="mt-2 text-[10px] text-text-secondary">
                    {zh
                      ? "文档太多，仅列出前一部分；请改用更具体的授权目录。"
                      : "Too many documents — only the first part is listed. Narrow the authorized folder."}
                  </p>
                )}
              </div>
            )
          ) : storedState === "checking" ? (
            <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
              <div className="text-center text-text-secondary">
                <HardDrive className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                <p className="text-sm">
                  {t({
                    id: "myDocsLoading",
                    message: "Loading your documents...",
                  })}
                </p>
              </div>
            </div>
          ) : storedFiles.length === 0 ? (
            <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
              <div className="text-center text-text-secondary">
                <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium mb-1">
                  {t({ id: "myDocsEmpty", message: "No documents yet" })}
                </p>
                <p className="text-xs">
                  {t({
                    id: "myDocsEmptyHint",
                    message:
                      "Documents saved in the editor are stored in your private directory",
                  })}
                </p>
                {nasCategories.length > 0 && (
                  <p className="mt-1 text-[10px] opacity-80">
                    {zh
                      ? "平台授权盘里的文档在「NAS 数据」页签中（公共 / 用户）"
                      : "Documents on mounted drives are under the “NAS data” tab (public / user)"}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="">
              {storedFiles.map((file) => (
                <div
                  key={file.name}
                  onClick={() => handleStoredFileClick(file)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-sidebar-hover border-b border-border last:border-0 transition-colors group cursor-pointer"
                  title={t({
                    id: "myDocsOpenHint",
                    message: "Click to open this document",
                  })}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <DocumentIcon
                      type={file.name.split(".").pop()?.toLowerCase() || ""}
                      size="sm"
                    />
                    <div className="min-w-0 text-left">
                      <p className="truncate font-semibold text-sm">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-text-secondary">
                        {formatFileSize(file.size)} ·{" "}
                        {formatRelativeTime(file.modified * 1000)}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStoredFileClick(file);
                      }}
                      disabled={loadingStoredFile !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                      title={t({
                        id: "myDocsOpenHint",
                        message: "Click to open this document",
                      })}
                    >
                      {loadingStoredFile === file.name ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FolderOpen className="h-4 w-4" />
                      )}
                      {t("Open")}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleStoredFileDownload(e, file)}
                      disabled={downloadingStoredFile !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-hover disabled:opacity-50"
                      title={t("Downloads")}
                    >
                      {downloadingStoredFile === file.name ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {t("Downloads")}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingStoredFile(file);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-hover"
                      title={
                        language.toLowerCase().startsWith("zh")
                          ? "重命名文档"
                          : "Rename document"
                      }
                    >
                      <Pencil className="h-4 w-4" />
                      {language.toLowerCase().startsWith("zh")
                        ? "重命名"
                        : "Rename"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleStoredFileDelete(e, file.name)}
                      className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-500"
                      title={t({
                        id: "myDocsDeleteHint",
                        message: "Delete this document",
                      })}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recent Files — local file handles only; in VOS mode the
          "My Documents" section above is the document surface, so hide this. */}
      {storedState === "off" && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{t("Recent")}</h2>
          </div>
        {/* VOS 镜像但拿不到登录态：最常见原因是页面被当成顶层页面打开
            （新标签页/直接访问 URL），此时门户不会注入免登录桥。 */}
        {isVOSDeployment && (
          <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            {zh
              ? "未获取到 VOS 登录态，暂时只能打开本地文件。请从 VOS 门户侧边栏打开 V-Office（在新标签页直接打开本页会失去免登录与「我的文档」）。"
              : "No VOS session detected, so only local files are available. Open V-Office from the VOS portal sidebar — opening this page directly in a new tab loses silent sign-in and My Documents."}
          </p>
        )}
        {isLoading ? (
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <Clock className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p className="text-sm">{t("Loading recent files...")}</p>
            </div>
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium mb-1">{t("No recent files")}</p>
              <p className="text-xs">
                {t("Files you open will appear here for quick access")}
              </p>
            </div>
          </div>
        ) : (
          <div className="">
            {recentFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => handleRecentFileClick(file)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-sidebar-hover border-b border-border last:border-0 transition-colors group"
                title={t("Click to reopen this file")}
              >
                <div className="flex items-center gap-4">
                  <DocumentIcon type={file.type} size="sm" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">{file.name}</p>
                    <p className="text-[10px] text-text-secondary">
                      {formatRelativeTime(file.updatedAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemoveRecentFile(e, file.path)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-border/50 rounded"
                  title={t("Remove from recent")}
                >
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            ))}
          </div>
        )}
        </section>
      )}
      </div>
    </>
  );
}
