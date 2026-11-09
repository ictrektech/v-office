/**
 * 案卷会稿（patent-docket）的进度摘要。
 *
 * 数据源是会话工作目录里的 `outputs/docket/{case_id}/docket.yaml`。这里刻意
 * 不引入 YAML 库：该文件由 `init_docket.py` 的 `yaml.safe_dump` 生成，字段
 * 固定、顶格，我们只取 phase / round / max_rounds / issues.status 这几个标量，
 * 一个正则解析足够；解析失败就当作「案卷还没建」，不影响其他功能。
 */

export interface DocketState {
  caseId: string;
  /** docket.yaml 在会话目录里的相对路径 */
  path: string;
  phase: string;
  round: number;
  maxRounds: number;
  openIssues: number;
  totalIssues: number;
  /** 文件 mtime（秒） */
  updatedAt: number;
}

const PHASE_LABEL: Record<string, string> = {
  intake: "立案",
  bootstrap_disclosure: "准备交底稿",
  wait_disclosure: "等待交底稿",
  dispatch_disclosure: "派发交底修订",
  wait_disclosure_fix: "等待交底修订",
  bootstrap_application: "准备申请文件",
  wait_application: "等待申请文件",
  dispatch_application: "派发申请修订",
  triage: "问题清单分诊",
  ask_human: "等待补充技术事实",
  round_close: "本轮收口",
  terminal_complete: "已完成",
  terminal_max_rounds: "到达轮次上限",
  terminal_blocked: "已阻塞",
};

const PHASE_LABEL_EN: Record<string, string> = {
  intake: "Case intake",
  bootstrap_disclosure: "Preparing disclosure draft",
  wait_disclosure: "Waiting for disclosure draft",
  dispatch_disclosure: "Dispatching disclosure revision",
  wait_disclosure_fix: "Waiting for disclosure revision",
  bootstrap_application: "Preparing application documents",
  wait_application: "Waiting for application documents",
  dispatch_application: "Dispatching application revision",
  triage: "Triage issue list",
  ask_human: "Waiting for technical facts",
  round_close: "Closing current round",
  terminal_complete: "Completed",
  terminal_max_rounds: "Round limit reached",
  terminal_blocked: "Blocked",
};

export function docketPhaseLabel(phase: string, zh = true): string {
  return (zh ? PHASE_LABEL[phase] : PHASE_LABEL_EN[phase]) ?? phase;
}

export function isDocketTerminal(phase: string): boolean {
  return phase.startsWith("terminal_");
}

export function parseDocketYaml(
  raw: string,
): Omit<DocketState, "path" | "updatedAt"> | null {
  const text = (raw || "").replace(/\r\n?/g, "\n");
  const phase = /^phase:[ \t]*([A-Za-z_][A-Za-z0-9_]*)/m.exec(text)?.[1] ?? "";
  if (!phase) return null;

  const readInt = (key: string): number => {
    const hit = new RegExp(`^${key}:[ \\t]*(\\d+)`, "m").exec(text);
    return hit ? Number(hit[1]) : 0;
  };

  const caseId = /^case_id:[ \t]*["']?([^"'\s]+)/m.exec(text)?.[1] ?? "";
  const items = issuesBlock(text).split(/\n-[ \t]+/).slice(1);
  const openIssues = items.filter((item) =>
    /(^|\n)[ \t]+status:[ \t]*open\b/.test(item),
  ).length;

  return {
    caseId,
    phase,
    round: readInt("round"),
    maxRounds: readInt("max_rounds"),
    openIssues,
    totalIssues: items.length,
  };
}

/** 截出 issues 这一段，避免把 rounds 里的同名字段算进来 */
function issuesBlock(text: string): string {
  const marker = /^issues:[ \t]*(.*)$/m.exec(text);
  if (!marker) return "";
  if (marker[1].trim() === "[]") return "";
  const rest = text.slice((marker.index ?? 0) + marker[0].length);
  const end = rest.search(/\n[a-z_]+:[ \t]/);
  return end >= 0 ? rest.slice(0, end) : rest;
}
