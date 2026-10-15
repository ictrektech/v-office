"use client";

/**
 * AI 客户端：对接本应用自己的 AI 服务（`server/ai.py`，Pi agent 托管）。
 *
 * 走的是 storage 服务同一个前缀 `/api/com.ictrek.v-office/api/v1/ai/*`：
 * VOS 网关剥前缀后转发到 storage 容器，本地 dev 由 next.config.ts 的 rewrite
 * 转发到 localhost:5000 —— 因此**不需要新增容器、也不需要新增网关路由**。
 *
 * 鉴权沿用 VOS OIDC Fastpath 令牌（与文档存储同一套，服务端复用同一个
 * `current_username` 校验）；独立部署下服务端 `V_OFFICE_AUTH_DISABLED=1`，
 * 不带令牌也能用。
 *
 * 对话是 SSE 单向流（比 WebSocket 轻，断线即取消），事件类型见 server/ai.py。
 */

import { getVOSAccessToken, clearVOSAuthCache } from "@/utils/vos/fastpath";

export const AI_BASE =
  process.env.NEXT_PUBLIC_AI_API || "/api/com.ictrek.v-office/api/v1/ai";

// ── 鉴权 ───────────────────────────────────────────────────────────────────

export async function authHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getVOSAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function aiFetch(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const resp = await fetch(`${AI_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), ...(await authHeaders()) },
  });
  if (resp.status === 401 && retry) {
    clearVOSAuthCache();
    return aiFetch(path, init, false);
  }
  return resp;
}

async function jsonOrThrow<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail || `请求失败（${resp.status}）`);
  }
  return (await resp.json()) as T;
}

// ── 服务状态与设置 ─────────────────────────────────────────────────────────

export interface AiHealth {
  ok: boolean;
  pi: { available: boolean; path: string; version: string | null };
  skills_dir: string;
  running: string[];
  global_concurrency: number;
}

export interface AiSettings {
  base_url: string;
  model: string;
  thinking: string;
  max_concurrency: number;
  turn_timeout_s: number;
  idle_timeout_s: number;
  auto_approve: boolean;
  /** 是否允许 agent 执行本地命令（默认关：写作只需读材料 / 写稿子） */
  allow_shell: boolean;
  skills: string[];
  system_prompt: string;
  /** 服务端只回「配没配」，不回明文密钥 */
  has_api_key: boolean;
  effective_base_url: string;
  /** 当前实际生效的工具白名单（服务端回传，避免两边口径不一致） */
  effective_tools: string;
  /** 当前实际注入的提示词护栏原文 */
  policy_text: string;
}

export async function aiHealth(): Promise<AiHealth> {
  const resp = await aiFetch("/health", { cache: "no-store" });
  return jsonOrThrow<AiHealth>(resp);
}

export async function getAiSettings(): Promise<AiSettings> {
  const resp = await aiFetch("/settings", { cache: "no-store" });
  return jsonOrThrow<AiSettings>(resp);
}

export async function putAiSettings(
  patch: Record<string, unknown>,
): Promise<AiSettings> {
  const resp = await aiFetch("/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return jsonOrThrow<AiSettings>(resp);
}

// ── 会话 ───────────────────────────────────────────────────────────────────

export interface AiSessionMeta {
  id: string;
  title: string;
  skill?: string;
  created_at?: number;
  updated_at?: number;
  turn?: number;
}

export async function createAiSession(
  title = "",
  skill = "",
): Promise<AiSessionMeta> {
  const resp = await aiFetch("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, skill }),
  });
  return jsonOrThrow<AiSessionMeta>(resp);
}

export async function listAiSessions(): Promise<AiSessionMeta[]> {
  const resp = await aiFetch("/sessions", { cache: "no-store" });
  return (await jsonOrThrow<{ sessions: AiSessionMeta[] }>(resp)).sessions;
}

export async function deleteAiSession(sid: string): Promise<void> {
  await aiFetch(`/sessions/${encodeURIComponent(sid)}`, { method: "DELETE" });
}

/** 让服务端把这一回合的进程树收掉（正常停止走 AbortController 也行，这个是兜底） */
export async function stopAiSession(sid: string): Promise<boolean> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/stop`, {
    method: "POST",
  });
  if (!resp.ok) return false;
  const body = (await resp.json()) as { stopped?: boolean };
  return !!body.stopped;
}

