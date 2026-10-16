"use client";

/**
 * 专利栏目首页 —— 严格照设计稿「AI 专利工作台」。
 *
 * 逐项对图：标题区（渐变橙图标 + 标题 + 副标题 + 右上橙色「+ 新建案件」）、
 * 上传技术资料卡 + 右侧「让 PI 你的专利助手」卡（带粉色装饰插画）、四个模块入口
 * （交底书 / 四件套 / 审查答复 / 附图）、最近案件两行列表（文档图标 + 案件名 +
 * 类型与最近编辑时间 + 状态标签 + 操作按钮 + 更多菜单）。
 *
 * 「最近案件」读真实 AI 会话（专利两个技能包的会话即一件案件）：点一行带
 * `?case=<会话 id>` 跳进工作台，由 `useAiChat` 的 `resumeFrom` 恢复那条会话。
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useExtracted } from "next-intl";
import {
  ArrowRight,
  CloudUpload,
  Ellipsis,
  FilePen,
  FileText,
  Layers,
  MessageSquareHeart,
  Plus,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  deleteAiSession,
  listAiSessions,
  type AiSessionMeta,
} from "@/utils/ai/client";

/** 品牌主橙（对图取色） */
const ORANGE = "#E2562B";
const ORANGE_SOFT = "#FBF2EE";

/** 技能包 → 案件详情页；不在表里的会话不作为专利案件展示 */
const SKILL_HOME: Record<string, string> = {
  "patent-disclosure": "/patent/studio",
  "patent-application": "/patent/application",
};

/** 列表里的专利类型标签（会话只记技能包，这里按技能给展示口径） */
type CaseKind = "invention" | "utility";

const SKILL_CASE_KIND: Record<string, CaseKind> = {
  "patent-disclosure": "utility",
  "patent-application": "invention",
};

interface CaseRow {
  id: string;
  title: string;
  href: string;
  updatedAt: number;
  turns: number;
  kind: CaseKind | null;
}

function caseHref(s: AiSessionMeta): string {
  const base = SKILL_HOME[s.skill ?? ""] ?? "/patent/studio";
  const title = encodeURIComponent(s.title || "");
  return `${base}?case=${s.id}${title ? `&title=${title}` : ""}`;
}

