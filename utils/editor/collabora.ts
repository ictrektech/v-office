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

const STORAGE_API =
  process.env.NEXT_PUBLIC_STORAGE_API || "/api/com.ictrek.v-office/api/v1";

/**
 * Word 文档是否默认走 Collabora 内核。
 *
 * 默认关闭（OnlyOffice 优先），由用户在编辑器里手动切换；部署侧想让
 * Word 文档默认用 Collabora 时设 NEXT_PUBLIC_WORD_ENGINE=collabora。
 * 即使默认/手动启用，会话取不到时也会自动回退，不会出现“文档打不开”。
 */
export const COLLABORA_WORD_ENGINE =
  process.env.NEXT_PUBLIC_WORD_ENGINE === "collabora";

/** 走 Collabora 的扩展名：本阶段只覆盖 Word 文档。 */
const COLLABORA_EXTS = new Set(["doc", "docx"]);

/** 是否为 Collabora 可接管的 Word 文档（doc/docx），供编辑器 UI 判断。 */
export function isWordDocExt(ext: string | undefined | null): boolean {
  return COLLABORA_EXTS.has((ext || "").toLowerCase().replace(/^\./, ""));
}

/**
 * 是否改用 Collabora 内核。
 *
 * @param ext      文档扩展名
 * @param override URL 上的 `engine` 参数（collabora / onlyoffice），
 *                 便于不重启 dev server 就能切换对比，生产用环境变量即可
 */
export function shouldUseCollabora(
  ext: string | undefined | null,
  override?: string | null,
): boolean {
  if (!isWordDocExt(ext)) return false;
  if (override === "collabora") return true;
  if (override === "onlyoffice") return false;
  return COLLABORA_WORD_ENGINE;
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
 */
export async function fetchCollaboraSession(
  name: string,
  edit = true,
  retry = true,
): Promise<CollaboraSession | null> {
  const token = await getVOSAccessToken();
  const url =
    `${STORAGE_API}/wopi/session?name=${encodeURIComponent(name)}` +
    `&edit=${edit ? 1 : 0}`;

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
    return fetchCollaboraSession(name, edit, false);
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
 * 本地文件（拖拽/选择/最近/云端下载）只存在于浏览器内存里，而 Collabora 是
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
