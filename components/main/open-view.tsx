"use client";

import { useEffect, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
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
  useSharedDocuments,
  type SharedDocumentRow,
} from "@/hooks/use-shared-documents";
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

  // 平台「数据访问授权」挂进来的目录（公共目录 / 我的数据 / NAS）里的文档，
  // 与私有文档并列显示在同一个列表里。
  const {
    tabs: sharedTabs,
    activeTab: sharedTab,
    selectTab: selectSharedTab,
    rows: sharedRows,
    loading: sharedLoading,
    error: sharedError,
    nav: sharedNav,
    crumbs: sharedCrumbs,
    busyKey: sharedBusyKey,
    setBusyKey: setSharedBusyKey,
    enterFolder: enterSharedFolder,
    goBack: leaveSharedFolder,
    downloadFile: downloadSharedFile,
  } = useSharedDocuments(language);

  // Load recent files on mount
  useEffect(() => {
    loadRecentFiles();
    initStoredFiles();
  }, []);

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
    try {
      const user = await whoAmI();
      if (!user) {
        setStoredState("off");
        return;
      }
      setStoredUser(user);
      setStoredFiles(await listStoredFiles());
      setStoredState("ready");
    } catch (error) {
      console.error("Documents unavailable:", error);
      setStoredState("off");
    }
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
   * 打开授权目录里的文档：整份下载到浏览器交给编辑器，同时记下保存落点，
   * 保存时写回共享盘上的原文件（即编辑原文档）。
   */
  const openSharedRow = async (row: SharedDocumentRow) => {
    if (sharedBusyKey) return;
    setSharedBusyKey(row.key);
    try {
      const file = await openSharedDocument(row.sourceId, row.path);
      await server.open(file, {
        sharedTarget: { source: row.sourceId, path: row.path },
      });
      router.push("/editor");
    } catch (error) {
      console.error("Failed to open shared document:", error);
    } finally {
      setSharedBusyKey(null);
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

      {/* 文档列表：一个页签 = 我的文档（私有目录）或一个已授权的共享目录
          （平台「数据访问授权」挂进来的目录，页签名即目录名）；进入共享目录
          的子目录时给出返回入口。 */}
      {storedState !== "off" && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {t({ id: "myDocsTitle", message: "My Documents" })}
            </h2>
            {storedUser && (
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
          </div>

          {/* 页签：我的文档 + 每个已授权的共享目录（目录名即页签名） */}
          {sharedTabs.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => selectSharedTab(null)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  sharedTab === null
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-muted",
                )}
              >
                <HardDrive className="h-3.5 w-3.5" />
                {zh ? "我的文档" : "My Documents"}
              </button>
              {sharedTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectSharedTab(tab)}
                  title={
                    zh
                      ? "打开即可编辑，保存写回该目录里的原文件"
                      : "Open to edit; saving writes back to the original file"
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    sharedTab?.key === tab.key
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-muted",
                  )}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* 在授权目录的子目录里：返回上一级 + 当前位置 */}
          {sharedNav && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
              <button
                type="button"
                onClick={() => void leaveSharedFolder()}
                className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 font-medium text-foreground transition-colors hover:bg-sidebar-hover"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {zh ? "返回" : "Back"}
              </button>
              {sharedCrumbs.map((crumb) => (
                <span key={crumb.path} className="flex items-center gap-1.5">
                  <span className="opacity-40">/</span>
                  <span className="max-w-[14rem] truncate">{crumb.name}</span>
                </span>
              ))}
            </div>
          )}

          {sharedError && (
            <p className="mb-3 text-xs text-red-500">{sharedError}</p>
          )}

          {sharedTab !== null && sharedLoading && sharedRows.length === 0 ? (
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
          ) : sharedTab === null && storedState === "checking" ? (
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
          ) : (sharedTab === null
              ? storedFiles.length === 0
              : sharedRows.length === 0) ? (
            <div className="bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm p-12 flex items-center justify-center">
              <div className="text-center text-text-secondary">
                <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium mb-1">
                  {sharedTab === null
                    ? t({ id: "myDocsEmpty", message: "No documents yet" })
                    : zh
                      ? "该目录下没有可打开的文档"
                      : "No openable documents here"}
                </p>
                <p className="text-xs">
                  {sharedTab === null
                    ? t({
                        id: "myDocsEmptyHint",
                        message:
                          "Documents saved in the editor are stored in your private directory",
                      })
                    : zh
                      ? "只显示 Word / Excel / PPT / PDF"
                      : "Only Word / Excel / PPT / PDF files are listed"}
                </p>
                {sharedTab === null && sharedTabs.length > 0 && (
                  <p className="mt-1 text-[10px] opacity-80">
                    {zh
                      ? `平台授权目录（${sharedTabs
                          .map((tab) => tab.label)
                          .join("、")}）里的文档在对应页签中`
                      : `Documents from authorized folders (${sharedTabs
                          .map((tab) => tab.label)
                          .join(", ")}) are under their own tabs`}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
            {sharedTab === null && (
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

            {/* 授权目录（页签）里的内容：目录可逐层进入，文档点开即编辑，
                保存写回共享盘上的原文件 */}
            {sharedTab !== null &&
              sharedRows.map((row) => (
              <div
                key={row.key}
                onClick={() =>
                  row.isDir
                    ? void enterSharedFolder(row)
                    : void openSharedRow(row)
                }
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-sidebar-hover border-b border-border last:border-0 transition-colors group cursor-pointer"
                title={
                  row.isDir
                    ? zh
                      ? "进入该文件夹"
                      : "Open this folder"
                    : zh
                      ? "点击打开并编辑原文档"
                      : "Click to open and edit the original"
                }
              >
                <div className="flex min-w-0 items-center gap-4">
                  {row.isDir ? (
                    <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <DocumentIcon
                      type={row.name.split(".").pop()?.toLowerCase() || ""}
                      size="sm"
                    />
                  )}
                  <div className="min-w-0 text-left">
                    <p className="truncate font-semibold text-sm">
                      {row.name}
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      {[
                        row.isDir
                          ? zh
                            ? "文件夹"
                            : "Folder"
                          : formatFileSize(row.size),
                        row.isDir
                          ? null
                          : formatRelativeTime(row.modified * 1000),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-2">
                  {row.isDir ? (
                    <ChevronRight className="h-4 w-4 text-text-secondary" />
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors group-hover:bg-primary/15">
                        {sharedBusyKey === row.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FolderOpen className="h-4 w-4" />
                        )}
                        {zh ? "打开" : "Open"}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void downloadSharedFile(row);
                        }}
                        disabled={sharedBusyKey !== null}
                        title={zh ? "下载原文件" : "Download original"}
                        className="rounded-lg bg-muted p-2 text-foreground transition-colors hover:bg-sidebar-hover disabled:opacity-50"
                      >
                        {sharedBusyKey === row.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            </>
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
