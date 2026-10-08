"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useEffect,
  useState,
} from "react";
import { X, Upload, Layers, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, useResolvedLanguage, useHasHydrated } from "@/store";
import {
  API_JS,
  APP_ROOT,
  getDocumentType,
  PRELOAD_HTML,
} from "@/utils/editor/utils";
import { ensureKernelCacheWorker } from "@/utils/editor/kernel-cache";
import io, { MockSocket } from "@/utils/editor/socket";
import { createFetchProxy } from "@/utils/editor/fetch";
import { createXHRProxy } from "@/utils/editor/xhr";
import { DocEditor } from "@/utils/editor/types";
import { createExtensionLoader } from "@/utils/extension";
import {
  fetchCollaboraSession,
  fetchCollaboraStatus,
  guessExtension,
  hideCollaboraWelcomeScreen,
  isCollaboraExt,
  isLegacyOfficeExt,
  mustCollaborateOnShared,
  pushDocumentToStorage,
  shouldUseCollabora,
} from "@/utils/editor/collabora";
import { toCollaboraLang, toOnlyOfficeLang } from "@/utils/editor/locale";
import InstallExtensionDialog from "@/components/install-extension-dialog";
import DocumentNameDialog from "@/components/document-name-dialog";
import KnowledgeBaseUploadDialog from "@/components/knowledge-base-upload-dialog";
import {
  isHybragInstalled,
  uploadKnowledgeFile,
} from "@/utils/hybrag/client";
import { clientLog, renameStoredFile } from "@/utils/vos/storage";
import { useRouter } from "next/navigation";
import {
  getVOSAccessToken,
  isVOSMode,
} from "@/utils/vos/fastpath";

const AUTO_SAVE_INTERVAL_MS = 10_000;

interface NameRequest {
  id: number;
  suggestedName: string;
  extension: string;
}

