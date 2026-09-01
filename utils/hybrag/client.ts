"use client";

/**
 * HybRAG（VOS 中的 WeKnora）客户端。
 *
 * 认证链路对齐 agentic-search 生产用法：
 * 1. VOS OIDC Fastpath 拿 VOS access token（utils/vos/fastpath.ts）
 * 2. POST /auth/vos-token-exchange 换成 hybrag JWT + refresh_token
 * 3. 业务 API 一律带 `Authorization: Bearer <hybrag JWT>`，过期前用
 *    refresh_token 续期，刷新失败回退重新 exchange。
 *
 * 网关路径默认 `/app/com.ictrek.hybrag`（与 agentic-search 的 HYBRAG_URL
 * 同形态，浏览器同域直调、无 CORS），可用 NEXT_PUBLIC_HYBRAG_API 覆盖。
 */

import {
  getVOSAccessToken,
  clearVOSAuthCache,
  isVOSMode,
} from "@/utils/vos/fastpath";

const API_BASE =
  process.env.NEXT_PUBLIC_HYBRAG_API || "/app/com.ictrek.hybrag/api/v1";

/** 提前续期缓冲：过期前 5 分钟刷新，避免 in-flight 401 */
const REFRESH_BUFFER_MS = 300_000;
/** 单个请求超时（上传大文件时可能偏紧，后续可按需调整） */
const REQUEST_TIMEOUT_MS = 60_000;
/** hybrag access token 默认有效期（真实值以 exchange 返回为准） */
const DEFAULT_TOKEN_TTL_MS = 60 * 60 * 1000;

export class HybragUnavailableError extends Error {
  constructor(message = "HybRAG is not available") {
    super(message);
    this.name = "HybragUnavailableError";
  }
}

export class HybragAuthError extends Error {
  constructor(message = "HybRAG authentication failed") {
    super(message);
    this.name = "HybragAuthError";
  }
}

export interface KnowledgeBase {
  id: string;
  name: string;
  type: string;
  is_temporary: boolean;
  knowledge_count?: number;
  chunk_count?: number;
}

interface HybragToken {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

/** 进程内缓存（只存内存，不落 localStorage/indexedDB） */
let cachedToken: HybragToken | null = null;

interface ExchangeResponse {
  success?: boolean;
  token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: string;
}

/** 从 JWT 的 exp 解析过期时间戳（ms）；非 JWT 或解析失败返回 null */
function parseJwtExp(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1] ?? ""));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** 计算 exchange 返回 token 的过期时间戳（ms） */
function computeExpiry(resp: ExchangeResponse): number {
  const now = Date.now();
  if (resp.expires_in) return now + resp.expires_in * 1000;
  if (resp.expires_at) return new Date(resp.expires_at).getTime();
  const jwtExp = parseJwtExp(resp.token);
  if (jwtExp) return jwtExp;
  return now + DEFAULT_TOKEN_TTL_MS;
}

/**
 * 用 VOS access token 向 hybrag 换取 hybrag JWT。
 * 404 视为 hybrag 未安装/网关不可达；401 视为 VOS 登录态失效。
 */
async function exchangeHybragToken(): Promise<HybragToken> {
  const vosToken = await getVOSAccessToken();
  if (!vosToken) {
    // VOS 模式下拿不到 access token 说明登录态已失效（OIDC 静默续期/重授权
    // 都失败），而不是 hybrag 未安装——后者由下面的 404 分支表达。
    throw new HybragAuthError("VOS access token unavailable");
  }
  const response = await fetch(`${API_BASE}/auth/vos-token-exchange`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vosToken}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) {
    throw new HybragUnavailableError();
  }
  if (response.status === 401) {
    throw new HybragAuthError("VOS token rejected");
  }
  if (!response.ok) {
    throw new HybragAuthError(
      `Token exchange failed: HTTP ${response.status}`,
    );
  }
  const body = (await response.json()) as ExchangeResponse;
  if (!body.success || !body.token) {
    throw new HybragAuthError("Token exchange returned unsuccessful");
  }
  return {
    token: body.token,
    refreshToken: body.refresh_token ?? "",
    expiresAt: computeExpiry(body),
  };
}

/** 用 hybrag refresh token 换取新 access token；失败返回 null */
async function refreshHybragToken(
  refreshToken: string,
): Promise<{ token: string; refreshToken?: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as Record<string, unknown>;
    // hybrag /auth/refresh 直接返回 { access_token, ... }，也兼容
    // { success: true, data: { token, refreshToken } } 的通用形态。
    const data = (body.data as Record<string, unknown> | undefined) ?? {};
    const token = (body.access_token ?? data.token ?? body.token) as
      | string
      | undefined;
    if (!token) return null;
    const nextRefresh = (data.refreshToken ?? body.refresh_token ?? body.refreshToken) as
      | string
      | undefined;
    return { token, refreshToken: nextRefresh };
  } catch {
    return null;
  }
}

/**
 * 获取可用的 hybrag JWT：缓存未过期直接用；临期用 refresh_token 续期；
 * 刷新失败或没有缓存时重新 exchange。返回 null 表示拿不到（不应触发）。
 */