export function PatentHome() {
  const t = useExtracted();
  usePageTitle(t({ id: "Patent Workbench", message: "AI 专利工作台" }));

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  const loadCases = useCallback(async () => {
    setLoadingCases(true);
    try {
      const list = await listAiSessions();
      setCases(
        list
          .filter((s) => SKILL_HOME[s.skill ?? ""])
          .sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0))
          .slice(0, 2)
          .map((s) => ({
            id: s.id,
            title: s.title || t({ id: "Untitled case", message: "未命名案件" }),
            href: caseHref(s),
            updatedAt: (s.updated_at ?? s.created_at ?? 0) * 1000,
            turns: s.turn ?? 0,
            kind: SKILL_CASE_KIND[s.skill ?? ""] ?? null,
          })),
      );
    } catch {
      setCases([]);
    } finally {
      setLoadingCases(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  /** 设计稿的「最近编辑」口径：今天给时刻，昨天给「昨天」，更早给月-日 */
  const editedLabel = (ts: number) => {
    if (!ts) return "—";
    const d = new Date(ts);
    const now = new Date();
    const dayKey = (x: Date) =>
      `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
    if (dayKey(d) === dayKey(now)) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes(),
      ).padStart(2, "0")}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (dayKey(d) === dayKey(yesterday)) {
      return t({ id: "Yesterday", message: "昨天" });
    }
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  };

  /** 案件类型标签：发明专利 / 实用新型 */
  const caseKindLabel = (kind: CaseKind) =>
    kind === "invention"
      ? t({ id: "Invention patent", message: "发明专利" })
      : t({ id: "Utility model", message: "实用新型" });

  const removeCase = async (id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteAiSession(id);
    } catch {
      void loadCases();
    }
  };

  /**
   * 四个模块（其余流程步骤都在这四页里面，不再单列入口）：
   * 交底书 → 申请文件四件套 → 审查答复 → 附图线稿。
   */
  const features = [
    {
      href: "/patent/studio",
      icon: FilePen,
      bg: "bg-[#FDECE6]",
      color: "#E2562B",
      title: t({ id: "Feature disclosure", message: "交底书生成" }),
      desc: t({
        id: "Feature disclosure desc",
        message: "从技术资料生成交底书",
      }),
    },
    {
      href: "/patent/application",
      icon: FileText,
      bg: "bg-[#FEF3E2]",
      color: "#DE8A16",
      title: t({ id: "Feature application", message: "申请文件四件套" }),
      desc: t({
        id: "Feature application desc",
        message: "权利要求、说明、摘要、附图",
      }),
    },
    {
      href: "/patent/office-action",
      icon: MessageSquareHeart,
      bg: "bg-[#FDECF2]",
      color: "#D9538A",
      title: t({ id: "Feature office action", message: "审查答复" }),
      desc: t({
        id: "Feature office action desc",
        message: "逐条答复审查意见，出意见陈述",
      }),
    },
    {
      href: "/patent/figures",
      icon: Layers,
      bg: "bg-[#E6F6EF]",
      color: "#2FA35C",
      title: t({ id: "Feature figures", message: "附图 / 线稿" }),
      desc: t({
        id: "Feature figures desc",
        message: "系统框图、流程图与结构示意图",
      }),
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-white px-8 py-7 custom-scrollbar dark:bg-[#0F0F10]">
      <div className="mx-auto w-full max-w-[1240px]">
        {/* 标题区 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#F2703F] to-[#D8411C] text-white shadow-[0_8px_18px_-10px_rgba(216,65,28,0.85)]">
              <Scale className="h-[26px] w-[26px]" strokeWidth={1.9} />
            </span>
            <div>
              <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#1A1A1A] dark:text-white">
                {t({ id: "Patent Workbench", message: "AI 专利工作台" })}
              </h1>
              <p className="mt-1 text-[12.5px] text-[#8A8A8F]">
                {t({
                  id: "Patent workbench subtitle",
                  message: "从技术构思到专利文件，一站式完成",
                })}
              </p>
            </div>
          </div>
          <Link
            href="/patent/studio?new=1"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13.5px] font-medium text-white shadow-[0_6px_14px_-8px_rgba(226,86,43,0.9)] transition hover:brightness-[0.94] active:scale-[0.98]"
            style={{ backgroundColor: ORANGE }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            {t({ id: "New Case", message: "新建案件" })}
          </Link>
        </div>

        {/* 上传技术资料 + 助手卡 */}
        <div className="mb-7 grid gap-4 lg:grid-cols-[1.08fr_1fr]">
          <Link
            href="/patent/studio?new=1"
            className="flex min-h-[142px] flex-col items-center justify-center rounded-xl px-6 py-5 text-center transition hover:brightness-[0.985]"
            style={{ backgroundColor: ORANGE_SOFT }}
          >
            <CloudUpload
              className="h-[26px] w-[26px]"
              strokeWidth={1.7}
              style={{ color: ORANGE }}
            />
            <span className="mt-2 text-[15px] font-semibold leading-tight text-[#1A1A1A]">
              {t({ id: "Upload related files", message: "上传技术资料" })}
            </span>
            <span className="mt-1 text-[12px] text-[#8A8A8F]">
              {t({
                id: "Upload related files hint",
                message: "支持 DOCX、PDF、图片、CAD、纤维等多种格式",
              })}
            </span>
            <span
              className="mt-3 inline-flex items-center rounded-lg px-5 py-1.5 text-[13px] font-medium text-white transition hover:brightness-[0.94]"
              style={{ backgroundColor: ORANGE }}
            >
              {t({ id: "Choose files", message: "选择文件" })}
            </span>
          </Link>

          <aside className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FDF0EA] via-[#FCEAE2] to-[#FBDCD0] px-5 py-5">
            <div className="relative z-10 flex h-full flex-col items-start">
              <h2 className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#241C19]">
                {t({ id: "Assistant greeting before", message: "让" })}{" "}
                <span style={{ color: ORANGE }}>PI</span>{" "}
                {t({ id: "Assistant greeting after", message: "你的专利助手" })}
              </h2>
              <p className="mt-2 text-[12.5px] text-[#A08B84]">
                {t({
                  id: "Assistant card tagline",
                  message: "智能分析 · 专业生命 · 高效飓行",
                })}
              </p>
              <span className="mt-3.5 inline-flex items-center rounded-lg border border-[#F2BBA3] bg-white px-4 py-1.5 text-[13px] font-medium text-[#E2562B]">
                {t({ id: "Learn more", message: "了解更多" })}
              </span>
            </div>
            <AssistantArt />
          </aside>
        </div>

        {/* 核心功能 */}
        <div className="mb-7">
          <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-[#1A1A1A] dark:text-white">
            {t({ id: "Core features", message: "核心功能" })}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {features.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className={cn(
                  "flex h-full flex-col rounded-xl border border-black/[0.06] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition dark:border-white/10 dark:bg-[#171719]",
                  "hover:-translate-y-0.5 hover:border-[#F2BBA3] hover:shadow-[0_2px_6px_rgba(0,0,0,0.04),0_14px_30px_-18px_rgba(226,86,43,0.5)]",
                )}
              >
                <span
                  className={cn(
                    "mb-3 flex h-9 w-9 items-center justify-center rounded-[10px]",
                    f.bg,
                  )}
                >
                  <f.icon
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.8}
                    style={{ color: f.color }}
                  />
                </span>
                <span className="block text-[13px] font-semibold leading-tight text-[#1A1A1A] dark:text-white">
                  {f.title}
                </span>
                <span className="mt-1 block text-[11.5px] leading-snug text-[#9A9AA0]">
                  {f.desc}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 最近案件 */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#1A1A1A] dark:text-white">
              {t({ id: "Recent cases", message: "最近案件" })}
            </h2>
            <Link
              href="/patent/studio"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#E2562B] transition hover:text-[#C64A1E]"
            >
              {t({ id: "All cases", message: "查看全部" })}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-white/10 dark:bg-[#171719]">
            {loadingCases ? (
              <p className="px-4 py-8 text-center text-[13px] text-[#8A8A8F]">
                {t({ id: "Loading cases", message: "正在加载…" })}
              </p>
            ) : cases.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-[#8A8A8F]">
                {t({
                  id: "No cases yet",
                  message: "还没有案件 —— 新建一件就会出现在这里。",
                })}
              </p>
            ) : (
              <ul>
                {cases.map((c) => {
                  const done = c.turns > 0;
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-2.5 last:border-0 dark:border-white/5"
                    >
                      <FileText className="h-[18px] w-[18px] shrink-0 text-[#B4B4BA]" />
                      <Link href={c.href} className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-[#1A1A1A] dark:text-white">
                          {c.title}
                        </span>
                        <span className="block truncate text-[11.5px] text-[#9A9AA0]">
                          {c.kind ? `${caseKindLabel(c.kind)} · ` : ""}
                          {t({ id: "Edited at", message: "最近编辑" })}{" "}
                          {editedLabel(c.updatedAt)}
                        </span>
                      </Link>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-medium",
                          done
                            ? "bg-[#E8F7EE] text-[#28A05A]"
                            : "bg-[#FDF6E3] text-[#C08A19]",
                        )}
                      >
                        {done
                          ? t({ id: "Case done", message: "已完成" })
                          : t({ id: "Case in progress", message: "进行中" })}
                      </span>
                      <Link
                        href={c.href}
                        className={cn(
                          "shrink-0 rounded-md border bg-white px-3 py-1 text-[12px] font-medium transition dark:bg-transparent",
                          done
                            ? "border-black/[0.12] text-[#3A3A3E] hover:border-black/25 dark:border-white/15 dark:text-slate-200"
                            : "border-[#F2BBA3] text-[#E2562B] hover:bg-[#FDF1EC]",
                        )}
                      >
                        {done
                          ? t({ id: "View case", message: "查看" })
                          : t({ id: "Review case", message: "审核处理" })}
                      </Link>
                      <Popover>
                        <PopoverTrigger
                          aria-label={t({
                            id: "More actions",
                            message: "更多操作",
                          })}
                          className="shrink-0 rounded-md p-1 text-[#9A9AA0] transition hover:bg-black/[0.04] hover:text-[#5C5C60] dark:hover:bg-white/5"
                        >
                          <Ellipsis className="h-4 w-4" />
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          className="w-28 p-1 border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#171719]"
                        >
                          <button
                            type="button"
                            onClick={() => void removeCase(c.id)}
                            className="w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] text-[#5C5C60] transition hover:bg-[#FDF1EC] hover:text-[#DC2626] dark:text-slate-300"
                          >
                            {t({ id: "Delete", message: "删除" })}
                          </button>
                        </PopoverContent>
                      </Popover>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 助手卡右侧的粉色装饰：光晕 + 双环主体 + 高光 + 星芒（对图手绘） */
function AssistantArt() {
  return (
    <svg
      viewBox="0 0 200 150"
      aria-hidden
      className="pointer-events-none absolute -right-3 top-[54%] h-[140px] w-[188px] -translate-y-1/2 select-none"
    >
      <defs>
        <radialGradient id="pt-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F3B09A" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#F3B09A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pt-body" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#F9CCB9" />
          <stop offset="48%" stopColor="#F09A7A" />
          <stop offset="100%" stopColor="#E0744E" />
        </linearGradient>
        <linearGradient id="pt-body2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FAD5C5" />
          <stop offset="100%" stopColor="#E88A66" />
        </linearGradient>
      </defs>

      <circle cx="84" cy="82" r="66" fill="url(#pt-glow)" />

      {/* 主体：一大一小两个圆环，像搁在卡面上的粉色眼镜 */}
      <g fill="none" strokeLinecap="round">
        <circle cx="90" cy="84" r="29" stroke="url(#pt-body)" strokeWidth="16" />
        <circle
          cx="143"
          cy="68"
          r="18"
          stroke="url(#pt-body2)"
          strokeWidth="12"
        />
        <path d="M117 76 L127 71" stroke="url(#pt-body)" strokeWidth="10" />
      </g>

      {/* 高光 */}
      <path
        d="M73 64 A 29 29 0 0 1 99 58"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M135 54 A 18 18 0 0 1 152 59"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.35"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* 左下小粉球 + 星芒 */}
      <circle cx="44" cy="104" r="6" fill="#F4B49E" opacity="0.9" />
      <path
        d="M30 66 l2.6 6.4 6.4 2.6 -6.4 2.6 -2.6 6.4 -2.6 -6.4 -6.4 -2.6 6.4 -2.6 z"
        fill="#F2A489"
        opacity="0.85"
      />
    </svg>
  );
}
