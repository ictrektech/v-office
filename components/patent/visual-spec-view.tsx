"use client";

import { useExtracted } from "next-intl";
import { ArrowLeft, Scale, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import { vp, VP_SPEC_GROUPS } from "./visual-spec";

/** 视觉规范页：把 `visual-spec.ts` 的令牌渲染成可查看的规范。 */
export function VisualSpecView() {
  const t = useExtracted();
  usePageTitle(t({ id: "Patent Visual Spec", message: "Patent Visual Spec" }));

  const radii = [
    { name: "rounded-lg", cls: "rounded-lg", note: "8px · 图标按钮" },
    { name: "rounded-xl", cls: "rounded-xl", note: "12px · 次级卡片" },
    { name: "rounded-2xl", cls: "rounded-2xl", note: "16px · 顶级卡片" },
    { name: "rounded-full", cls: "rounded-full", note: "胶囊 / 标签" },
  ];

  const shadows = [
    { name: "vp.subCard", cls: vp.subCard, note: "静态卡片" },
    { name: "vp.card", cls: vp.card, note: "面板 / 列表卡" },
    {
      name: "vp.hoverable",
      cls: cn(vp.card, vp.hoverable),
      note: "可点击卡片悬浮态",
    },
  ];

  const typography = [
    { name: "vp.h1", cls: vp.h1, sample: "AI 专利撰写室", note: "19px / 600" },
    { name: "vp.h2", cls: vp.h2, sample: "技术方案", note: "15px / 600" },
    { name: "vp.docHeading", cls: vp.docHeading, sample: "有益效果", note: "文档小标题" },
    { name: "vp.docText", cls: vp.docText, sample: "本结构包括基座、弹性卡臂与限位凸台。", note: "文档正文 / 1.95 行高" },
    { name: "vp.body", cls: vp.body, sample: "界面说明与次级内容。", note: "13px 次文本" },
    { name: "vp.meta", cls: vp.meta, sample: "09:21 · 王工", note: "12px 辅助信息" },
    { name: "vp.label", cls: vp.label, sample: "CASES", note: "11.5px 全大写分区标题" },
  ];

  return (
    <div className={cn(vp.shell, "overflow-y-auto custom-scrollbar")}>
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/patent" className={vp.iconBtn}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB]">
            <Scale className="h-4.5 w-4.5 text-white" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className={vp.h1}>{t({ id: "Patent Visual Spec", message: "Patent Visual Spec" })}</h1>
            <p className={vp.meta}>
              {t({
                id: "Spec subtitle",
                message: "Single source of truth: components/patent/visual-spec.ts",
              })}
            </p>
          </div>
        </div>

        {VP_SPEC_GROUPS.map((group) => (
          <section key={group.title} className="mb-10">
            <h2 className={cn(vp.h2, "mb-3")}>
              {t({ id: "Palette", message: "Palette" })}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {group.items.map((c) => (
                <div key={c.name} className={cn(vp.subCard, "p-3")}>
                  <div
                    className="mb-2 h-12 w-full rounded-lg border border-black/5"
                    style={{ background: c.value }}
                  />
                  <p className="text-[12.5px] font-medium text-[#0F172A] dark:text-white">
                    {c.name}
                  </p>
                  <p className="font-mono text-[11px] text-[#94A3B8]">{c.value}</p>
                  <p className={cn(vp.meta, "mt-1 text-[11px]")}>{c.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="mb-10">
          <h2 className={cn(vp.h2, "mb-3")}>{t({ id: "Radius & Elevation", message: "Radius & Elevation" })}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {radii.map((r) => (
              <div key={r.name} className={cn(vp.subCard, "p-3")}>
                <div className={cn("mb-2 h-12 w-full border border-[#E7EAF0] bg-[#F5F7FB]", r.cls)} />
                <p className="font-mono text-[11.5px] text-[#0F172A] dark:text-white">{r.name}</p>
                <p className={cn(vp.meta, "text-[11px]")}>{r.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {shadows.map((s) => (
              <div key={s.name} className={cn(s.cls, "p-4")}>
                <Sparkles className="mb-2 h-4 w-4 text-[#2563EB]" />
                <p className="font-mono text-[11.5px] text-[#0F172A] dark:text-white">{s.name}</p>
                <p className={cn(vp.meta, "text-[11px]")}>{s.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className={cn(vp.h2, "mb-3")}>{t({ id: "Typography", message: "Typography" })}</h2>
          <div className="space-y-2">
            {typography.map((ty) => (
              <div key={ty.name} className={cn(vp.subCard, "flex items-baseline gap-4 p-3")}>
                <span className="w-40 shrink-0 font-mono text-[11px] text-[#94A3B8]">
                  {ty.name}
                </span>
                <span className={cn(ty.cls, "min-w-0 flex-1 truncate")}>{ty.sample}</span>
                <span className={cn(vp.meta, "hidden shrink-0 text-[11px] sm:block")}>{ty.note}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className={cn(vp.h2, "mb-3")}>{t({ id: "Components", message: "Components" })}</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className={cn(vp.card, "space-y-3 p-4")}>
              <span className={vp.label}>{t({ id: "Buttons", message: "Buttons" })}</span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={vp.btnPrimary}>
                  {t({ id: "Primary", message: "Primary" })}
                </button>
                <button type="button" className={vp.btnGhost}>
                  {t({ id: "Ghost", message: "Ghost" })}
                </button>
                <button type="button" className={vp.btnText}>
                  {t({ id: "Text link", message: "Text link" })}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={vp.chip}>{t({ id: "Chip", message: "Chip" })}</span>
                <span className={cn(vp.chip, "border-[#EFF4FF] bg-[#EFF4FF] text-[#2563EB]")}>
                  {t({ id: "Accent chip", message: "Accent chip" })}
                </span>
                <span className="rounded-full bg-[#FEF2F2] px-2.5 py-1 text-[11.5px] font-medium text-[#DC2626]">
                  {t({ id: "High risk", message: "High risk" })}
                </span>
              </div>
            </div>

            <div className={cn(vp.card, "space-y-3 p-4")}>
              <span className={vp.label}>{t({ id: "Segmented control", message: "Segmented control" })}</span>
              <div className={vp.segGroup}>
                <span className={cn(vp.segOn, "text-[#2563EB]")}>{t({ id: "Agent", message: "Agent" })}</span>
                <span className={vp.segOff}>{t({ id: "Analysis", message: "Analysis" })}</span>
              </div>
              <input
                className={vp.input}
                placeholder={t({ id: "Input placeholder", message: "Input placeholder" })}
              />
            </div>

            <div className={cn(vp.card, "p-4 lg:col-span-2")}>
              <span className={cn(vp.label, "mb-3 block")}>
                {t({ id: "Status colors", message: "Status colors" })}
              </span>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  {
                    key: "draft",
                    cls: "bg-[#EFF4FF] text-[#2563EB]",
                    label: t({ id: "Draft", message: "Draft" }),
                  },
                  {
                    key: "searching",
                    cls: "bg-[#FFF7ED] text-[#D97706]",
                    label: t({ id: "Searching", message: "Searching" }),
                  },
                  {
                    key: "review",
                    cls: "bg-[#ECFDF3] text-[#16A34A]",
                    label: t({ id: "In review", message: "In review" }),
                  },
                  {
                    key: "blocked",
                    cls: "bg-[#FEF2F2] text-[#DC2626]",
                    label: t({ id: "Blocked", message: "Blocked" }),
                  },
                  {
                    key: "done",
                    cls: "bg-[#F1F5F9] text-[#475569]",
                    label: t({ id: "Done", message: "Done" }),
                  },
                ].map((s) => (
                  <span
                    key={s.key}
                    className={cn("rounded-xl px-3 py-2 text-center text-[12px] font-medium", s.cls)}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <p className={cn(vp.meta, "pb-6")}>
          {t({
            id: "Spec footnote",
            message: "Palette values live in VP_COLORS; component defaults in the vp object.",
          })}
        </p>
      </div>
    </div>
  );
}
