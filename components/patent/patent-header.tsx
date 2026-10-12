"use client";

import Link from "next/link";
import { useExtracted } from "next-intl";
import { ArrowLeft, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { vp } from "./visual-spec";

export type PatentNavKey = "studio" | "review" | "spec";

/**
 * 专利栏目共用顶栏。
 *
 * 三个全屏页（撰写室 / 审阅 / 视觉规范）都挂它，保证栏目内部导航一致；
 * 右侧操作区由各页通过 children 传入（图 1 的「修订记录 / 分享」，图 2 的
 * 「预览 / 完成」）。
 */
export function PatentHeader({
  active,
  title,
  subtitle,
  children,
}: {
  active: PatentNavKey;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const t = useExtracted();

  // 文案在数组里就地求值：每次调用都是字面量，构建期可静态提取
  const navItems: { key: PatentNavKey; href: string; label: string }[] = [
    {
      key: "studio",
      href: "/patent/studio",
      label: t({ id: "Patent Studio", message: "Patent Studio" }),
    },
    {
      key: "review",
      href: "/patent/review",
      label: t({ id: "Document Review", message: "Document Review" }),
    },
    {
      key: "spec",
      href: "/patent/spec",
      label: t({ id: "Visual Spec", message: "Visual Spec" }),
    },
  ];

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#E7EAF0] bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0b0b]/70">
      {/* 返回栏目首页。原来是 32px 的纯图标幽灵按钮，实际没人看见——带上文字 */}
      <Link
        href="/patent"
        className={cn(vp.btnGhost, "shrink-0 gap-1.5 px-2.5")}
        title={t({ id: "Back to Patent Workbench", message: "Back to Patent Workbench" })}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="text-[12.5px]">{t({ id: "Back", message: "Back" })}</span>
      </Link>

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] shadow-[0_1px_2px_rgba(16,24,40,0.08),0_8px_20px_-10px_rgba(37,99,235,0.9)]">
          <Scale className="h-4.5 w-4.5 text-white" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h1 className={cn(vp.h1, "truncate leading-tight")}>{title}</h1>
          {subtitle ? (
            <p className={cn(vp.meta, "truncate mt-0.5")}>{subtitle}</p>
          ) : null}
        </div>
      </div>

      <nav className={cn(vp.segGroup, "ml-2 hidden md:inline-flex")}>
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={item.key === active ? vp.segOn : vp.segOff}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  );
}
