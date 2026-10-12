"use client";

import { useState } from "react";
import Link from "next/link";
import { useExtracted } from "next-intl";
import {
  AlignLeft,
  Bold,
  Check,
  ChevronRight,
  Eye,
  Italic,
  Link2,
  MoreHorizontal,
  Share2,
  Sparkles,
  Table,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiDraft } from "@/utils/ai/client";
import { usePageTitle } from "@/hooks/use-page-title";
import { MOCK_DOC_BLOCKS, MOCK_REVIEW_ISSUES } from "@/utils/patent/mock";
import { getPatentTemplates } from "@/utils/patent/templates";
import { DocCanvas } from "./doc-canvas";
import { PatentHeader } from "./patent-header";
import { ReviewComments } from "./review-comments";
import { vp } from "./visual-spec";

type ReviewTab = "document" | "requirements";

/**
 * 申请文件审阅。
 *
 * 骨架包含：步骤条 / 状态胶囊 / 双标签（申请文件 · 审阅要点）/ 正文行内标注 /
 * 右栏批注 / 底栏动作。审阅要点直接由「申请文件四件套」模板字段派生，
 * 保证与撰写室用的是同一份模板定义（单一事实源）。
 */
export function PatentReview() {
  const t = useExtracted();
  usePageTitle(t({ id: "Application Review", message: "Application Review" }));

  const [tab, setTab] = useState<ReviewTab>("document");
  const [activeAnchor, setActiveAnchor] = useState<string | undefined>(undefined);

  const template = getPatentTemplates().find((tpl) => tpl.kind === "application");
  const requirements = template?.fields ?? [];
  const openIssues = MOCK_REVIEW_ISSUES.filter((i) => i.status === "open");

  // 审阅对象在这里是一份「只读草稿」：结构与撰写室一致，方便两边共用画布
  const reviewDraft: AiDraft = {
    title: t({ id: "Claims and Description (draft)", message: "Claims and Description (draft)" }),
    blocks: MOCK_DOC_BLOCKS.map((b) => ({
      anchor: b.anchor,
      heading: b.heading ?? "",
      text: b.text,
    })),
    chars: 0,
  };

  // 文案在数组里就地求值：每次调用都是字面量，构建期可静态提取
  const steps = [
    {
      key: "build",
      label: t({ id: "Build the case", message: "Build the case" }),
      done: true,
      current: false,
    },
    {
      key: "review",
      label: t({ id: "Review outcome", message: "Review outcome" }),
      done: false,
      current: true,
    },
    {
      key: "file",
      label: t({ id: "File it", message: "File it" }),
      done: false,
      current: false,
    },
  ];

  return (
    <div className={cn(vp.shell, "flex flex-col")}>
      <PatentHeader
        active="review"
        title={t({ id: "Application Review", message: "Application Review" })}
        subtitle={t({
          id: "Review subtitle",
          message: "Check claims and description against the disclosure before filing.",
        })}
      >
        <span className={cn(vp.chip, "border-[#EFF4FF] bg-[#EFF4FF] text-[#2563EB]")}>
          <Sparkles className="h-3 w-3" />
          {t({ id: "Suggesting", message: "Suggesting" })}
        </span>
        <span className={cn(vp.chip, "hidden sm:inline-flex")}>
          {t({ id: "N sources", message: "{count} sources", values: { count: "52" } })}
        </span>
        <button type="button" className={cn(vp.btnGhost, "hidden sm:inline-flex")}>
          <Share2 className="h-3.5 w-3.5" />
          {t({ id: "Share", message: "Share" })}
        </button>
        <button type="button" className={vp.iconBtn}>
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </PatentHeader>

      {/* 面包屑 + 步骤条 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#E7EAF0] bg-white/60 px-4 py-2.5 backdrop-blur dark:border-white/10 dark:bg-transparent md:px-6">
        <nav className="flex items-center gap-1 text-[12px] text-[#94A3B8]">
          <Link href="/patent" className="transition hover:text-[#2563EB]">
            {t({ id: "Patent Workbench", message: "Patent Workbench" })}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#475569] dark:text-slate-300">
            {t({ id: "Application Review", message: "Application Review" })}
          </span>
        </nav>

        <ol className="ml-auto flex items-center gap-3">
          {steps.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px]",
                  s.done
                    ? "bg-[#16A34A] text-white"
                    : s.current
                      ? "bg-[#2563EB] text-white"
                      : "border border-[#E7EAF0] text-[#94A3B8] dark:border-white/10",
                )}
              >
                {s.done ? <Check className="h-2.5 w-2.5" /> : "•"}
              </span>
              <span
                className={cn(
                  "text-[12px]",
                  s.current
                    ? "font-medium text-[#2563EB]"
                    : s.done
                      ? "text-[#475569] dark:text-slate-300"
                      : "text-[#94A3B8]",
                )}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#0e0e0e]">
        {/* 标题 + 标签 */}
        <div className="border-b border-[#E7EAF0] px-4 pt-4 dark:border-white/10 md:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-white">
              {t({ id: "Review Outcome", message: "Review Outcome" })}
            </h1>
            <span className={cn(vp.meta, "text-[12px]")}>
              {t({ id: "Edited just now", message: "Edited just now" })}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1">
            {(
              [
                { key: "document", label: t({ id: "Application", message: "Application" }) },
                {
                  key: "requirements",
                  label: `${t({ id: "Review Points", message: "Review Points" })} ${requirements.length}`,
                },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key as ReviewTab)}
                className={cn(
                  "border-b-2 px-3 py-2 text-[13px] transition-colors",
                  tab === item.key
                    ? "border-[#2563EB] font-medium text-[#2563EB]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "document" ? (
          <>
            {/* 格式工具条 */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-[#E7EAF0] px-4 py-2 dark:border-white/10 md:px-6">
              <button type="button" className={vp.iconBtn}>
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              {[Bold, Italic, Underline, Link2, Table].map((Icon, i) => (
                <button key={i} type="button" className={vp.iconBtn}>
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
              <span className={cn(vp.meta, "ml-auto hidden text-[11.5px] md:block")}>
                {t({
                  id: "N findings highlighted",
                  message: "{count} findings highlighted in the text",
                  values: { count: String(openIssues.length) },
                })}
              </span>
            </div>

            <div className="flex min-h-0 flex-1">
              <DocCanvas
                draft={reviewDraft}
                toolbar={false}
                selectedAnchor={activeAnchor}
                onSelectBlock={setActiveAnchor}
                /* 有未处理问题的段落，用同一套「待确认」视觉标出来 */
                pendingAnchors={openIssues.map((i) => String(i.anchor))}
              />
              <ReviewComments
                issues={MOCK_REVIEW_ISSUES}
                activeAnchor={activeAnchor}
                onSelect={setActiveAnchor}
                className="hidden xl:flex"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar md:px-6">
            <p className={cn(vp.body, "mb-3")}>
              {t({
                id: "Review points intro",
                message:
                  "Points derived from the application template — the same definition the studio uses.",
              })}
            </p>
            <div className="space-y-2">
              {requirements.map((f) => (
                <div
                  key={f.key}
                  className={cn(vp.subCard, "flex items-start gap-3 p-3")}
                >
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-[#E7EAF0] text-[9px] text-[#94A3B8] dark:border-white/10">
                    •
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#0F172A] dark:text-white">
                      {f.label}
                    </p>
                    {f.hint ? <p className={cn(vp.meta, "mt-1")}>{f.hint}</p> : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                      f.required
                        ? "bg-[#FEF2F2] text-[#DC2626]"
                        : "bg-[#F1F5F9] text-[#475569]",
                    )}
                  >
                    {f.required
                      ? t({ id: "Required", message: "Required" })
                      : t({ id: "Optional", message: "Optional" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底栏动作 */}
        <div className="flex items-center justify-end gap-2 border-t border-[#E7EAF0] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#101010] md:px-6">
          <button type="button" className={vp.btnGhost}>
            <Eye className="h-3.5 w-3.5" />
            {t({ id: "Preview", message: "Preview" })}
          </button>
          <button type="button" className={vp.btnPrimary}>
            <Check className="h-3.5 w-3.5" />
            {t({ id: "Complete review", message: "Complete review" })}
          </button>
        </div>
      </div>
    </div>
  );
}
