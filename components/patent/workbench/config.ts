/**
 * 专利工作台的单页配置：四种任务、对应技能包、会话持久化键。
 *
 * 一个任务 = 一条会话（后端技能包按阶段拆开），切换任务只换会话，不换页面。
 */

import {
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  NotebookText,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export type StageKey = "disclosure" | "application" | "oa" | "full" | "copyright";

export interface StageConfig {
  key: StageKey;
  label: string;
  labelEn: string;
  /** 后端技能包目录名 */
  skill: string;
  /** 新建会话时的默认标题 */
  sessionTitle: string;
  sessionTitleEn: string;
  hint: string;
  hintEn: string;
}

export const STAGES: Record<StageKey, StageConfig> = {
  disclosure: {
    key: "disclosure",
    label: "交底书",
    labelEn: "Invention Disclosure",
    skill: "patent-disclosure",
    sessionTitle: "专利交底书",
    sessionTitleEn: "Patent Invention Disclosure",
    hint: "只产出交底书与查新定位，不进入申请文件。",
    hintEn:
      "Produces only the invention disclosure and prior-art positioning; does not proceed to application documents.",
  },
  application: {
    key: "application",
    label: "申请文件",
    labelEn: "Application Documents",
    skill: "patent-application",
    sessionTitle: "专利申请文件",
    sessionTitleEn: "Patent Application Documents",
    hint: "需要已有交底书；依次生成权利要求书、说明书、摘要与附图。",
    hintEn:
      "Requires an existing invention disclosure; generates claims, specification, abstract, and drawings in order.",
  },
  oa: {
    key: "oa",
    label: "审查答复",
    labelEn: "Office Action Response",
    skill: "patent-oa",
    sessionTitle: "专利审查答复",
    sessionTitleEn: "Patent Office Action Response",
    hint: "上传审查意见通知书与对比文件，逐条答复后出意见陈述。",
    hintEn:
      "Upload the office action notice and prior-art references; respond item by item, then produce an opinion statement.",
  },
  full: {
    key: "full",
    label: "全流程",
    labelEn: "Full Process",
    skill: "patent-docket",
    sessionTitle: "专利全流程",
    sessionTitleEn: "Patent Full Process",
    hint: "一条龙：交底 → 申请文件 → 问题清单修订，最多 3 轮。",
    hintEn:
      "All-in-one: disclosure → application documents → issue-list revisions, up to 3 rounds.",
  },
  copyright: {
    key: "copyright",
    label: "软件著作权",
    labelEn: "Software Copyright",
    skill: "software-copyright",
    sessionTitle: "软件著作权申请",
    sessionTitleEn: "Software Copyright Application",
    hint: "传源码包，8 步出申请表、操作手册与前后 30 页代码材料。",
    hintEn:
      "Upload the source archive; 8 steps produce the application form, user manual, and the first/last 30 pages of code materials.",
  },
};

export const STAGE_LIST = Object.values(STAGES);

/** 对话栏宽度：桌面端给到 2/5，窄屏保底，超宽屏不无限膨胀 */
export const CHAT_MIN_WIDTH = 440;
export const CHAT_MAX_WIDTH = 1000;
export const CHAT_DEFAULT_WIDTH = 560;

function viewportWidth(): number {
  return typeof window === "undefined" ? 1440 : window.innerWidth;
}

/** 首次进入的默认宽度：约 40%，窄屏至少 460，超宽屏封顶 */
export function fittedChatWidth(): number {
  return Math.min(CHAT_MAX_WIDTH, Math.max(460, Math.round(viewportWidth() * 0.4)));
}

/** 点「展开」时的宽版：约一半多一点，读长回复/长文档更舒服 */
export function wideChatWidth(): number {
  return Math.min(CHAT_MAX_WIDTH, Math.max(680, Math.round(viewportWidth() * 0.55)));
}

/** 拖动上限：右边再宽，左栏也至少留 560，避免在小窗口里把案件区挤没 */
export function maxChatWidth(): number {
  const viewport = viewportWidth();
  return Math.min(CHAT_MAX_WIDTH, Math.max(CHAT_MIN_WIDTH, viewport - 560));
}

export function isStageKey(value: string): value is StageKey {
  return value in STAGES;
}

/** 每个任务的会话 id 存在这个 key 下，刷新后接着用 */
export function persistKeyFor(mode: StageKey): string {
  // 软著并入工作台后沿用原来的键：老案件（/patent/copyright）还能自动接上
  if (mode === "copyright") return "ai:software-copyright";
  return `ai:patent:${mode}`;
}

/** 产出物表格里的一行：agent 草稿产物，或案件目录里的文件 */
export interface OutputRow {
  id: string;
  name: string;
  stage: string;
  time: number | null;
  kind: "artifact" | "file";
  /** artifact 的 key */
  artifactKey?: string;
  /** file 的相对路径 */
  path?: string;
}

export type PreviewTarget =
  | { kind: "artifact"; key: string; name: string }
  | { kind: "file"; path: string; name: string };

export function baseName(path: string): string {
  return path.split("/").pop() || path;
}

/** 编辑器内核认识的格式：只有这些能交给 Collabora / OnlyOffice 在线打开 */
export function isOfficePath(path: string): boolean {
  return /\.(docx?|xlsx|pptx)$/i.test(path);
}

/**
 * 能不能在线打开。
 *
 * 产物（artifact）是 markdown，看似不是 Office 文件——但服务端有 md→docx
 * 的确定性管线，打开时导出成 docx 就能进编辑器；所以 artifact 一律可开。
 * 之前预览页只认 `kind === "file" && 扩展名`，技能产出的四件套恰好全是
 * artifact，于是「在线打开」按钮永远不出现。
 */
export function canOpenOnline(target: PreviewTarget): boolean {
  return target.kind === "artifact" || isOfficePath(target.path);
}

/** 产出物行前面的小图标：按类型区分，别所有行都是同一张纸 */
export function rowFileIcon(name: string, kind?: OutputRow["kind"]): LucideIcon {
  if (kind === "artifact") return NotebookText;
  const ext = name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() ?? "";
  if (["xlsx", "xls", "csv"].includes(ext)) return FileSpreadsheet;
  if (["pptx", "ppt"].includes(ext)) return Presentation;
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return FileImage;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (["pdf"].includes(ext)) return FileType;
  if (["md", "txt", "markdown"].includes(ext)) return NotebookText;
  if (["json", "yaml", "yml", "xml", "html", "tex", "py", "js", "ts"].includes(ext)) {
    return FileCode2;
  }
  if (["doc", "docx"].includes(ext)) return FileText;
  return File;
}

/**
 * 产出物面板分「成品 / 草稿」两层。
 *
 * - 成品：docx / xlsx / pdf / 图片 / 成稿 md，默认展开的产出物表；
 * - 草稿：对话成稿 artifact + 旁路 md（问题清单、对照表、TRACKER…），
 *   收进单独的「草稿」折叠区，点开才见；
 * - 过程件（json / yaml / figure_plan 等纯中间格式）：两层都不进，留在磁盘。
 */
const DELIVERABLE_EXT = /\.(docx?|xlsx?|pptx?|pdf|csv|png|jpe?g|svg)$/i;
const INTERNAL_FILE =
  /(^|\/)(标号核对|TRACKER|README|figure_plan|invention_figures|intake|chart|index)(\.|$)/i;
/** 旁路文档：人看的，但不是交付件 → 草稿区 */
const DRAFT_FILE =
  /(^|\/)(问题清单|视图检查清单|对照表|生成报告|lint|底稿|调试)(\.|$)/i;

export function isDraftFile(path: string): boolean {
  const name = baseName(path);
  if (!name) return false;
  return /\.md$/i.test(name) && DRAFT_FILE.test(name);
}

export function isDeliverable(path: string): boolean {
  const name = baseName(path);
  if (!name || INTERNAL_FILE.test(name) || isDraftFile(name)) return false;
  if (DELIVERABLE_EXT.test(name)) return true;
  // Markdown 是技能的主要成稿格式
  return /\.md$/i.test(name);
}

/** 时间统一成 HH:mm；服务端有的接口给秒，有的给毫秒 */
export function formatClock(value?: number | null): string {
  if (!value) return "—";
  const date = new Date(value > 1e12 ? value : value * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
