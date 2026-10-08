"use client";

/**
 * Collabora Online 集成客户端（仅 Word 文档）。
 *
 * 背景：OnlyOffice 内核对 WPS 导出的复杂表单类 Word 文档渲染保真度不足
 * （表格错位、页眉浮动对象被当成正文环绕物、Wingdings 复选框变成乱码），
 * 实测 Collabora（LibreOffice 内核）能正确还原这类文档。
 *
 * 接入方式刻意做得最小：只替换“打开 .doc / .docx”这一个入口，
 * 前端先向 storage 换取一次性 access_token 与编辑器地址，再用 iframe
 * 加载 Collabora；Collabora 通过 WOPI 协议直接读写 storage，
 * 因此保存链路与原有实现一致，Excel/PPT 等其它格式完全不受影响。
 *
 * 默认仍用 OnlyOffice 内核解析；用户可在编辑器里点击按钮手动切换到
 * Collabora（对复杂文档解析能力更强），NEXT_PUBLIC_WORD_ENGINE=collabora
 * 可让 Word 文档默认就走 Collabora。
 */

import { getVOSAccessToken, clearVOSAuthCache } from "@/utils/vos/fastpath";
import type { SharedTarget } from "@/utils/vos/storage";

const STORAGE_API =
  process.env.NEXT_PUBLIC_STORAGE_API || "/api/com.ictrek.v-office/api/v1";

/**
 * doc/docx/ppt/xls 是否默认走 Collabora 内核。
 *
 * 默认关闭（OnlyOffice 优先），由用户在编辑器里手动切换；部署侧想让
 * 这些文档默认用 Collabora 时设 NEXT_PUBLIC_WORD_ENGINE=collabora。
 * 即使默认/手动启用，会话取不到时也会自动回退，不会出现“文档打不开”。
 */
export const COLLABORA_WORD_ENGINE =
  process.env.NEXT_PUBLIC_WORD_ENGINE === "collabora";

/**
 * 走 Collabora 的扩展名。
 *
 * Word 文档（doc/docx）之外，还包含老版二进制格式（ppt/xls）：x2t 读不好也写不了
 * 这些格式，而 Collabora 就是服务端 LibreOffice，原生读写并按原格式保存——它自己的
 * discovery 对 doc/xls/ppt 都声明了 edit 动作，对 pdf 只有 view_comment（所以 PDF
 * 仍走 OnlyOffice）。
 *
 * 现代格式 xlsx/pptx 也一并纳入：它们是不是**默认**走 Collabora 仍由部署默认
 * （NEXT_PUBLIC_WORD_ENGINE）决定，这里只决定"能不能交给它"——包括编辑器里的手动
 * 切换、以及模板库（13 个模板里 6 个 pptx、2 个 xlsx）。此前漏了这两个，于是模板
 * 里绝大多数连 Collabora 的入口都不出现，和 shouldUseCollabora 注释里写的
 * "现代格式按部署默认"对不上；共享盘文档也早已在用 Collabora 打开 pptx/xlsx
 * （见 SHARED_COLLABORATIVE_EXTS），能力是验证过的。
 */
const COLLABORA_EXTS = new Set([
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
]);

/**
 * 老版二进制格式：默认就走 Collabora，不看引擎偏好。
 *
 * OnlyOffice 路线对它们先天不足——x2t 写不出二进制（.doc 输出 0 字节），xls 完全
 * 没有补齐，ppt 还得靠镜像里的 LibreOffice impress；Collabora 是服务端 LibreOffice，
 * 原生读写且按原格式保存，所以这些文件默认交给它。
 */
const LEGACY_EXTS = new Set(["doc", "ppt", "xls"]);

/**
 * 该扩展名是否可交给 Collabora 内核（doc/docx/ppt/pptx/xls/xlsx），供编辑器 UI 判断
 * ——它决定"使用 Collabora 打开"这个入口出不出现，不代表默认内核。
 */
export function isCollaboraExt(ext: string | undefined | null): boolean {
  return COLLABORA_EXTS.has(normalizeExt(ext));
}

function normalizeExt(ext: string | undefined | null): string {
  return (ext || "").toLowerCase().replace(/^\./, "");
}

