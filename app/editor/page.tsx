"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useEffect,
  useState,
} from "react";
import { X, Upload, RotateCcw, Loader2, Sparkles } from "lucide-react";
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
  alignCollaboraHost,
  fetchCollaboraSession,
  fetchCollaboraStatus,
  guessExtension,
  hideCollaboraWelcomeScreen,
  pushDocumentToStorage,
} from "@/utils/editor/collabora";
import { mustStayOnCollabora, resolveEngine } from "@/utils/editor/engine";
import { toCollaboraLang, toOnlyOfficeLang } from "@/utils/editor/locale";
import InstallExtensionDialog from "@/components/install-extension-dialog";
import DocumentNameDialog from "@/components/document-name-dialog";
import KnowledgeBaseUploadDialog from "@/components/knowledge-base-upload-dialog";
import {
  isHybragInstalled,
  uploadKnowledgeFile,
} from "@/utils/hybrag/client";
import {
  clientLog,
  listStoredFiles,
  renameStoredFile,
  type SharedTarget,
} from "@/utils/vos/storage";
import { useRouter } from "next/navigation";
import {
  getVOSAccessToken,
  isVOSMode,
} from "@/utils/vos/fastpath";
import { useAiChat } from "@/hooks/use-ai-chat";
import { AgentPanel } from "@/components/studio/agent-panel";

const AUTO_SAVE_INTERVAL_MS = 10_000;

/** 右上角「AI 微调」入口暂不展示；右栏与改稿逻辑保留，恢复时改回 true。 */
const SHOW_AI_TOUCHUP = false;

/**
 * 「我的文档」里是否已经有这个文件名。
 *
 * 换 Collabora 会话前要先往私有存储推一份原文件副本，而那个 PUT 是**覆盖写**：
 * 模板 / 外链的文件名是固定的，一旦用户按原名保存过，推副本就会把用户的成果换成
 * 一份干净模板。取不到列表（非 VOS 部署）时返回 false —— 那种环境下推副本本来
 * 就会失败并回退，不会误判。
 */
