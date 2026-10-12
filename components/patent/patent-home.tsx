"use client";

import Link from "next/link";
import { useExtracted } from "next-intl";
import {
  ArrowRight,
  Blocks,
  FileCheck2,
  FileText,
  FlaskConical,
  Home,
  Palette,
  PenLine,
  ScanSearch,
  Scale,
  Stamp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import { getPatentTemplates } from "@/utils/patent/templates";
import type { WorkKind } from "@/utils/patent/types";
import { vp } from "./visual-spec";

const KIND_META: Record<WorkKind, { icon: typeof FileText; cls: string }> = {
  disclosure: { icon: FlaskConical, cls: "bg-[#EFF4FF] text-[#2563EB]" },
  application: { icon: FileText, cls: "bg-[#ECFDF3] text-[#16A34A]" },
  published: { icon: ScanSearch, cls: "bg-[#FFF7ED] text-[#D97706]" },
  "office-action": { icon: Stamp, cls: "bg-[#F1F5F9] text-[#475569]" },
};

/** 工作对象文案（静态分支：next-intl 提取器要求消息可静态分析）。 */
function KindLabel({ kind }: { kind: WorkKind }) {
  const t = useExtracted();
  switch (kind) {
    case "disclosure":
      return <>{t({ id: "Disclosure", message: "Disclosure" })}</>;
    case "application":
      return <>{t({ id: "Application", message: "Application" })}</>;
    case "published":
      return <>{t({ id: "Search", message: "Search" })}</>;
    default:
      return <>{t({ id: "Office action", message: "Office action" })}</>;
  }
}

/**
 * 专利栏目首页（工作台）。
 *
 * 两个主入口 + 独立模板库 + 视觉规范。模板来自 `public/patent/templates.json`，
 * 与撰写室、审阅页共用同一份定义。
 */
export function PatentHome() {
  const t = useExtracted();
  usePageTitle(t({ id: "Patent Workbench", message: "Patent Workbench" }));
  const templates = getPatentTemplates();

  // 文案在数组里就地求值（每次调用都是字面量，构建期可静态提取）
  const entries = [
    {
      href: "/patent/studio",
      icon: FlaskConical,
      title: t({ id: "AI Patent Studio", message: "AI Patent Studio" }),
      badge: t({ id: "Core", message: "Core" }),
      desc: t({
        id: "Studio card desc",
        message: "Core workspace: materials → mining → prior-art → disclosure draft.",
      }),
    },
    {
      href: "/patent/review",
      icon: FileCheck2,
      title: t({ id: "Application Review", message: "Application Review" }),
      badge: t({ id: "Review", message: "Review" }),
      desc: t({
        id: "Review card desc",
        message: "Check claims and description against the disclosure, issue by issue.",
      }),
    },
  ];

  return (
    <div className={cn(vp.shell, "overflow-y-auto custom-scrollbar")}>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Hero */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2563EB] shadow-[0_1px_2px_rgba(16,24,40,0.08),0_10px_24px_-12px_rgba(37,99,235,0.9)]">
              <Scale className="h-5 w-5 text-white" strokeWidth={1.8} />
            </span>
            <div>
              <h1 className={cn(vp.h1, "text-[22px]")}>
                {t({ id: "Patent Workbench", message: "Patent Workbench" })}
              </h1>
              <p className={cn(vp.meta, "mt-0.5")}>
                {t({
                  id: "Workbench subtitle",
                  message: "Disclosure drafting and application review, powered by the patent skill.",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 主入口：一句话说清「想写专利就从这里开始」，别让人去猜点哪张卡 */}
            <Link
              href="/patent/studio?template=disclosure-invention"
              className={vp.btnPrimary}
            >
              <PenLine className="h-3.5 w-3.5" />
              {t({ id: "Start a patent draft", message: "Start a patent draft" })}
            </Link>
            <Link href="/patent/spec" className={vp.btnGhost}>
              <Palette className="h-3.5 w-3.5" />
              {t({ id: "Visual Spec", message: "Visual Spec" })}
            </Link>
            {/* 栏目首页也要能回 V-Office 主界面，否则进了专利栏目就只剩栏目内导航 */}
            <Link href="/" className={vp.btnGhost}>
              <Home className="h-3.5 w-3.5" />
              {t({ id: "Back to V-Office", message: "V-Office Home" })}
            </Link>
          </div>
        </div>

        {/* 两个主入口 */}
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {entries.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className={cn(vp.card, vp.hoverable, "group flex flex-col p-5")}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF4FF]">
                  <e.icon className="h-5 w-5 text-[#2563EB]" strokeWidth={1.8} />
                </span>
                <div>
                  <h2 className={vp.h2}>{e.title}</h2>
                  <span className="text-[11.5px] text-[#94A3B8]">{e.badge}</span>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-[#94A3B8] transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]" />
              </div>
              <p className={vp.body}>{e.desc}</p>
            </Link>
          ))}
        </div>

        {/* 独立模板 */}
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className={vp.h2}>
              {t({ id: "Templates", message: "Or start from a template" })}
            </h2>
            <p className={cn(vp.meta, "mt-0.5")}>
              {t({
                id: "Templates subtitle",
                message:
                  "Click any card to draft with that template — its skill, field list and output contract come along.",
              })}
            </p>
          </div>
          <span className={cn(vp.meta, "text-[11.5px]")}>
            public/patent/templates.json
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const meta = KIND_META[tpl.kind];
            const Icon = meta.icon;
            return (
              <Link
                key={tpl.id}
                href={`/patent/studio?template=${tpl.id}`}
                className={cn(vp.subCard, vp.hoverable, "group flex flex-col p-4")}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg",
                      meta.cls,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-medium", meta.cls)}>
                    <KindLabel kind={tpl.kind} />
                  </span>
                </div>

                <h3 className="text-[14px] font-medium text-[#0F172A] dark:text-white">
                  {tpl.name}
                </h3>
                <p className={cn(vp.meta, "mt-1.5 leading-relaxed")}>{tpl.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className={vp.chip}>
                    {t({
                      id: "N fields",
                      message: "{count} fields",
                      values: { count: String(tpl.fields.length) },
                    })}
                  </span>
                  {tpl.outputs.slice(0, 2).map((o) => (
                    <span key={o} className={cn(vp.chip, "font-mono text-[10.5px]")}>
                      {o}
                    </span>
                  ))}
                  {/* 明确的动作：点这张卡就是用它起草 */}
                  <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-[#2563EB]">
                    {t({ id: "Use this template", message: "Use this template" })}
                    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 骨架说明 */}
        <div className={cn(vp.card, "mt-8 flex flex-wrap items-start gap-4 p-5")}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] dark:bg-white/10">
            <Blocks className="h-5 w-5 text-[#475569] dark:text-slate-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={vp.h2}>
              {t({ id: "What the skeleton leaves open", message: "What the skeleton leaves open" })}
            </h2>
            <ul className={cn(vp.body, "mt-2 space-y-1.5")}>
              <li>
                ·{" "}
                {t({
                  id: "Skeleton note agent",
                  message:
                    "Agent runtime: the patent skill will be driven from the app backend (/api/com.ictrek.v-office/api/v1/ai/*).",
                })}
              </li>
              <li>
                ·{" "}
                {t({
                  id: "Skeleton note documents",
                  message:
                    "Documents: the canvas will be replaced by the editor kernel (docx) — anchors stay the same.",
                })}
              </li>
              <li>
                ·{" "}
                {t({
                  id: "Skeleton note cases",
                  message: "Cases and materials: replace utils/patent/mock.ts with real endpoints.",
                })}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
