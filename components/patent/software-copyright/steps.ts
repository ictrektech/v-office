/**
 * 软著办理的 8 个阶段与对应指令。
 *
 * 顺序必须和技能 SKILL.md 的工作流一致：代码抽取完成后再出申请表，
 * 因为「页数」字段依赖抽取结果。每一步都要用户确认后才进入下一步。
 */

export type StepKey =
  | "analyze"
  | "business"
  | "selection"
  | "extract"
  | "application"
  | "manual"
  | "shots"
  | "build";

export interface StepMeta {
  key: StepKey;
  title: string;
  desc: string;
}

export interface StepMark {
  done: boolean;
  at: number;
}

export const STEPS: StepMeta[] = [
  { key: "analyze", title: "项目分析", desc: "识别框架、源码文件数与源程序总行数" },
  { key: "business", title: "业务理解", desc: "行业、目标用户、核心功能与手册模块" },
  { key: "selection", title: "代码选材", desc: "挑选最能体现真实功能的源码文件" },
  { key: "extract", title: "抽取代码材料", desc: "前 30 页 + 后 30 页，共 60 页" },
  { key: "application", title: "申请表信息", desc: "软件全称、版本、环境与功能说明" },
  { key: "manual", title: "操作手册", desc: "按真实页面逐章写，并完成自检" },
  { key: "shots", title: "截图", desc: "上传截图，或本次跳过并保留占位" },
  { key: "build", title: "正式资料", desc: "生成 Word / TXT，校验页数" },
];

/** 每一步发给 agent 的指令，措辞对齐技能里的「页面按钮 → 指令」表 */
export const PROMPTS: Record<Exclude<StepKey, "shots">, string> = {
  analyze:
    "开始软著办理。请先检查运行环境，再分析 project/ 下的项目源码；如果没有 project/ 就提示我上传源码包。" +
    "工作目录用 outputs/软著。报告识别到的框架、源码文件数、源程序总行数（含空行）。",
  business:
    "项目已确认。按 SKILL.md 第 1 步生成业务理解草稿到 outputs/软著/草稿/，" +
    "然后把行业、目标用户、核心价值、主要功能、操作手册模块（manual_modules）列给我确认。",
  selection:
    "确认业务理解，继续：记录 business 门禁，生成代码文件候选清单，" +
    "按最能体现软件真实功能的文件给出选择建议，并估算能凑多少页。",
  extract:
    "确认代码选材（按你的建议执行）。记录 code-selection 门禁，抽取代码材料，" +
    "报告生成的是前30页/后30页还是全部，以及总页数。",
  application:
    "确认代码材料，继续：生成 outputs/软著/草稿/申请表信息.md（页数用抽取结果），" +
    "并列出需要我补全的字段（著作权人、日期、硬件/系统环境等）。",
  manual:
    "确认申请表信息，继续：记录 application-fields 门禁，生成操作手册草稿到 outputs/软著/草稿/操作手册.md，" +
    "按真实页面逐章写，并完成操作手册自检记录（至少三轮）。",
  build:
    "确认草稿，生成正式资料：记录 markdown 门禁，运行 build_docx_from_md.py 生成 Word 和 TXT，" +
    "报告产物清单、代码页数和仍需我人工核对的地方。",
};

export const SHOT_PROMPTS = {
  skip: "这次不截图。记录 screenshot-method 门禁（method=skip），手册里保留可见的截图预留位置。",
  upload:
    "我用自行上传的截图。截图在 materials/ 里，请复制到 outputs/软著/用户截图 并按手册模块顺序加数字前缀，" +
    "然后记录 screenshot-method 门禁（method=user-supplied）并整理截图清单。",
} as const;

const STEPS_KEY = "ai:copyright:steps:";
const INFO_KEY = "ai:copyright:info:";

/** 本页面认领会话用；新建案件时也清这个键 */
export const COPYRIGHT_PERSIST_KEY = "ai:software-copyright";

export function readStepMarks(sessionId: string): Partial<Record<StepKey, StepMark>> {
  try {
    const raw = localStorage.getItem(STEPS_KEY + sessionId);
    return raw ? (JSON.parse(raw) as Partial<Record<StepKey, StepMark>>) : {};
  } catch {
    return {};
  }
}

export function writeStepMark(sessionId: string, key: StepKey): void {
  try {
    const marks = readStepMarks(sessionId);
    marks[key] = { done: true, at: Date.now() };
    localStorage.setItem(STEPS_KEY + sessionId, JSON.stringify(marks));
  } catch {
    // 无痕模式忽略；本页仍以内存状态为准
  }
}

/** 申请信息存在本地，恢复案件时不用再向 agent 问一遍 */
export interface SoftwareInfo {
  name: string;
  version: string;
  owner: string;
  finishDate: string;
  devEnv: string;
  runEnv: string;
}

export function readSoftwareInfo(sessionId: string): SoftwareInfo | null {
  try {
    const raw = localStorage.getItem(INFO_KEY + sessionId);
    return raw ? (JSON.parse(raw) as SoftwareInfo) : null;
  } catch {
    return null;
  }
}

export function writeSoftwareInfo(sessionId: string, info: SoftwareInfo): void {
  try {
    localStorage.setItem(INFO_KEY + sessionId, JSON.stringify(info));
  } catch {
    // 忽略
  }
}

/** 产出物表格里的阶段标签，按文件路径猜，够用且不依赖服务端字段 */
export function stageOf(path: string): string {
  const text = path.toLowerCase();
  if (text.includes("正式资料")) return "正式资料";
  if (text.includes("操作手册")) return "操作手册";
  if (text.includes("申请表")) return "申请表";
  if (text.includes("代码")) return "代码材料";
  if (text.includes("业务理解")) return "业务理解";
  if (text.includes("截图")) return "截图";
  if (text.includes("分析") || text.includes("project")) return "项目分析";
  return "草稿";
}

export function nextStep(marks: Partial<Record<StepKey, StepMark>>): StepKey | null {
  return STEPS.find((step) => !marks[step.key]?.done)?.key ?? null;
}
