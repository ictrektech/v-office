import { converter } from "./x2t";
import { MockSocket } from "./socket";
import {
  User,
  Participant,
  AscSaveTypes,
  ServerOptions,
  DocEditor,
} from "./types";
import { emptyDocx, emptyPdf, emptyPptx, emptyXlsx } from "./empty";
import { getDocumentType, getFileExt } from "./utils";
import { allPlugins, featuredPlugins, getPluginConfigUrl } from "./plugins";
import { isVOSMode } from "@/utils/vos/fastpath";
import { saveCloudFile, clientLog } from "@/utils/vos/storage";

// AI 助手插件统一走 VOS 网关形态路径（本地 dev 由 next.config.ts rewrite 映射到
// public/ai-assistant 镜像副本，VOS 由平台网关路由到 agentic-search 应用）。
// 注意：不要用 process.env.NEXT_PUBLIC_BASE_PATH 在此分支——worker 编译时该
// 常量不可靠（会被折叠成本地分支，VOS 分支字符串不进 bundle）。
// 该路径必须以 config.json 结尾——sdkjs 用「来源目录 + url」拼接插件地址。
export const AGENTIC_SEARCH_PLUGIN_CONFIG =
  "/app/com.ictrek.agentic-search/plugins/agentic-search/config.json";

function mergeBuffers(buffers: Uint8Array[]) {
  const totalLength = buffers.reduce((acc, buffer) => acc + buffer.length, 0);
  const mergedBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    mergedBuffer.set(buffer, offset);
    offset += buffer.length;
  }
  return mergedBuffer;
}

function randomId() {
  return Math.random().toString(36).substring(2, 9);
}

function getUrl(data: Uint8Array, type?: string) {
  const blob = new Blob([data as Uint8Array<ArrayBuffer>], {
    type: type || "application/octet-stream",
  });
  return URL.createObjectURL(blob);
}

export class EditorServer {
  private id = "";
  private socket: MockSocket | null = null;
  private sessionId: string = "session-id";
  private user: User = {
    id: "uid",
    name: "Me",
  };
  private client = {
    buildVersion: "9.3.0",
    buildNumber: 8,
  };
  private participants: Participant[] = [];
  private syncChangesIndex = 0;
  private loadPromise: Promise<void> | null = null;