export interface AiMaterial {
  name: string;
  size: number;
  chars: number;
  truncated?: boolean;
  parseError?: string | null;
}

export interface AiDraftBlock {
  anchor: string;
  heading: string;
  text: string;
}

export interface AiDraft {
  title: string;
  blocks: AiDraftBlock[];
  chars: number;
  updated_at?: number;
}

export interface AiSessionState {
  materials: AiMaterial[];
  /** 当前会话的成稿模板（用户上传；没有就是 null） */
  template?: AiTemplate | null;
  draft: AiDraft;
  /** 产物清单（四件套这类多文件任务用；没有就是空数组） */
  artifacts?: AiArtifact[];
  /** 当前在编辑器里改的是哪一份产物 */
  activeArtifact?: string;
  running: boolean;
}

export async function getAiState(sid: string): Promise<AiSessionState> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/state`, {
    cache: "no-store",
  });
  return jsonOrThrow<AiSessionState>(resp);
}

/**
 * 上传材料：服务端**当场解析成文本**再入库。
 * agent 全程看不到这份文件——所以这里返回的是解析结果（字数/失败原因），
 * 前端据此提示「扫描件解析不出正文，请补文字说明」这类情况。
 */
export async function uploadAiMaterial(
  sid: string,
  file: File,
): Promise<AiMaterial> {
  const resp = await aiFetch(
    `/sessions/${encodeURIComponent(sid)}/materials?name=${encodeURIComponent(file.name)}`,
    { method: "POST", body: await file.arrayBuffer() },
  );
  return jsonOrThrow<AiMaterial>(resp);
}

/** 撤掉一份材料：下一轮起 agent 的参考里不再有它（原件由会话删除时一并清）。 */
export async function deleteAiMaterial(sid: string, name: string): Promise<void> {
  await aiFetch(
    `/sessions/${encodeURIComponent(sid)}/materials/${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
}

/** 成稿模板的摘要（全文在服务端，这里只够画界面）。 */
export interface AiTemplate {
  name: string;
  chars: number;
  truncated?: boolean;
  parseError?: string | null;
  uploaded_at?: number;
}

/**
 * 上传成稿模板（docx/md/txt）：服务端解析成文本，之后每轮 prompt 都带
 * 「严格按这个模板的栏目成文」。材料是「写什么」，模板是「按什么结构写」。
 */
export async function uploadAiTemplate(
  sid: string,
  file: File,
): Promise<AiTemplate> {
  const resp = await aiFetch(
    `/sessions/${encodeURIComponent(sid)}/template?name=${encodeURIComponent(file.name)}`,
    { method: "POST", body: await file.arrayBuffer() },
  );
  const data = await jsonOrThrow<{ template: AiTemplate }>(resp);
  return data.template;
}

/** 撤掉模板：下一轮起不再按它的结构成文。 */
export async function deleteAiTemplate(sid: string): Promise<void> {
  await aiFetch(`/sessions/${encodeURIComponent(sid)}/template`, { method: "DELETE" });
}

/**
 * 产物（artifacts）——一会话多份成文。
 *
 * 草稿只有一份，但申请文件四件套这种任务天生要交四份文件；把每份单独存，
 * 界面才能摆出「四张卡、各自状态」。正文按需单取，列表响应里不带全文。
 */
export interface AiArtifact {
  key: string;
  title: string;
  chars: number;
  updated_at: number;
}

