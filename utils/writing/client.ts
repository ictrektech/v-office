"use client";

/**
 * 公文写作子页面客户端：鉴权、材料上传、WebSocket 会话。
 *
 * 鉴权链路对齐 AI 助手插件（public/ai-assistant/index.js）：
 * 1. VOS 模式下用 fastpath 拿 VOS access token
 * 2. POST {API_BASE}/auth/vos-oidc 兑换本应用 JWT（内存缓存）
 * 3. WS {API_BASE}/chat?token=<JWT>，create_session → writing_request
 *
 * 本地开发（非 VOS）：不带 token，直连同源（Next rewrite）/ 回退 5004、5273。
 */

import { getVOSAccessToken, isVOSMode } from "@/utils/vos/fastpath";

export const API_BASE = "/api/com.ictrek.agentic-search";

// ── 鉴权 ──────────────────────────────────────────────────────────────────

let jwtCache: string | null = null;

/** 本应用 JWT：VOS 模式兑换并缓存；本地模式返回 null */
export async function getWritingJwt(): Promise<string | null> {
  try {
    if (!(await isVOSMode())) return null;
  } catch {
    return null;
  }
  if (jwtCache) return jwtCache;
  const vosToken = await getVOSAccessToken();
  if (!vosToken) return null;
  try {
    const resp = await fetch(`${API_BASE}/auth/vos-oidc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: vosToken }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { success?: boolean; token?: string };
    if (data?.success && data.token) {
      jwtCache = data.token;
      return jwtCache;
    }
    return null;
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const jwt = await getWritingJwt();
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}

// ── 材料上传 ───────────────────────────────────────────────────────────────

export interface UploadedSource {
  uploadId: string;
  name: string;
  size: number;
  /** 上传时预解析出的字数（0 = 未提取到文本） */
  chars: number;
  /** 解析失败原因（扫描件 PDF 等；无则解析成功） */
  parseError?: string;
}

export async function uploadSourceFile(file: File): Promise<UploadedSource> {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${API_BASE}/writing/upload`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `上传失败（${resp.status}）`);
  }
  return (await resp.json()) as UploadedSource;
}

// ── WebSocket 会话 ─────────────────────────────────────────────────────────

export interface WritingConfig {
  docType: string;
  title: string;
  publisher?: string;
  audience?: string;
  style?: string;
  requirements?: string;
  lengthWords?: number;
  rewriteRounds?: number;
  knowledgeBaseNames?: string[];
  /** 发文字号（红头文件版式用，如 "X政发〔2026〕5号"） */
  docNumber?: string;
}

export type WritingEvent = Record<string, unknown> & { _event?: string };

type EventListener = (data: WritingEvent) => void;

function buildWsCandidates(token: string): string[] {
  if (typeof window === "undefined") return [];
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  const host = window.location.host;
  const list = [
    `${scheme}://${host}${API_BASE}/chat${suffix}`,
    `ws://${window.location.hostname}:5004${API_BASE}/chat${suffix}`,
    `ws://${window.location.hostname}:5273${API_BASE}/chat${suffix}`,
  ];
  return [...new Set(list)];
}

