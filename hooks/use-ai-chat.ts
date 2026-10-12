"use client";

/**
 * 栏目级 AI 对话状态机（专利 / 写作共用）。
 *
 * 这一版按「零盘 agent」重写：
 * - agent 只输出文本与 patch，草稿真值在服务端；这里只负责把事件画出来
 * - 「接受」才落文：accept → 服务端 apply → 拉回新草稿 + 已保存文件名
 * - 材料上传返回的是**解析结果**（字数/失败原因），不是文件句柄
 *
 * 重试/超时/并发/进程回收/落盘全在服务端（server/ai.py），前端没有计时器。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  aiHealth,
  applyAiPatches,
  chatStream,
  createAiSession,
  exportAiDocx,
  getAiState,
  importAiDocx,
  importAiDraft,
  saveAiDraft,
  stopAiSession,
  uploadAiMaterial,
  type AiDraft,
  type AiEvent,
  type AiHealth,
  type AiMaterial,
  type AiPatch,
} from "@/utils/ai/client";
import type { AgentChange } from "@/utils/patent/types";

/** 面板里的变更卡：AgentChange + 落文需要的额外字段 */
export type ChangeLike = AgentChange & { key?: string; full?: boolean; fullText?: string };

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  at: string;
  streaming?: boolean;
  error?: boolean;
  /** 附注：重试、工具调用、编号纠偏等 */
  notes?: string[];
  /** 待确认/已处理的文档变更 */
  changes?: ChangeLike[];
  /** 这条用户消息指向的段落（用于在消息里显示「第 N 段」） */
  anchor?: string;
}

export interface SendOptions {
  anchor?: string;
  selection?: string;
  /** 这一轮结束后立刻存进我的文档 */
  save?: boolean;
}

