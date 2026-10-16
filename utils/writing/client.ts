"use client";

/**
 * 公文写作客户端（已从 agentic-search 迁到本应用自己的 AI 服务）。
 *
 * 原实现：WebSocket + 后端五/三阶段编排（`services/writing.ts` 978 行），
 * 由 agentic-search 应用承载。现在改成**最轻形态**：
 *
 * - 三段提示词（写手起草 / 审改团队 / 定稿签发人）从原后端 TS 里搬到这里，
 *   一次回合内由模型连续完成，产出仍用 `<final-doc>` 包裹定稿全文
 *   （解析失败还有一层兜底：取最后一个代码块/全文）。
 * - 传输换成 SSE（比 WebSocket 轻，断线即取消），进程隔离、超时、并发、
 *   重试全在服务端（`server/ai.py`）。
 * - 相对原来的五阶段，界面上的阶段卡片少了几张——这是刻意的取舍：
 *   少一层编排，少一处和 agent 行为耦合的地方。
 *
 * 保留原有导出名，写作页面不需要改。
 */

import {
  AI_BASE,
  authHeaders,
  aiHealth,
  chatStream,
  createAiSession,
  deleteAiSession,
  getAiState,
  getAiTranscript,
  listAiSessions,
  putAiTranscript,
  stopAiSession,
  uploadAiMaterial,
  type AiEvent,
  type AiTranscriptMessage,
} from "@/utils/ai/client";

/** 兼容旧引用：现在指向本应用 AI 服务，不再是 agentic-search。 */
export const API_BASE = AI_BASE;

/** 旧代码（generate-view 取产物、旧字号接口）仍从这里取鉴权头 */
export { authHeaders };

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
  /** 正文字号（pt）；渲染在客户端完成，不再回传后端改档 */
  bodyFontSize?: number;
}

export interface UploadedSource {
  /** 本应用里就是 AI 会话 id：材料与该文件一一对应 */
  uploadId: string;
  name: string;
  size: number;
  chars: number;
  parseError?: string;
}

export type WritingEvent = Record<string, unknown> & { _event?: string };
type EventListener = (data: WritingEvent) => void;

/** 写作技能的口径：材料由 agent 自己读，这里只给文字要求 */
const WRITING_SKILL = "writing";

