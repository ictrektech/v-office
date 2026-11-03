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
  | "source"
  | "screens"
  | "other";

const DISCLOSURE_SLOTS: MaterialSlot[] = [
  {
    key: "inventor",
    label: "发明人材料",
    hint: "技术方案、实验数据、现有说明，可多份",
  },
  {
    key: "project",
    label: "项目目录",
    hint: "源码/文档打包成 ZIP，可多份；服务端会解包",
  },
  { key: "tex", label: ".tex 源文件", hint: "可选，有 LaTeX 稿就传，可多份" },
  {
    key: "disclosure",
    label: "已有交底书",
    hint: "上一版交底 .md / .docx，用于迭代",
  },
  { key: "other", label: "其他材料", hint: "标准、CAD、补充说明，可多份" },
];

const APPLICATION_SLOTS: MaterialSlot[] = [
  {
    key: "disclosureDir",
    label: "同案交底目录",
    hint: "交底书 .md / .docx，可多份（技能按目录取稿）",
    required: true,
  },
  {
    key: "schema",
    label: "结构 / 外观 schema",
    hint: "实用新型、外观需要；structure_schema / appearance_schema",
  },
  {
    key: "figurePlan",
    label: "figure_plan",
    hint: "附图规划，实用新型、外观需要",
  },
  { key: "lineart", label: "入文线稿", hint: "实用新型、外观需要，可多张" },
  { key: "photos", label: "入文实拍", hint: "仅外观需要，可多张" },
  {
    key: "applicant",
    label: "申请人信息",
    hint: "可选；未填只进问题清单，不拦流程",
  },
  { key: "other", label: "其他材料", hint: "补充说明、参考稿，可多份" },
];

const OA_SLOTS: MaterialSlot[] = [
  {
    key: "oaNotice",
    label: "审查意见通知书",
    hint: "OA 原件，PDF 优先；可多份",
    required: true,
  },
  {
    key: "applicationDocs",
    label: "本申请文件",
    hint: "权利要求书、说明书、摘要，可多份",
    required: true,
  },
  { key: "prior", label: "对比文件", hint: "D1、D2 等现有技术，可多份" },
  {
    key: "vector",
    label: "向量配置",
    hint: "可选，检索用 embedding 配置（json/yaml）",
  },
  {
    key: "cases",
    label: "历史案例库",
    hint: "可选，历史答复压缩包；少于 3 件会提示入库",
  },
  { key: "other", label: "其他材料", hint: "补充说明、答复草稿，可多份" },
];

/**
 * 全流程 = patent-docket（案卷会稿）的输入。
 *
 * docket 自己只做调度，正文仍由交底包 / 申请包写；所以这里收的是「立案时
 * 手上有什么」：发明人材料、已有交底、已有申请、问题清单。没有交底也能
 * 从零开写，因此发明人材料不设 required，缺技术事实由 docket 在对话里问。
 */
const DOCKET_SLOTS: MaterialSlot[] = [
  {
    key: "inventor",
    label: "发明人材料",
    hint: "技术方案、实验数据、现有说明，可多份",
  },
  {
    key: "disclosure",
    label: "已有交底书",
    hint: "有交底就传 .md / .docx；没有则从零开写",
  },
  {
    key: "applicationDocs",
    label: "已有申请文件",
    hint: "已有四件套时传，按改稿走而不是重写",
  },
  {
    key: "other",
    label: "问题清单 / 其他",
    hint: "问题清单、对比文件、补充说明，可多份",
  },
];

/**
 * 软著 = software-copyright 的输入。
 *
 * 与专利不同，它只有一个真正必需的材料：**项目源码包**（服务端会解成
 * `project/`）。截图是第 6 步才用到的，先放一行占位、跳过也行；需求/设计文档
 * 属于可选补充。刻意不复用「项目目录」槽：那个是专利交底的源码/文档打包，
 * 语义不同，混用会让用户不知道该传什么。
 */
const COPYRIGHT_SLOTS: MaterialSlot[] = [
  {
    key: "source",
    label: "项目源码包",
    hint: "项目根目录打包成 ZIP（排除 node_modules/.git/dist），服务端解成 project/",
    required: true,
  },
  {
    key: "screens",
    label: "软件截图",
    hint: "可选；第 6 步选了「我自行上传截图」时用，按页面顺序命名",
  },
  {
    key: "other",
    label: "需求 / 设计文档",
    hint: "可选；需求说明、设计文档、演示数据，可多份",
  },
];

export const STAGE_SLOTS: Record<StageKey, MaterialSlot[]> = {
  disclosure: DISCLOSURE_SLOTS,
  full: DOCKET_SLOTS,
  application: APPLICATION_SLOTS,
  oa: OA_SLOTS,
  copyright: COPYRIGHT_SLOTS,
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
  if (/发明人|技术方案|实验数据|创新点|technical[_-]?(solution|scheme)/.test(text)) {
    return pick("inventor");
  }
  if (/审查|office|(^|[^a-z])oa([^a-z]|$)/.test(text)) return pick("oaNotice");
  if (/对比|prior|(^|[^a-z])d[12]([^0-9]|$)/.test(text)) return pick("prior");
  if (/schema|结构|外观/.test(text)) return pick("schema");
  if (/figure_?plan|附图规划/.test(text)) return pick("figurePlan");
  if (/线稿|lineart|line_art/.test(text)) return pick("lineart");
  if (/实拍|photo/.test(text)) return pick("photos");
  if (/\.tex$/.test(text)) return pick("tex");
  if (/权利要求|说明书|申请文件|申请稿|四件套/.test(text)) return pick("applicationDocs");
  if (/申请信息|申请人/.test(text)) return pick("applicant");
  if (/向量|vector|embedding/.test(text)) return pick("vector");
  if (/案例|case/.test(text)) return pick("cases");
  /* 软著：源码包和截图各自只有一行，按扩展名就能分准 */
  if (has("screens") && /\.(png|jpe?g|webp|gif|bmp)$/.test(text)) return "screens";
  if (has("source") && /\.(zip|rar|7z|tar|gz)$/.test(text)) return "source";
  if (has("source")) return "source";

  if (has("project")) return "project";
  if (has("disclosureDir")) return "disclosureDir";
  return "other";
}