export async function listAiArtifacts(
  sid: string,
): Promise<{ artifacts: AiArtifact[]; active: string }> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/artifacts`, {
    cache: "no-store",
  });
  const data = await jsonOrThrow<{ artifacts?: AiArtifact[]; active?: string }>(resp);
  return { artifacts: data.artifacts ?? [], active: data.active ?? "" };
}

export async function saveAiArtifact(
  sid: string,
  key: string,
  title: string,
  markdown: string,
): Promise<AiArtifact> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/artifacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, title, markdown }),
  });
  return jsonOrThrow<AiArtifact>(resp);
}

export async function fetchAiArtifact(
  sid: string,
  key: string,
): Promise<{ key: string; title: string; markdown: string }> {
  const resp = await aiFetch(
    `/sessions/${encodeURIComponent(sid)}/artifacts/${encodeURIComponent(key)}`,
    { cache: "no-store" },
  );
  return jsonOrThrow<{ key: string; title: string; markdown: string }>(resp);
}

export async function deleteAiArtifact(sid: string, key: string): Promise<void> {
  await aiFetch(`/sessions/${encodeURIComponent(sid)}/artifacts/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
}

export interface AiPatch {
  anchor: string;
  op?: string;
  heading?: string;
  text: string;
  before?: string;
  /** 整篇替换（来自 <final-doc>） */
  full?: boolean;
}

export interface AiApplyResult {
  applied: AiPatch[];
  skipped: { anchor?: string; reason?: string }[];
  draft: AiDraft;
  saved: string | null;
}

/** 用户点「接受」后落文：服务端改草稿，并按需写进「我的文档」 */
export async function applyAiPatches(
  sid: string,
  patches: AiPatch[],
  save = true,
): Promise<AiApplyResult> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patches, save }),
  });
  return jsonOrThrow<AiApplyResult>(resp);
}

/** 主动保存当前草稿到「我的文档」 */
export async function saveAiDraft(
  sid: string,
): Promise<{ saved: string; draft: AiDraft; already?: boolean }> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/save`, {
    method: "POST",
  });
  return jsonOrThrow<{ saved: string; draft: AiDraft; already?: boolean }>(resp);
}

/** 对话记录里的一条（服务端只认白名单字段，见 server/ai.py 的 transcript 段） */
export interface AiTranscriptMessage {
  role: "user" | "agent";
  text: string;
  at: string;
  /** 模型的思考过程 */
  thinking?: string;
  anchor?: string;
}

/** 取这条会话的对话记录（含思考过程）；没有则返回空数组 */
export async function getAiTranscript(
  sid: string,
): Promise<{ messages: AiTranscriptMessage[] }> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/transcript`);
  return jsonOrThrow<{ messages: AiTranscriptMessage[] }>(resp);
}

/** 存下这条会话的对话记录（对话停下来后由 hook 自动落库） */
export async function putAiTranscript(
  sid: string,
  messages: AiTranscriptMessage[],
): Promise<{ saved: boolean }> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/transcript`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  return jsonOrThrow<{ saved: boolean }>(resp);
}

/**
 * 量一下「我的文档」里那份 docx 的正文长度（只读）。
 *
 * 注入完成后用它核对有没有贴全：粘贴是异步的，保存抢跑会落下一份截断的文档。
 * 返回 0 = 这次没量上（文件不存在/转换失败），调用方按「不算失败」处理。
 */
export async function getDocChars(sid: string, name: string): Promise<number> {
  const resp = await aiFetch(
    `/sessions/${encodeURIComponent(sid)}/doc-chars?name=${encodeURIComponent(name)}`,
  );
  const data = await jsonOrThrow<{ chars: number }>(resp);
  return data.chars || 0;
}

/**
 * 草稿 → `.docx` 并写进「我的文档」，返回文件名。
 *
 * 这是打开编辑器内核（Collabora）的前置步骤：内核只认 docx/odt，而草稿是
 * Markdown。转换用技能包里的确定性脚本做（服务端起子进程），所以结果稳定。
 *
 * `blank`：**打开编辑器的载体请求**。撰写室一进来就是 Collabora，空稿也得有个
 * 文件才能起内核，这时传 true，服务端给一份完全空白（不含标题）的 docx；
 * 用户主动「出稿」时不传——空稿会被服务端回「还没有内容」，不产出只有标题的
 * 文件（那会把同名文档覆盖成十几字节，把用户写好的正文弄丢）。
 */
export async function exportAiDocx(
  sid: string,
  opts: { blank?: boolean } = {},
): Promise<{ saved: string; draft: AiDraft }> {
  const query = opts.blank ? "?blank=1" : "";
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/docx${query}`, {
    method: "POST",
  });
  return jsonOrThrow<{ saved: string; draft: AiDraft }>(resp);
}