export default function Page() {
  const router = useRouter();
  const server = useAppStore((state) => state.server);
  const language = useResolvedLanguage();
  const theme = useAppStore((state) => state.theme);
  const hasHydrated = useHasHydrated();
  const isDirty = useRef(false);
  const editVersionRef = useRef(0);
  const editorRef = useRef<DocEditor | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [nameRequest, setNameRequest] = useState<NameRequest | null>(null);
  const [showKbUpload, setShowKbUpload] = useState(false);
  const [vosMode, setVosMode] = useState(false);
  /**
   * Word 文档改用 Collabora 内核时的编辑器地址；为空表示走原有 OnlyOffice
   * 内核（默认、以及取不到会话时的回退路径）。
   */
  const [collaboraUrl, setCollaboraUrl] = useState<string | null>(null);
  /** 当前文档是否为 Collabora 可接管的 Word 文档（doc/docx，非新建文档） */
  const [collaboraDoc, setCollaboraDoc] = useState(false);
  /**
   * 当前文档来自共享源（NAS / 公共目录）：统一走 Collabora 多人协同，且不允许
   * 回退到本地内核编辑——整份字节覆盖会抹掉协作者刚改的内容。
   */
  const [sharedCollaborative, setSharedCollaborative] = useState(false);
  /**
   * 老版二进制格式（doc / xls / ppt）：本地内核写不出这些格式，必须走 Collabora，
   * 且同样不允许回退到本地内核编辑。
   */
  const [legacyCollabora, setLegacyCollabora] = useState(false);
  /** 编辑器首帧是否已经画出来；没画出来之前盖一层骨架，避免白屏/黑屏观感 */
  const [editorPainted, setEditorPainted] = useState(false);
  /** Collabora iframe：用于摘掉首启浮层、监听首帧 */
  const collaboraFrameRef = useRef<HTMLIFrameElement | null>(null);
  /** 引擎切换进行中（换会话/重挂编辑器），期间禁用切换按钮 */
  const [switchingEngine, setSwitchingEngine] = useState(false);
  /** 当前实际生效的内核，用于避免重复初始化与切换失败的回退判断 */
  const activeEngineRef = useRef<"onlyoffice" | "collabora" | null>(null);
  /** 打开耗时打点（供 useCallback 里的流程使用；实现由 effect 里的 init 注入） */
  const openMarkRef = useRef<(phase: string) => void>(() => {});
  /** 可重复执行的编辑器启动函数（供 UI 按钮切换内核时复用） */
  const startEditorRef = useRef<((useCollabora: boolean) => Promise<void>) | null>(
    null,
  );
  /** 打开文档时的编辑权限（切换内核时沿用） */
  const editingRef = useRef(true);
  /** HybRAG 是否已安装（未安装时隐藏"上传到知识库"入口） */
  const [kbAvailable, setKbAvailable] = useState(false);
  const tryDirectRef = useRef<(() => Promise<void>) | null>(null);
  const nameResolverRef = useRef<((name: string | null) => void) | null>(null);
  const nameRequestIdRef = useRef(0);

  const requestFileName = useCallback(
    (suggestedName: string, extension: string) => {
      nameResolverRef.current?.(null);
      return new Promise<string | null>((resolve) => {
        nameResolverRef.current = resolve;
        setNameRequest({
          id: ++nameRequestIdRef.current,
          suggestedName,
          extension,
        });
      });
    },
    [],
  );

  const finishNameRequest = useCallback((name: string | null) => {
    const resolve = nameResolverRef.current;
    nameResolverRef.current = null;
    setNameRequest(null);
    resolve?.(name);
  }, []);

  const closeDocument = useCallback(async () => {
    const zh = language.toLowerCase().startsWith("zh");
    // 新建文档在退出时才弹框确认命名（对齐 WPS 等习惯）：编辑期间已用
    // 默认名静默保存，这里确认后把文档重命名为正式名称。
    const untitledName = server.getUntitledSaveName();
    if (untitledName) {
      const extension =
        untitledName.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "docx";
      const name = await requestFileName(
        untitledName.replace(/\.[a-z0-9]{2,5}$/i, ""),
        extension,
      );
      if (name) {
        const target = /\.[a-z0-9]{2,5}$/i.test(name)
          ? name
          : `${name}.${extension}`;
        if (target !== untitledName) {
          try {
            await renameStoredFile(untitledName, target);
          } catch {
            toast.error(
              zh ? "重命名失败，请重试" : "Rename failed. Try again.",
            );
            return; // 改名失败留在编辑器，用户可重试
          }
        }
        server.markUntitledNamed();
      }
      // 用户取消：保留默认名文件，直接退出，文档不会丢失
    }
    if (
      isDirty.current &&
      !window.confirm(
        zh
          ? "文档有未保存的更改，确定要关闭吗？"
          : "This document has unsaved changes. Close it?",
      )
    ) {
      return;
    }
    isDirty.current = false;
    // 客户端路由：别整页刷新（那会白屏闪一下）。列表侧另有缓存，返回即秒出。
    router.replace("/");
  }, [language, router, server, requestFileName]);

  /** Collabora 冷启动等待：遮罩可见时轮询状态直到就绪/超时/用户取消 */
  const [collaboraWaiting, setCollaboraWaiting] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const waitCancelRef = useRef(false);

  /**
   * 确保 Collabora 就绪再继续。warming_up 时展示等待遮罩并自动轮询，
   * unavailable 直接失败，unknown（无 storage 服务）视为可尝试。
   * 返回 false 表示用户应停留在 OnlyOffice。
   */
  const ensureCollaboraReady = useCallback(async (): Promise<boolean> => {
    const zh = language.toLowerCase().startsWith("zh");
    const statusStarted = performance.now();
    const state = await fetchCollaboraStatus();
    openMarkRef.current(
      `status=${state} ${Math.round(performance.now() - statusStarted)}ms`,
    );
    if (state !== "warming_up") {
      if (state === "unavailable") {
        toast.error(
          zh
            ? "Collabora 服务当前不可用，已为你保留 OnlyOffice 内核"
            : "Collabora is currently unavailable, staying on OnlyOffice",
        );
        return false;
      }
      return true; // ok / unknown
    }

    // 冷启动等待：遮罩 + 实时秒数 + 可取消，全程告知用户发生了什么
    const timeoutMs = 150_000;
    const startedAt = Date.now();
    waitCancelRef.current = false;
    setWaitSeconds(0);
    setCollaboraWaiting(true);
    try {
      while (Date.now() - startedAt < timeoutMs) {
        if (waitCancelRef.current) {
          toast.info(
            zh
              ? "已取消等待，继续使用 OnlyOffice 内核"
              : "Waiting cancelled, staying on OnlyOffice",
          );
          return false;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const next = await fetchCollaboraStatus();
        openMarkRef.current(
          `wait-status=${next} at ${Math.round((Date.now() - startedAt) / 1000)}s`,
        );
        if (next === "ok" || next === "unknown") return true;
        if (next === "unavailable") break;
        setWaitSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }
      toast.error(
        zh
          ? "Collabora 启动超时，已为你保留 OnlyOffice 内核，请稍后重试"
          : "Collabora start-up timed out, staying on OnlyOffice. Try again later",
      );
      return false;
    } finally {
      setCollaboraWaiting(false);
    }
  }, [language]);

  /**
   * 手动切换解析内核：doc/docx 默认用 OnlyOffice，用户点击按钮后换
   * Collabora（对复杂文档解析能力更强），也可从 Collabora 切回 OnlyOffice。
   */
  const handleSwitchEngine = useCallback(
    async (useCollabora: boolean) => {
      const start = startEditorRef.current;
      if (!start || switchingEngine) return;
      const zh = language.toLowerCase().startsWith("zh");
      // 强制协同的文档只有一个合法内核：共享盘文档切回本地会整份覆盖协作者的
      // 内容；老格式（doc/xls/ppt）本地内核写不出，切回去等于保存出坏文件。
      if (
        !useCollabora &&
        (server.getSharedTarget() ||
          isLegacyOfficeExt(server.getDocument().fileType))
      ) {
        toast.error(
          zh
            ? "该文档以协同内核打开，不能切回本地内核"
            : "This document stays on the collaboration engine",
        );
        return;
      }
      setSwitchingEngine(true);
      try {
        // 选择持久化，下次从首页打开文档时沿用同一内核
        useAppStore.getState().setState({
          wordEngine: useCollabora ? "collabora" : "onlyoffice",
        });
        if (useCollabora) {
          const ready = await ensureCollaboraReady();
          if (!ready) {
            // 用户取消/服务不可用：内核偏好退回 OnlyOffice，避免下次
            // 打开文档又自动撞一次失败
            useAppStore.getState().setState({ wordEngine: "onlyoffice" });
            return;
          }
        }
        await start(useCollabora);
        if (useCollabora) {
          if (activeEngineRef.current === "collabora") {
            toast.success(
              zh
                ? "已切换到 Collabora 内核：对复杂文档（如 WPS 表单类 Word）的解析能力更强"
                : "Switched to Collabora: it renders complex documents (e.g. WPS-style Word forms) more faithfully",
            );
          } else {
            toast.error(
              zh
                ? "Collabora 内核暂不可用，已保留 OnlyOffice"
                : "Collabora is unavailable, staying on OnlyOffice",
            );
          }
        } else {
          toast.info(
            zh ? "已切换回 OnlyOffice 内核" : "Switched back to OnlyOffice",
          );
        }
      } finally {
        setSwitchingEngine(false);
      }
    },
    [language, server, switchingEngine, ensureCollaboraReady],
  );

  /** 上传到知识库：导出当前文档字节 → hybrag 上传 */
  const handleKbUpload = useCallback(
    async (fileName: string, knowledgeBaseId: string) => {
      const currentEditor = editorRef.current;
      if (!currentEditor) {
        throw new Error(
          language.toLowerCase().startsWith("zh")
            ? "编辑器尚未就绪，请稍后重试"
            : "The editor is not ready yet. Try again later.",
        );
      }
      const exported = await server.exportDocument(currentEditor, fileName);
      if (!exported) {
        throw new Error(
          language.toLowerCase().startsWith("zh")
            ? "文件导出失败，请重试"
            : "Failed to export the document. Try again.",
        );
      }
      await uploadKnowledgeFile(
        knowledgeBaseId,
        exported.fileName,
        exported.data,
      );
    },
    [language, server],
  );

  useEffect(() => {
    server.setFileNameRequester(requestFileName);
    return () => {
      server.setFileNameRequester(null);
      nameResolverRef.current?.(null);
      nameResolverRef.current = null;
    };
  }, [requestFileName, server]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    void isVOSMode().then((vosMode) => {
      setVosMode(vosMode);
      if (!active || !vosMode) return;
      // HybRAG 安装探测（GET 非 404 即已安装）。编辑器初始化会阻塞主线程，
      // 探测请求可能明显变慢，不能加墙钟超时（会误杀已安装环境）。
      void isHybragInstalled().then((installed) => {
        if (active) setKbAvailable(installed);
      });
      interval = setInterval(async () => {
        const currentEditor = editorRef.current;
        if (
          !currentEditor ||
          !isDirty.current ||
          autoSaveInFlightRef.current
        ) {
          return;
        }

        const savingVersion = editVersionRef.current;
        autoSaveInFlightRef.current = true;
        try {
          const saved = await server.requestSave(currentEditor);
          if (saved && editVersionRef.current === savingVersion) {
            isDirty.current = false;
          }
        } finally {
          autoSaveInFlightRef.current = false;
        }
      }, AUTO_SAVE_INTERVAL_MS);
    });

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [server]);

  useLayoutEffect(() => {
    if (!hasHydrated) return;

    const apiUrl = APP_ROOT + API_JS;
    const searchParams = new URLSearchParams(window.location.search);

    const fileId = searchParams.get("fileId");
    const newDoc = searchParams.get("new");
    const fileUrl = searchParams.get("url");
    const paramEditing = searchParams.get("editing");
    const paramLang = searchParams.get("lang");
    const paramTheme = searchParams.get("theme");

    const editing = paramEditing === null ? true : paramEditing !== "0";
    // 界面语言要按内核各自的码表换算，不能原样下发：OnlyOffice 只认 zh / zh-tw，
    // Collabora 认 zh-CN 这类 BCP-47，码对不上就被内核静默忽略、退回英文界面。
    const uiLang = paramLang || language;
    const onlyOfficeLang = toOnlyOfficeLang(uiLang);
    const collaboraLang = toCollaboraLang(uiLang);
    const uiTheme = paramTheme || theme;

    let editor: DocEditor | null = null;

    /**
     * 共享盘文档在协同内核不可用时的只读降级开关：置 true 后挂载的本地内核
     * 只给只读权限——宁可不能编辑，也不能让整份覆盖抹掉协作者的修改。
     */
    let forceReadOnly = false;

    /**
     * 打开文档的分阶段耗时打点，写到 storage 的 /client-log（容器日志里能看到）。
     * 线上"打开要 20 多秒"这类问题必须靠真实数据定位，不能凭猜。
     */
    let mark: (phase: string) => void = () => {};

    // AI 助手等 OnlyOffice 插件运行在编辑器 iframe 内，沿 parent 链查找该桥
    // 获取宿主能力（VOS 访问令牌、当前文档名）。
    window.__voffice = {
      getVOSAccessToken,
      getDocumentTitle: () => server.getDocument().title,
    };

    MockSocket.on("connect", server.handleConnect);
    MockSocket.on("disconnect", server.handleDisconnect);

    const onAppReady = () => {
      // 首帧骨架必须在这里收掉：OnlyOffice 的 app-ready 就是"编辑器壳已经画出来"。
      // 漏掉这一句的后果是那层不透明遮罩一直盖到兜底定时器（原本 20s），
      // 用户看到的就是"打开文档要 20 多秒"——实际文档早就好了。
      setEditorPainted(true);
      mark("paint=onlyoffice-app-ready");
      const iframe = document.querySelector<HTMLIFrameElement>(
        'iframe[name="frameEditor"]',
      );
      const win = iframe?.contentWindow as typeof window;
      const iframeDoc = iframe?.contentDocument;
      if (!iframeDoc || !win) {
        throw new Error("Iframe not loaded");
      }

      // iframe 文档的 baseURI（preload.html 所在目录）是编辑器相对请求
      // 的正确解析基准；代理在父页面上下文构造 Request 时若以父页面为
      // 基准，VOS basePath 下所有相对路径都会错位（404 → 弹"使用文档
      // 时出错"警告 → 点确定后崩溃）。
      // 但本地 dev 的编辑器文档 <base> 指向 ziziyi CDN（跨域），直接用
      // baseURI 会把请求改道到 CDN 缺失资源；完全不传基准又会把相对
      // 请求解析到父页面根，导致所有插件配置加载失败（插件集体消失）。
      // 折中：跨域时用 iframe 自身地址做基准——同源、真实存在、随当前
      // 访问域名走（不写死任何地址），弹窗与插件两个问题都避开。
      const iframeBaseURI = (() => {
        try {
          const base = win.document.baseURI;
          if (new URL(base).origin === location.origin) return base;
          const self = new URL(win.location.href);
          if (self.origin === location.origin) return self.href;
          return undefined;
        } catch {
          return undefined;
        }
      })();
      const xhr = createXHRProxy(win.XMLHttpRequest, iframeBaseURI);
      const fetchProxy = createFetchProxy(win, iframeBaseURI);
      const _Worker = win.Worker;

      xhr.use((request: Request) => {
        return server.handleRequest(request);
      });
      fetchProxy.use((request: Request) => {
        return server.handleRequest(request);
      });
      Object.assign(win, {
        io: io,
        XMLHttpRequest: xhr,
        fetch: fetchProxy,
        Worker: function (url: string, options?: WorkerOptions) {
          // 本地跨域场景（iframeBaseURI 为 undefined）直接用原生 Worker，
          // 由编辑器 iframe 自己按 <base> 解析，维持修复前行为。
          if (!iframeBaseURI) {
            return new _Worker(url, options);
          }
          const u = new URL(url, iframeBaseURI);
          return new _Worker(
            u.href.replace(u.origin, location.origin),
            options,
          );
        },
      });

      // const script = iframeDoc.createElement("script");
      // script.src = apiUrl;
      // iframeDoc.body.appendChild(script);
    };

    const createEditor = () => {
      const doc = server.getDocument();
      const user = server.getUser();
      const documentType = getDocumentType(doc.fileType);

      server.setClient({
        buildVersion: window.DocsAPI!.DocEditor.version(),
      });
      editor = new window.DocsAPI!.DocEditor("placeholder", {
        document: {
          fileType: doc.fileType,
          key: doc.key,
          title: doc.title,
          url: doc.url,

          permissions: {
            // forceReadOnly：共享盘文档在协同内核不可用时的只读降级
            edit: editing && !forceReadOnly && doc.fileType !== "pdf",
            chat: false,
            rename: editing && !forceReadOnly,
            protect: editing && !forceReadOnly,
            review: false,
            print: false,
          },
        },
        documentType: documentType,
        editorConfig: {
          // 换算后的内核语言码（zh / zh-tw…）；对不上的码 OnlyOffice 会静默退回英文
          lang: onlyOfficeLang,
          coEditing: {
            mode: "fast",
            change: false,
          },
          user: {
            ...user,
          },
          customization: {
            uiTheme: uiTheme,
            features: {
              spellcheck: {
                change: false,
              },
            },
            logo: {
              // Base-path aware: /logo-name_*.svg sits at the site root, not
              // the portal root, under VOS sub-path deployments.
              image:
                location.origin +
                (process.env.NEXT_PUBLIC_BASE_PATH ?? "") +
                "/logo-name_black.svg",
              imageDark:
                location.origin +
                (process.env.NEXT_PUBLIC_BASE_PATH ?? "") +
                "/logo-name_white.svg",
              url: location.origin,
            },
          },
        },
        events: {
          onAppReady: async () => {
            onAppReady();
          },
          onDocumentReady: () => {
            mark("doc-ready");
          },
          onDocumentStateChange: (e: { data: boolean; target: unknown }) => {
            if (e.data) {
              isDirty.current = true;
              editVersionRef.current += 1;
            }
          },
          onRequestOpen: () => {},
          onError: () => {},
          onInfo: () => {},
          onWarning: () => {},
          onRequestSaveAs: () => {},
          onSaveDocument: () => {
            isDirty.current = false;
          },
          onDownloadAs: () => {},
          onSave: () => {
            isDirty.current = false;
          },
          writeFile: async () => {
            isDirty.current = false;
          },
        },
        type: "desktop",
        width: "100%",
        height: "100%",
      });
      Object.assign(window, {
        editor,
      });
      editorRef.current = editor;
      return editor;
    };

    const loadEditor = () => {
      if (window.DocsAPI && window.DocsAPI.DocEditor) {
        createEditor();
        return;
      }
      let script = document.querySelector<HTMLScriptElement>(
        `script[src="${apiUrl}"]`,
      );
      if (!script) {
        script = document.createElement("script");
        script.src = apiUrl;
        document.head.appendChild(script);
      }
      script.onload = () => {
        createEditor();
      };
      script.onerror = (e) => {
        console.error("Failed to load DocsAPI script", e);
      };
    };

    const init = async () => {
      const engineOverride = searchParams.get("engine");

      if (newDoc) {
        server.openNew(newDoc)
      }
      if (fileUrl && !fileId) {
        const { loader, tryDirect } = createExtensionLoader({
          onWaiting: () => setShowInstallHint(true),
          onReady: () => setShowInstallHint(false),
        });
        tryDirectRef.current = tryDirect;
        server.openUrl(fileUrl, {
          fileType: searchParams.get("fileType") || '',
          fileName: searchParams.get("fileName") || '',
          loader,
        })
      }

      editingRef.current = editing;

      // 判定必须以实际装载的文档为准：本地文件（拖拽 / 选择 / 最近 / 我的文档
      // 下载）走的是 server.open(file) + router.push("/editor")，URL 上不带
      // 任何参数，只认 searchParams 会永远命中不到。
      const document = server.getDocument();
      const original = server.getOriginalDocument();
      const ext = guessExtension(
        original?.name,
        document.title,
        searchParams.get("fileName"),
        searchParams.get("fileType"),
        fileUrl,
      );
      const collaboraDoc = isCollaboraExt(ext) && !server.isNewDocumentOpen();
      setCollaboraDoc(collaboraDoc);

      /**
       * 共享源（NAS / 公共目录）文档统一走 Collabora 多人协同：同一份文件被多人
       * 同时打开时，只有服务端内核能让所有人进同一个文档会话（互见光标、盘上只有
       * 一份权威字节）。因此不看引擎偏好，也不看部署默认值。
       */
      const sharedTarget = server.getSharedTarget();
      const sharedCollaborative = mustCollaborateOnShared(
        Boolean(sharedTarget),
        ext,
      );
      setSharedCollaborative(sharedCollaborative);

      /**
       * 老版二进制格式（doc / xls / ppt）同样强制走 Collabora：x2t 写不出这些
       * 格式（.doc 输出 0 字节、xls 根本没有实现），留在本地内核上只会得到
       * "能打开、一保存就写坏"的结果。
       */
      const legacyCollabora = isLegacyOfficeExt(ext);
      setLegacyCollabora(legacyCollabora);

      /** 当前文档是否属于"必须走 Collabora"的强制集合（共享源 或 老格式） */
      const forcedCollaborative = sharedCollaborative || legacyCollabora;
      // 打开耗时打点：带文档标识与阶段，落到 storage 的容器日志里
      const t0 = performance.now();
      let docLabel = "";
      mark = (phase: string) =>
        void clientLog(
          `open-timing +${Math.round(performance.now() - t0)}ms ${phase}` +
            (docLabel ? ` | ${docLabel}` : ""),
        );
      openMarkRef.current = mark;

      docLabel =
        `${ext || "?"} new=${server.isNewDocumentOpen()} shared=${sharedCollaborative}` +
        ` legacy=${legacyCollabora}`;
      // 从编辑器路由直接进来（刷新/外链）也要注册内核缓存：字体与内核是每次打开
      // 的最大开销，交给 Service Worker 用 Cache API 兜住（见 public/sw.js）
      ensureKernelCacheWorker();
      mark("init");

      /**
       * 按内核启动编辑器，可重复调用（UI 按钮切换内核时复用）。
       * doc/docx 默认用 OnlyOffice；useCollabora 为 true 时先换取
       * Collabora 会话，取不到再回退 OnlyOffice，保证“新内核不可用”
       * 不会演变成“文档打不开”。
       */
      const startEditor = async (useCollabora: boolean) => {
        // 共享源文档、老格式（doc/xls/ppt）即使不在"手动可切"名单里也强制走协同
        if (useCollabora && (collaboraDoc || forcedCollaborative)) {
          const name =
            original?.name ||
            searchParams.get("fileName") ||
            document.title;
          // 本地文件只在浏览器内存里，Collabora 服务端取不到，先原样推一份
          // 到 storage；?url= 指向存储时文件本来就在，不必重复上传。
          // 共享源（平台授权目录 / NAS）文档本来就在服务端：不推副本，让
          // Collabora 通过 WOPI 直接读写原文件，保存即写回共享盘。
          const ready = sharedTarget
            ? true
            : original
              ? await pushDocumentToStorage(original.name, original.data)
              : Boolean(fileUrl);
          const sessionStarted = performance.now();
          const session = ready
            ? await fetchCollaboraSession(
                name,
                editingRef.current,
                sharedTarget,
                collaboraLang,
              )
            : null;
          mark(
            `session=${session ? "ok" : "fail"} ${Math.round(performance.now() - sessionStarted)}ms`,
          );
          if (session) {
            // 销毁已有 OnlyOffice 实例，避免事件监听残留
            editorRef.current?.destroyEditor?.();
            editorRef.current = null;
            editor?.destroyEditor?.();
            editor = null;
            activeEngineRef.current = "collabora";
            setCollaboraUrl(session.editorUrl);
            return;
          }
          if (forcedCollaborative) {
            // 这类文档绝不回退到本地内核：共享盘文档回退会整份字节覆盖、抹掉
            // 协作者的修改；老格式（doc/xls/ppt）本地内核**写不出**，回退等于
            // "能打开、一保存就写坏"。降级为只读打开，并说明原因。
            forceReadOnly = true;
            toast.error(
              language.toLowerCase().startsWith("zh")
                ? "协同内核暂不可用，已以只读方式打开；为避免写坏或覆盖，请稍后重新打开"
                : "Collaboration engine unavailable — opened read-only to avoid overwriting or corrupting the file",
            );
          } else if (activeEngineRef.current === "onlyoffice") {
            // 手动切换失败：OnlyOffice 仍在运行，维持现状不重复初始化
            console.warn(
              "[editor] Collabora session unavailable, staying on OnlyOffice",
            );
            return;
          } else {
            console.warn(
              "[editor] Collabora session unavailable, falling back to OnlyOffice",
            );
          }
        }

        activeEngineRef.current = "onlyoffice";
        setCollaboraUrl(null);
        editorRef.current?.destroyEditor?.();
        editorRef.current = null;
        editor?.destroyEditor?.();
        editor = null;
        // #placeholder 由 collaboraUrl 条件渲染，等 React 提交后再挂编辑器
        await new Promise((resolve) => setTimeout(resolve, 0));
        loadEditor();
        mark("mount=onlyoffice");
      };
      startEditorRef.current = startEditor;

      // 引擎优先级：URL 参数（调试）> 用户偏好（首页上传卡选择/编辑器内
      // 切换，持久化在 store）> 环境变量默认（OnlyOffice）
      const userEngine = useAppStore.getState().wordEngine;
      const enginePref =
        engineOverride ||
        (userEngine === "collabora"
          ? "collabora"
          : userEngine === "onlyoffice"
            ? "onlyoffice"
            : null);
      const useCollabora =
        forcedCollaborative || shouldUseCollabora(ext, enginePref);
      if (useCollabora && !forcedCollaborative) {
        // 私有现代格式文档：上次会话选了 Collabora 而内核还在冷启动时，先等
        // 就绪再挂载，避免静默回退 OnlyOffice 让用户困惑
        const ready = await ensureCollaboraReady();
        if (!ready) {
          await startEditor(false);
          return;
        }
      }
      // 强制协同的文档（共享源 / 老格式）直接取会话、不做前置探活：那次探活是
      // 一次多余往返，而"内核不可用"由取会话的失败路径兜住（降级为只读），
      // 更快也少一层等待。
      await startEditor(useCollabora);
    }

    init()

    return () => {
      MockSocket.off("connect", server.handleConnect);
      MockSocket.off("disconnect", server.handleDisconnect);
      editor?.destroyEditor?.();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  /**
   * 骨架兜底：正常由 iframe onLoad / onAppReady 收尾。这里只兜 4 秒——骨架的职责
   * 是盖住"路由切进来的那一下白屏"，不是盖住整个加载过程；一旦兜底时间设长，
   * 万一收尾的信号没接上（曾经真实发生过），用户看到的就是干等十几秒的白遮罩。
   */
  useEffect(() => {
    if (editorPainted) return;
    const timer = window.setTimeout(() => setEditorPainted(true), 4_000);
    return () => window.clearTimeout(timer);
  }, [editorPainted]);

  /**
   * 摘掉 Collabora 首启的"What's new"浮层：它会盖住正文，用户点开自己的文档
   * 第一眼看到的是推广内容。同源 iframe 直接移除该节点，不动服务端行为。
   */
  useEffect(() => {
    const frame = collaboraFrameRef.current;
    if (!frame) return;
    return hideCollaboraWelcomeScreen(frame);
  }, [collaboraUrl]);

  /** 渲染期用的同一判定（强制走 Collabora 的文档不给"切回本地内核"的入口） */
  const forcedCollaborative = sharedCollaborative || legacyCollabora;

  /**
   * 悬浮按钮组的落点。
   *
   * Collabora 的顶栏是一条窄带，而且最右侧是它自带的协作者头像 / Editing 等
   * 控件：按 OnlyOffice 的尺寸摆（h-9 + top-3，36px 高从 12px 起）会往下探出
   * 顶栏、压住下面的工具栏，也会蹭到头像。所以 Collabora 用更矮的一组、贴到
   * 最上沿，并整体左移一档让开右侧控件；OnlyOffice 顶栏更高，维持原位不动。
   */
  const actions = collaboraUrl
    ? {
        group: "right-60 top-1 gap-1.5",
        button:
          "flex h-7 items-center gap-1 rounded-lg bg-background/90 px-2.5 text-foreground shadow-md ring-1 ring-border backdrop-blur hover:bg-muted disabled:opacity-60",
        icon: "h-3.5 w-3.5",
        text: "text-xs font-medium",
        close: "right-44 top-1 h-7 w-7",
      }
    : {
        group: "right-52 top-3 gap-2",
        button:
          "flex h-9 items-center gap-1.5 rounded-lg bg-background/90 px-3 text-foreground shadow-md ring-1 ring-border backdrop-blur hover:bg-muted disabled:opacity-60",
        icon: "h-4 w-4",
        text: "text-sm font-medium",
        close: "right-40 top-3 h-9 w-9",
      };

  return (
    <>
    {nameRequest && (
      <DocumentNameDialog
        key={nameRequest.id}
        suggestedName={nameRequest.suggestedName}
        extension={nameRequest.extension}
        language={language}
        onCancel={() => finishNameRequest(null)}
        onSave={(name) => finishNameRequest(name)}
      />
    )}
    <InstallExtensionDialog
      open={showInstallHint}
      onClose={() => setShowInstallHint(false)}
      onTryDirect={tryDirectRef.current || undefined}
    />
    {/*
      顶右操作按钮组（内核切换 / 上传知识库）。
      这两个按钮各自写死 right 偏移时会互相压字：按钮带文字，宽度随语言变化
      （中文「上传到知识库」vs 英文 "Upload to KB"），固定偏移无法预估实际宽度。
      改成 flex 排布，整组锚在原知识库按钮的位置（right-52），
      内核切换按钮排在前面 → 渲染在知识库按钮左侧，间距由 gap 保证。
      关闭按钮仍单独用 right-40 定位，位置不变。
    */}
    <div className={`fixed z-50 flex items-center ${actions.group}`}>
      {collaboraDoc && !collaboraUrl && !sharedCollaborative && (
        <button
          type="button"
          onClick={() => handleSwitchEngine(true)}
          disabled={switchingEngine}
          aria-label={
            language.toLowerCase().startsWith("zh")
              ? "使用 Collabora 打开"
              : "Open with Collabora"
          }
          title={
            language.toLowerCase().startsWith("zh")
              ? "使用 Collabora 打开：对复杂文档（如 WPS 表单类 Word）解析能力更强"
              : "Open with Collabora: renders complex documents (e.g. WPS-style Word forms) more faithfully"
          }
          className="flex h-9 items-center gap-1.5 rounded-lg bg-background/90 px-3 text-foreground shadow-md ring-1 ring-border backdrop-blur hover:bg-muted disabled:opacity-60"
        >
          <Layers className="h-4 w-4" />
          <span className="text-sm font-medium">
            {language.toLowerCase().startsWith("zh")
              ? "使用 Collabora 打开"
              : "Open with Collabora"}
          </span>
        </button>
      )}
      {/* 强制协同的文档（共享盘 / 老格式）不给"切回本地内核"的入口 */}
      {collaboraUrl && !forcedCollaborative && (
        <button
          type="button"
          onClick={() => handleSwitchEngine(false)}
          disabled={switchingEngine}
          aria-label={
            language.toLowerCase().startsWith("zh")
              ? "切换回 OnlyOffice"
              : "Switch back to OnlyOffice"
          }
          title={
            language.toLowerCase().startsWith("zh")
              ? "切换回 OnlyOffice 内核"
              : "Switch back to OnlyOffice"
          }
          className={actions.button}
        >
          <RotateCcw className={actions.icon} />
          <span className={actions.text}>
            {language.toLowerCase().startsWith("zh")
              ? "切换回 OnlyOffice"
              : "Back to OnlyOffice"}
          </span>
        </button>
      )}
      {vosMode && kbAvailable && (
        <button
          type="button"
          onClick={() => setShowKbUpload(true)}
          aria-label={
            language.toLowerCase().startsWith("zh")
              ? "上传到知识库"
              : "Upload to knowledge base"
          }
          title={
            language.toLowerCase().startsWith("zh")
              ? "上传到知识库"
              : "Upload to knowledge base"
          }
          className={actions.button}
        >
          <Upload className={actions.icon} />
          <span className={actions.text}>
            {language.toLowerCase().startsWith("zh")
              ? "上传到知识库"
              : "Upload to KB"}
          </span>
        </button>
      )}
    </div>
    <button
      type="button"
      onClick={closeDocument}
      aria-label={
        language.toLowerCase().startsWith("zh")
          ? "关闭当前文档"
          : "Close document"
      }
      title={
        language.toLowerCase().startsWith("zh")
          ? "关闭当前文档"
          : "Close document"
      }
      className={`fixed z-50 flex items-center justify-center rounded-lg bg-background/90 text-foreground shadow-md ring-1 ring-border backdrop-blur hover:bg-muted ${actions.close}`}
    >
      <X className={collaboraUrl ? "h-4 w-4" : "h-5 w-5"} />
    </button>
    {collaboraUrl ? (
      <iframe
        ref={collaboraFrameRef}
        title="document"
        src={collaboraUrl}
        className="fixed inset-0 h-screen w-screen border-0"
        allow="clipboard-read; clipboard-write; fullscreen"
        onLoad={() => {
          setEditorPainted(true);
          openMarkRef.current("paint=collabora-iframe");
        }}
      />
    ) : (
      <div>
        <div className="w-screen h-screen">
          <div id="placeholder">
            <iframe
              className="w-0 h-0 hidden"
              src={APP_ROOT + PRELOAD_HTML}
            ></iframe>
          </div>
        </div>
      </div>
    )}
    {/*
      首帧骨架：从路由切进编辑器页到内核真正画出内容之间，避免白屏/黑屏闪一下。
      Collabora 用 iframe onLoad 收尾、OnlyOffice 用 onAppReady 收尾，另有一道
      兜底定时器，任何异常都不会让骨架常驻。
    */}
    {!editorPainted && !collaboraWaiting && (
      <div className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {language.toLowerCase().startsWith("zh")
              ? "正在打开文档…"
              : "Opening document…"}
          </p>
        </div>
      </div>
    )}
    {showKbUpload && (
      <KnowledgeBaseUploadDialog
        language={language}
        suggestedName={server.getDocument().title}
        extension={server.getDocument().fileType}
        onCancel={() => setShowKbUpload(false)}
        onUpload={handleKbUpload}
      />
    )}
    {collaboraWaiting && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl bg-card px-10 py-8 text-center shadow-xl ring-1 ring-border">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-base font-semibold">
            {language.toLowerCase().startsWith("zh")
              ? "正在启动 Collabora 解析内核…"
              : "Starting the Collabora engine…"}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {language.toLowerCase().startsWith("zh")
              ? "Collabora 容器首次启动约需 1 分钟。无需刷新页面，就绪后将自动为你打开文档。"
              : "First boot takes about a minute. No need to refresh — the document will open automatically once it is ready."}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {language.toLowerCase().startsWith("zh")
              ? `已等待 ${waitSeconds} 秒`
              : `Waited ${waitSeconds}s`}
          </p>
          <button
            type="button"
            onClick={() => {
              waitCancelRef.current = true;
            }}
            className="mt-1 rounded-lg border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {language.toLowerCase().startsWith("zh") ? "取消，使用 OnlyOffice" : "Cancel, use OnlyOffice"}
          </button>
        </div>
      </div>
    )}
    {/* 全局 toast 容器已提升到根 layout（components/app-toaster.tsx），
        这里不再单独渲染，否则同一条 toast 会显示两次 */}
    </>
  );
}
