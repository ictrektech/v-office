"use client";

import { useState } from "react";
import { useExtracted } from "next-intl";
import { Check, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewIssue } from "@/utils/patent/types";
import { vp, VP_SEVERITY } from "../studio/visual-spec";

/** 严重度文案（静态分支：next-intl 提取器要求消息可静态分析）。 */
function SeverityLabel({ severity }: { severity: ReviewIssue["severity"] }) {
  const t = useExtracted();
  switch (severity) {
    case "high":
      return <>{t({ id: "High", message: "High" })}</>;
    case "mid":
      return <>{t({ id: "Medium", message: "Medium" })}</>;
    default:
      return <>{t({ id: "Low", message: "Low" })}</>;
  }
}

/**
 * 审阅页右栏：问题批注。
 *
 * 骨架里 Resolve 只改本地状态；接后端后对应「问题标记为已处理」，
 * 与正文锚点（`anchor`）双向联动：点批注 → 滚动到正文高亮处。
 */
export function ReviewComments({
  issues,
  activeAnchor,
  onSelect,
  className,
}: {
  issues: ReviewIssue[];
  activeAnchor?: string;
  onSelect: (anchor: string) => void;
  className?: string;
}) {
  const t = useExtracted();
  const [resolved, setResolved] = useState<Record<string, boolean>>(
    () => Object.fromEntries(issues.filter((i) => i.status === "resolved").map((i) => [i.id, true])),
  );

  return (
    <aside
      className={cn(
        "flex w-[21rem] shrink-0 flex-col border-l border-[#E7EAF0] bg-white dark:border-white/10 dark:bg-[#101010]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[#E7EAF0] px-4 py-3 dark:border-white/10">
        <span className={vp.label}>{t({ id: "Findings", message: "Findings" })}</span>
        <span className={cn(vp.meta, "text-[11.5px]")}>
          {t({
            id: "N open",
            message: "{count} open",
            values: { count: String(issues.filter((i) => !resolved[i.id]).length) },
          })}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 custom-scrollbar">
        {issues.map((issue) => {
          const sev = VP_SEVERITY[issue.severity];
          const isResolved = !!resolved[issue.id];
          const isActive = activeAnchor === issue.anchor;
          return (
            <div
              key={issue.id}
              onClick={() => onSelect(issue.anchor)}
              className={cn(
                "cursor-pointer rounded-xl border p-3 transition-colors",
                isActive
                  ? "border-[#BFD3FF] bg-[#F7F9FF]"
                  : "border-[#E7EAF0] bg-white hover:border-[#D8E1F2] dark:border-white/10 dark:bg-white/[0.03]",
                isResolved && "opacity-60",
              )}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
                <span className={cn("text-[11.5px] font-medium", sev.text)}>
                  <SeverityLabel severity={issue.severity} />
                </span>
                <span className="ml-auto text-[11px] text-[#94A3B8]">
                  {t({ id: "Clause", message: "Clause" })} {issue.anchor}
                </span>
              </div>

              <p className="text-[13px] font-medium leading-snug text-[#0F172A] dark:text-white">
                {issue.title}
              </p>
              <p className={cn(vp.meta, "mt-1.5 leading-relaxed")}>{issue.detail}</p>

              <div className={cn(vp.subCard, "mt-2 p-2.5")}>
                <div className="flex items-start gap-1.5">
                  <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 text-[#2563EB]" />
                  <p className="text-[12px] leading-relaxed text-[#475569] dark:text-slate-300">
                    {issue.suggestion}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1F5F9] text-[10.5px] font-medium text-[#475569] dark:bg-white/10 dark:text-slate-300">
                  {issue.reviewer}
                </span>
                <span className="text-[11px] text-[#94A3B8]">{issue.at}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResolved((prev) => ({ ...prev, [issue.id]: !prev[issue.id] }));
                  }}
                  className={cn(
                    vp.btnText,
                    "ml-auto",
                    isResolved && "text-[#16A34A] hover:text-[#16A34A]",
                  )}
                >
                  <Check className="h-3 w-3" />
                  {isResolved
                    ? t({ id: "Resolved", message: "Resolved" })
                    : t({ id: "Resolve", message: "Resolve" })}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