  private file: File | null = null;
  private fileType: string = "docx";
  private title: string = "";
  private isNewDocument = false;
  /** 新建文档在编辑期间静默保存用的默认文件名（退出时 UI 据此弹框改名） */
  private untitledSavedAs: string | null = null;
  private requestFileName:
    | ((suggestedName: string, extension: string) => Promise<string | null>)
    | null = null;
  private saveRequest:
    | {
        resolve: (success: boolean) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    | null = null;
  private fsMap: Map<string, Uint8Array> = new Map();
  private urlsMap: Map<string, string> = new Map();

  private downloadId: string = "";
  private downloadParts: Uint8Array[] = [];

  /** 导出模式：非空表示当前 downloadAs 会话用于导出字节（上传知识库） */
  private exportResolver:
    | ((result: { fileName: string; data: Uint8Array } | null) => void)
    | null = null;
  private exportFileName: string | null = null;

  private options: ServerOptions = {};

  constructor(options: ServerOptions = {}) {
    this.options = options;
    this.send = this.send.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }

  async open(
    file: File,
    { fileType, fileName }: { fileType?: string; fileName?: string } = {},
  ) {
    const title = fileName || file.name;
    this.fileType = fileType || getFileExt(file.name) || "docx";
    const documentType = getDocumentType(this.fileType);
    this.id = randomId();
    this.file = file;
    this.title = title;
    this.isNewDocument = false;
    const buffer = await file.arrayBuffer();
    this.loadPromise = this.loadDocument(buffer, this.fileType);

    return {
      id: this.id,
      documentType,
    };
  }

  openNew(fileType?: string) {
    this.fileType = fileType || "docx";
    // TODO: should generate new id?
    this.id = this.id || randomId();
    this.title = "New Document";
    this.isNewDocument = true;
    const documentType = getDocumentType(this.fileType);

    let binData: Uint8Array | null = null;

    switch (documentType) {
      case "word":
        binData = Uint8Array.from(emptyDocx, (v) => v.charCodeAt(0));
        break;
      case "cell":
        binData = Uint8Array.from(emptyXlsx, (v) => v.charCodeAt(0));
        break;
      case "slide":
        binData = Uint8Array.from(emptyPptx, (v) => v.charCodeAt(0));
        break;
      case "pdf":
        binData = Uint8Array.from(emptyPdf, (v) => v.charCodeAt(0));
        break;
    }

    if (!binData) {
      throw new Error("Failed to create new document");
    }

    this.fsMap.set("Editor.bin", binData);
    this.urlsMap.set("Editor.bin", getUrl(binData));

    return {
      id: this.id,
      documentType: documentType,
    };
  }

  async openUrl(
    url: string,
    {
      fileType,
      fileName,
      loader = (url: string) => fetch(url).then((res) => res.arrayBuffer()),
    }: {
      fileType?: string;
      fileName?: string;
      loader?: (url: string) => Promise<ArrayBuffer>;
    } = {},
  ) {
    const title = fileName || decodeURIComponent(url.split("/").pop() || "Document")
    this.fileType = fileType || getFileExt(title) || "docx";
    const documentType = getDocumentType(this.fileType);
    this.id = randomId();
    this.title = title;
    this.isNewDocument = false;
    this.loadPromise = this.loadDocument(() => loader(url), this.fileType);

    return {
      id: this.id,
      documentType,
    };
  }

  getDocument() {
    if (!this.id) {
      this.openNew();
    }

    return {
      fileType: this.fileType,
      key: this.id,
      title: this.title,
      url: "/" + this.id,
    };
  }

  getUser() {
    return this.user;
  }

  private async loadDocument(
    buffer: ArrayBuffer | (() => Promise<ArrayBuffer>),
    fileType: string,
  ) {
    if (typeof buffer == "function") {
      buffer = await buffer();
    }

    let output: Uint8Array | null = null;
    let media: { [key: string]: Uint8Array } = {};

    if (fileType == "pdf") {
      output = new Uint8Array(buffer);
    } else {
      const result = await converter.convert({
        data: buffer,
        fileFrom: "doc." + fileType,
        fileTo: "Editor.bin",
      });
      output = result.output;
      media = result.media;
    }

    if (!output) {
      throw new Error("Failed to convert file");
    }

    if (this.urlsMap.size > 0) {
      this.urlsMap.forEach((url) => URL.revokeObjectURL(url));
    }
    this.fsMap.set("Editor.bin", output);
    this.urlsMap.set("Editor.bin", getUrl(output));
    for (const name in media) {
      this.addMedia(name, media[name]);
    }
  }

  private addMedia(name: string, data: Uint8Array) {
    const pathname = "media/" + name;
    const url = getUrl(data);
    this.fsMap.set(pathname, data);
    this.urlsMap.set(pathname, url);
    return url;
  }

  setClient(info: Partial<typeof this.client>) {
    this.client = {
      ...this.client,
      ...info,
    };
  }

  setFileNameRequester(
    requester:
      | ((suggestedName: string, extension: string) => Promise<string | null>)
      | null,
  ) {
    this.requestFileName = requester;
  }

  /**
   * 新建文档已用默认名静默保存的文件名（如 "New Document.docx"）。
   * 非新建文档、或尚未保存过时返回 null —— UI 在退出文档时据此弹框
   * 让用户确认正式命名。
   */
  getUntitledSaveName(): string | null {
    return this.isNewDocument ? this.untitledSavedAs : null;
  }

  /** 退出弹框命名（或用户确认保留默认名）后清除标记，避免再次弹出 */
  markUntitledNamed(): void {
    this.isNewDocument = false;
    this.untitledSavedAs = null;
  }

  requestSave(editor: DocEditor): Promise<boolean> {
    if (this.saveRequest || this.exportResolver) {
      return Promise.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        if (!this.saveRequest) return;
        this.saveRequest = null;
        resolve(false);
      }, 60_000);
      this.saveRequest = { resolve, timer };
      try {
        editor.downloadAs({ extension: this.fileType, isDownload: false });
      } catch (error) {
        console.error("Failed to request document save", error);
        this.finishSaveRequest(false);
      }
    });
  }

  /** 导出当前文档字节（供「上传到知识库」复用），失败或超时返回 null */
  exportDocument(
    editor: DocEditor,
    fileName: string,
  ): Promise<{ fileName: string; data: Uint8Array } | null> {
    if (!editor || this.saveRequest || this.exportResolver) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.exportResolver = null;
        this.exportFileName = null;
        console.error("Document export timed out");
        resolve(null);
      }, 60_000);
      this.exportResolver = (result) => {
        clearTimeout(timer);
        this.exportResolver = null;
        this.exportFileName = null;
        resolve(result);
      };
      const originalFileName = this.exportFileName;
      this.exportFileName = fileName;
      try {
        editor.downloadAs({ extension: this.fileType, isDownload: false });
      } catch (error) {
        console.error("Failed to request document export", error);
        this.exportFileName = originalFileName;
        this.exportResolver(null);
      }
    });
  }

  private finishSaveRequest(success: boolean) {
    if (!this.saveRequest) return;
    const { resolve, timer } = this.saveRequest;
    this.saveRequest = null;
    clearTimeout(timer);
    resolve(success);
  }

  handleConnect({ socket }: { socket: MockSocket }) {
    console.log("connect: ", socket);

    this.socket = socket;
    const { send, sessionId, client } = this;

    this.participants = [
      {
        connectionId: this.sessionId,
        encrypted: false,
        id: this.user.id,
        idOriginal: this.user.id,
        indexUser: 1,
        isCloseCoAuthoring: false,
        isLiveViewer: false,
        username: this.user.name,
        view: false,
      },
    ];

    socket.server.on("message", this.handleMessage);

    send({
      maxPayload: 100000000,
      pingInterval: 25000,
      pingTimeout: 20000,
      sid: sessionId,
      upgrades: [],
    });

    send({
      type: "license",
      license: {
        type: 3,
        buildNumber: client.buildNumber,
        buildVersion: client.buildVersion,
        light: false,
        mode: 0,
        rights: 1,
        protectionSupport: true,
        isAnonymousSupport: true,
        liveViewerSupport: true,
        branding: false,
        customization: true,
        advancedApi: false,
      },
    });
  }

  handleDisconnect({ socket }: { socket: MockSocket }) {
    console.log("disconnect: ", socket);
    this.socket = null;
  }

  send(...msg: unknown[]) {
    if (!this.socket) {
      console.error("Socket is not connected");
      return;
    }
    console.log("[ws] >> ", ...msg);
    this.socket.server.emit("message", ...msg);
  }

  async handleMessage(msg: Record<string, string>, ...args: unknown[]) {
    console.log("[ws] << ", msg, args);

    const { send, sessionId, participants, user, client } = this;
    const type =
      typeof msg === "object" && msg && "type" in msg ? msg.type : null;
    switch (type) {
      case "auth":
        const changes: unknown[] = [];
        send({
          type: "authChanges",
          changes: changes,
        });
        send({
          type: "auth",
          result: 1,
          sessionId: sessionId,
          participants: participants,
          locks: [],
          //   changes: changes,
          //   changesIndex: 0,
          indexUser: 1,
          buildVersion: client.buildVersion || "9.3.0",
          buildNumber: client.buildNumber || 9,
          licenseType: 3,
          editorType: 2,
          mode: "edit",
          permissions: {
            comment: true,
            chat: true,
            download: true,
            edit: true,
            fillForms: false,
            modifyFilter: true,
            protect: true,
            print: true,
            review: false,
            copy: true,
          },
        });

        try {
          if (this.loadPromise) {
            await this.loadPromise;
          }
          send({
            type: "documentOpen",
            data: {
              type: "open",
              status: "ok",
              data: {
                ...Object.fromEntries(this.urlsMap),
              },
            },
          });
        } catch (err) {
          console.error(err);
          // TODO: send error message
          send({
            type: "documentOpen",
            data: {
              type: "open",
              status: "ok",
              data: {
                "Editor.bin": "",
              },
            },
          });
        }
        break;
      case "isSaveLock":
        send({
          type: "saveLock",
          saveLock: false,
        });
        break;
      case "saveChanges":
        send({
          type: "unSaveLock",
          index: -1,
          syncChangesIndex: ++this.syncChangesIndex,
          time: +new Date(),
        });
        break;
      case "getLock":
        send({
          type: "getLock",
          locks: {
            [msg.block]: {
              time: +new Date(),
              user: user?.id,
              block: msg.block,
            },
          },
        });
        send({
          type: "releaseLock",
          locks: {
            [msg.block]: {
              time: +new Date(),
              user: user?.id,
              block: msg.block,
            },
          },
        });
        break;
    }
  }

  async handleRequest(req: Request) {
    const u = new URL(req.url);

    const { id: key, send } = this;
    // console.log("[msg] server: ", u, key);

    if (u.pathname.endsWith("/downloadas/" + key)) {
      const cmd = JSON.parse(u.searchParams.get("cmd") || "{}");
      const buffer = await req.arrayBuffer();

      console.log("downloadAs -> ", cmd, buffer);

      let formatTo = cmd.outputformat;
      if (!formatTo && this.fileType === "pdf") {
        formatTo = 513;
      }

      const browserDownload = (data: Uint8Array) => {
        const blob = new Blob([new Uint8Array(data)]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = cmd.title || "test.docx";
        a.click();
        URL.revokeObjectURL(url);
      };

      const download = async () => {
        const vosMode = await isVOSMode();
        const exporting = this.exportResolver !== null && this.exportFileName !== null;
        let saveName = exporting
          ? this.exportFileName!
          : this.title || cmd.title || `document.${this.fileType}`;
        if (vosMode && this.isNewDocument && !exporting) {
          // 新建文档在编辑期间（自动/手动保存）一律用默认名静默保存，
          // 不打断用户；退出文档时才由 UI 弹框确认命名（对齐 WPS 等
          // 主流办公软件习惯），见 page.tsx 的 closeDocument。
          if (!/\.[a-z0-9]{2,5}$/i.test(saveName)) {
            saveName += `.${this.fileType}`;
          }
          this.untitledSavedAs = saveName;
        }

        const input = mergeBuffers(this.downloadParts);
        let fileFrom = "from.bin";
        if (cmd.format == "pdf") {
          fileFrom = "from.pdf";
        }

        const fileTo =
          "doc." + (getFileExt(cmd.title) || this.fileType || "docx");

        let { output } = await converter.convert({
          data: input.buffer,
          fileFrom: fileFrom,
          fileTo: fileTo,
          formatTo: formatTo,
          media: Object.fromEntries(this.fsMap),
        });
        if (!output && cmd.format == "pdf") {
          output = input;
        }
        if (!output) {
          console.error("Conversion failed");
          // TODO: error message
          return { status: "error" };
        }

        // 导出模式（上传知识库）：把转换后的字节回调出去，不落 VOS 存储、
        // 不做浏览器下载。
        if (exporting && this.exportResolver) {
          const resolver = this.exportResolver;
          this.exportResolver = null;
          const exportedName = this.exportFileName || saveName;
          this.exportFileName = null;
          resolver({ fileName: exportedName, data: output });
          return { status: "ok" };
        }

        // VOS deployment: persist directly into the private app storage.
        // A failed server save must remain an error instead of silently changing
        // the operation into a browser download.
        if (vosMode) {
          clientLog(`save-begin: ${saveName} (${output.byteLength} bytes)`);
          try {
            await saveCloudFile(saveName, output);
            clientLog(`save-ok: ${saveName}`);
            return { status: "ok" };
          } catch (error) {
            clientLog(`save-failed: ${saveName} :: ${error}`);
            console.error("Failed to save document to VOS storage", error);
            return { status: "error" };
          }
        }

        clientLog("save-skipped: not vos mode");
        browserDownload(output);
        return { status: "ok" };
      };

      let result = {
        status: "ok",
      };

      switch (cmd.savetype) {
        case AscSaveTypes.PartStart:
          this.downloadId = "_" + Math.round(Math.random() * 1000);
          this.downloadParts = [new Uint8Array(buffer)];
          break;
        case AscSaveTypes.Part:
          this.downloadParts.push(new Uint8Array(buffer));
          break;
        case AscSaveTypes.Complete:
          this.downloadParts.push(new Uint8Array(buffer));
          result = await download();
          this.downloadParts = [];
          this.finishSaveRequest(result.status === "ok");
          break;
        case AscSaveTypes.CompleteAll:
          this.downloadId = "_" + Math.round(Math.random() * 1000);
          this.downloadParts = [new Uint8Array(buffer)];
          result = await download();
          this.downloadParts = [];
          this.finishSaveRequest(result.status === "ok");
          break;
      }

      setTimeout(() => {
        send({
          type: "documentOpen",
          data: {
            type: "save",
            // status: "ok",
            status: result.status,
            data: "data:,",
            filetype: "pptx",
          },
        });
      }, 100);

      return Response.json({
        status: result.status,
        type: "save",
        data: this.downloadId,
      });
    }

    if (u.pathname.endsWith("/upload/" + key)) {
      const buffer = await req.arrayBuffer();
      const data = new Uint8Array(buffer);
      const filename = Date.now() + ".png";
      const pathname = "media/" + filename;
      const url = this.addMedia(filename, data);
      return Response.json({ [pathname]: url });
    }

    // 代理已将相对 URL 按 iframe base 解析为绝对路径（见 xhr/fetch），
    // 所以这里必须按后缀匹配，不能假定 pathname 恰为 /plugins.json。
    if (u.pathname.endsWith("/plugins.json")) {
      const state = this.options.getState?.();
      if (state?.plugins == "none") {
        return Response.json({ url: "", pluginsData: [], autostart: [] });
      }
      const names = state?.plugins == "all" ? allPlugins : featuredPlugins;
      // 本地 dev（非 VOS）：ziziyi 的远程 AI 插件与我们自己的「AI 助手」同名，
      // 其后端不在本地、点开必然空白，从列表去掉避免误点；VOS 模式保持原样。
      const localNames = (await isVOSMode())
        ? names
        : names.filter((name) => name !== "ai");
      const configs = localNames.map(getPluginConfigUrl);
      // AI 助手插件：sdkjs 用「元素字符串截到 config.json」当插件目录，
      // 再以该目录 + config.url 拼 iframe src。元素若是相对路径，目录也
      // 是相对的，最终会被编辑器文档的 <base>（指向 ziziyi CDN）解析，
      // 导致插件白屏——所以这里必须 push 带 origin 的绝对 URL。
      // config 里的 url 保持相对（见 agentic-search 插件 config.json），
      // api 网关由插件 index.js 自动嗅探，不在 url 上传参。
      configs.push(
        AGENTIC_SEARCH_PLUGIN_CONFIG.startsWith("http")
          ? AGENTIC_SEARCH_PLUGIN_CONFIG
          : u.origin + AGENTIC_SEARCH_PLUGIN_CONFIG,
      );
      return Response.json({ url: "", pluginsData: configs, autostart: [] });
    }

    return null;
  }
}
