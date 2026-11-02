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

export type StageKey = "disclosure" | "application" | "oa" | "full";

export interface StageConfig {
  key: StageKey;
  label: string;
  /** 后端技能包目录名 */
  skill: string;
  /** 新建会话时的默认标题 */
  sessionTitle: string;
  hint: string;
}

export const STAGES: Record<StageKey, StageConfig> = {
  disclosure: {
    key: "disclosure",
    label: "交底书",
    skill: "patent-disclosure",
    sessionTitle: "专利交底书",
    hint: "只产出交底书与查新定位，不进入申请文件。",
  },
  application: {
    key: "application",
    label: "申请文件",
    skill: "patent-application",
    sessionTitle: "专利申请文件",
    hint: "需要已有交底书；依次生成权利要求书、说明书、摘要与附图。",
  },
  oa: {
    key: "oa",
    label: "审查答复",
    skill: "patent-oa",
    sessionTitle: "专利审查答复",
    hint: "上传审查意见通知书与对比文件，逐条答复后出意见陈述。",
  },
  full: {
    key: "full",
    label: "全流程",
    skill: "patent-docket",
    sessionTitle: "专利全流程",
    hint: "一条龙：交底 → 申请文件 → 问题清单修订，最多 3 轮。",
  },
};

export const STAGE_LIST = Object.values(STAGES);

/** 对话栏宽度：随窗口留出更合理的左右比例，拖动范围保持可用 */
export const CHAT_MIN_WIDTH = 340;
export const CHAT_MAX_WIDTH = 700;
export const CHAT_DEFAULT_WIDTH = 408;

export function fittedChatWidth(): number {
  const viewport = typeof window === "undefined" ? 1440 : window.innerWidth;
  return Math.min(560, Math.max(CHAT_MIN_WIDTH, Math.round(viewport * 0.29)));
}

export function isStageKey(value: string): value is StageKey {
  return value in STAGES;
}

/** 每个任务的会话 id 存在这个 key 下，刷新后接着用 */
export function persistKeyFor(mode: StageKey): string {
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

/** 时间统一成 HH:mm；服务端有的接口给秒，有的给毫秒 */
export function formatClock(value?: number | null): string {
  if (!value) return "—";
  const date = new Date(value > 1e12 ? value : value * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