function configBlock(cfg: WritingConfig): string {
  const lines = [
    `文种：${cfg.docType}`,
    `标题 / 主题：${cfg.title}`,
    cfg.publisher ? `发布机关：${cfg.publisher}` : "",
    cfg.docNumber ? `发文字号：${cfg.docNumber}` : "",
    cfg.audience ? `受文 / 解读对象：${cfg.audience}` : "",
    cfg.style ? `行文口径 / 解读形式：${cfg.style}` : "",
    cfg.lengthWords ? `篇幅：约 ${cfg.lengthWords} 字` : "",
    cfg.requirements ? `其他要求：${cfg.requirements}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

/** 三段角色，合并成一次回合；原样保留原来的口径，避免行为漂移。 */
function composePrompt(cfg: WritingConfig, materials: string[]): string {
  const materialHint = materials.length
    ? `\n\n# 参考材料\n\n材料已放在当前工作目录的 materials/ 下：${materials
        .map((m) => `\`${m}\``)
        .join("、")}。请先用 read / bash 读一遍再动笔，不要凭空编数据。`
    : "";
  return [
    "你要依次以三个身份完成一篇公文：写手（起草）→ 审改团队（审查后改稿）→ 定稿签发人（复核定稿）。",
    "三步在这一次回答里连续做完，不要中途提问。",
    "",
    "# 写作要求",
    configBlock(cfg),
    materialHint,
    "",
    "# 输出格式（严格遵守）",
    "1. 先输出「## 审查意见」，分条列你在改稿中处理的问题，最多 6 条，确无问题写「无」；",
    "2. 然后必须输出定稿全文，用 <final-doc> 与 </final-doc> 两个标记包裹（标记独占一行）；",
    "3. 标记之外除审查意见外不得有任何其他文字，定稿正文用 Markdown。",
    "",
    "示例：",
    "<final-doc>",
    "# 标题",
    "正文内容...",
    "</final-doc>",
  ].join("\n");
}

function extractFinalDoc(text: string): string {
  const match = text.match(/<final-doc>([\s\S]*?)<\/final-doc>/);
  if (match?.[1]?.trim()) return match[1].trim();
  // 兜底（最轻）：模型偶发漏标记时，丢掉审查意见段落，保留其余正文
  const withoutReview = text.replace(/##\s*审查意见[\s\S]*?(?=\n#|\n##|$)/, "").trim();
  return withoutReview || text.trim();
}

// ── 服务可用性 ─────────────────────────────────────────────────────────────

export async function checkWritingService(): Promise<boolean> {
  try {
    const health = await aiHealth();
    return health.ok && health.pi.available;
  } catch {
    return false;
  }
}

/** 每个写作文件一个独立会话：材料、产物、上下文都隔离 */
export async function uploadSourceFile(file: File): Promise<UploadedSource> {
  const meta = await createAiSession(file.name, WRITING_SKILL);
  // 服务端当场解析成文本（agent 不接触文件），把解析结果带回来给界面提示
  const parsed = await uploadAiMaterial(meta.id, file);
  return {
    uploadId: meta.id,
    name: parsed.name,
    size: parsed.size,
    chars: parsed.chars ?? 0,
    ...(parsed.parseError ? { parseError: parsed.parseError } : {}),
  };
}

// ── 会话 ───────────────────────────────────────────────────────────────────

export class WritingClient {
  private listeners = new Set<EventListener>();
  private closeListener: (() => void) | null = null;
  private controller: AbortController | null = null;
  /** 页面会读它（用于「保存到我的文档」等），所以是公开字段 */
  sessionId: string | null = null;
  private streaming = false;
  private materials: string[] = [];

  onEvent(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onClose(listener: () => void): void {
    this.closeListener = listener;
  }

  private emit(data: WritingEvent): void {
    for (const listener of this.listeners) listener(data);
  }

  isConnected(): boolean {
    return !!this.sessionId;
  }

  /** 发一个回合并消费 SSE；abort 由 stop()/disconnect() 触发 */
  private async runTurn(
    prompt: string,
    stage: "draft" | "reviewfix" | "signoff" | "revise",
    cfg: WritingConfig,
    resume: boolean,
    instruction?: string,
  ): Promise<void> {
    const sessionId = this.sessionId;
    if (!sessionId || this.streaming) return;
    this.streaming = true;
    const started = Date.now();
    this.emit({ _event: "writing_stage", stage, status: "start", ...(instruction ? { instruction } : {}) });

    let text = "";
    let failure: string | null = null;
    const controller = new AbortController();
    this.controller = controller;

    try {
      await chatStream(sessionId, {
        prompt,
        resume,
        autosave: false,  // 写作栏目自己管存稿（见 writing-view 的「保存到我的文档」）
        signal: controller.signal,
        onEvent: (event: AiEvent) => {
          switch (event.type) {
            case "delta":
              text += String(event.text ?? "");
              break;
            case "message_end":
              // 完整消息到达时以它为准（流式可能缺尾巴）
              if (event.text) text = String(event.text);
              break;
            case "retry":
              this.emit({
                _event: "writing_warning",
                message: `模型未响应，正在重试（第 ${event.attempt ?? 2} 次）`,
              });
              break;
            case "error":
              failure = String(event.message ?? "生成失败");
              if (event.text) text = String(event.text);
              break;
            default:
              break;
          }
        },
      });
    } catch (err) {
      failure = `连接中断：${String(err)}`;
    } finally {
      this.controller = null;
      this.streaming = false;
    }

    if (failure && !text.trim()) {
      this.emit({ _event: "writing_error", message: failure });
      this.closeListener?.();
      return;
    }

    this.emit({
      _event: "writing_stage",
      stage,
      status: "done",
      elapsedMs: Date.now() - started,
    });

    const content = extractFinalDoc(text);
    // agent 的输出要留底：写作这条线不走 useAiChat，没人替它写对话记录（服务端
    // 只认前端的 PUT），于是「最近使用」点进去只剩成稿、过程全丢。这里每轮追加一次。
    if (text.trim()) {
      void appendTranscript(sessionId, prompt, text).catch(() => {
        // 存不上不打扰用户：成稿仍可用
      });
    }
    this.emit({
      _event: "writing_done",
      title: cfg.title || cfg.docType,
      content,
      // 文件名交给页面自己的导出链路（x2t / 打印），这里不再回传 docx URL
      files: [],
    });
    if (failure) this.emit({ _event: "writing_warning", message: failure });
  }

  /**
   * 开始写作。`uploadId` 就是会话 id（见 uploadSourceFile），`agent` 参数保留
   * 仅为兼容旧调用——现在只有一条链路（本应用后端 + Pi）。
   */
  async start(config: WritingConfig, uploadId?: string, _agent?: string): Promise<void> {
    if (!uploadId) {
      this.emit({ _event: "writing_error", message: "缺少材料会话，请重新上传材料" });
      return;
    }
    this.sessionId = uploadId;
    this.materials = [];
    await this.runTurn(composePrompt(config, this.materials), "draft", config, false);
  }

  /** 局部微调：同一会话里追加一轮，上下文由 agent 自己保留 */
  revise(instruction: string, config: WritingConfig): void {
    if (!this.sessionId) {
      this.emit({ _event: "writing_error", message: "会话不存在，请重新开始" });
      return;
    }
    const prompt = [
      "请在上一版定稿的基础上做这一处修改，其余内容保持不动。",
      `修改要求：${instruction}`,
      "仍然用 <final-doc> 与 </final-doc> 包裹完整定稿全文。",
    ].join("\n");
    void this.runTurn(prompt, "revise", config, true, instruction);
  }

  /** 撤销：会话上下文由 agent 持有，本版不提供回滚 */
  undo(_config?: WritingConfig): void {
    this.emit({
      _event: "writing_error",
      message: "当前版本不支持撤销：会话上下文由 agent 保留，请直接用「局部微调」说明要改回什么",
    });
  }

  /** 停止：断开连接（服务端据此回收进程树），再补一发显式停止兜底 */
  stop(): void {
    this.controller?.abort();
    if (this.sessionId) void stopAiSession(this.sessionId);
    this.emit({ _event: "writing_stopped" });
  }

  /**
   * 接回一个已存在的会话（页面刷新 / 从「最近使用」打开时调用）。
   * 这里只记住 id：校验留给下一个回合（服务端 session 不存在会明确报错）。
   */
  async resume(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
  }

  /** 只断连接，保留会话（页面切文件时用） */
  disconnect(): void {
    this.controller?.abort();
    this.controller = null;
    this.streaming = false;
    this.sessionId = null;
    this.closeListener?.();
  }
}

// ── 历史 / 恢复（最简实现：会话列表即历史）──────────────────────────────────

export interface MyWritingDoc {
  /** 会话 id（本应用里就是 AI 会话 id） */
  sessionId: string;
  name: string;
  /** ISO 时间串（页面用 Date.parse 处理） */
  updatedAt: string;
  config?: WritingConfig;
}

export interface RestoredWriting {
  restored: boolean;
  title?: string;
  content?: string;
  files?: { name: string; url: string; kind?: string }[];
  /** 修订次数（本版没有阶段流水线，恒为 0） */
  revisions?: number;
  items?: unknown[];
}

/**
 * 把这一轮的「用户要求 + agent 输出」追加进会话的对话记录。
 *
 * 写作不走 `useAiChat`，所以没人替它写 transcript——不写的话「最近使用」点进去
 * 过程全丢，只剩成稿。
 */
async function appendTranscript(
  sid: string,
  userText: string,
  agentText: string,
): Promise<void> {
  const at = new Date().toISOString();
  let existing: AiTranscriptMessage[] = [];
  try {
    existing = (await getAiTranscript(sid)).messages ?? [];
  } catch {
    /* 第一次存：当作没有 */
  }
  await putAiTranscript(sid, [
    ...existing,
    { role: "user", text: userText, at },
    { role: "agent", text: agentText, at },
  ]);
}

/** 草稿 blocks → Markdown（成稿正文；段落之间空一行） */
function draftToMarkdown(blocks: { heading?: string; text?: string }[]): string {
  return blocks
    .map((b) => `${b.heading ? `${b.heading}\n\n` : ""}${b.text ?? ""}`.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * 恢复现场（点「最近使用」/ 刷新页面回到某条会话）。
 *
 * 成稿就在服务端那条会话的草稿里（写作自管保存，草稿即最新一版），所以这里按
 * 会话 id 直接读回来。**必须真的恢复**：以前这里恒返回「没恢复」，于是用户从
 * 「最近使用」点进来是一片空白——之前做的全白费。
 *
 * 阶段流水线（那几张过程卡）没有落库，恢复后直接看成稿；要重跑某一阶段再发指令。
 */
export async function restoreWriting(
  session?: string,
  config?: WritingConfig,
): Promise<RestoredWriting> {
  if (!session) return { restored: false };
  try {
    const state = await getAiState(session);
    const draft = state?.draft;
    const content = draft?.blocks?.length ? draftToMarkdown(draft.blocks) : "";
    if (!content.trim()) return { restored: false };
    // 过程也恢复：agent 的输出都追加在对话记录里（每次落文时写一次），按轮次还原成
    // 过程卡片，用户的要求也一并放回去——这样点开还能看到当时是怎么写出来的。
    let items: unknown[] = [];
    try {
      const transcript = await getAiTranscript(session);
      items = (transcript.messages ?? [])
        .filter((m) => (m.text || "").trim())
        .map((m, index) => ({
          key: `restored-${index}`,
          kind: m.role === "user" ? "parse" : "draft",
          title: m.role === "user" ? "你的要求" : "写手起草",
          status: "done",
          text: m.text,
          thinking: m.thinking ?? "",
          tools: [],
        }));
    } catch {
      /* 旧会话没存过对话记录：只有成稿能回来 */
    }
    return {
      restored: true,
      title: draft?.title || config?.title || config?.docType,
      content,
      // 文件导出由页面自己的链路负责（服务端按需转换），这里不回传文件
      files: [],
      revisions: 0,
      items,
    };
  } catch {
    // 会话已被清理：上层按「重新开始」处理
    return { restored: false };
  }
}

export async function listMyWritingSessions(): Promise<MyWritingDoc[]> {
  const sessions = await listAiSessions();
  return sessions
    // 只看写作这条线：专利那几个技能包的会话归「AI 专利工作台」的最近案件，
    // 混进来两边的列表都会变乱（而且点开也恢复不到对的现场）。
    .filter((s) => !(s.skill ?? "").startsWith("patent"))
    .map((s) => ({
      sessionId: s.id,
      name: s.title || "未命名稿件",
      updatedAt: new Date((s.updated_at ?? Date.now() / 1000) * 1000).toISOString(),
      // 写作配置没有随会话落库，这里给一份最小的（只有文种与标题是必填）：
      // 上层「打开最近使用」要求 sessionId **和 config 都在**才肯恢复，缺 config
      // 就永远不恢复——老文档点进去一片空白，根子就是这个条件不成立。
      config: { docType: s.title || "公文", title: s.title || "" },
    }));
}

export async function deleteMyWritingSession(sessionId: string): Promise<void> {
  await deleteAiSession(sessionId);
}