/** 老版二进制格式（doc / xls / ppt）：本地内核读不好、更要命的是**写不出**。 */
export function isLegacyOfficeExt(ext: string | undefined | null): boolean {
  return LEGACY_EXTS.has(normalizeExt(ext));
}

/**
 * 是否改用 Collabora 内核。
 *
 * 老版二进制格式（doc / xls / ppt）**无条件**走 Collabora：x2t 写不出这些格式
 * （.doc 输出 0 字节、xls 根本没有实现），打开解析也不好——留在本地内核上只会
 * 得到"能打开、一保存就写出坏文件/空文件"这种最糟的结果。因此这里连内核偏好与
 * URL 覆盖都不看：过去把偏好判断放在前面，导致默认配置（wordEngine=onlyoffice）
 * 下这些老格式实际走的是本地内核，与代码注释写的相反。
 *
 * @param ext      文档扩展名
 * @param override URL 上的 `engine` 参数（collabora / onlyoffice），
 *                 便于不重启 dev server 就能切换对比，生产用环境变量即可
 */
export function shouldUseCollabora(
  ext: string | undefined | null,
  override?: string | null,
): boolean {
  if (!isCollaboraExt(ext)) return false;
  if (isLegacyOfficeExt(ext)) return true;
  if (override === "collabora") return true;
  if (override === "onlyoffice") return false;
  // 其余（docx/xlsx/pptx 等现代格式）按部署默认
  return COLLABORA_WORD_ENGINE;
}

/**
 * 共享源（NAS / 平台授权的公共目录）文档是否可以多人协同。
 *
 * 共享盘上的同一份文件可能同时被多个人打开，而只有服务端内核（Collabora）能让
 * 大家进同一个文档会话：互见光标、盘上只有一份权威字节（实测：第二个用户加入
 * 只发一次 CheckFileInfo，不再重新拉取文档，两侧状态栏同步变化）。本地内核
 * （OnlyOffice）是浏览器单机渲染，N 个人各改各的内存副本、保存时整份覆盖，
 * 必然互相抹掉——所以共享源文档不看扩展名偏好，也不看用户在设置里选了哪个内核。
 *
 * 刻意排除：pdf（Collabora 只声明批注，不能协同编辑）、txt / md / csv / rtf
 * （多人反复写回语义有坑）。这些继续走原来的单机链路，行为不变。
 */
const SHARED_COLLABORATIVE_EXTS = new Set([
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
]);

/** 共享源文档是否必须走 Collabora 多人协同（与内核偏好、部署默认无关）。 */
export function mustCollaborateOnShared(
  shared: boolean,
  ext: string | undefined | null,
): boolean {
  return shared && SHARED_COLLABORATIVE_EXTS.has(normalizeExt(ext));
}

/**
 * 摘掉 Collabora 首次打开时的"What's new"浮层，并返回清理函数。
 *
 * 社区版镜像会在第一次打开编辑器时弹一层盖住正文的浮层：用户点开自己的文档，
 * 第一眼看到的是广告而不是内容。官方开关 `home_mode.enable=true` 能关掉它，
 * 但同时把并发连接/并发文档压到 20/10，代价太大；所以这里用同源 iframe 直接
 * 移除那层节点，不改任何服务端行为。iframe 与宿主跨源时静默跳过（拿不到
 * contentDocument 就不做）。
 */
export function hideCollaboraWelcomeScreen(
  iframe: HTMLIFrameElement,
): () => void {
  const SELECTOR = "[class*='iframe-welcome'],[class*='welcome-modal']";
  let observer: MutationObserver | null = null;
  let timer: number | null = null;

  const strip = () => {
    let removed = 0;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.querySelectorAll(SELECTOR).forEach((node) => {
        node.remove();
        removed += 1;
      });
    } catch {
      return; // 跨源：放弃
    }
    if (removed > 0) stopObserving();
  };

  const stopObserving = () => {
    observer?.disconnect();
    observer = null;
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const attach = () => {
    strip();
    try {
      const doc = iframe.contentDocument;
      if (!doc || observer) return;
      observer = new MutationObserver(strip);
      observer.observe(doc.documentElement, { childList: true, subtree: true });
      // 浮层只在首屏出现；最多盯 20 秒就收工，别让观察器常驻
      timer = window.setTimeout(stopObserving, 20_000);
    } catch {
      /* 跨源：忽略 */
    }
  };

  iframe.addEventListener("load", attach);
  attach();
  return () => {
    iframe.removeEventListener("load", attach);
    stopObserving();
  };
}

