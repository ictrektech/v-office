/** AI 写作栏目的模板类型（与 public/writing/templates.json 对应）。 */

/** 栏目分组：红头文种 / 报告类 / 事务文书 */
export type WritingKind = "redhead" | "report" | "misc";

export interface WritingTemplateField {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
}

export interface WritingTemplate {
  id: string;
  name: string;
  description: string;
  kind: WritingKind;
  /** 是否红头版式（GB/T 9704-2012 六要素） */
  redhead: boolean;
  /** 技能包入口（skills/writing/prompts/…） */
  skillEntry: string;
  /** 产出文件 */
  outputs: string[];
  /** 成文结构（起手话术用） */
  fields: WritingTemplateField[];
}
