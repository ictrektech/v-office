"use client";

/**
 * 文档存储客户端：对接 VOS 部署里的 v-office-storage 服务。
 *
 * 通过同域相对路径 `/api/com.ictrek.v-office` 访问（VOS 网关剥前缀后
 * 转发到存储服务），自动附带 VOS OIDC Fastpath Bearer 令牌。独立部署（非
 * VOS iframe）下所有函数抛出 StorageUnavailableError，UI 据此隐藏「我的文档」入口。
 */

import { getVOSAccessToken, clearVOSAuthCache, isVOSMode } from "./fastpath";

const API_BASE =
  process.env.NEXT_PUBLIC_STORAGE_API ||
  "/api/com.ictrek.v-office/api/v1";

export interface StoredFile {
  name: string;
  size: number;
  modified: number;
}

/** 源里一个可直接浏览的已授权目录（服务端已解析，不含平台内部路径层级） */
export interface SharedSourceRoot {
  name: string;
  /** 源内相对路径；空串代表源根 */
  path: string;
  /** 授权目录类型：public / user / mount（用于识别「公共目录」） */
  kind?: string;
}

/** 文档源：平台「数据访问授权」挂进来的目录（shared）或宿主挂载的 NAS 目录（nas）。 */
export interface SharedSource {
  id: string;
  name: string;
  kind: string;
  readOnly: boolean;
  roots?: SharedSourceRoot[];
}

/** 只读文档源里的一个条目（子目录，或编辑器可打开的文档）。 */
export interface SharedEntry {
  name: string;
  /** 相对源根的路径，作为打开/下载的凭据 */
  path: string;
  isDir: boolean;
  size: number;
  modified: number;
}

export interface SharedListing {
  source: string;
  path: string;
  parent: string;
  entries: SharedEntry[];
  truncated: boolean;
}

/** 递归遍历出来的一个文档（NAS 数据分类下的平铺条目） */
export interface SourceDocument {
  name: string;
  /** 源内相对路径，直接用于打开/下载 */
  path: string;
  /** 所在子目录（相对分类根，空串表示就在根目录下） */
  folder: string;
  size: number;
  modified: number;
}

export interface SourceDocumentListing {
  source: string;
  path: string;
  documents: SourceDocument[];
  truncated: boolean;
}