async function storedNameTaken(name: string): Promise<boolean> {
  try {
    return (await listStoredFiles()).some((file) => file.name === name);
  } catch {
    return false;
  }
}

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
  /** Collabora 内核的编辑器地址；为空表示当前跑的是 OnlyOffice。 */
  const [collaboraUrl, setCollaboraUrl] = useState<string | null>(null);
  /** 编辑器首帧是否已经画出来；没画出来之前盖一层骨架，避免白屏/黑屏观感 */
  const [editorPainted, setEditorPainted] = useState(false);
  /** Collabora iframe：用于摘掉首启浮层、监听首帧 */
  const collaboraFrameRef = useRef<HTMLIFrameElement | null>(null);
  /**
   * 微调模式：URL 带 `?ai=<skill>` 时右栏挂 PI 助手，文档留在左侧。
   *
   * 同步**不走注入**：PI 改的是「我的文档」里那份 docx（服务端以 **Word 修订**呈现），
   * 左侧点「同步到编辑器」重新加载一次会话就能看到修订，用户用 Word 原生的
   * 接受/拒绝逐条审阅——可审、可逆、无 postMessage 时序竞态。
   */
  const [aiSkill, setAiSkill] = useState("");
  /** 当前打开的文档名（回灌草稿、重新加载会话都要用它） */
  const [docName, setDocName] = useState("");
  const [syncing, setSyncing] = useState(false);
  /** 重新加载会话所需的入参：startEditor 里确定后存下来，供「同步」按钮复用 */
  const collaboraArgsRef = useRef<{
    name: string;
    editing: boolean;
    sharedTarget: SharedTarget | null;
    lang: string;
  } | null>(null);
  /** 每次重新加载 +1：逼 coolwsd 丢开内存里的旧文档、重新读盘 */
  const collaboraVersionRef = useRef(0);
  /** 打开耗时打点（供 useCallback 里的流程使用；实现由 effect 里的 init 注入） */
  const openMarkRef = useRef<(phase: string) => void>(() => {});
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

  /** 微调模式开关：右栏 PI 展开着（URL 带 `?ai=` 进来，或点右上角「AI 微调」） */
  const aiMode = aiSkill !== "";

  /**
   * 微调用的技能包：URL 的 `ai=<skill>` 优先（从工作台跳过来会带对的那个），
   * 否则按写作走——编辑器右上角那个「AI 微调」是通用改稿入口，不该逼用户先选技能。
   */
  const [aiDefaultSkill, setAiDefaultSkill] = useState("writing");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ai = params.get("ai") || "";
    if (ai) {
      setAiDefaultSkill(ai);
      setAiSkill(ai);
    }
  }, []);

  /** 微调会话：标题取文档名——会话标题就是落盘 docx 的名字，回灌才接得上 */
  const chat = useAiChat({
    skill: aiSkill || "writing",
    title: docName,
    paused: !aiMode || !docName,
    // 按文档记忆：同一份文档的微调对话留在自己那条线上，刷新后还在
    persistKey: docName ? `ai:editor:${docName}` : undefined,
  });

  /**
   * 把编辑器里的最新内容回灌成草稿。
   *
   * PI 每次动手前都要做一遍：用户在编辑器里手改过、又没回灌的话，PI 会拿着旧稿
   * 去改，一落盘就把他的手改覆盖掉——这是这条链路最容易出事的地方。
   */
  const pullFromEditor = useCallback(async () => {
    if (!docName) return;
    try {
      await chat.importDocx(docName);
    } catch {
      /* 文档还没导出过 / 编辑器还没保存：保持现有草稿，别把整条链路打断 */
    }
  }, [chat, docName]);

  /**
   * 重新加载左侧文档：换一个会话版本号，Collabora 就丢开内存里的旧文档重新读盘。
   * 这是「看到 AI 修订」的唯一动作（做法见文件头那段同步说明）。
   */
  const syncEditor = useCallback(async () => {
    const args = collaboraArgsRef.current;
    if (!args?.name) return;
    setSyncing(true);
    try {
      collaboraVersionRef.current += 1;
      const session = await fetchCollaboraSession(
        args.name,
        args.editing,
        args.sharedTarget,
        args.lang,
        true, // retry：401 时清一次鉴权缓存重试
        collaboraVersionRef.current, // version > 0 → 换 docKey，Collabora 重新读盘
      );
      if (!session) {
        toast.error("重新加载失败：拿不到协同会话");
        return;
      }
      setEditorPainted(false);
      setCollaboraUrl(alignCollaboraHost(session.editorUrl));
    } finally {
      setSyncing(false);
    }
  }, []);

  /**
   * PI 改完一轮就自动把左侧刷成最新：用户在右侧说完话，左边直接变成带修订的新版
   * （Word 原生修订，逐条接受/拒绝）。
   *
   * 刻意不做「有没有未同步改动」这类状态判断——发送前必回灌 + 改完自动重载，
   * 两句话说得清，用户也不用记自己该点哪个按钮。
   */
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    const now = chat.streaming;
    if (wasStreamingRef.current && !now && aiMode && docName) {
      void syncEditor();
    }
    wasStreamingRef.current = now;
  }, [chat.streaming, aiMode, docName, syncEditor]);

  /** 刚进微调（或换了文档）时先回灌一次，免得 PI 拿着空草稿就开始改 */
  const hydratedForRef = useRef("");
  useEffect(() => {
    if (!aiMode || !docName || !chat.sessionId) return;
    if (hydratedForRef.current === docName) return;
    hydratedForRef.current = docName;
    void pullFromEditor();
  }, [aiMode, docName, chat.sessionId, pullFromEditor]);

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
            ? "Collabora 服务当前不可用"
            : "Collabora is currently unavailable",
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
            zh ? "已取消等待 Collabora 启动" : "Stopped waiting for Collabora",
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
        zh ? "Collabora 启动超时，请稍后重试" : "Collabora start-up timed out",
      );
      return false;
    } finally {
      setCollaboraWaiting(false);
    }
  }, [language]);

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
      // 唯一的引擎决策：扩展名 + 是否公共区 + 首页开关。
      const sharedTarget = server.getSharedTarget();
      const useCollabora =
        resolveEngine(ext, useAppStore.getState().wordEngine, Boolean(sharedTarget)) ===
        "collabora";
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
        `${ext || "?"} new=${server.isNewDocumentOpen()}` +
        ` engine=${useCollabora ? "collabora" : "onlyoffice"}`;
      // 从编辑器路由直接进来（刷新/外链）也要注册内核缓存：字体与内核是每次打开
      // 的最大开销，交给 Service Worker 用 Cache API 兜住（见 public/sw.js）
      ensureKernelCacheWorker();
      mark("init");

      /**
       * 按内核启动编辑器。useCollabora 时先换会话；换不到则回退——
       * 老格式只能只读（本地内核写不出），其余格式退回 OnlyOffice。
       */
      const startEditor = async (useCollabora: boolean, readOnly = false) => {
        forceReadOnly = readOnly;
        if (useCollabora) {
          // 只有 openUrl 打开（模板 / 外链）才会"决策时还没有字节"：本地文件、
          // 我的文档、共享源都是 open(file)，open 里已经同步留底了。
          const lazyUrlOpened = !sharedTarget && !original;
          if (lazyUrlOpened) {
            // 原文件字节是"装载时才留底"的，不等装载完成就是 null，会话必然取不到
            // 文件——模板换了半天 Collabora 却总是回退 OnlyOffice，根因就在这里。
            try {
              await server.ensureLoaded();
            } catch (error) {
              // 装载失败（模板文件 404 / 转换失败）不在这里炸：让下面的 ready
              // 落空、正常回退 OnlyOffice，由它把加载错误照旧呈现给用户。
              console.warn(
                "[editor] document load failed before the Collabora session",
                error,
              );
            }
          }
          const source = sharedTarget
            ? null
            : (server.getOriginalDocument() ?? original);

          // 推副本用的是 PUT（覆盖写），而模板 / 外链的文件名是固定的：用户"点模板
          // → 编辑 → 直接保存"过之后，「我的文档」里就躺着同名文件，这里会把他的
          // 成果悄悄换成一份干净模板。所以撞名时不推、退回 OnlyOffice（那条路只从
          // URL 读，不写盘）。拖拽 / 我的文档打开不走这一支——推上去的就是他自己
          // 那份，覆盖是预期内的。
          const taken =
            lazyUrlOpened && source ? await storedNameTaken(source.name) : false;

          const name = source?.name || searchParams.get("fileName") || document.title;
          // 本地文件只在浏览器内存里，Collabora 服务端取不到，先原样推一份到
          // storage；?url= 直接指向存储时文件本来就在，不必重复上传。
          // 共享源（平台授权目录 / NAS）文档本来就在服务端：不推副本，让
          // Collabora 通过 WOPI 直接读写原文件，保存即写回共享盘。
          let ready = false;
          if (taken) {
            toast.error(
              language.toLowerCase().startsWith("zh")
                ? `「我的文档」里已有同名文件 ${name}，为避免覆盖它，请先重命名后再用 Collabora 打开`
                : `"${name}" already exists in My Documents. Rename it first, or keep using OnlyOffice.`,
            );
          } else if (sharedTarget) {
            ready = true;
          } else if (source) {
            ready = await pushDocumentToStorage(name, source.data);
          } else {
            ready = Boolean(fileUrl);
          }
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
            setCollaboraUrl(alignCollaboraHost(session.editorUrl));
            // 微调模式要用：文档名 + 重新加载会话所需的入参
            setDocName(name);
            collaboraArgsRef.current = {
              name,
              editing: editingRef.current,
              sharedTarget: sharedTarget ?? null,
              lang: collaboraLang,
            };
            return;
          }
          if (mustStayOnCollabora(ext, Boolean(sharedTarget))) {
            // 老格式写不出、公共区会被整份覆盖：宁可只读，也不能写坏/覆盖
            forceReadOnly = true;
            toast.error(
              language.toLowerCase().startsWith("zh")
                ? "Collabora 暂不可用，已以只读方式打开；请稍后重新打开以便编辑"
                : "Collabora is unavailable — opened read-only. Reopen later to edit",
            );
          } else {
            console.warn(
              "[editor] Collabora session unavailable, falling back to OnlyOffice",
            );
            toast.error(
              language.toLowerCase().startsWith("zh")
                ? "Collabora 暂不可用，已改用 OnlyOffice 打开"
                : "Collabora is unavailable — opened with OnlyOffice instead",
            );
          }
        }

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

      if (useCollabora) {
        const ready = await ensureCollaboraReady();
        if (!ready) {
          // 老格式与公共区文档不能退回本地内核，只能只读打开
          const readOnly = mustStayOnCollabora(ext, Boolean(sharedTarget));
          if (readOnly) {
            toast.error(
              language.toLowerCase().startsWith("zh")
                ? "该文档只能由 Collabora 编辑，已以只读方式打开"
                : "This document can only be edited with Collabora — opened read-only",
            );
          }
          await startEditor(false, readOnly);
          return;
        }
      }
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
        // 微调模式下右栏占了 26rem，按钮组整体再左移一档，别压在面板上
        group: aiMode ? "right-[41rem] top-1 gap-1.5" : "right-60 top-1 gap-1.5",
        button:
          "flex h-7 items-center gap-1 rounded-lg bg-background/90 px-2.5 text-foreground shadow-md ring-1 ring-border backdrop-blur hover:bg-muted disabled:opacity-60",
        icon: "h-3.5 w-3.5",
        text: "text-xs font-medium",
        close: aiMode ? "right-[37rem] top-1 h-7 w-7" : "right-44 top-1 h-7 w-7",
      }
    : {
        group: aiMode ? "right-[39rem] top-3 gap-2" : "right-52 top-3 gap-2",
        button:
          "flex h-9 items-center gap-1.5 rounded-lg bg-background/90 px-3 text-foreground shadow-md ring-1 ring-border backdrop-blur hover:bg-muted disabled:opacity-60",
        icon: "h-4 w-4",
        text: "text-sm font-medium",
        close: aiMode ? "right-[36rem] top-3 h-9 w-9" : "right-40 top-3 h-9 w-9",
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
    {/* 顶右操作按钮组（上传知识库 / AI 微调） */}
    <div className={`fixed z-50 flex items-center ${actions.group}`}>
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
      {/*
        AI 微调：就地展开右栏，不跳页——左侧文档原地不动，用户不会有"换了地方"的
        感觉；再点一次收起。同步做法见文件头那段说明（PI 改稿 → 自动重载看 Word 修订）。
      */}
      {SHOW_AI_TOUCHUP && collaboraUrl && (
        <button
          type="button"
          onClick={() => {
            // 还没保存/命名的新文档：PI 没有可改的基准，给一句话而不是静默无反应
            if (!aiMode && !docName) {
              toast.info(
                language.toLowerCase().startsWith("zh")
                  ? "先保存这份文档（起个名），PI 才能基于它改稿"
                  : "Save the document first (give it a name) so PI has something to revise",
              );
              return;
            }
            setAiSkill((prev) => (prev ? "" : aiDefaultSkill));
          }}
          aria-label={
            language.toLowerCase().startsWith("zh") ? "AI 微调" : "AI touch-up"
          }
          title={
            language.toLowerCase().startsWith("zh")
              ? "让 PI 在右侧改这份文档：改动以 Word 修订标出，你在左侧接受或拒绝"
              : "Let PI revise this document on the right — edits come back as Word revisions for you to accept or reject"
          }
          className={`${actions.button} ${aiMode ? "text-[#E2562B]" : ""}`}
        >
          <Sparkles className={actions.icon} />
          <span className={actions.text}>
            {language.toLowerCase().startsWith("zh") ? "AI 微调" : "AI touch-up"}
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
        className={
          aiMode
            ? "fixed inset-y-0 left-0 right-[26rem] h-screen border-0"
            : "fixed inset-0 h-screen w-screen border-0"
        }
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
      微调模式右栏：PI 助手。
      PI 改的是「我的文档」里那份 docx，改完点「同步到编辑器」重新加载左侧即可看到
      修订（用 Word 原生接受/拒绝）。PI 每次发送前先把编辑器里的最新内容回灌成草稿，
      免得拿着旧稿去改、把用户的手改覆盖掉。
    */}
    {aiMode ? (
      <aside className="fixed inset-y-0 right-0 z-40 flex w-[26rem] flex-col border-l border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#0F0F10]">
        <header className="flex shrink-0 items-center gap-2 border-b border-black/[0.06] px-3 py-2.5 dark:border-white/10">
          <Sparkles className="h-4 w-4 shrink-0 text-[#E2562B]" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#1A1A1A] dark:text-white">
            {docName || "微调"}
          </span>
          <button
            type="button"
            onClick={() => void syncEditor()}
            disabled={syncing || !docName}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#F2BBA3] px-2 py-1 text-[11.5px] font-medium text-[#E2562B] transition hover:bg-[#FBF2EE] disabled:opacity-40 dark:hover:bg-[#2A1A14]"
          >
            {syncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
            同步到编辑器
          </button>
        </header>
        <div className="min-h-0 flex-1">
          <AgentPanel
            messages={chat.messages}
            materials={chat.materials}
            template={chat.template}
            streaming={chat.streaming}
            blocked={chat.blocked}
            sessionReady={!!chat.sessionId}
            lastSaved={chat.lastSaved}
            onSend={(text) => {
              void (async () => {
                await pullFromEditor();
                await chat.send(text);
              })();
            }}
            onStop={chat.stop}
            onUpload={chat.upload}
            onUploadTemplate={(file) => chat.uploadTemplate(file)}
            onRemoveTemplate={() => void chat.removeTemplate()}
            onRemoveMaterial={(name) => void chat.removeMaterial(name)}
            onAcceptChange={(key) => void chat.acceptChange(key)}
            onRejectChange={chat.rejectChange}
            onAcceptAll={() => void chat.acceptAll()}
            onSave={() => void chat.saveNow()}
            panelWidth="w-full"
            className="h-full min-h-0 border-none bg-transparent dark:bg-transparent"
          />
        </div>
      </aside>
    ) : null}
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
