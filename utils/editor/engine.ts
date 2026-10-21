/**
 * 解析内核决策。唯一入口是 `resolveEngine`，规则按顺序：
 *
 *   1. doc / xls / ppt → Collabora（OnlyOffice 内核读不好、更写不出这些老格式）
 *   2. 公共区文档       → Collabora（多人同时打开时只有服务端内核能进同一个会话，
 *                          本地内核各改各的、保存整份覆盖）
 *   3. 其余 Office     → 首页开关选的那个，默认 Collabora
 *   4. pdf / txt / csv 等 → OnlyOffice（Collabora 只能看和批注 PDF）
 *
 * 我的文档、本地、模板、外链都看开关，不看来源。
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

/** 这份文档用哪个内核；`choice` 是首页开关，`shared` 表示公共区文档。 */
export function resolveEngine(
  ext: string | undefined | null,
  choice: Engine,
  shared = false,
): Engine {
  const normalized = normalizeExt(ext);
  if (LEGACY_EXTS.has(normalized)) return "collabora";
  if (shared && SWITCHABLE_EXTS.has(normalized)) return "collabora";
  if (SWITCHABLE_EXTS.has(normalized)) return choice;
  return "onlyoffice";
}

/** Collabora 起不来时能否退回 OnlyOffice：老格式与公共区文档不能，只能只读。 */
export function mustStayOnCollabora(
  ext: string | undefined | null,
  shared = false,
): boolean {
  const normalized = normalizeExt(ext);
  return LEGACY_EXTS.has(normalized) || (shared && SWITCHABLE_EXTS.has(normalized));
}
