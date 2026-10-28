/**
 * 材料槽位：按技能阶段区分，不再全阶段共用一套。
 *
 * 依据各技能 SKILL.md：
 * - 交底：发明人材料 + 项目目录 + 可选 .tex；
 * - 申请文件：同案交底目录（必需），实用新型/外观再加 schema、figure_plan、线稿、实拍；
 * - 审查答复：审查意见通知书 + 本申请文件（必需），对比文件可选。
 *
 * 后端只按文件名存材料，没有类型字段。这里把「用户从哪一行上传的」记在
 * localStorage 里；换设备或记录丢失时，再按文件名猜一个兜底分类。
 */

import type { StageKey } from "./config";

export interface MaterialSlot {
  key: SlotKey;
  label: string;
  hint: string;
  /** 技能门禁会因缺这项而终止 */
  required?: boolean;
}

export type SlotKey =
  | "inventor"
  | "project"
  | "tex"
  | "disclosure"
  | "disclosureDir"
  | "schema"
  | "figurePlan"
  | "lineart"
  | "photos"
  | "applicant"
  | "oaNotice"
  | "applicationDocs"
  | "prior"
  | "vector"
  | "cases"
  | "other";

const DISCLOSURE_SLOTS: MaterialSlot[] = [
  { key: "inventor", label: "发明人材料", hint: "技术方案、实验数据、现有说明" },
  { key: "project", label: "项目目录", hint: "源码、文档、图纸，可多选" },
  { key: "tex", label: ".tex 源文件", hint: "可选，有 LaTeX 稿就传" },
  { key: "disclosure", label: "已有交底书", hint: "上一版交底，用于迭代" },
  { key: "other", label: "其他材料", hint: "标准、CAD、补充说明" },
];

const APPLICATION_SLOTS: MaterialSlot[] = [
  {
    key: "disclosureDir",
    label: "同案交底目录",
    hint: "选本机交底案件，或上传交底书 .md / .docx",
    required: true,
  },
  { key: "schema", label: "结构 / 外观 schema", hint: "实用新型、外观需要" },
  { key: "figurePlan", label: "figure_plan", hint: "附图规划，实用新型、外观需要" },
  { key: "lineart", label: "入文线稿", hint: "实用新型、外观需要" },
  { key: "photos", label: "入文实拍", hint: "仅外观需要" },
  { key: "applicant", label: "申请人信息", hint: "可选，只进问题清单，不拦流程" },
  { key: "other", label: "其他材料", hint: "补充说明、参考稿" },
];

const OA_SLOTS: MaterialSlot[] = [
  {
    key: "oaNotice",
    label: "审查意见通知书",
    hint: "OA 原件，PDF 优先",
    required: true,
  },
  {
    key: "applicationDocs",
    label: "本申请文件",
    hint: "权利要求书、说明书、摘要",
    required: true,
  },
  { key: "prior", label: "对比文件", hint: "D1、D2 等现有技术，可多份" },
  { key: "vector", label: "向量配置", hint: "可选，检索用向量库配置" },
  { key: "cases", label: "历史案例库", hint: "可选，少于 3 件时会提示入库" },
  { key: "other", label: "其他材料", hint: "补充说明、答复草稿" },
];

export const STAGE_SLOTS: Record<StageKey, MaterialSlot[]> = {
  disclosure: DISCLOSURE_SLOTS,
  full: DISCLOSURE_SLOTS,
  application: APPLICATION_SLOTS,
  oa: OA_SLOTS,
};

export function slotsFor(stage: StageKey): MaterialSlot[] {
  return STAGE_SLOTS[stage];
}

/** 旧记录里的 slot 值可能不属于当前阶段，展示前先校验 */
export function isSlotFor(stage: StageKey, value: string): value is SlotKey {
  return slotsFor(stage).some((slot) => slot.key === value);
}

const STORAGE_KEY = "ai:patent:slots";

export function readSlotMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function writeSlot(name: string, slot: SlotKey): void {
  try {
    const map = readSlotMap();
    map[name] = slot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 无痕模式等：忽略，刷新后按文件名推断
  }
}

export function removeSlot(name: string): void {
  try {
    const map = readSlotMap();
    delete map[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 忽略
  }
}

/** 记录丢失时的兜底：按阶段和常见命名猜分类 */
export function inferSlot(name: string, stage: StageKey): SlotKey {
  const text = name.toLowerCase();
  const slots = slotsFor(stage);
  const has = (key: SlotKey) => slots.some((slot) => slot.key === key);
  const pick = (key: SlotKey): SlotKey => (has(key) ? key : "other");

  if (/交底|disclosure/.test(text)) {
    return pick(has("disclosureDir") ? "disclosureDir" : "disclosure");
  }
  if (/审查|office|(^|[^a-z])oa([^a-z]|$)/.test(text)) return pick("oaNotice");
  if (/对比|prior|(^|[^a-z])d[12]([^0-9]|$)/.test(text)) return pick("prior");
  if (/schema|结构|外观/.test(text)) return pick("schema");
  if (/figure_?plan|附图规划/.test(text)) return pick("figurePlan");
  if (/线稿|lineart|line_art/.test(text)) return pick("lineart");
  if (/实拍|photo/.test(text)) return pick("photos");
  if (/\.tex$/.test(text)) return pick("tex");
  if (/申请信息|申请人/.test(text)) return pick("applicant");
  if (/向量|vector|embedding/.test(text)) return pick("vector");
  if (/案例|case/.test(text)) return pick("cases");

  if (has("project")) return "project";
  if (has("disclosureDir")) return "disclosureDir";
  return "other";
}
