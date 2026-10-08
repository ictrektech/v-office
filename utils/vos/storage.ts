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

export async function listSharedSources(refresh = false): Promise<SharedSource[]> {
  const response = await request(`/sources${refresh ? "?refresh=1" : ""}`);
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

/**
 * 把共享源里的文档下载成 File，交给编辑器打开。
 *
 * 同时把服务端给的版本标记（X-VOffice-Token）带出来：编辑器保存时要回传它，
 * 服务端据此判断"你写的还是不是你收到的那一版"。用响应头而不是查一次列表，
 * 是因为**只有跟内容一起取到的标记才对应你手里这份字节**（列表可能是几分钟前
 * 拉的，期间文件早被改过了）。
 */
export async function openSharedDocument(
  source: string,
  path: string,
): Promise<{ file: File; token: string }> {
  const response = await request(
    `/sources/${encodeURIComponent(source)}/file?path=${encodeURIComponent(path)}`,
  );
  if (!response.ok) {
    throw new Error(`Open shared document failed: ${response.status}`);
  }
  const token = response.headers.get("X-VOffice-Token") || "";
  const blob = await response.blob();
  const name = path.split("/").pop() || "document";
  return { file: new File([blob], name), token };
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
  refresh = false,
): Promise<SourceDocumentListing> {
  // refresh=1 让服务端绕过目录列举缓存：用于用户显式刷新、以及我们自己刚写完
  // 共享盘之后的强制对齐
  const params = new URLSearchParams();
  if (path) params.set("path", path);
  if (refresh) params.set("refresh", "1");
  const query = params.toString();
  const response = await request(
    `/sources/${encodeURIComponent(source)}/documents${query ? `?${query}` : ""}`,
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

/** 把「我的文档」里的一个文件写进共享目录之后的结果。 */
export interface PublishOutcome {
  /** created：目标原本不存在；overwritten：覆盖了公共目录里的同名文件 */
  status: "created" | "overwritten";
  path: string;
  size: number;
  version: string;
  /** 覆盖时被留底的旧版本（源内相对路径）；新建时是空串 */
  backup?: string;
}

/**
 * 把「我的文档」里的一个文件写入共享源目录（例如 NAS 的公共目录）。
 *
 * **同名直接覆盖**：用户点这个入口本来就是"把我这份放上去"，不再要
 * "你看过的是哪一版"这种凭据。覆盖掉的那一版由服务端留底，用户随时能从文件列表的
 * 「版本」里取回或退回——强制覆盖之所以能接受，靠的就是这一步。
 *
 * 抛出的错误：READ_ONLY（目录只读）、IN_USE:<用户名>（有人正用编辑器改这份文件，
 * 从外面覆盖会把对方正在改的内容冲掉，服务端会挡住）、以及网络/服务端错误。
 */
export async function copyStoredFileToSource(
  name: string,
  source: string,
  path = "",
): Promise<PublishOutcome> {
  const params = new URLSearchParams({ name });
  if (path) params.set("path", path);
  const response = await request(
    `/sources/${encodeURIComponent(source)}/copy-from-file?${params.toString()}`,
    { method: "POST" },
  );
  if (response.status === 403) throw new Error("READ_ONLY");
  if (response.status === 423) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: { holder?: string };
    } | null;
    throw new Error(`IN_USE:${payload?.detail?.holder ?? ""}`);
  }
  if (!response.ok) {
    throw new Error(`Copy to shared folder failed: ${response.status}`);
  }
  return (await response.json()) as PublishOutcome;
}

/** 共享盘上一个文件被覆盖时留下的旧版本（可回退）。 */
export interface SharedFileVersion {
  /** 版本标识，回退时原样回传；服务端会校验它确实属于这个文件 */
  id: string;
  name: string;
  /** 这一版"打开/另存"时该用的名字（带那一版的时刻），由服务端给 */
  exportName?: string;
  size?: number;
  /** 留底时刻（秒） */
  modified?: number;
  /** 这一版的提交人；记录功能上线前留下的版本没有这个信息，会是空串 */
  by?: string;
  version?: string;
}

export interface SourceHistory {
  /** 最近的在前，最多 keep 条 */
  versions: SharedFileVersion[];
  /** 保留份数上限；0 表示这台部署没开留底 */
  keep: number;
  /** 共享盘可写才有意义：只读挂载下不给回退入口 */
  writable: boolean;
}

/**
 * 读某个共享文件的留底版本（文件列表里「版本」那一栏的内容）。
 *
 * 留底是覆盖时由服务端自动做的，前端不碰目录结构，只拿这份列表。
 */
export async function listSourceHistory(
  source: string,
  path: string,
): Promise<SourceHistory> {
  const response = await request(
    `/sources/${encodeURIComponent(source)}/history?path=${encodeURIComponent(path)}`,
  );
  if (!response.ok) {
    throw new Error(`Read file history failed: ${response.status}`);
  }
  const payload = (await response.json()) as Partial<SourceHistory>;
  return {
    versions: Array.isArray(payload.versions) ? payload.versions : [],
    keep: payload.keep ?? 0,
    writable: payload.writable !== false,
  };
}

export interface RestoreOutcome {
  status: "restored";
  path: string;
  size: number;
  version: string;
  previousVersion?: string | null;
  /** 被回退掉的那一版（回退本身也留底了，所以还能再回退回来） */
  backup?: string;
}

/**
 * 把某个留底版本写回原文件（用户点「还原」）。
 *
 * 服务端在回退前也会给"当前版本"留底，所以回退错了还能再回退回来。
 * 只读挂载会抛 READ_ONLY，由界面提示。
 */
export async function restoreSourceHistory(
  source: string,
  path: string,
  id: string,
): Promise<RestoreOutcome> {
  const query = new URLSearchParams({ path, id });
  const response = await request(
    `/sources/${encodeURIComponent(source)}/history/restore?${query.toString()}`,
    { method: "POST" },
  );
  if (response.status === 403) throw new Error("READ_ONLY");
  if (!response.ok) {
    throw new Error(`Restore file version failed: ${response.status}`);
  }
  return (await response.json()) as RestoreOutcome;
}

/**
 * 把某个留底版本「保存到我的文档」（私有目录），**不动公共盘上的原文件**。
 *
 * 给"想反悔但先不急着回退"用：把旧版本取回自己名下看一眼、接着改。服务端按那一版的
 * 时刻命名（撞名自动加后缀），所以这里不传名字，用返回的名字告诉用户存成了什么。
 */
export async function exportSourceHistory(
  source: string,
  path: string,
  id: string,
): Promise<{ status: "saved"; name: string; size: number }> {
  const query = new URLSearchParams({ path, id });
  const response = await request(
    `/sources/${encodeURIComponent(source)}/history/export?${query.toString()}`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`Save version to My Documents failed: ${response.status}`);
  }
  return (await response.json()) as {
    status: "saved";
    name: string;
    size: number;
  };
}

