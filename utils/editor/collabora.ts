"use client";

/**
 * Collabora Online 接入：换会话、推副本、就绪探活、iframe 适配。
 *
 * 用哪个内核由 `utils/editor/engine.ts` 的 `resolveEngine` 决定，这里不做判断。
 */

import { getVOSAccessToken, clearVOSAuthCache } from "@/utils/vos/fastpath";
import type { SharedTarget } from "@/utils/vos/storage";



const STORAGE_API =
  process.env.NEXT_PUBLIC_STORAGE_API || "/api/com.ictrek.v-office/api/v1";

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

/**
 * 本地开发：把编辑器地址的 host 对齐成页面自己的 host。
 *
 * coolwsd 是**按请求 Host 推导 CSP 的 `frame-ancestors`** 的（实测：Host 为
 * `localhost` 时给出 `localhost:*`，为 `127.0.0.1` 时给出 `127.0.0.1:*`）。
 * 页面在 `localhost:3004`、编辑器却在 `127.0.0.1:9980` 时，浏览器会直接拒绝渲染
 * 这个 iframe（表现为「文档打不开」「编辑器白屏」）。两边都是回环地址时对齐一下。
 *
 * 只在回环地址之间生效：生产是网关同源前缀（`/app/<app-id>/cool/...`），
 * 域名不是回环，这里原样返回。
 */
export function alignCollaboraHost(editorUrl: string): string {
  const loopback = (h: string) => h === "localhost" || h === "127.0.0.1";
  try {
    const url = new URL(editorUrl);
    const pageHost = window.location.hostname;
    if (url.hostname !== pageHost && loopback(url.hostname) && loopback(pageHost)) {
      url.hostname = pageHost;
    }
    return url.toString();
  } catch {
    return editorUrl;
  }
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
  /** 会话版本：>0 时服务端给 WOPISrc 换一个 docKey，Collabora 重新读盘（AI 改完刷新用） */
  version = 0,
): Promise<CollaboraSession | null> {
  const token = await getVOSAccessToken();
  const params = [`name=${encodeURIComponent(name)}`, `edit=${edit ? 1 : 0}`];
  if (version > 0) params.push(`version=${version}`);
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
    return fetchCollaboraSession(name, edit, sharedTarget, lang, false, version);
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
