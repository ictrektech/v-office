import templatesData from "@/public/patent/templates.json";
import type { PatentTemplate, WorkKind } from "./types";

/**
 * 专利栏目独立模板。
 *
 * 与 Office 文件模板（`utils/templates.ts` → `public/files/templates.json`）分开维护：
 * 那边是「下载一个 docx 去编辑」，这边是「一份字段清单 + 一个 skill 入口 + 产出契约」。
 * 模板只承载入口与字段，流程细则仍以 patent-disclosure-skill 的
 * 各子包的 SKILL.md 与 prompts/ 为准，避免两头维护。
 */
const TEMPLATES = templatesData as PatentTemplate[];

export function getPatentTemplates(): PatentTemplate[] {
  return TEMPLATES;
}

export function getPatentTemplate(id: string): PatentTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByKind(kind: WorkKind): PatentTemplate[] {
  return TEMPLATES.filter((t) => t.kind === kind);
}

/** 交底类模板（三种专利类型）——撰写室默认从这里起步 */
export function getDisclosureTemplates(): PatentTemplate[] {
  return getTemplatesByKind("disclosure");
}