export class WritingClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private closeListener: (() => void) | null = null;
  private started = false;
  /** 防止 stop() 后 onClose 触发 UI 错误态 */
  intentionallyClosed = false;

  onEvent(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onClose(listener: () => void): void {
    this.closeListener = listener;
  }

  private emit(data: WritingEvent): void {
    for (const l of this.listeners) l(data);
  }

  /**
   * 连接并启动写作。依次尝试候选 WS 地址，首个成功升级的连接生效。
   */
  async start(
    config: WritingConfig,
    uploadId?: string,
    agent: "claude" | "opencode" = "claude",
  ): Promise<void> {
    const jwt = await getWritingJwt();
    const candidates = buildWsCandidates(jwt ?? "");
    if (candidates.length === 0) throw new Error("无法建立连接");

    for (const url of candidates) {
      try {
        await this.connect(url);
        break;
      } catch (err) {
        if (url === candidates[candidates.length - 1]) {
          throw new Error("无法连接 AI 服务（ agentic-search 未启动？）");
        }
        console.warn("[writing] ws candidate failed:", url, err);
      }
    }

    try {
      await this.createSession(agent);
    } catch (err) {
      // 后端热重载 / spawn 瞬时卡顿会导致握手成功但会话无响应：
      // 断开重连一次再试，仍失败才报错
      console.warn("[writing] create_session failed, retrying once:", err);
      this.disconnect();
      for (const url of candidates) {
        try {
          await this.connect(url);
          break;
        } catch {
          if (url === candidates[candidates.length - 1]) {
            throw err instanceof Error ? err : new Error(String(err));
          }
        }
      }
      await this.createSession(agent);
    }

    this.started = true;
    this.ws!.send(
      JSON.stringify({
        type: "writing_request",
        config,
        ...(uploadId ? { uploadId } : {}),
      }),
    );
  }

  /** 成稿后局部微调：发修订指令，服务端重新导出后经 writing_done 推送新成稿 */
  revise(instruction: string, config: WritingConfig): void {
    if (!this.ws || !this.started) {
      throw new Error("连接未就绪，请重新生成后再试");
    }
    this.ws.send(
      JSON.stringify({
        type: "writing_revise",
        instruction,
        config,
      }),
    );
  }

  /** 撤销最近一次修改：服务端回退到上一版成稿并重新导出（无 LLM 调用） */
  undo(config: WritingConfig): void {
    if (!this.ws || !this.started) {
      throw new Error("连接未就绪，请重新生成后再试");
    }
    this.ws.send(JSON.stringify({ type: "writing_undo", config }));
  }

  /** 发送 create_session 并等待 session_created（20s 超时） */
  private createSession(agent: "claude" | "opencode"): Promise<void> {
    this.ws!.send(
      JSON.stringify({
        type: "create_session",
        agent: agent === "opencode" ? "opencode" : "claude-code",
        mode: "all",
      }),
    );
    return this.waitSessionCreated();
  }

  /** 当前会话 id（create_session / join_session 成功后可用） */
  sessionId = "";

  /** 重连已有写作会话（join_session）：刷新后恢复微调/撤销能力 */
  async resume(sessionId: string): Promise<void> {
    const jwt = await getWritingJwt();
    const candidates = buildWsCandidates(jwt ?? "");
    if (candidates.length === 0) throw new Error("无法建立连接");
    for (const url of candidates) {
      try {
        await this.connect(url);
        break;
      } catch (err) {
        if (url === candidates[candidates.length - 1]) {
          throw new Error("无法连接 AI 服务（ agentic-search 未启动？）");
        }
        console.warn("[writing] ws candidate failed:", url, err);
      }
    }
    this.ws!.send(JSON.stringify({ type: "join_session", session_id: sessionId }));
    await this.waitSessionCreated();
    this.started = true;
  }

  private waitSessionCreated(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("创建会话超时")), 20_000);
      const off = this.onEvent((data) => {
        if (data._event === "session_created") {
          clearTimeout(timer);
          off();
          const sid = (data as { session?: { id?: string } }).session?.id;
          if (sid) this.sessionId = sid;
          resolve();
        } else if (data._event === "error") {
          clearTimeout(timer);
          off();
          reject(new Error(String(data.message ?? "创建会话失败")));
        }
      });
    });
  }

  private connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            ws.close();
          } catch { /* ignore */ }
          reject(new Error("连接超时"));
        }
      }, 8_000);

      ws.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.ws = ws;
        this.attach(ws);
        resolve();
      };
      ws.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error("连接失败"));
      };
    });
  }

  private attach(ws: WebSocket): void {
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string) as WritingEvent;
        // 后端消息只带 type 字段：镜像到 _event，统一所有事件分发（createSession / handleEvent）
        if (!data._event) {
          const t = (data as Record<string, unknown>).type;
          if (typeof t === "string") data._event = t;
        }
        this.emit(data);
      } catch {
        // 非 JSON 消息忽略
      }
    };
    ws.onclose = () => {
      this.ws = null;
      if (!this.intentionallyClosed) this.closeListener?.();
    };
  }

  /** 停止写作（终止管线与 agent 进程） */
  stop(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.started) {
        try {
          this.ws.send(JSON.stringify({ type: "stop_writing" }));
        } catch { /* ignore */ }
      }
      this.intentionallyClosed = true;
      try {
        this.ws.close();
      } catch { /* ignore */ }
    }
    this.ws = null;
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    try {
      this.ws?.close();
    } catch { /* ignore */ }
    this.ws = null;
  }
}

export interface RestoredWriting {
  restored: boolean;
  title?: string;
  content?: string;
  files?: { name: string; url: string }[];
  revisions?: number;
}

/** 刷新后恢复成稿：按会话 id 取最新版本栈成稿并重新导出（无 LLM 调用） */
export async function restoreWriting(
  sessionId: string,
  config: WritingConfig,
): Promise<RestoredWriting | null> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/writing/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ session: sessionId, config }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`恢复失败 (${res.status})`);
  return (await res.json()) as RestoredWriting;
}
