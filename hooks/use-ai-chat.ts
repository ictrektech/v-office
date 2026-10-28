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
  deleteAiArtifact,
  deleteAiMaterial,
  deleteAiTemplate,
  exportAiDocx,
  fetchAiArtifact,
  fetchAiDraftHtml,
  getAiState,
  getAiTranscript,
  importAiDocx,
  importAiDraft,
  putAiTranscript,
  saveAiArtifact,
  saveAiDraft,
  stopAiSession,
  uploadAiMaterial,
  uploadAiTemplate,
  type AiArtifact,
  type AiDraft,
  type AiEvent,
  type AiHealth,
  type AiMaterial,
  type AiPatch,
  type AiTemplate,
  type AiTranscriptMessage,
} from "@/utils/ai/client";
import type { AgentChange } from "@/utils/patent/types";

/** 面板里的变更卡：AgentChange + 落文需要的额外字段 */
export type ChangeLike = AgentChange & { key?: string; full?: boolean; fullText?: string };

/**
 * 上次那条会话线的 id（`persistKey` 存在 localStorage 里的值）。
 *
 * 无痕模式下 localStorage 会直接抛异常，一律当「没有」处理，别让它炸掉初始化。
 */
export function readPersistedSession(key?: string): string {
  if (!key) return "";
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function clearPersistedSession(key?: string): void {
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // 忽略
  }
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  at: string;
  streaming?: boolean;
  error?: boolean;
  /** 这一条（agent 消息）开始生成的时间戳：面板据此显示「已思考 N 秒」 */
  startedAt?: number;
  /** 附注：重试、工具调用、编号纠偏等 */
  notes?: string[];
  /** 待确认/已处理的文档变更 */
  changes?: ChangeLike[];
  /**
   * 模型的思考过程（流式累积）。
   *
   * 只上屏、**不进草稿**：它是模型的推理草稿，不是专利正文。服务端把它
   * 作为独立的 `thinking` 事件发出来，就是为了让用户在长思考期间有东西看。
   */
  thinking?: string;
  /**
   * 正在做的事：**最新一步** + 累计步数，只占一行。
   *
   * 以前是每轮往 notes 里塞一条「调用工具：read、read」——一次写作能堆出
   * 二十多行几乎一样的字，用户看到的就是一面墙。现在改成一行就地更新：
   * 「正在读取 SKILL.md（第 7 步）」。
   */
  activity?: { name: string; target: string; steps: number };
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
  /** 当前会话的成稿模板（用户上传；null = 没传，按技能包默认结构写） */
  template: AiTemplate | null;
  sessionId: string | null;
  streaming: boolean;
  health: AiHealth | null;
  /** 最近一次写进「我的文档」的文件名 */
  lastSaved: string | null;
  /** 最近一次「保存到我的文档」的结果（界面据此给出明确反馈） */
  lastSave: {
    name: string;
    /** 文档本来就在「我的文档」里，一个字都没改 */
    already: boolean;
    at: number;
    error?: string;
  } | null;
  /** 需要用户先去设置页处理的情况（未配密钥 / 没装 pi） */
  blocked: string | null;
  pendingChanges: number;
  /** 返回本轮是否完整成功；调用方可用它决定是否推进流程 */
  send: (instruction: string, options?: SendOptions) => Promise<boolean>;
  stop: () => void;
  upload: (file: File) => Promise<AiMaterial>;
  /** 上传成稿模板：之后每轮都按它的结构成文 */
  uploadTemplate: (file: File) => Promise<AiTemplate>;
  /** 撤掉模板 */
  removeTemplate: () => Promise<void>;
  /** 撤掉一份材料 */
  removeMaterial: (name: string) => Promise<void>;
  /** 产物清单（多文件任务用；没有就是空数组） */
  artifacts: AiArtifact[];
  /** 当前在编辑器里改的是哪份产物 */
  activeArtifact: string;
  /** 把当前稿子存成某份产物（并设为活动产物） */
  saveArtifactFromDraft: (key: string, title: string) => Promise<void>;
  /** 在编辑器里打开某份产物 */
  openArtifact: (key: string) => Promise<void>;
  /** 只取产物正文（预览用） */
  loadArtifact: (key: string) => Promise<string>;
  /** 删掉一份产物 */
  removeArtifact: (key: string) => Promise<void>;
  saveNow: () => Promise<void>;
  importDraft: (markdown: string, title?: string) => Promise<void>;
  /**
   * **按段**样式已落地的信号（递增计数）。
   *
   * `<doc-style anchor="N"/>` 直接改 docx、不动草稿，草稿的 updated_at 不变，
   * 「选区回合结束后按 updated_at 判断要不要重载」的现有机制会漏掉它。这里
   * 给编辑器一个独立的信号：变了就说明盘上那份 docx 刚被改过（只有那一段），
   * 该换版本重载。
   */
  scopedStyleSeq: number;
  /**
   * 草稿 → docx 落「我的文档」，返回文件名（打开编辑器内核用）。
   *
   * `blank=true` 只给打开编辑器用：空稿也产出一份**空白** docx 当载体，否则
   * Collabora 没文件可开。默认 false，空稿会被服务端拒绝（「还没有内容」）。
   */
  exportDocx: (blank?: boolean) => Promise<string>;
  /**
   * 取草稿的 HTML（服务端「md→docx→mammoth」单一管线渲染）。
   *
   * 编辑器注入专用：前端不自己渲染 Markdown，粘进去的内容与 apply 写盘的
   * docx 长得完全一致。
   */
  fetchDraftHtml: () => Promise<string>;
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
    // 服务端已把改动落到草稿与 docx（以 Word 修订呈现），卡片只是摘要，
    // 不再有「点接受」这一步——审阅在编辑器里用 Word 原生修订完成。
    status: (patch as { status?: ChangeLike["status"] }).status === "applied" ? "applied" : "proposed",
    full,
  };
}