async function getHybragToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt - REFRESH_BUFFER_MS) {
    return cachedToken.token;
  }
  if (cachedToken?.refreshToken) {
    const refreshed = await refreshHybragToken(cachedToken.refreshToken);
    if (refreshed?.token) {
      cachedToken = {
        token: refreshed.token,
        refreshToken: refreshed.refreshToken ?? cachedToken.refreshToken,
        expiresAt: now + DEFAULT_TOKEN_TTL_MS,
      };
      return cachedToken.token;
    }
    cachedToken = null;
  }
  const exchanged = await exchangeHybragToken();
  if (exchanged) {
    cachedToken = exchanged;
    return exchanged.token;
  }
  return null;
}

/**
 * hybrag API 统一请求：带 Bearer、超时、401 时清缓存重试一次。
 * 非 VOS 环境 / 网关 404 抛 HybragUnavailableError。
 */
async function hybragRequest(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  if (!(await isVOSMode())) {
    throw new HybragUnavailableError("Not running under VOS");
  }
  const token = await getHybragToken();
  if (!token) {
    throw new HybragUnavailableError("HybRAG token unavailable");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 401 && retry) {
    // token 过期/失效：丢掉缓存重试一次（exchange 层发现 VOS token 失效会抛错）
    cachedToken = null;
    clearVOSAuthCache();
    return hybragRequest(path, init, false);
  }
  return response;
}

/** 列出当前空间可用（document 类型、非临时）的知识库 */
export async function listDocumentKnowledgeBases(): Promise<KnowledgeBase[]> {
  const response = await hybragRequest("/knowledge-bases");
  if (!response.ok) {
    throw new Error(`List knowledge bases failed: ${response.status}`);
  }
  const body = await response.json();
  const list = Array.isArray(body?.data) ? (body.data as KnowledgeBase[]) : [];
  // 只做 document 库；faq 库不接受文件上传，前端过滤掉
  return list.filter((kb) => kb.type === "document" && !kb.is_temporary);
}

/** 默认 embedding 模型：Model Hub Ollama Embedding（列表异常时的兜底，优先精确匹配） */
const DEFAULT_EMBEDDING_MODEL_ID = "model-hub-ollama-embedding";

/**
 * 创建 document 类型知识库，返回知识库 ID。
 *
 * embedding_model_id 必须传：服务端不传时不会补默认值，库会创建成功但成为
 * 废库——文件解析在向量化阶段报 "model ID cannot be empty"，检索也不可用
 * （已在线上日志实锤）。这里优先取空间里的 Model Hub Ollama Embedding，
 * 否则取列表里第一个 embedding 模型；列表拉不到时兜底用默认 ID。
 */
export async function createKnowledgeBase(name: string): Promise<string> {
  const [embeddingModelId, summaryModelId] = await pickDefaultModels();
  const response = await hybragRequest("/knowledge-bases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      type: "document",
      embedding_model_id: embeddingModelId,
      ...(summaryModelId ? { summary_model_id: summaryModelId } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`Create knowledge base failed: ${response.status}`);
  }
  const body = await response.json();
  const id = body?.data?.id as string | undefined;
  if (!id) {
    throw new Error("Create knowledge base returned no id");
  }
  return id;
}

/** 从空间模型列表选默认 embedding / chat 模型；找不到时用约定默认值兜底 */
async function pickDefaultModels(): Promise<[string, string | null]> {
  let models: Array<{ id?: string; name?: string; type?: string }> = [];
  try {
    const response = await hybragRequest("/models");
    if (response.ok) {
      const body = await response.json();
      models = (body?.data ?? []) as typeof models;
    }
  } catch {
    // 列表不可用时走默认值兜底
  }
  const norm = (t?: string) => (t ?? "").toLowerCase();
  const embeddingModels = models.filter(
    (m) => (m.id || m.name) && norm(m.type) === "embedding",
  );
  const preferred = embeddingModels.find(
    (m) => m.id === DEFAULT_EMBEDDING_MODEL_ID,
  );
  const embedding = preferred ?? embeddingModels[0];
  if (!embedding?.id) {
    // 模型列表拿不到/为空：退到约定的默认 embedding 模型
    return [DEFAULT_EMBEDDING_MODEL_ID, null];
  }
  const chat =
    models.find((m) => m.id && norm(m.type) === "knowledgeqa") ??
    models.find((m) => m.id && norm(m.type) === "chat");
  return [embedding.id, chat?.id ?? null];
}

/** 上传文件到指定知识库（multipart）；文件重复时抛 409 错误 */
export async function uploadKnowledgeFile(
  knowledgeBaseId: string,
  fileName: string,
  data: Uint8Array,
): Promise<void> {
  const form = new FormData();
  form.append("file", new Blob([data as BlobPart]), fileName);
  form.append("fileName", fileName);
  form.append("channel", "v-office");
  const response = await hybragRequest(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/knowledge/file`,
    { method: "POST", body: form },
  );
  if (!response.ok) {
    if (response.status === 409) {
      throw new Error("A file with the same content already exists in the knowledge base");
    }
    throw new Error(`Upload knowledge file failed: ${response.status}`);
  }
}