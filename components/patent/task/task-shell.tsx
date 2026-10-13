"use client";

/**
 * 任务页外壳（申请文件四件套 / 审查意见答复这类「表单驱动」的工作台）。
 *
 * 为什么不是撰写室那种形态：这两个任务不是「跟 AI 协作写一篇稿子」，而是
 * **先把要件填全 → 再分段生成 → 最后导出文件**。用户要的是一张能填的表和一条
 * 能看见进度的步骤条，不是 Word 编辑器 —— 所以这里刻意不挂 Collabora。
 *
 * 配色随任务走：四件套绿、答复蓝。用内联 style 传色，避免 Tailwind 动态类被扫掉。
 */

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { vp } from "@/components/studio/visual-spec";

/** 步骤条的一项 */
export interface TaskStep {
  key: string;
  label: string;
  /** 副标题：这一步在做什么（设计稿里每个点下面那行小字） */
  hint: string;
}

export function TaskShell({
  accent,
  badge,
  title,
  subtitle,
  icon: Icon,
  steps,
  activeStep,
  backHref,
  backLabel,
  assistantLabel,
  aside,
  children,
}: {
  /** 主色（图标底、当前步骤、按钮） */
  accent: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  steps: TaskStep[];
  /** 当前处在第几步（0 起） */
  activeStep: number;
  backHref: string;
  /** 顶栏「返回」/「AI 助手」（由栏目侧按语言传入，壳里不写死） */
  backLabel: string;
  assistantLabel: string;
  /** 右栏（预计生成内容 / 使用说明 / 提示） */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn(vp.shell, "flex flex-col")}>
      {/* 顶栏 */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0b0b]/70">
        <Link href={backHref} className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-2 text-[14px] text-[#475569] transition hover:text-[#0F172A] dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <span className="ml-auto text-[14px] text-[#8E8E93]">{assistantLabel}</span>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-6xl px-8 pb-16 pt-8">
          {/* Hero */}
          <section className="mb-6 flex items-center gap-6 overflow-hidden rounded-3xl bg-white px-7 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:bg-[#141414] dark:ring-white/10">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
            >
              <Icon className="h-7 w-7" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <span
                className="inline-block rounded-full px-2.5 py-1 text-[12.5px] font-semibold"
                style={{ backgroundColor: `${accent}14`, color: accent }}
              >
                {badge}
              </span>
              <h1 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] dark:text-white">
                {title}
              </h1>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[#6E6E73] dark:text-slate-400">
                {subtitle}
              </p>
            </div>
            {/* 装饰：右侧一组淡色文档图形，不喧宾夺主 */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex" aria-hidden="true">
              <span
                className="flex h-16 w-12 items-center justify-center rounded-xl opacity-20"
                style={{ backgroundColor: accent }}
              >
                <Icon className="h-7 w-7" />
              </span>
              <span className="flex h-20 w-14 items-center justify-center rounded-2xl opacity-30" style={{ backgroundColor: accent }}>
                <Icon className="h-9 w-9" />
              </span>
            </div>
          </section>

          {/* 步骤条 */}
          <section className="mb-6 rounded-3xl bg-white px-7 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:bg-[#141414] dark:ring-white/10">
            <ol className="flex flex-wrap items-center gap-y-3">
              {steps.map((s, i) => {
                const done = i < activeStep;
                const on = i === activeStep;
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition",
                        on
                          ? "text-white"
                          : done
                            ? "bg-[#E8F9EC] text-[#34C759] dark:bg-[#34C759]/15"
                            : "bg-black/[0.05] text-[#8E8E93] dark:bg-white/10",
                      )}
                      style={on ? { backgroundColor: accent } : undefined}
                    >
                      {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-[14.5px] font-semibold leading-tight",
                          on ? "text-[#0F172A] dark:text-white" : "text-[#6E6E73] dark:text-slate-400",
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="block text-[12.5px] leading-tight text-[#94A3B8]">{s.hint}</span>
                    </span>
                    {i < steps.length - 1 ? (
                      <span className="mx-2 hidden h-px w-10 bg-black/[0.08] lg:block dark:bg-white/10" />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>

          {/* 双栏 */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">{children}</div>
            {aside ? <aside className="w-full shrink-0 space-y-4 lg:w-[22rem]">{aside}</aside> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 右栏卡片：标题 + 图标 */
export function AsideCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:bg-[#141414] dark:ring-white/10">
      <h3 className="mb-3 flex items-center gap-2 text-[15.5px] font-semibold text-[#0F172A] dark:text-white">
        <Icon className="h-4 w-4 text-[#007AFF]" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** 表单分组：序号 + 标题 + 内容 */
export function FormSection({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:bg-[#141414] dark:ring-white/10">
      <h2 className="mb-5 flex items-center gap-2.5 text-[17px] font-semibold text-[#0F172A] dark:text-white">
        <span className="text-[#007AFF]">{index}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** 字段：标签 + 必填星号 + 控件 + 字数 */
export function Field({
  label,
  required,
  hint,
  counter,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <label className="text-[14.5px] font-medium text-[#0F172A] dark:text-white">
          {label}
          {required ? <span className="ml-0.5 text-[#FF3B30]">*</span> : null}
        </label>
        {hint ? <span className="text-[12.5px] text-[#94A3B8]">{hint}</span> : null}
        {counter ? (
          <span className="ml-auto font-mono text-[12px] text-[#94A3B8]">{counter}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** 输入框 / 文本域（iOS 风：细边、圆角、聚焦微蓝） */
export function inputClass(extra?: string) {
  return cn(
    "w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-[15px] text-[#0F172A] outline-none transition placeholder:text-[#B0B0B8] focus:border-[#9CC9FF] focus:ring-4 focus:ring-[#007AFF]/10 dark:border-white/10 dark:bg-white/5 dark:text-white",
    extra,
  );
}
