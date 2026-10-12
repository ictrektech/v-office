/**
 * 专利栏目骨架 —— 领域类型。
 *
 * 这一层只描述「专利工作台」自己的概念，不依赖任何后端实现：
 * 案件 / 文档 / 模板 / 审阅问题 / AI 变更。后续接入
 * `/api/com.ictrek.v-office/api/v1/ai/*`（Pi agent + patent skill）时，
 * 由 client 层把这些类型映射到事件流，页面层不需要改。
 */

/** 专利类型：发明 / 实用新型 / 外观设计（与 skill 的三个子目录一一对应） */
export type PatentType = "invention" | "utility" | "design";

/** 工作对象：交底书 / 申请文件四件套 / 已公开文献 / 审查意见 */
export type WorkKind =
  | "disclosure" // 交底书
  | "application" // 申请文件（权利要求书 / 说明书 / 摘要 / 附图）
  | "published" // 已公开专利（解读对象）
  | "office-action"; // 审查意见

/** 案件状态（列表与看板用） */
export type CaseStatus = "drafting" | "searching" | "reviewing" | "filed" | "done";

export interface PatentCase {
  id: string;
  /** 案件名 / 交底书标题 */
  title: string;
  patentType: PatentType;
  kind: WorkKind;
  status: CaseStatus;
  /** 0~100，用于列表进度条 */
  progress: number;
  owner: string;
  /** ISO 时间串，展示层负责格式化 */
  updatedAt: string;
  /** 关联的 skill 子包名，供客户端建会话时使用 */
  skill: string;
}

/** 交底书的字段化录入（模板即这份字段清单 + 输出契约） */
export interface DisclosureField {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** 是否由 AI 从材料中推断（骨架里仅作展示标记） */
  inferred?: boolean;
}

export interface PatentTemplate {
  id: string;
  name: string;
  description: string;
  /** 适用对象 */
  kind: WorkKind;
  patentType?: PatentType;
  /** 入口：patent-disclosure-skill 内的子包 */
  skillEntry: string;
  /** 产出契约，如 ["交底书.md", "交底书.docx"] */
  outputs: string[];
  fields: DisclosureField[];
}

/** 文档正文块（骨架用结构化段落，接编辑器后可换成 docx/OnlyOffice 文档） */
export interface DocBlock {
  id: string;
  /** 段落序号，用于图 2 那种行内标注锚点 */
  anchor: string;
  heading?: string;
  text: string;
}

/** 审阅问题（图 2 右侧栏 + 正文行内标注） */
export interface ReviewIssue {
  id: string;
  severity: "high" | "mid" | "low";
  title: string;
  detail: string;
  suggestion: string;
  /** 指向 DocBlock.anchor */
  anchor: string;
  /** 命中原文片段，用于高亮 */
  snippet: string;
  status: "open" | "resolved";
  /** 审阅人姓名缩写 */
  reviewer: string;
  at: string;
}

/** AI 提出的文档变更（图 1 的 Proposed Changes） */
export interface AgentChange {
  id: string;
  operation: "insert" | "replace" | "delete";
  anchor: string;
  /** 变更前原文（insert 时为空） */
  before?: string;
  after: string;
  reason: string;
  status: "proposed" | "accepted" | "rejected";
}

export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  at: string;
  changes?: AgentChange[];
  /** 骨架里的阶段标签，对齐 skill 的 Step 1..8 */
  stage?: string;
  pending?: boolean;
}

/** 撰写室右栏的模型选择（骨架：纯展示，接后端时映射到 Pi 的 provider/model） */
export interface AgentModelOption {
  id: string;
  label: string;
  note?: string;
}