/**
 * 取某个留底版本的字节，供界面上「打开」看内容。
 *
 * 只读：拿到之后按**本地文件**打开（编辑器对本地文件的保存只会另存或下载），
 * 公共盘上的原文件和留底都不会被碰到。
 */
export async function fetchSourceHistoryFile(
  source: string,
  path: string,
  id: string,
): Promise<Blob> {
  const query = new URLSearchParams({ path, id });
  const response = await request(
    `/sources/${encodeURIComponent(source)}/history/file?${query.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Open file version failed: ${response.status}`);
  }
  return await response.blob();
}

/** 编辑器的保存落点：共享源 + 源内相对路径（即"编辑原文档"）。 */
export interface SharedTarget {
  source: string;
  path: string;
  /**
   * 打开这份文档时服务端给的版本标记（X-VOffice-Token）。
   *
   * 保存时回传它做一次 CAS：如果盘上已经不是这一版（别人改过），服务端会拒写，
   * 避免拿"打开时的旧副本"整份写回、把别人刚写进去的内容抹掉。每次保存成功后
   * 服务端会返回新的标记，编辑器要跟着更新。
   */
  token?: string;
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
  ifMatchToken = "",
): Promise<string> {
  const query = new URLSearchParams({ path });
  if (ifMatchToken) query.set("if-match-token", ifMatchToken);
  const response = await request(
    `/sources/${encodeURIComponent(source)}/file?${query.toString()}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Blob([data as ArrayBuffer]),
    },
  );
  if (response.status === 409) throw new Error("SHARED_VERSION_CHANGED");
  if (!response.ok) {
    throw new Error(`Save shared document failed: ${response.status}`);
  }
  // 返回写完之后的新标记：编辑器要拿它更新手里的凭据，否则下一次自动保存会
  // 因为"凭据还是上一版的"而被自己刚写的这一版挡住。
  const payload = (await response.json().catch(() => null)) as
    | { token?: string }
    | null;
  return payload?.token || "";
}