export interface UseAiChat {
  messages: ChatMessage[];
  draft: AiDraft | null;
  materials: AiMaterial[];
  sessionId: string | null;
  streaming: boolean;
  health: AiHealth | null;
  /** 最近一次写进「我的文档」的文件名 */
  lastSaved: string | null;
  /** 需要用户先去设置页处理的情况（未配密钥 / 没装 pi） */
  blocked: string | null;
  pendingChanges: number;
  send: (instruction: string, options?: SendOptions) => Promise<void>;
  stop: () => void;
  reset: () => void;
  upload: (file: File) => Promise<AiMaterial>;
  saveNow: () => Promise<void>;
  importDraft: (markdown: string, title?: string) => Promise<void>;
  /** 草稿 → docx 落「我的文档」，返回文件名（打开编辑器内核用） */
  exportDocx: () => Promise<string>;
  /** 把「我的文档」里的 docx 回读成草稿（编辑器里改过的内容回灌） */
  importDocx: (name: string) => Promise<void>;
  acceptChange: (changeKey: string) => Promise<void>;
  rejectChange: (changeKey: string) => void;
  acceptAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const now = () =>
  new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

let seq = 0;
const nextId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

/** 把 patch 映射成面板能画的变更卡 */
function toChange(patch: AiPatch, messageId: string): ChangeLike {
  const op = (patch.op || "replace").toLowerCase();
  const full = patch.full || patch.anchor === "all";
  const text = patch.text || "";
  return {
    id: `${messageId}-${patch.anchor}-${op}-${Math.random().toString(36).slice(2, 6)}`,
    key: `${messageId}:${patch.anchor}:${op}`,
    operation: op === "insert" ? "insert" : op === "delete" ? "delete" : "replace",
    anchor: full ? "全文" : String(patch.anchor || ""),
    before: patch.before || "",
    // after 只用于展示（全文可能几万字，别塞进 DOM）；落文用 fullText
    after: full && text.length > 400 ? `${text.slice(0, 400)}…` : text,
    fullText: text,
    reason: full ? "整篇重写" : "按你的要求修改",
    status: "proposed",
    full,
  };
}

export function useAiChat(options: {
  skill: string;
  title?: string;
  persistKey?: string;
}): UseAiChat {
  const { skill, title = "", persistKey } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [materials, setMaterials] = useState<AiMaterial[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState(title);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<string | null>(null);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionRef.current) return sessionRef.current;
    const meta = await createAiSession(draftTitle, skill);
    sessionRef.current = meta.id;
    setSessionId(meta.id);
    if (persistKey) {
      try {
        localStorage.setItem(persistKey, meta.id);
      } catch {
        // 无痕模式忽略
      }
    }
    return meta.id;
  }, [draftTitle, persistKey, skill]);

  const refresh = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    try {
      const state = await getAiState(sid);
      setDraft(state.draft);
      setMaterials(state.materials);
      if (state.draft?.title) setDraftTitle(state.draft.title);
    } catch {
      // 状态拉取失败不影响对话
    }
  }, []);

  // 初始化：探活 → 建会话 → 拉状态
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const h = await aiHealth();
        if (!alive) return;
        setHealth(h);
        if (!h.pi.available) {
          setBlocked("服务端未安装 pi，请联系管理员");
          return;
        }
      } catch {
        if (alive) setBlocked("AI 服务不可用（后端未启动或未部署）");
        return;
      }
      try {
        await ensureSession();
        await refresh();
      } catch {
        if (alive) setBlocked("无法创建 AI 会话");
      }
    })();
    return () => {
      alive = false;
    };
  }, [ensureSession, refresh]);

  const patchMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    [],
  );

  const send = useCallback(
    async (instruction: string, options: SendOptions = {}) => {
      const text = instruction.trim();
      if (!text || streaming) return;
      const sid = await ensureSession();
      const agentId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text, at: now(), anchor: options.anchor },
        { id: agentId, role: "agent", text: "", at: now(), streaming: true },
      ]);
      setStreaming(true);
      setBlocked(null);
      const controller = new AbortController();
      abortRef.current = controller;

      let sawError = false;
      const addNote = (note: string) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === agentId ? { ...m, notes: [...(m.notes ?? []), note] } : m)),
        );

      try {
        await chatStream(sid, {
          prompt: text,
          anchor: options.anchor || "",
          selection: options.selection || "",
          save: !!options.save,
          signal: controller.signal,
          onEvent: (event: AiEvent) => {
            switch (event.type) {
              case "delta":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentId ? { ...m, text: m.text + String(event.text ?? "") } : m,
                  ),
                );
                break;
              case "message_end": {
                const full = String(event.text ?? "");
                if (full) patchMessage(agentId, { text: full });
                break;
              }
              case "patch": {
                const change = toChange(event.patch as AiPatch, agentId);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentId ? { ...m, changes: [...(m.changes ?? []), change] } : m,
                  ),
                );
                break;
              }
              case "draft": {
                setDraft(event.draft as AiDraft);
                const t = (event.draft as AiDraft)?.title;
                if (t) setDraftTitle(t);
                break;
              }
              case "saved":
                setLastSaved(String(event.name ?? ""));
                break;
              case "retry":
                addNote(`模型未响应，自动重试第 ${event.attempt ?? 2} 次`);
                break;
              case "tools": {
                const names = Array.isArray(event.names) ? event.names : [];
                if (names.length) addNote(`调用工具：${names.join("、")}`);
                break;
              }
              case "warn":
                addNote(String(event.message ?? ""));
                break;
              case "error": {
                sawError = true;
                const message = String(event.message ?? "出错了");
                const partial = String(event.text ?? "");
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentId
                      ? {
                          ...m,
                          streaming: false,
                          error: true,
                          text: partial || message,
                          notes: partial ? [...(m.notes ?? []), message] : m.notes,
                        }
                      : m,
                  ),
                );
                if (event.kind === "preflight") setBlocked(message);
                break;
              }
              default:
                break;
            }
          },
        });
      } catch (err) {
        sawError = true;
        patchMessage(agentId, { streaming: false, error: true, text: `发送失败：${String(err)}` });
      } finally {
        abortRef.current = null;
        setStreaming(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentId
              ? {
                  ...m,
                  streaming: false,
                  error: m.error || (sawError ? true : undefined),
                  text: m.text || (sawError ? m.text : "（本轮没有输出）"),
                }
              : m,
          ),
        );
        void refresh();
      }
    },
    [ensureSession, patchMessage, refresh, streaming],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    const sid = sessionRef.current;
    if (sid) void stopAiSession(sid);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    sessionRef.current = null;
    setSessionId(null);
    setMessages([]);
    setDraft(null);
    setMaterials([]);
    setLastSaved(null);
    if (persistKey) {
      try {
        localStorage.removeItem(persistKey);
      } catch {
        // 忽略
      }
    }
    void ensureSession().then(() => refresh());
  }, [ensureSession, persistKey, refresh]);

  const upload = useCallback(
    async (file: File) => {
      const sid = await ensureSession();
      const parsed = await uploadAiMaterial(sid, file);
      await refresh();
      return parsed;
    },
    [ensureSession, refresh],
  );

  const saveNow = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    try {
      const res = await saveAiDraft(sid);
      setLastSaved(res.saved);
      setDraft(res.draft);
    } catch (err) {
      setBlocked(String(err));
    }
  }, []);

  const importDraft = useCallback(
    async (markdown: string, nextTitle = "") => {
      const sid = await ensureSession();
      const updated = await importAiDraft(sid, markdown, nextTitle || draftTitle);
      setDraft(updated);
      if (updated.title) setDraftTitle(updated.title);
    },
    [draftTitle, ensureSession],
  );

  /** 出稿：草稿 → docx。失败往上抛，由栏目页决定怎么提示（这里不吞） */
  const exportDocx = useCallback(async (): Promise<string> => {
    const sid = await ensureSession();
    const res = await exportAiDocx(sid);
    setDraft(res.draft);
    if (res.draft?.title) setDraftTitle(res.draft.title);
    setLastSaved(res.saved);
    return res.saved;
  }, [ensureSession]);

  /** 回读：编辑器里改过的 docx → 草稿。失败也往上抛（回读失败不该静默） */
  const importDocx = useCallback(
    async (name: string) => {
      const sid = await ensureSession();
      const updated = await importAiDocx(sid, name);
      setDraft(updated);
      if (updated.title) setDraftTitle(updated.title);
    },
    [ensureSession],
  );

  const markChange = useCallback(
    (changeKey: string, status: AgentChange["status"]) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.changes
            ? {
                ...m,
                changes: m.changes.map((c) =>
                  (c as { key?: string }).key === changeKey ? { ...c, status } : c,
                ),
              }
            : m,
        ),
      );
    },
    [],
  );

  const applyChanges = useCallback(
    async (changes: ChangeLike[]) => {
      const sid = sessionRef.current;
      if (!sid || changes.length === 0) return;
      // 全文替换的正文可能很长，展示用 after 已截断，落文要用 fullText
      const patches: AiPatch[] = changes.map((c) => ({
        anchor: c.full ? "all" : String(c.anchor),
        op: c.operation === "insert" ? "insert" : c.operation === "delete" ? "delete" : "replace",
        text: c.fullText || c.after || "",
        full: !!c.full,
      }));
      try {
        const res = await applyAiPatches(sid, patches, true);
        for (const c of changes) if (c.key) markChange(c.key, "accepted");
        setDraft(res.draft);
        if (res.saved) setLastSaved(res.saved);
        if (res.skipped.length) {
          const detail = res.skipped.map((s) => `第 ${s.anchor} 段：${s.reason}`).join("；");
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "agent", text: `有变更没能应用：${detail}`, at: now(), error: true },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "agent", text: `应用变更失败：${String(err)}`, at: now(), error: true },
        ]);
      }
    },
    [markChange],
  );

  const acceptChange = useCallback(
    async (changeKey: string) => {
      const all = messages.flatMap((m) => (m.changes ?? []) as ChangeLike[]);
      const target = all.filter((c) => c.key === changeKey);
      await applyChanges(target);
    },
    [applyChanges, messages],
  );

  const rejectChange = useCallback(
    (changeKey: string) => markChange(changeKey, "rejected"),
    [markChange],
  );

  const acceptAll = useCallback(async () => {
    const all = messages.flatMap((m) => (m.changes ?? []) as ChangeLike[]);
    await applyChanges(all.filter((c) => c.status === "proposed"));
  }, [applyChanges, messages]);

  const pendingChanges = messages.reduce(
    (count, m) => count + (m.changes ?? []).filter((c) => c.status === "proposed").length,
    0,
  );

  return {
    messages,
    draft,
    materials,
    sessionId,
    streaming,
    health,
    lastSaved,
    blocked,
    pendingChanges,
    send,
    stop,
    reset,
    upload,
    saveNow,
    importDraft,
    exportDocx,
    importDocx,
    acceptChange,
    rejectChange,
    acceptAll,
    refresh,
  };
}
