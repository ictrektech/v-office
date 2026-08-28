"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useEffect,
  useState,
} from "react";
import { X } from "lucide-react";
import { useAppStore, useResolvedLanguage, useHasHydrated } from "@/store";
import {
  API_JS,
  APP_ROOT,
  getDocumentType,
  PRELOAD_HTML,
} from "@/utils/editor/utils";
import io, { MockSocket } from "@/utils/editor/socket";
import { createFetchProxy } from "@/utils/editor/fetch";
import { createXHRProxy } from "@/utils/editor/xhr";
import { DocEditor } from "@/utils/editor/types";
import { createExtensionLoader } from "@/utils/extension";
import InstallExtensionDialog from "@/components/install-extension-dialog";
import DocumentNameDialog from "@/components/document-name-dialog";
import { sitePath } from "@/utils/site-path";

interface NameRequest {
  id: number;
  suggestedName: string;
  extension: string;
}

export default function Page() {
  const server = useAppStore((state) => state.server);
  const language = useResolvedLanguage();
  const theme = useAppStore((state) => state.theme);
  const hasHydrated = useHasHydrated();
  const isDirty = useRef(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [nameRequest, setNameRequest] = useState<NameRequest | null>(null);
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

  const closeDocument = useCallback(() => {
    const zh = language.toLowerCase().startsWith("zh");
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
    window.location.href = sitePath("/");
  }, [language]);

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
    const lang = paramLang || language;
    const uiTheme = paramTheme || theme;

    let editor: DocEditor | null = null;

    MockSocket.on("connect", server.handleConnect);
    MockSocket.on("disconnect", server.handleDisconnect);

    const onAppReady = () => {
      const iframe = document.querySelector<HTMLIFrameElement>(
        'iframe[name="frameEditor"]',
      );
      const win = iframe?.contentWindow as typeof window;
      const iframeDoc = iframe?.contentDocument;
      if (!iframeDoc || !win) {
        throw new Error("Iframe not loaded");
      }

      const xhr = createXHRProxy(win.XMLHttpRequest);
      const fetchProxy = createFetchProxy(win);
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
          const u = new URL(url, location.origin);
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
            edit: editing && doc.fileType !== "pdf",
            chat: false,
            rename: editing,
            protect: editing,
            review: false,
            print: false,
          },
        },
        documentType: documentType,
        editorConfig: {
          lang: lang,
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
          onAppReady: async (e: unknown) => {
            console.log("App ready", e, editor);
            onAppReady();
          },
          onDocumentReady: (e: unknown) => {
            console.log("Document ready", e);
          },
          onDocumentStateChange: (e: { data: boolean; target: unknown }) => {
            console.log("Document state change", e);
            if (e.data) {
              isDirty.current = true;
            }
          },
          onRequestOpen: (e: unknown) => {
            console.log("onRequestOpen", e);
          },
          onError: (e: unknown) => {
            console.log("Error", e);
          },
          onInfo: (e: unknown) => {
            console.log("Info", e);
          },
          onWarning: (e: unknown) => {
            console.log("onWarning", e);
          },
          onRequestSaveAs: (e: unknown) => {
            console.log("onRequestSaveAs", e);
          },
          onSaveDocument: (e: unknown) => {
            console.log("onSaveDocument", e);
            isDirty.current = false;
          },
          onDownloadAs: (e: unknown) => {
            console.log("onDownloadAs", e);
          },
          onSave: (e: unknown) => {
            console.log("onSave", e);
            isDirty.current = false;
          },
          writeFile: async (e: unknown) => {
            console.log("writeFile", e);
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
      loadEditor()
    }

    init()

    return () => {
      MockSocket.off("connect", server.handleConnect);
      MockSocket.off("disconnect", server.handleDisconnect);
      editor?.destroyEditor?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

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
      className="fixed right-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-background/90 text-foreground shadow-md ring-1 ring-border backdrop-blur hover:bg-muted"
    >
      <X className="h-5 w-5" />
    </button>
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
    </>
  );
}
