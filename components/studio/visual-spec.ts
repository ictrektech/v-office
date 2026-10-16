/**
 * 工作台视觉规范（单一事实源）。
 *
 * 主色与全局主题对齐：`app/globals.css` 的 `--primary: hsl(12 65% 50%)` ≈ `#D4542F`
 * 橙红。此前这套规范是 iOS 系统蓝（#007AFF），嵌在专利/写作工作台里与左栏、
 * 全局按钮对不上，已全部换回橙红。页面只引用这里，避免各页各写一套 `text-[#...]`。
 */

/** 基础色板 */
export const VP_COLORS = {
  /** 强调色（主操作、选中态、数据条）——与全局 --primary 同值 */
  accent: "#D4542F",
  /** 强调色深一档（hover） */
  accentDark: "#B8441F",
  /** 强调色浅底（选中行、标签底） */
  accentSoft: "#FDF1EC",
  /** 强调色描边（虚线框、focus 环） */
  accentBorder: "#F3C3AC",
  /** 语义色 */
  success: "#16A34A",
  successSoft: "#ECFDF3",
  warning: "#D97706",
  warningSoft: "#FFF7ED",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  /** 文本 */
  ink: "#1A1A1A",
  inkMid: "#5C5C60",
  inkSoft: "#9A9AA0",
  /** 线与底 */
  line: "#ECECEE",
  canvas: "#F6F6F7",
  surface: "#FFFFFF",
} as const;

/** 语义色对应的浅底（审阅严重度、状态标签复用） */
export const VP_SEVERITY = {
  high: { text: "text-[#DC2626]", bg: "bg-[#FEF2F2]", dot: "bg-[#DC2626]" },
  mid: { text: "text-[#D97706]", bg: "bg-[#FFF7ED]", dot: "bg-[#D97706]" },
  low: { text: "text-[#D4542F]", bg: "bg-[#FDF1EC]", dot: "bg-[#D4542F]" },
} as const;

/**
 * 组合类名。用 tailwind-merge 与页面自己的类名合并时，
 * 后写的覆盖前面的，所以这里只放「默认值」，布局交给页面。
 */
export const vp = {
  /** 全屏工作台外壳：浅灰底，深色跟随主题 */
  shell:
    "h-screen overflow-hidden bg-[#F6F6F7] text-[#1A1A1A] antialiased dark:bg-[#0F0F10] dark:text-white",

  /** 顶级卡片（大面板、列表卡） */
  card:
    "rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-18px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#141414]",

  /** 次级卡片（卡内小卡、统计格） */
  subCard:
    "rounded-xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-white/8 dark:bg-white/[0.03]",

  /** 悬浮态（可点击卡片/行） */
  hoverable:
    "transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F3C3AC] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_40px_-20px_rgba(212,84,47,0.35)]",

  /** 主按钮：橙红实心 */
  btnPrimary:
    "inline-flex items-center gap-1.5 rounded-xl bg-[#D4542F] px-4 py-2.5 text-[14.5px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_20px_-12px_rgba(212,84,47,0.9)] transition hover:bg-[#B8441F] active:scale-[0.98]",

  /** 次按钮：白底描边 */
  btnGhost:
    "inline-flex items-center gap-1.5 rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-[14.5px] font-medium text-[#5C5C60] transition hover:border-[#F3C3AC] hover:text-[#1A1A1A] active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-300",

  /** 纯文字按钮 */
  btnText:
    "inline-flex items-center gap-1 text-[14px] text-[#9A9AA0] transition hover:text-[#D4542F]",

  /** 分割胶囊（Tab / 分段控件）容器 */
  segGroup:
    "inline-flex items-center gap-1 rounded-full border border-black/[0.05] bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/5",

  /** 分割胶囊选中态 / 未选中态 */
  segOn:
    "rounded-full bg-white px-4 py-2 text-[14px] font-medium text-[#1A1A1A] shadow-[0_1px_3px_rgba(0,0,0,0.10)] dark:text-white",
  segOff:
    "rounded-full px-4 py-2 text-[14px] font-medium text-[#9A9AA0] transition hover:text-[#1A1A1A] dark:hover:text-white",

  /** 状态标签 */
  chip:
    "inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[13px] text-[#5C5C60] dark:border-white/10 dark:bg-white/5 dark:text-slate-300",

  /** 输入框 / 底栏输入区 */
  input:
    "w-full rounded-xl border border-black/[0.07] bg-white px-4 py-3 text-[14.5px] leading-relaxed text-[#1A1A1A] outline-none transition placeholder:text-[#9A9AA0] focus:border-[#E9A78C] focus:ring-4 focus:ring-[#D4542F]/10 dark:border-white/10 dark:bg-white/5 dark:text-white",

  /** 图标按钮 */
  iconBtn:
    "inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#5C5C60] transition hover:bg-black/[0.04] hover:text-[#1A1A1A] dark:hover:bg-white/10 dark:hover:text-white",

  /** 正文段落（文档画布） */
  docText: "text-[15px] leading-[1.95] text-[#1F2937] dark:text-slate-200",
  docHeading: "text-[16.5px] font-semibold text-[#1A1A1A] dark:text-white",

  /** 字阶 */
  h1: "text-[21px] font-semibold tracking-[-0.01em] text-[#1A1A1A] dark:text-white",
  h2: "text-[17px] font-semibold text-[#1A1A1A] dark:text-white",
  label:
    "text-[12.5px] font-medium uppercase tracking-[0.08em] text-[#9A9AA0]",
  meta: "text-[13.5px] text-[#9A9AA0]",
  body: "text-[14.5px] leading-relaxed text-[#5C5C60] dark:text-slate-300",
} as const;