export interface CollaboraSession {
  /** 浏览器直接加载的编辑器地址（含 WOPISrc 与 access_token） */
  editorUrl: string;
  /** Collabora 回调 storage 的 WOPI 源地址 */
  wopiSrc: string;
  accessToken: string;
  name: string;
  canWrite: boolean;
}

/**
 * 为某个文档换取 Collabora 会话。失败返回 null，调用方据此回退到
 * 原有编辑器，保证“新内核不可用也不会打不开文档”。
 *
 * lang 为界面语言（BCP-47，见 utils/editor/locale.ts）：Collabora 默认只跟随
 * 浏览器语言，不传这个参数时应用内切了语言编辑器也不会跟着变。
 */
export async function fetchCollaboraSession(
  name: string,
  edit = true,
  sharedTarget?: SharedTarget | null,
  lang?: string,
  retry = true,
): Promise<CollaboraSession | null> {
  const token = await getVOSAccessToken();
  const params = [`name=${encodeURIComponent(name)}`, `edit=${edit ? 1 : 0}`];
  if (sharedTarget) {
    // 共享源文档：storage 按 source+path 解析原文件并签发对应 WOPI 令牌
    params.push(`source=${encodeURIComponent(sharedTarget.source)}`);
    params.push(`path=${encodeURIComponent(sharedTarget.path)}`);
  }
  if (lang) params.push(`lang=${encodeURIComponent(lang)}`);
  const url = `${STORAGE_API}/wopi/session?${params.join("&")}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // storage 侧探测 Collabora discovery 的上限是 5s，这里留出余量；
      // 超时即视为不可用并回退，不让用户对着空白页干等。
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }

  if (resp.status === 401 && retry) {
    clearVOSAuthCache();
    return fetchCollaboraSession(name, edit, sharedTarget, lang, false);
  }
  if (!resp.ok) return null;

  try {
    const data = (await resp.json()) as CollaboraSession;
    return data?.editorUrl ? data : null;
  } catch {
    return null;
  }
}

/**
 * 把本地打开的文档原样推入 storage，供 Collabora 通过 WOPI 读取。
 *
 * 本地文件（拖拽/选择/最近/我的文档下载）只存在于浏览器内存里，而 Collabora 是
 * 服务端渲染，只能从 storage 取文件。因此换会话之前必须先落一份。
 *
 * 没部署存储服务（纯独立部署）时请求会失败，返回 false，调用方回退到原有
 * OnlyOffice 内核——保证「拿不到 storage」不会变成「文档打不开」。
 */
export async function pushDocumentToStorage(
  name: string,
  data: ArrayBuffer | Uint8Array,
): Promise<boolean> {
  const token = await getVOSAccessToken();
  try {
    const resp = await fetch(`${STORAGE_API}/files/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: new Blob([data as ArrayBuffer]),
      signal: AbortSignal.timeout(30_000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/** 从文件名 / URL 推断扩展名（小写、无点）。 */
export function guessExtension(...candidates: (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const cleaned = candidate.split("?")[0].split("#")[0];
    const match = cleaned.match(/\.([A-Za-z0-9]{2,5})$/);
    if (match) return match[1].toLowerCase();
  }
  return "";
}

/**
 * 查询 Collabora 就绪状态（storage 侧后台探活结果）。
 *
 * ok          —— 可正常打开文档
 * warming_up  —— 容器冷启动中，前端应展示等待提示并自动重试
 * unavailable —— 超过预热窗口仍未就绪，大概率未部署，前端应立即回退
 * unknown     —— 无 storage 服务（独立部署），保持旧行为：点了再试、失败回退
 */
export type CollaboraState = "ok" | "warming_up" | "unavailable" | "unknown";

export async function fetchCollaboraStatus(): Promise<CollaboraState> {
  const token = await getVOSAccessToken();
  try {
    const resp = await fetch(`${STORAGE_API}/wopi/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return "unknown";
    const data = (await resp.json()) as { state?: string };
    if (
      data.state === "ok" ||
      data.state === "warming_up" ||
      data.state === "unavailable"
    ) {
      return data.state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}
