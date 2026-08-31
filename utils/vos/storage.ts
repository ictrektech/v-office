"use client";

/**
 * 云端文档客户端：对接 VOS 部署里的 v-office-storage 服务。
 *
 * 通过同域相对路径 `/api/com.ictrek.v-office` 访问（VOS 网关剥前缀后
 * 转发到存储服务），自动附带 VOS OIDC Fastpath Bearer 令牌。独立部署（非
 * VOS iframe）下所有函数抛出 CloudUnavailableError，UI 据此隐藏云端入口。
 */

import { getVOSAccessToken, clearVOSAuthCache, isVOSMode } from "./fastpath";

const API_BASE =
  process.env.NEXT_PUBLIC_STORAGE_API ||
  "/api/com.ictrek.v-office/api/v1";

export interface CloudFile {
  name: string;
  size: number;
  modified: number;
}

export class CloudUnavailableError extends Error {
  constructor(message = "Cloud storage unavailable outside VOS") {
    super(message);
    this.name = "CloudUnavailableError";
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
    throw new CloudUnavailableError();
  }
  const token = await getVOSAccessToken();
  if (!token) {
    throw new CloudUnavailableError("VOS token unavailable");
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

export async function listCloudFiles(): Promise<CloudFile[]> {
  const response = await request("/files");
  if (!response.ok) {
    throw new Error(`List cloud files failed: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.files) ? data.files : [];
}

export async function openCloudFile(name: string): Promise<File> {
  const response = await request(`/files/${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error(`Open cloud file failed: ${response.status}`);
  }
  const blob = await response.blob();
  return new File([blob], name);
}

export async function saveCloudFile(
  name: string,
  data: Uint8Array | ArrayBuffer,
): Promise<void> {
  const response = await request(`/files/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Blob([data as ArrayBuffer]),
  });
  if (!response.ok) {
    throw new Error(`Save cloud file failed: ${response.status}`);
  }
}

export async function deleteCloudFile(name: string): Promise<void> {
  const response = await request(`/files/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Delete cloud file failed: ${response.status}`);
  }
}
