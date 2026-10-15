"use client";

import Link from "next/link";
import { useExtracted, useLocale } from "next-intl";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  Home,
  PenLine,
  Scale,
  Stamp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  getPatentTemplates,
  localizeTemplate,
  localizeVariant,
} from "@/utils/patent/templates";
import type { WorkKind } from "@/utils/patent/types";
import { vp } from "../studio/visual-spec";

/** 工作对象的配色（iOS 系统色：蓝 / 绿 / 灰） */
const KIND_META: Record<WorkKind, { icon: typeof FileText; cls: string }> = {
  disclosure: { icon: FlaskConical, cls: "bg-[#EAF4FF] text-[#007AFF]" },
  application: { icon: FileText, cls: "bg-[#E8F9EC] text-[#34C759]" },
  "office-action": { icon: Stamp, cls: "bg-[#EFEFF4] text-[#8E8E93]" },
};

/** 工作对象文案（静态分支：next-intl 提取器要求消息可静态分析）。 */
function KindLabel({ kind }: { kind: WorkKind }) {
  const t = useExtracted();
  switch (kind) {
    case "disclosure":
      return <>{t({ id: "Disclosure", message: "Disclosure" })}</>;
    case "application":
      return <>{t({ id: "Application", message: "Application" })}</>;
    default:
      return <>{t({ id: "Office action", message: "Office action" })}</>;
  }
}

/**
 * 专利栏目首页（工作台）。
 *
 * 视觉按 iOS 那一套来：大圆角、白卡片、极轻投影、系统蓝，字号整体偏大
 * （正文 15px、卡片标题 20px），在 27" 屏上一眼能看清，不用眯着眼。
 *
 * 两个主入口 + 模板库。模板来自 `public/patent/templates.json`，
 * 与撰写室、审阅页共用同一份定义。
 */
export function PatentHome() {
  const t = useExtracted();
  const locale = useLocale();
  const isZh = locale.toLowerCase().startsWith("zh");
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
  ];

  return (
    <div className={cn(vp.shell, "overflow-y-auto custom-scrollbar")}>
      <div className="mx-auto w-full max-w-6xl px-8 pb-16 pt-12">
        {/* Hero */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#007AFF] shadow-[0_2px_4px_rgba(0,0,0,0.06),0_12px_28px_-14px_rgba(0,122,255,0.9)]">
              <Scale className="h-7 w-7 text-white" strokeWidth={1.8} />
            </span>
            <div>
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] dark:text-white">
                {t({ id: "Patent Workbench", message: "Patent Workbench" })}
              </h1>
              <p className="mt-1 text-[15.5px] leading-relaxed text-[#6E6E73] dark:text-slate-400">
                {t({
                  id: "Workbench subtitle",
                  message: "Disclosure drafting and application review, powered by the patent skill.",
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 主入口：一句话说清「想写专利就从这里开始」，别让人去猜点哪张卡 */}
            <Link
              href="/patent/studio?template=disclosure"
              className="inline-flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_10px_24px_-14px_rgba(0,122,255,0.9)] transition hover:bg-[#0062CC] active:scale-[0.98]"
            >
              <PenLine className="h-4.5 w-4.5" />
              {t({ id: "Start a patent draft", message: "Start a patent draft" })}
            </Link>
            {/* 栏目首页也要能回 V-Office 主界面，否则进了专利栏目就只剩栏目内导航 */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-medium text-[#1C1C1E] shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05] transition hover:bg-[#F2F2F7] active:scale-[0.98] dark:bg-white/10 dark:text-white"
            >
              <Home className="h-4.5 w-4.5" />
              {t({ id: "Back to V-Office", message: "V-Office Home" })}
            </Link>
          </div>
        </div>

        {/* 两个主入口 */}
        <div className="mb-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {entries.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="group flex flex-col rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(0,0,0,0.28)] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_24px_48px_-24px_rgba(0,122,255,0.35)] dark:bg-[#141414] dark:ring-white/10"
            >
              <div className="mb-5 flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF4FF] dark:bg-[#007AFF]/15">
                  <e.icon className="h-7 w-7 text-[#007AFF]" strokeWidth={1.8} />
                </span>
                <div>
                  <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.01em] text-[#0F172A] dark:text-white">
                    {e.title}
                  </h2>
                  <span className="mt-0.5 inline-block rounded-full bg-[#EFEFF4] px-2.5 py-0.5 text-[12.5px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-slate-300">
                    {e.badge}
                  </span>
                </div>
                <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7] text-[#8E8E93] transition-all group-hover:bg-[#007AFF] group-hover:text-white dark:bg-white/10">
                  <ArrowRight className="h-4.5 w-4.5" />
                </span>
              </div>
              <p className="text-[15.5px] leading-relaxed text-[#6E6E73] dark:text-slate-400">
                {e.desc}
              </p>
            </Link>
          ))}
        </div>

        {/* 独立模板 */}
        <div className="mb-5">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-white">
            {t({ id: "Templates", message: "Or start from a template" })}
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-[#6E6E73] dark:text-slate-400">
            {t({
              id: "Templates subtitle",
              message:
                "Click any card to draft with that template — its skill, field list and output contract come along.",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const meta = KIND_META[tpl.kind];
            const Icon = meta.icon;
            // 模板名跟随界面语言（英文名同时也是落盘 docx 的文件名来源）
            const loc = localizeTemplate(tpl, isZh);
            return (
              <Link
                key={tpl.id}
                href={
                  tpl.kind === "application"
                    ? "/patent/application"
                    : tpl.kind === "office-action"
                      ? "/patent/office-action"
                      : `/patent/studio?template=${tpl.id}`
                }
                className={cn(
                  "group flex flex-col rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_20px_44px_-26px_rgba(0,122,255,0.4)] dark:bg-[#141414] dark:ring-white/10",
                )}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      meta.cls,
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.9} />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[12.5px] font-semibold",
                      meta.cls,
                    )}
                  >
                    <KindLabel kind={tpl.kind} />
                  </span>
                </div>

                <h3 className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[#0F172A] dark:text-white">
                  {loc.name}
                </h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#6E6E73] dark:text-slate-400">
                  {loc.description}
                </p>

                {/* 底部：只放必要的一行 chips（产出文件名不再重复——描述里已经写了）。
                    容器允许换行、不硬裁：宁可换行，也不要把 chip 切成半块挂在卡片边缘。 */}
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {tpl.variants?.length ? (
                      tpl.variants.map((v) => (
                        <span
                          key={v.id}
                          className="shrink-0 rounded-full bg-[#EAF4FF] px-3 py-1.5 text-[13.5px] font-semibold text-[#007AFF] dark:bg-[#007AFF]/15"
                        >
                          {localizeVariant(v, isZh).name}
                        </span>
                      ))
                    ) : (
                      <span className="shrink-0 rounded-full bg-[#EFEFF4] px-3 py-1.5 text-[13.5px] font-semibold text-[#6E6E73] dark:bg-white/10 dark:text-slate-300">
                        {t({
                          id: "N fields",
                          message: "{count} fields",
                          values: { count: String(tpl.fields.length) },
                        })}
                      </span>
                    )}
                  </div>
                  {/* 明确的动作：点这张卡就是用它起草 */}
                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[14.5px] font-semibold text-[#007AFF]">
                    {t({ id: "Use this template", message: "Use this template" })}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
