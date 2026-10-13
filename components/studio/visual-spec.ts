/**
 * 专利栏目视觉规范（单一事实源）。
 *
 * 依据设计稿（浅色、卡片化、蓝调强调、柔和阴影）抽取成一组令牌与
 * 组合类名，页面只引用这里，避免各页各写一套 `text-[#...]`。
 * 令牌同时被 `app/patent/spec/page.tsx` 渲染成可查看的规范页。
 */

/** 基础色板 */
export const VP_COLORS = {
  /** 强调色（主操作、选中态、数据条）——iOS 系统蓝，比网页蓝更圆润耐看 */
  accent: "#007AFF",
  /** 强调色浅底（选中行、标签底） */
  accentSoft: "#EAF4FF",
  /** 语义色 */
  success: "#16A34A",
  successSoft: "#ECFDF3",
  warning: "#D97706",
  warningSoft: "#FFF7ED",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  /** 文本 */
  ink: "#0F172A",
  inkMid: "#475569",
  inkSoft: "#94A3B8",
  /** 线与底 */
  line: "#E7EAF0",
  canvas: "#F5F7FB",
  surface: "#FFFFFF",
} as const;

/** 语义色对应的浅底（审阅严重度、状态标签复用） */
export const VP_SEVERITY = {
  high: { text: "text-[#DC2626]", bg: "bg-[#FEF2F2]", dot: "bg-[#DC2626]" },
  mid: { text: "text-[#D97706]", bg: "bg-[#FFF7ED]", dot: "bg-[#D97706]" },
  low: { text: "text-[#2563EB]", bg: "bg-[#EFF4FF]", dot: "bg-[#2563EB]" },
} as const;

/**
 * 组合类名。用 tailwind-merge 与页面自己的类名合并时，
 * 后写的覆盖前面的，所以这里只放「默认值」，布局交给页面。
 */
export const vp = {
  /** 全屏工作台外壳：浅色渐变底，深色跟随主题 */
  shell:
    "h-screen overflow-hidden bg-[#F2F2F7] text-[#0F172A] antialiased dark:bg-[#0B0B0B] dark:text-white",

  /** 顶级卡片（大面板、列表卡）——iOS 的大圆角 + 极轻投影 */
  card:
    "rounded-3xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-18px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#141414]",

  /** 次级卡片（卡内小卡、统计格） */
  subCard:
    "rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-white/8 dark:bg-white/[0.03]",

  /** 悬浮态（可点击卡片/行） */
  hoverable:
    "transition-all duration-200 hover:-translate-y-0.5 hover:border-[#CFE3FF] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_40px_-20px_rgba(0,122,255,0.35)]",

  /** 主按钮 */
  btnPrimary:
    "inline-flex items-center gap-1.5 rounded-2xl bg-[#007AFF] px-4 py-2.5 text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_20px_-12px_rgba(0,122,255,0.9)] transition hover:bg-[#0062CC] active:scale-[0.98]",

  /** 次按钮 */
  btnGhost:
    "inline-flex items-center gap-1.5 rounded-2xl border border-black/[0.06] bg-white px-4 py-2.5 text-[15px] font-medium text-[#475569] transition hover:border-[#CFE3FF] hover:text-[#0F172A] active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-300",

  /** 纯文字按钮 */
  btnText:
    "inline-flex items-center gap-1 text-[14px] text-[#64748B] transition hover:text-[#007AFF]",

  /** 分割胶囊（Tab / 分段控件）容器 —— iOS 的 segmented control */
  segGroup:
    "inline-flex items-center gap-1 rounded-full border border-black/[0.05] bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/5",

  /** 分割胶囊选中态 / 未选中态 */
  segOn:
    "rounded-full bg-white px-4 py-2 text-[14px] font-medium text-[#0F172A] shadow-[0_1px_3px_rgba(0,0,0,0.10)]",
  segOff:
    "rounded-full px-4 py-2 text-[14px] font-medium text-[#64748B] transition hover:text-[#0F172A]",

  /** 状态标签 */
  chip:
    "inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[13px] text-[#475569] dark:border-white/10 dark:bg-white/5 dark:text-slate-300",

  /** 输入框 / 底栏输入区 —— 字号跟着面板正文走，不再是「小一号」的观感 */
  input:
    "w-full rounded-2xl border border-black/[0.07] bg-white px-4 py-3 text-[15px] leading-relaxed text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#9CC9FF] focus:ring-4 focus:ring-[#007AFF]/10 dark:border-white/10 dark:bg-white/5 dark:text-white",

  /** 图标按钮 */
  iconBtn:
    "inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B] transition hover:bg-black/[0.04] hover:text-[#0F172A] dark:hover:bg-white/10 dark:hover:text-white",

  /** 正文段落（文档画布） */
  docText: "text-[15px] leading-[1.95] text-[#1F2937] dark:text-slate-200",
  docHeading: "text-[16.5px] font-semibold text-[#0F172A] dark:text-white",

  /** 字阶 */
  h1: "text-[21px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-white",
  h2: "text-[17px] font-semibold text-[#0F172A] dark:text-white",
  label:
    "text-[12.5px] font-medium uppercase tracking-[0.08em] text-[#94A3B8]",
  meta: "text-[13.5px] text-[#94A3B8]",
  body: "text-[14.5px] leading-relaxed text-[#475569] dark:text-slate-300",
} as const;

/** 规范页要展示的分组（避免规范页自己维护一份清单） */
export const VP_SPEC_GROUPS = [
  {
    title: "色板",
    items: [
      { name: "accent", value: VP_COLORS.accent, desc: "主操作 / 选中 / 数据强调" },
      { name: "accentSoft", value: VP_COLORS.accentSoft, desc: "强调色浅底" },
      { name: "success", value: VP_COLORS.success, desc: "通过 / 已完成" },
      { name: "warning", value: VP_COLORS.warning, desc: "待确认 / 中风险" },
      { name: "danger", value: VP_COLORS.danger, desc: "高风险 / 驳回" },
      { name: "ink", value: VP_COLORS.ink, desc: "主文本" },
      { name: "inkMid", value: VP_COLORS.inkMid, desc: "次文本" },
      { name: "inkSoft", value: VP_COLORS.inkSoft, desc: "占位 / 说明" },
      { name: "line", value: VP_COLORS.line, desc: "描边" },
      { name: "canvas", value: VP_COLORS.canvas, desc: "页面底色" },
    ],
  },
] as const;