/**
 * 取草稿的 HTML（服务端走「md→docx→mammoth」同一条管线渲染）。
 *
 * 前端**不自己渲染 Markdown**：早先前端那套把 `**加粗**` 原样粘进了文档、
 * 标题还重复——两套渲染器必然各画各的。docx 是用户最终要的东西，长相以它
 * 为准：这里返回的就是「那份 docx 的 HTML 版」，粘贴进编辑器后与 apply 写盘
 * 的内容完全一致。
 */
export async function fetchAiDraftHtml(sid: string): Promise<string> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/draft-html`);
  const data = await jsonOrThrow<{ html: string }>(resp);
  return data.html || "";
}

/**
 * 把「我的文档」里的 docx 回读成草稿。
 *
 * 用户在编辑器里手改的内容不进 agent 的会话上下文，不回读的话下一轮 AI
 * 会拿着旧稿改，等于把用户的修改覆盖掉。
 */
export async function importAiDocx(sid: string, name: string): Promise<AiDraft> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/import-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return (await jsonOrThrow<{ draft: AiDraft; source: string }>(resp)).draft;
}

/** 从编辑器导入当前稿（用户在编辑器里手改过，agent 是不知道的） */
export async function importAiDraft(
  sid: string,
  markdown: string,
  title = "",
): Promise<AiDraft> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, title }),
  });
  return jsonOrThrow<AiDraft>(resp);
}

// ── 对话（SSE）─────────────────────────────────────────────────────────────

export interface AiEvent {
  type: string;
  [key: string]: unknown;
}

export interface ChatOptions {
  prompt: string;
  resume?: boolean;
  /** 要改的段落编号（服务端草稿里的方括号编号） */
  anchor?: string;
  /** 用户选中的原文（与 anchor 二选一或同时给） */
  selection?: string;
  /** 这一轮结束后立刻存进我的文档 */
  save?: boolean;
  /** 初稿是否自动存进我的文档（写作栏目自管保存时设 false） */
  autosave?: boolean;
  onEvent: (event: AiEvent) => void;
  signal?: AbortSignal;
}

/**
 * 发一个回合并消费 SSE。
 *
 * 客户端通过关闭连接即可取消（服务端会捕获断开并杀掉进程树）；
 * 这里不做重试——重试策略在服务端（最轻：只兜底一次）。
 */
export async function chatStream(
  sid: string,
  { prompt, resume = true, anchor = "", selection = "", save = false, autosave = true, onEvent, signal }: ChatOptions,
): Promise<void> {
  const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, resume, anchor, selection, save, autosave }),
    signal,
  });
  if (!resp.ok || !resp.body) {
    const body = (await resp.json().catch(() => ({}))) as { detail?: string };
    onEvent({ type: "error", message: body.detail || `连接失败（${resp.status}）` });
    onEvent({ type: "closed" });
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          onEvent(JSON.parse(payload) as AiEvent);
        } catch {
          // 半行/坏行直接跳过：SSE 下一行还会来
        }
      }
    }
  } catch (err) {
    // AbortError = 用户主动停止，不算错误
    if (!(err instanceof DOMException && err.name === "AbortError")) {
      onEvent({ type: "error", message: `连接中断：${String(err)}` });
    }
  } finally {
    onEvent({ type: "closed" });
  }
}
