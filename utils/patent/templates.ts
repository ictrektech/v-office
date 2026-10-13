import templatesData from "@/public/patent/templates.json";
import type { PatentTemplate, PatentTemplateVariant, WorkKind } from "./types";

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

/**
 * 模板的类型变体列表。
 *
 * 没有变体的模板（如申请文件四件套）返回空数组——调用方据此决定要不要显示
 * 类型切换控件。交底书合并成一个入口后，三种类型就靠这个列表切换。
 */
export function getTemplateVariants(tpl?: PatentTemplate): PatentTemplateVariant[] {
  return tpl?.variants ?? [];
}

/** 按 id 取变体；找不到就退回第一个（默认发明）。 */
export function resolveVariant(
  tpl: PatentTemplate | undefined,
  variantId?: string | null,
): PatentTemplateVariant | undefined {
  const variants = getTemplateVariants(tpl);
  if (!variants.length) return undefined;
  return variants.find((v) => v.id === variantId) ?? variants[0];
}

/** 按界面语言取模板名 / 说明（英文缺省回落到中文，保证任何语言都有名字可显示）。 */
export function localizeTemplate(
  tpl: PatentTemplate,
  isZh: boolean,
): { name: string; description: string } {
  if (isZh) return { name: tpl.name, description: tpl.description };
  return { name: tpl.nameEn || tpl.name, description: tpl.descriptionEn || tpl.description };
}

/** 同上，变体（类型标签与说明）。 */
export function localizeVariant(
  variant: PatentTemplateVariant,
  isZh: boolean,
): { name: string; note?: string } {
  if (isZh) return { name: variant.name, note: variant.note };
  return { name: variant.nameEn || variant.name, note: variant.noteEn ?? variant.note };
}
