"use client";

import { Upload, FileText, FolderOpen, Download, Info, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { fetchCollaboraStatus, type CollaboraState } from "@/utils/editor/collabora";
import {
  useAppStore,
  useHasHydrated,
  useResolvedLanguage,
  type WordEngine,
} from "@/store";

interface FilePickerCardProps {
  onFileSelect?: (file: File) => void;
  onFileSelectWithHandle?: (file: File, handle?: FileSystemFileHandle) => void;
  accept?: string;
}

export function FilePickerCard({
  onFileSelect,
  onFileSelectWithHandle,
  accept = ".docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf",
}: FilePickerCardProps) {
  const t = useExtracted();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [supportsFileSystemAPI, setSupportsFileSystemAPI] = useState(false);

  // Check if File System Access API is supported
  useEffect(() => {
    if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
      setSupportsFileSystemAPI(true);
    }
  }, []);

  const handleClick = async () => {
    // Prefer File System Access API if available
    if (supportsFileSystemAPI) {
      try {
        // @ts-ignore - File System Access API types
        const [fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: "Office Documents",
              accept: {
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                  [".docx"],
                "application/msword": [".doc"],
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                  [".xlsx"],
                "application/vnd.ms-excel": [".xls"],
                "application/vnd.openxmlformats-officedocument.presentationml.presentation":
                  [".pptx"],
                "application/vnd.ms-powerpoint": [".ppt"],
                "application/pdf": [".pdf"],
              },
            },
          ],
          multiple: false,
        });

        const file = await fileHandle.getFile();
        if (file) {
          if (onFileSelectWithHandle) {
            onFileSelectWithHandle(file, fileHandle);
          } else if (onFileSelect) {
            onFileSelect(file);
          }
        }
        return;
      } catch (err: any) {
        // If the user cancelled the picker, don't fallback to the regular input
        if (err.name === "AbortError") return;
        console.warn("File System Access API error, falling back:", err);
      }
    }

    // Fallback to regular file input
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Regular file input doesn't provide handle
      if (onFileSelectWithHandle) {
        onFileSelectWithHandle(file, undefined);
      } else if (onFileSelect) {
        onFileSelect(file);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!e.dataTransfer) return;

    // 同步获取文件和项目，防止异步后 DataTransfer 被浏览器清除
    const files = Array.from(e.dataTransfer.files);
    const items = Array.from(e.dataTransfer.items);

    if (items.length > 0 && items[0].kind === "file") {
      const item = items[0];
      try {
        // @ts-ignore
        const handle = await (item as any).getAsFileSystemHandle?.();
        if (handle && handle.kind === "file") {
          const file = files[0];
          if (file) {
            if (onFileSelectWithHandle) {
              onFileSelectWithHandle(file, handle);
            } else if (onFileSelect) {
              onFileSelect(file);
            }
            return;
          }
        }
      } catch {
        // 拿不到 handle（浏览器不支持或权限被拒），走下方常规文件回退
      }
    }

    // 回退到常规文件对象
    const fallbackFile = files[0];
    if (fallbackFile) {
      if (onFileSelectWithHandle) {
        onFileSelectWithHandle(fallbackFile, undefined);
      } else if (onFileSelect) {
        onFileSelect(fallbackFile);
      }
    }
  };

  // Handle File System Access API folder picker
  const handleFolderPick = async (
    startIn: "documents" | "desktop" | "downloads",
  ) => {
    if (!supportsFileSystemAPI) return;

    try {
      // @ts-ignore - File System Access API types
      const [fileHandle] = await window.showOpenFilePicker({
        startIn,
        types: [
          {
            description: "Office Documents",
            accept: {
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                [".docx"],
              "application/msword": [".doc"],
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                [".xlsx"],
              "application/vnd.ms-excel": [".xls"],
              "application/vnd.openxmlformats-officedocument.presentationml.presentation":
                [".pptx"],
              "application/vnd.ms-powerpoint": [".ppt"],
              "application/pdf": [".pdf"],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      if (file) {
        // Prefer the new callback with handle, fallback to old one
        if (onFileSelectWithHandle) {
          onFileSelectWithHandle(file, fileHandle);
        } else if (onFileSelect) {
          onFileSelect(file);
        }
      }
    } catch {
      // User cancelled or error occurred
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
      />

      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          w-full flex flex-col items-center justify-center p-6 
          bg-linear-to-br from-primary/5 to-primary/10
          border-[3px] border-dashed rounded-2xl 
          transition-all duration-300 group cursor-pointer
          hover:shadow-lg hover:shadow-primary/10
          ${
            isDragOver
              ? "border-primary bg-primary/20 scale-[1.02]"
              : "border-primary/30 hover:border-primary/60"
          }
        `}
      >
        <div
          className={`
          w-20 h-20 rounded-2xl flex items-center justify-center 
          transition-all duration-300 mb-4
          ${
            isDragOver
              ? "bg-primary scale-110 rotate-12"
              : "bg-primary/10 group-hover:bg-primary group-hover:scale-110"
          }
        `}
        >
          <Upload
            className={`
            w-9 h-9 transition-colors duration-300
            ${isDragOver ? "text-white" : "text-primary group-hover:text-white"}
          `}
          />
        </div>

        <div className="text-center w-full">
          <h3 className="text-lg font-bold mb-1.5 text-foreground">
            {isDragOver ? t("Drop your file here") : t("Choose a file")}
          </h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto mb-1 leading-relaxed">
            {t(
              "Drag and drop your Office document here, or click to browse from your computer",
            )}
          </p>
          <p className="text-[10px] text-text-secondary/70 mb-4">
            {t("Supports: DOCX, DOC, XLSX, XLS, PPTX, PPT, PDF")}
          </p>

          {/* Word 文档解析引擎选择（默认 OnlyOffice，复杂文档推荐 Collabora）。
              点击切换不能触发文件选择，需阻断冒泡。 */}
          <EngineSwitch />


          {/* Quick access buttons for File System Access API */}
          {supportsFileSystemAPI && false && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFolderPick("documents");
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/80 border border-border/50 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-sm font-medium group shadow-sm"
              >
                <FileText className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                <span className="text-gray-700 group-hover:text-blue-700">
                  {t("Docs")}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFolderPick("desktop");
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/80 border border-border/50 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium group shadow-sm"
              >
                <FolderOpen className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                <span className="text-gray-700 group-hover:text-green-700">
                  {t("Desktop")}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFolderPick("downloads");
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/80 border border-border/50 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-sm font-medium group shadow-sm"
              >
                <Download className="w-4 h-4 text-orange-600 group-hover:text-orange-700" />
                <span className="text-gray-700 group-hover:text-orange-700">
                  {t("Downloads")}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Word 文档解析引擎选择器：默认 OnlyOffice，可切换到 Collabora
 * （LibreOffice 内核，对复杂文档解析能力更强）。选择持久化到 store，
 * 打开文档后编辑器按此选择启动对应内核。
 */
function EngineSwitch() {
  const hasHydrated = useHasHydrated();
  const wordEngine = useAppStore((state) => state.wordEngine);
  const resolved = useResolvedLanguage();
  // SSR 与客户端首帧必须输出同一份内容：hydrate 前按站点默认语言（中文）
  // 渲染，与 i18n/request.ts 的 defaultLocale 保持一致；hydrate 后再跟随
  // 用户语言，避免 hydration 不匹配导致整棵 SSR 树被丢弃重渲染。
  const zh = hasHydrated ? resolved.toLowerCase().startsWith("zh") : true;
  // SSR 与客户端首帧必须一致（默认 OnlyOffice），persist 恢复完成后再显示
  // 用户实际选择，否则 localStorage 里的值会触发 hydration 不匹配，
  // 导致 React 丢弃整棵 SSR 树重渲染（表现为页面闪一下 + dev 报 Issue）。
  const activeEngine: WordEngine = hasHydrated ? wordEngine : "onlyoffice";

  // Collabora 就绪状态（storage 侧后台探活）。unknown 表示无 storage 服务
  // （独立部署），按钮保持可用、行为与从前一致。
  const [collaboraState, setCollaboraState] = useState<CollaboraState>("unknown");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      const state = await fetchCollaboraStatus();
      if (!active) return;
      setCollaboraState(state);
      // 未就绪期间 5s 一次直到就绪；就绪后 30s 保活（感知容器重启）；
      // unknown（无 storage）不再轮询，避免无意义请求。
      timer = setTimeout(poll, state === "ok" || state === "unknown" ? 30_000 : 5_000);
    };
    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const setEngine = (engine: WordEngine) => {
    useAppStore.getState().setState({ wordEngine: engine });
  };

  const collaboraStarting = zh
    ? "Collabora 正在启动（首次约需 1 分钟），就绪后自动可用，无需刷新页面"
    : "Collabora is starting (first boot takes ~1 min). It will become available automatically — no page refresh needed";
  const collaboraUnavailable = zh
    ? "Collabora 服务当前不可用，请稍后再试或使用 OnlyOffice"
    : "Collabora is currently unavailable. Try again later or use OnlyOffice";
  const collaboraHint = zh
    ? "Collabora（LibreOffice 内核）：对复杂文档（如 WPS 表单类 Word）解析能力更强"
    : "Collabora (LibreOffice core): renders complex documents (e.g. WPS-style Word forms) more faithfully";
  const onlyOfficeHint = zh
    ? "默认内核，适合常规文档"
    : "Default core for regular documents";

  const collaboraDisabled =
    collaboraState === "warming_up" || collaboraState === "unavailable";
  const collaboraTitle =
    collaboraState === "warming_up"
      ? collaboraStarting
      : collaboraState === "unavailable"
        ? collaboraUnavailable
        : collaboraHint;

  return (
    <div
      className="mb-4 flex flex-col items-center gap-1.5"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-text-secondary/70">
          {zh ? "Word 解析引擎" : "Word engine"}
        </span>
        <div className="inline-flex items-center rounded-lg border border-border bg-background/70 p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setEngine("onlyoffice")}
            title={onlyOfficeHint}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              activeEngine === "onlyoffice"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            OnlyOffice
          </button>
          <button
            type="button"
            onClick={() => setEngine("collabora")}
            disabled={collaboraDisabled}
            title={collaboraTitle}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              activeEngine === "collabora"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
              collaboraDisabled && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
            )}
          >
            {collaboraState === "warming_up" && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            Collabora
          </button>
        </div>
        <span title={collaboraHint} className="cursor-help">
          <Info className="w-3 h-3 text-text-secondary/60" aria-hidden />
        </span>
      </div>
      {/* 常显的引擎说明：加粗引擎名并配色区分，一眼看清两个引擎的取舍 */}
      <p className="max-w-lg text-center text-sm leading-relaxed text-foreground/85">
        {zh ? (
          <>
            <span className="font-semibold text-primary">OnlyOffice</span>
            {" 解析快，但复杂文档解析能力有限；"}
            <span className="font-semibold text-violet-500 dark:text-violet-400">
              Collabora
            </span>
            {" 解析能力强、能处理复杂文档，速度稍慢"}
          </>
        ) : (
          <>
            <span className="font-semibold text-primary">OnlyOffice</span>
            {" is fast but limited on complex documents; "}
            <span className="font-semibold text-violet-500 dark:text-violet-400">
              Collabora
            </span>
            {" handles complex documents better, slightly slower"}
          </>
        )}
      </p>
      {/* 状态提示独立成行，不覆盖上面的引擎说明：让用户在任何时刻都知道
          Collabora 处于什么状态、为什么要等、等待期间该做什么 */}
      {collaboraState === "warming_up" && (
        <p className="max-w-lg text-center text-xs leading-relaxed text-amber-600 dark:text-amber-400">
          {collaboraStarting}
        </p>
      )}
      {collaboraState === "unavailable" && (
        <p className="max-w-lg text-center text-xs leading-relaxed text-red-500">
          {collaboraUnavailable}
        </p>
      )}
    </div>
  );
}