export class StorageUnavailableError extends Error {
  constructor(message = "Storage unavailable outside VOS") {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

/** Fire-and-forget diagnostic line, surfaced in the storage service logs. */
export async function clientLog(message: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch(`${API_BASE.replace(/\/api\/v1$/, "")}/client-log`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: message.slice(0, 2000),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Logging must never throw.
  }
}

async function request(
  path: string,
  init: RequestInit & { retry?: boolean } = {},
): Promise<Response> {
  if (!(await isVOSMode())) {
    throw new StorageUnavailableError();
  }
  const token = await getVOSAccessToken();
  if (!token) {
    throw new StorageUnavailableError("VOS token unavailable");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    // Never hang the editor UI: storage calls fail fast and surface a save
    // error instead of changing the operation into a browser download.
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 401 && init.retry !== false) {
    // Token expired or revoked: drop the cache and retry once with a
    // freshly acquired one — still silent, still no redirects.
    clearVOSAuthCache();
    return request(path, { ...init, retry: false });
  }
  return response;
}

/** Resolves to the signed-in VOS username, or null outside VOS. */
export async function whoAmI(): Promise<string | null> {
  if (!(await isVOSMode())) return null;
  try {
    const response = await request("/me", { retry: false });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.username ?? null;
  } catch {
    return null;
  }
}

export async function listStoredFiles(): Promise<StoredFile[]> {
  const response = await request("/files");
  if (!response.ok) {
    throw new Error(`List files failed: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.files) ? data.files : [];
}

export async function openStoredFile(name: string): Promise<File> {
  const response = await request(`/files/${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error(`Open file failed: ${response.status}`);
  }
  const blob = await response.blob();
  return new File([blob], name);
}

export async function saveStoredFile(
  name: string,
  data: Uint8Array | ArrayBuffer,
): Promise<void> {
  const response = await request(`/files/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Blob([data as ArrayBuffer]),
  });
  if (!response.ok) {
    throw new Error(`Save file failed: ${response.status}`);
  }
}

export async function deleteStoredFile(name: string): Promise<void> {
  const response = await request(`/files/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Delete file failed: ${response.status}`);
  }
}

export async function renameStoredFile(
  name: string,
  newName: string,
): Promise<void> {
  const response = await request(`/files/${encodeURIComponent(name)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  });
  if (!response.ok) {
    if (response.status === 409) {
      throw new Error("A file with that name already exists");
    }
    throw new Error(`Rename file failed: ${response.status}`);
  }
}

// ---------------------------------------------------------------------------
// 只读共享源（/exposed 授权目录、NAS 挂载目录）
//
// 这些目录由宿主侧挂载进容器，服务端只允许列目录与取文件。文档打开后由
// 编辑器正常加载，保存时仍写入用户私有目录，不会回写共享盘。
// ---------------------------------------------------------------------------

export async function listSharedSources(): Promise<SharedSource[]> {
  const response = await request("/sources");
  if (!response.ok) {
    throw new Error(`List sources failed: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.sources) ? data.sources : [];
}

export async function browseSharedSource(
  source: string,
  path = "",
): Promise<SharedListing> {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  const response = await request(
    `/sources/${encodeURIComponent(source)}/entries${query}`,
  );
  if (!response.ok) {
    throw new Error(`Browse source failed: ${response.status}`);
  }
  return (await response.json()) as SharedListing;
}

/** 把共享源里的文档下载成 File，交给编辑器打开。 */
export async function openSharedDocument(
  source: string,
  path: string,
): Promise<File> {

  const response = await request(
    `/sources/${encodeURIComponent(source)}/file?path=${encodeURIComponent(path)}`,
  );
  if (!response.ok) {
    throw new Error(`Open shared document failed: ${response.status}`);
  }
  const blob = await response.blob();
  const name = path.split("/").pop() || "document";
  return new File([blob], name);
}

/**
 * 递归遍历一个授权目录，拿到其中所有可打开的文档（平铺）。
 *
 * 挂载盘里的文档常埋在多层子目录里，服务端一次遍历到底并返回相对路径，
 * 前端直接平铺展示，不需要用户逐层点进去。
 */
export async function listSourceDocuments(
  source: string,
  path = "",
): Promise<SourceDocumentListing> {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  const response = await request(
    `/sources/${encodeURIComponent(source)}/documents${query}`,
  );
  if (!response.ok) {
    throw new Error(`List source documents failed: ${response.status}`);
  }
  return (await response.json()) as SourceDocumentListing;
}

/**
 * 把共享源（NAS）里的文档复制到「我的文档」。
 *
 * 服务端直接读共享盘写私有目录，不经浏览器；默认不覆盖同名文件。
 */
export async function copySourceFileToStorage(
  source: string,
  path: string,
): Promise<void> {
  const params = new URLSearchParams({ path });
  const response = await request(
    `/sources/${encodeURIComponent(source)}/copy-to-file?${params.toString()}`,
    { method: "POST" },
  );
  if (response.status === 409) throw new Error("TARGET_EXISTS");
  if (!response.ok) {
    throw new Error(`Copy to my documents failed: ${response.status}`);
  }
}

/**
 * 把「我的文档」里的一个文件复制到共享源目录（例如 NAS 的公共目录）。
 *
 * 服务端直接读私有目录写共享盘，不经浏览器；默认不覆盖同名文件。
 * 抛出 TARGET_EXISTS / READ_ONLY 供调用方给出明确提示。
 */
export async function copyStoredFileToSource(
  name: string,
  source: string,
  path = "",
): Promise<void> {
  const params = new URLSearchParams({ name });
  if (path) params.set("path", path);
  const response = await request(
    `/sources/${encodeURIComponent(source)}/copy-from-file?${params.toString()}`,
    { method: "POST" },
  );
  if (response.status === 409) throw new Error("TARGET_EXISTS");
  if (response.status === 403) throw new Error("READ_ONLY");
  if (!response.ok) {
    throw new Error(`Copy to shared folder failed: ${response.status}`);
  }
}

/** 编辑器的保存落点：共享源 + 源内相对路径（即"编辑原文档"）。 */
export interface SharedTarget {
  source: string;
  path: string;
}

/**
 * 把编辑后的文档写回共享源，覆盖共享盘上的原文件。
 *
 * 保存失败（目录只读、权限不足）抛出异常，由编辑器把保存状态标记为错误，
 * 不会静默改成浏览器下载——否则用户会以为已经存回原文件了。
 */
export async function saveSharedDocument(
  source: string,
  path: string,
  data: Uint8Array | ArrayBuffer,
): Promise<void> {
  const response = await request(
    `/sources/${encodeURIComponent(source)}/file?path=${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Blob([data as ArrayBuffer]),
    },
  );
  if (!response.ok) {
    throw new Error(`Save shared document failed: ${response.status}`);
  }
}
