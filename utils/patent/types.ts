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

/** 工作对象：交底书 / 申请文件四件套 / 审查意见 */
export type WorkKind = "disclosure" | "application" | "office-action";

/** 交底书的字段化录入（模板即这份字段清单 + 输出契约） */
export interface DisclosureField {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** 是否由 AI 从材料中推断（仅作展示标记） */
  inferred?: boolean;
}

export interface PatentTemplate {
  id: string;
  name: string;
  description: string;
  /** 英文名：界面切英文时用，也是会话标题（落盘 docx 的文件名）的来源 */
  nameEn: string;
  descriptionEn?: string;
  /** 适用对象 */
  kind: WorkKind;
  patentType?: PatentType;
  /** 入口：patent-disclosure-skill 内的子包 */
  skillEntry: string;
  /** 产出契约，如 ["交底书.md", "交底书.docx"] */
  outputs: string[];
  fields: DisclosureField[];
  /**
   * 同入口下的类型变体（当前只有交底书有：发明 / 实用新型 / 外观设计）。
   *
   * 三者走的是**同一个技能包** patent-disclosure，差别只在字段清单、skill 子入口
   * 和产出契约——所以入口合成一张卡，类型在工作台里选，不在首页逼用户分。
   */
  variants?: PatentTemplateVariant[];
}

/** 交底书类型变体：id 与 PatentType 对齐 */
export interface PatentTemplateVariant {
  id: PatentType;
  /** 短标签，出现在分段控件上 */
  name: string;
  /** 英文标签 */
  nameEn?: string;
  /** 一句话说明这一类长什么样 */
  note?: string;
  /** 英文说明 */
  noteEn?: string;
  /** 技能子入口，如 skills/patent-disclosure/prompts/utility_model */
  skillEntry: string;
  /** 该类型的产出契约 */
  outputs: string[];
  /** 该类型的字段清单 */
  fields: DisclosureField[];
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
  status: "proposed" | "applied" | "accepted" | "rejected";
}

