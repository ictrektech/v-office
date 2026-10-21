/**
 * 解析内核决策。唯一入口是 `resolveEngine`，规则只有三条：
 *
 *   1. pdf             → OnlyOffice（Collabora 只能看和批注，不能编辑 PDF）
 *   2. doc / xls / ppt → Collabora（OnlyOffice 内核读不好、更写不出这些老格式）
 *   3. 其余 Office     → 首页开关选的那个，默认 Collabora
 *
 * 文档来源（我的文档 / 公共区 / 本地 / 模板 / 外链）不参与判断。
 */

export type Engine = "onlyoffice" | "collabora";

/** 开关的出厂默认值；只有部署显式要求 OnlyOffice 时才不是 Collabora。 */
export const DEFAULT_ENGINE: Engine =
  process.env.NEXT_PUBLIC_WORD_ENGINE === "onlyoffice" ? "onlyoffice" : "collabora";

/** 老版二进制格式：OnlyOffice 内核写不出，只能交给 Collabora。 */
const LEGACY_EXTS = new Set(["doc", "xls", "ppt"]);

/** 其余可交给 Collabora 的格式：用哪个内核由首页开关决定。 */
const SWITCHABLE_EXTS = new Set(["docx", "xlsx", "pptx", "odt", "ods", "odp"]);

function normalizeExt(ext: string | undefined | null): string {
  return (ext || "").toLowerCase().replace(/^\./, "");
}

/** 这份文档用哪个内核；`choice` 是首页开关的值。 */
export function resolveEngine(
  ext: string | undefined | null,
  choice: Engine,
): Engine {
  const normalized = normalizeExt(ext);
  if (LEGACY_EXTS.has(normalized)) return "collabora";
  if (SWITCHABLE_EXTS.has(normalized)) return choice;
  return "onlyoffice";
}

/** Collabora 起不来时，这份文档能不能退回 OnlyOffice（老格式不能，只能只读）。 */
export function mustStayOnCollabora(ext: string | undefined | null): boolean {
  return LEGACY_EXTS.has(normalizeExt(ext));
}