/** 会话草稿的 blocks → Markdown（存产物时用；服务端存的是 markdown，这里只是回写） */
function blocksToMarkdown(blocks: { heading?: string; text?: string }[]): string {
  return blocks
    .map((b) => {
      const body = (b.text || "").trim();
      const heading = (b.heading || "").trim();
      if (heading && body.startsWith(heading)) return body;
      return heading ? `## ${heading}\n\n${body}` : body;
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * 心跳看门狗的阈值（毫秒）。
 *
 * 为什么需要：SSE 被掐断（dev 热刷新整页刷新、代理超时、切换网络、切标签…）时，
 * 浏览器的 fetch 会**静默地结束**——既不报错也不抛异常。而组件里的 streaming
 * 只有在 `finally` 里复位；Fast Refresh 还会把旧 state 留下来，于是界面永远
 * 转圈「思考中…」，而后台其实早就没人跑了。
 *
 * 后端每轮都会发心跳（`type: "ping"`），所以「一段时间内一个事件都没有」
 * 就等于连接已死：主动收尾 → 复位状态 → 拉回已落盘的内容。
 *
 * 阈值必须是后端心跳间隔（服务端 `PING_INTERVAL_S = 15s`）的**数倍**：
 * 这里 45s = 连丢 3 个心跳才判定死亡。曾经是 20s，只比心跳大 5s——只要有一次
 * 心跳因为后端切片、代理缓冲、主线程忙而晚到，看门狗就会把一轮完全正常的
 * 回合掐成「连接中断」（实测撞过：首轮加载技能刚好跨过 20s）。
 * 放宽到 3 倍是刻意的取舍：真断线时多等 45 秒可接受，误杀正常回合不可接受。
 */
const STREAM_WATCHDOG_MS = 45_000;
const STREAM_WATCHDOG_TICK_MS = 3_000;

export function useAiChat(options: {
  skill: string;
  title?: string;
  persistKey?: string;
  /**
   * 先别建会话：等调用方把标题（= 落盘文件名）定下来再说。
   *
   * 专利/写作撰写室进页面先问「这份稿子叫什么」——文件名就是会话标题，建完再改
   * 等于把已经导出的 docx 改名，多一步还容易和编辑器里开着的那份对不上。
   */
  paused?: boolean;
  /**
   * 直接恢复这条会话（而不是新建）。
   *
   * 谁用：栏目首页的「最近案件」。点一条案件就该回到那条会话——材料、草稿、
   * 产物与对话记录全在原处；而 `persistKey` 只能恢复「本页面自己那条线」，
   * 跨页面点开某一条历史案件它做不到。
   *
   * 会话已被清理时静默退回新建（与 persistKey 分支同一套兜底）。
   */
  resumeFrom?: string;
  /**
   * 强制开一条新会话（首页「新建案件」用）。
   *
   * 不带它时：靠 `persistKey` 认领上次那条线，刷新/重开接着用同一份稿子和同一段
   * 对话。带它时：先把那条线清掉再建——否则用户点「新建」，进来看到的还是旧案子。
   */
  fresh?: boolean;
}): UseAiChat {
  const {
    skill,
    title = "",
    persistKey,
    paused = false,
    resumeFrom = "",
    fresh,
  } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [materials, setMaterials] = useState<AiMaterial[]>([]);
  const [template, setTemplate] = useState<AiTemplate | null>(null);
  /** 产物（四件套这类多文件任务）：清单 + 当前在编辑器里改的那份 */
  const [artifacts, setArtifacts] = useState<AiArtifact[]>([]);
  const [activeArtifact, setActiveArtifact] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  /** 按段样式已落地的信号（见接口注释）：style 事件带 scope="selection" 时递增 */
  const [scopedStyleSeq, setScopedStyleSeq] = useState(0);
  const [blocked, setBlocked] = useState<string | null>(null);
  /** 最近一次「保存到我的文档」的结果：成功给文件名，失败给原因 */
  const [lastSave, setLastSave] = useState<{
    name: string;
    already: boolean;
    at: number;
    error?: string;
  } | null>(null);
  const [draftTitle, setDraftTitle] = useState(title);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<string | null>(null);
  /**
   * 建会话的**在途 Promise**。
   *
   * 为什么必须有：`ensureSession` 有两个调用方——初始化 effect 和 `reset()`，
   * 而 reset 会先把 `sessionRef` 清空再建。两道调用几乎同时进来时，两边都看到
   * 「没有会话」，于是**并发建出两个会话**（本地日志实录：55 毫秒内连建两个，
   * 每个都在 sessions/ 下落一个新文件夹）。在途Promise 让第二个调用等第一个
   * 的结果，同一时刻只会有一个会话被创建。
   */
  const ensureInFlight = useRef<Promise<string> | null>(null);
  /** 对话记录是否已经尝试恢复过（只恢复一次，别把进行中的对话覆盖掉） */
  const transcriptLoadedRef = useRef(false);
  /**
   * 外部标题的**最新值**（= 落盘文件名）。
   *
   * 建会话时读它而不是 `draftTitle`：调用方（撰写室）可能刚把用户起的名字传进来，
   * 而 `draftTitle` 是 useState 的初值，同一个渲染周期里还是旧名——用它建会话，
   * 文件名就错了，事后再改等于把已导出的 docx 改名。渲染期赋值即可，Ref 就是这么用的。
   */
  const titleRef = useRef(title);
  titleRef.current = title;

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionRef.current) return sessionRef.current;
    // 在途去重：并发调用共用同一次创建（见 ensureInFlight 的注释）
    if (ensureInFlight.current) return ensureInFlight.current;
    const task = (async (): Promise<string> => {
      // 调用方点名要恢复某条会话（「最近案件」点进来的）：先试它，失败再按
      // persistKey / 新建走。会话没了就当它过期，不把死 id 往上传。
      if (resumeFrom) {
        try {
          const state = await getAiState(resumeFrom);
          sessionRef.current = resumeFrom;
          setSessionId(resumeFrom);
          if (persistKey) {
            try {
              localStorage.setItem(persistKey, resumeFrom);
            } catch {
              /* 无痕模式忽略 */
            }
          }
          if (state.draft?.title) setDraftTitle(state.draft.title);
          return resumeFrom;
        } catch {
          /* 已清理：往下走新建 */
        }
      }
      // 先认领上次那条会话线。`persistKey` 的用意就是「同一条稿子线，刷新/重开
      // 页面还接着用」，但这里以前**只写不读**：每次进页面都新建一个会话，而新
      // 会话的草稿是空的。于是出现最费解的一幕——编辑器里明明开着整篇稿子（那是
      // 「我的文档」里那份 docx），点「保存到我的文档」却回你一句「草稿是空的」；
      // 顺带 AI 也看不见上一轮写了什么。
      // 「新建案件」进来：先忘掉上次那条线，否则新建完又认领回旧案子。
      // `fresh` 没显式给时直接看地址栏的 `?new=1`——省得每个页面都接一遍。
      const wantFresh =
        fresh ?? new URLSearchParams(window.location.search).get("new") === "1";
      if (wantFresh && persistKey) clearPersistedSession(persistKey);
      if (wantFresh) {
        // `?new=1` 是一次性的：用完就从地址栏抹掉，否则刷新页面又被当成新建，
        // 刚建好的会话会被下一次 fresh 清掉。
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.get("new") === "1") {
            url.searchParams.delete("new");
            window.history.replaceState(null, "", url);
          }
        } catch {
          /* 无痕模式等：忽略，不影响会话逻辑 */
        }
      }
      const remembered = readPersistedSession(persistKey);
      if (remembered) {
        try {
          const state = await getAiState(remembered);
          sessionRef.current = remembered;
          setSessionId(remembered);
          if (state.draft?.title) setDraftTitle(state.draft.title);
          return remembered;
        } catch {
          // 会话已被清理（服务端重启/换机器/手动删过）：清掉记录往下新建，
          // 别让一个死 id 卡住整个初始化
          clearPersistedSession(persistKey);
        }
      }
      // 标题取 titleRef（见它的注释）：调用方刚把用户起的名字传进来时，
      // draftTitle 这个 useState 初值在同一渲染周期里还是旧的
      const meta = await createAiSession(titleRef.current || draftTitle, skill);
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
    })();
    ensureInFlight.current = task;
    try {
      return await task;
    } finally {
      ensureInFlight.current = null;
    }
  }, [draftTitle, fresh, persistKey, resumeFrom, skill]);

  const refresh = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    try {
      const state = await getAiState(sid);
      setDraft(state.draft);
      setMaterials(state.materials);
      setTemplate(state.template ?? null);
      setArtifacts(state.artifacts ?? []);
      setActiveArtifact(state.activeArtifact ?? "");
      if (state.draft?.title) setDraftTitle(state.draft.title);
    } catch {
      // 状态拉取失败不影响对话
    }
  }, []);

  // 初始化：探活 → 建会话 → 拉状态 → 恢复对话记录
  useEffect(() => {
    let alive = true;
    if (paused) {
      // 标题还没定：先不建会话（文件名来自会话标题，建错就得改名）
      return;
    }
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
        // 对话记录（含思考过程）恢复：刷新/换设备再进来，上一段对话还在
        const sid = sessionRef.current;
        if (sid && !transcriptLoadedRef.current) {
          transcriptLoadedRef.current = true;
          try {
            const saved = await getAiTranscript(sid);
            if (!alive) return;
            if (saved.messages?.length) {
              setMessages(
                saved.messages.map((m) => ({
                  id: nextId(),
                  role: m.role === "user" ? ("user" as const) : ("agent" as const),
                  text: m.text || "",
                  at: m.at || now(),
                  thinking: m.thinking || undefined,
                  anchor: m.anchor || undefined,
                })),
              );
            }
          } catch {
            // 恢复失败不影响对话：就当是新开一段
          }
        }
      } catch {
        if (alive) setBlocked("无法创建 AI 会话");
      }
    })();
    return () => {
      alive = false;
    };
  }, [ensureSession, paused, refresh]);

  const patchMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    [],
  );

  const send = useCallback(
    async (instruction: string, options: SendOptions = {}) => {
      const text = instruction.trim();
      if (!text || streaming) return false;
      const sid = await ensureSession();
      const agentId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text, at: now(), anchor: options.anchor },
        {
          id: agentId,
          role: "agent",
          text: "",
          at: now(),
          streaming: true,
          startedAt: Date.now(),
        },
      ]);
      setStreaming(true);
      setBlocked(null);
      const controller = new AbortController();
      abortRef.current = controller;

      let sawError = false;
      // 看门狗：连接静默死亡时兜底（否则界面永远「思考中」）
      let lastEventAt = Date.now();
      const watchdog = setInterval(() => {
        if (Date.now() - lastEventAt < STREAM_WATCHDOG_MS) return;
        sawError = true;
        patchMessage(agentId, {
          streaming: false,
          error: true,
          text:
            "连接中断（页面刷新、网络切换或代理超时），本轮已停止。" +
            "已生成的内容仍保留在文档里，可继续发指令让 AI 接着写。",
        });
        controller.abort();
      }, STREAM_WATCHDOG_TICK_MS);

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
            lastEventAt = Date.now();
            switch (event.type) {
              case "delta":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentId ? { ...m, text: m.text + String(event.text ?? "") } : m,
                  ),
                );
                break;
              case "thinking": {
                // 思考只上屏。final=true 时用服务端给的整段替换本地拼接的
                // （流里的 delta 可能缺尾巴，口径与正文一致）。
                const piece = String(event.text ?? "");
                const isFinal = event.final === true;
                if (!piece) break;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentId
                      ? { ...m, thinking: isFinal ? piece : (m.thinking ?? "") + piece }
                      : m,
                  ),
                );
                break;
              }
              case "tool": {
                const name = String(event.name ?? "");
                const target = String(event.target ?? "");
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentId
                      ? {
                          ...m,
                          activity: { name, target, steps: (m.activity?.steps ?? 0) + 1 },
                        }
                      : m,
                  ),
                );
                break;
              }
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
              case "style": {
                // 整篇样式（<doc-style/>）落地：更新草稿，并**明说一句**。
                // 少了这句，用户只看到文档自己刷新了一下，不知道是 AI 改了样式，
                // 会当成「AI 说改好了却没生效」。
                if (event.draft) {
                  setDraft(event.draft as AiDraft);
                  const st = (event.draft as AiDraft)?.title;
                  if (st) setDraftTitle(st);
                }
                if (event.scope === "selection") {
                  // 按段样式：docx 已被直接改（只有那一段），草稿的 updated_at
                  // 没动，得单独发信号让编辑器换版本重载，否则用户看到的还是旧版
                  setScopedStyleSeq((n) => n + 1);
                }
                addNote(String(event.message ?? "已更新整篇样式"));
                break;
              }
              case "saved":
                setLastSaved(String(event.name ?? ""));
                break;
              case "retry":
                addNote(`模型未响应，自动重试第 ${event.attempt ?? 2} 次`);
                break;
              case "tools": {
                // 兜底（拿不到逐条 tool 事件时才用）：让步数动起来即可。
                // 绝不写进 notes —— 那正是「一屏调用工具：read、read」的来源。
                const names = Array.isArray(event.names) ? event.names : [];
                if (!names.length) break;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentId && !m.activity
                      ? {
                          ...m,
                          activity: { name: String(names[0]), target: "", steps: names.length },
                        }
                      : m,
                  ),
                );
                break;
              }
              case "warn":
                addNote(String(event.message ?? ""));
                break;
              case "stop": {
                // 用户停止不算异常；超时 / 空闲 / 死循环中止要说明原因，
                // 并让 send 返回 false，调用方不再推进流程步骤。
                if (event.kind === "aborted") break;
                sawError = true;
                const reason = String(event.message ?? "已中止本轮");
                const partial = String(event.text ?? "");
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentId
                      ? {
                          ...m,
                          streaming: false,
                          error: true,
                          text: partial || m.text,
                          notes: [...(m.notes ?? []), reason],
                        }
                      : m,
                  ),
                );
                break;
              }
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
        clearInterval(watchdog);
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
      return !sawError && !controller.signal.aborted;
    },
    [ensureSession, patchMessage, refresh, streaming],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    const sid = sessionRef.current;
    if (sid) void stopAiSession(sid);
  }, []);

  const upload = useCallback(
    async (file: File) => {
      const sid = await ensureSession();
      const parsed = await uploadAiMaterial(sid, file);
      await refresh();
      return parsed;
    },
    [ensureSession, refresh],
  );

  /** 上传模板：解析失败也把结果回给界面（parseError），别静默 */
  const uploadTemplate = useCallback(
    async (file: File): Promise<AiTemplate> => {
      const sid = await ensureSession();
      const uploaded = await uploadAiTemplate(sid, file);
      await refresh();
      return uploaded;
    },
    [ensureSession, refresh],
  );

  const removeTemplate = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    await deleteAiTemplate(sid);
    await refresh();
  }, [refresh]);

  /** 撤掉一份材料：下一轮 prompt 里就不带它了（材料传上去要能收回，所以接了它） */
  const removeMaterial = useCallback(
    async (name: string) => {
      const sid = sessionRef.current;
      if (!sid) return;
      await deleteAiMaterial(sid, name);
      await refresh();
    },
    [refresh],
  );

  /**
   * 把当前这份稿子存成产物。
   *
   * 取的是**服务端刚落盘的那份**（重新拉 state），不是本地 state：AI 回合的
   * 落文与状态推送有先后，直接读本地 state 可能拿到上一轮的稿子。
   */
  const saveArtifactFromDraft = useCallback(
    async (key: string, title: string) => {
      const sid = sessionRef.current ?? (await ensureSession());
      const state = await getAiState(sid);
      const markdown = blocksToMarkdown(state.draft?.blocks ?? []);
      await saveAiArtifact(sid, key, title, markdown);
      await refresh();
    },
    [ensureSession, refresh],
  );

  /**
   * 在编辑器里打开某份产物：正文灌进会话草稿 → 现有注入机制把它粘进
   * Collabora（零刷新）。同时把 active 切到这份。
   */
  const openArtifact = useCallback(
    async (key: string) => {
      const sid = sessionRef.current ?? (await ensureSession());
      const item = await fetchAiArtifact(sid, key);
      await importAiDraft(sid, item.markdown, item.title);
      // 灌草稿不改 active，这里再存一次（内容相同）只为把 active 切过去
      await saveAiArtifact(sid, item.key, item.title, item.markdown);
      await refresh();
    },
    [ensureSession, refresh],
  );

  /** 只取某份产物的正文（预览用：不动草稿、不切 active） */
  const loadArtifact = useCallback(async (key: string): Promise<string> => {
    const sid = sessionRef.current;
    if (!sid) return "";
    const item = await fetchAiArtifact(sid, key);
    return item.markdown || "";
  }, []);

  const removeArtifact = useCallback(
    async (key: string) => {
      const sid = sessionRef.current;
      if (!sid) return;
      await deleteAiArtifact(sid, key);
      await refresh();
    },
    [refresh],
  );

  const saveNow = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    try {
      const res = await saveAiDraft(sid);
      setLastSaved(res.saved);
      setDraft(res.draft);
      // 保存结果单独存一份（带时间戳）：界面要的是「刚存成了，文件名是这个」
      // 这一下明确的反馈，而不是角落里一个永远亮着的小字。
      setLastSave({
        name: res.saved,
        already: res.already === true,
        at: Date.now(),
      });
    } catch (err) {
      setLastSave({ name: "", already: false, at: Date.now(), error: String(err) });
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

  /**
   * 出稿：草稿 → docx。失败往上抛，由栏目页决定怎么提示（这里不吞）。
   *
   * `blank=true` 是打开编辑器的载体请求：空稿也给一份空白 docx，否则 Collabora
   * 没有文件可开，撰写室一进来就是死的。默认为 false —— 主动出稿时空稿该被
   * 明确拒绝（服务端回「还没有内容」），不该顺手产出一份只有标题的文件。
   */
  const exportDocx = useCallback(async (blank = false): Promise<string> => {
    const sid = await ensureSession();
    const res = await exportAiDocx(sid, { blank });
    setDraft(res.draft);
    if (res.draft?.title) setDraftTitle(res.draft.title);
    setLastSaved(res.saved);
    return res.saved;
  }, [ensureSession]);

  /** 草稿 → HTML（服务端单一渲染管线）：编辑器注入用，前端不渲染 Markdown */
  const fetchDraftHtml = useCallback(async (): Promise<string> => {
    const sid = await ensureSession();
    return fetchAiDraftHtml(sid);
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

  /**
   * 对话停下来就落库（服务端 transcript.json）。
   *
   * 只在**不流式**时存：流式中每个 delta 都会改 messages，那时写库等于把一次
   * 回合拆成几十次请求；等它停下来写一次，内容也齐了。思考过程（thinking）
   * 一起存——用户问的就是「AI 想过什么」也要留得下。
   */
  useEffect(() => {
    const sid = sessionRef.current;
    if (!sid || streaming || !transcriptLoadedRef.current) return;
    if (!messages.length) return;  // 空会话不写文件
    const payload: AiTranscriptMessage[] = messages.map((m) => ({
      role: m.role,
      text: m.text,
      at: m.at,
      ...(m.thinking ? { thinking: m.thinking } : {}),
      ...(m.anchor ? { anchor: m.anchor } : {}),
    }));
    const timer = window.setTimeout(() => {
      void putAiTranscript(sid, payload).catch(() => {
        // 存不上不打扰用户：对话照常能用
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [messages, streaming]);

  return {
    messages,
    draft,
    materials,
    template,
    sessionId,
    streaming,
    health,
    lastSaved,
    lastSave,
    scopedStyleSeq,
    blocked,
    pendingChanges,
    send,
    stop,
    upload,
    uploadTemplate,
    removeTemplate,
    removeMaterial,
    artifacts,
    activeArtifact,
    saveArtifactFromDraft,
    openArtifact,
    loadArtifact,
    removeArtifact,
    saveNow,
    importDraft,
    exportDocx,
    fetchDraftHtml,
    importDocx,
    acceptChange,
    rejectChange,
    acceptAll,
    refresh,
  };
}
