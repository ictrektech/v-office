import templatesData from "@/public/writing/templates.json";
import type { WritingTemplate, WritingKind } from "./types";

/**
 * AI 写作栏目独立模板（与专利栏 `utils/patent/templates.ts` 同思路）。
 *
 * 模板只承载入口与字段清单（起手话术的成文结构），流程细则以技能包
 * `writing` 的 SKILL.md 与 prompts/ 为准，避免两头维护。
 */
const TEMPLATES = templatesData as WritingTemplate[];

export function getWritingTemplates(): WritingTemplate[] {
  return TEMPLATES;
}

export function getWritingTemplate(id: string): WritingTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getWritingTemplatesByKind(kind: WritingKind): WritingTemplate[] {
  return TEMPLATES.filter((t) => t.kind === kind);
}

/** 按栏目页的中文名反查模板（写作栏内部用的是中文文种名） */
export function getWritingTemplateByName(name: string): WritingTemplate | undefined {
  return TEMPLATES.find((t) => t.name === name);
}
