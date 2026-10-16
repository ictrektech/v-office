/**
 * 专利栏目主题令牌（单一事实源）。
 *
 * 数值与首页 `patent-home.tsx` 对齐：主橙 `#E2562B`、浅粉底 `#FBF2EE`、
 * 卡片 `rounded-xl` + 单层浅阴影。专利各页（首页 / 交底书 / 四件套 / 图纸）
 * 只引这里的 `pt`，避免各页各写一套 `text-[#...]`。
 */

/** 品牌主橙与浅底（与首页同一组值） */
export const ORANGE = "#E2562B";
export const ORANGE_HOVER = "#C64A1E";
export const ORANGE_SOFT = "#FBF2EE";

/** 组合类名：页面只引这里，避免各页各写一套 `text-[#...]` */
export const pt = {
  /** 栏目外壳：浅灰底 + 深色跟随主题 */
  shell:
    "h-screen overflow-hidden bg-[#F6F6F7] text-[#1A1A1A] antialiased dark:bg-[#0F0F10] dark:text-white",

  /** 主卡片 */
  card:
    "rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-white/10 dark:bg-[#171719]",

  /** 次级卡片（卡内小卡、统计格） */
  subCard:
    "rounded-xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:border-white/8 dark:bg-white/[0.03]",

  /** 可点击卡片的悬浮态 */
  hoverable:
    "transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F2BBA3] hover:shadow-[0_2px_6px_rgba(0,0,0,0.04),0_14px_30px_-18px_rgba(226,86,43,0.45)]",

  /** 主按钮：橙红实心 */
  btnPrimary:
    "inline-flex items-center gap-1.5 rounded-lg bg-[#E2562B] px-4 py-2.5 text-[13.5px] font-medium text-white shadow-[0_6px_14px_-8px_rgba(226,86,43,0.9)] transition hover:bg-[#C64A1E] active:scale-[0.98]",

  /** 次按钮：白底描边 */
  btnGhost:
    "inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3.5 py-2 text-[13px] font-medium text-[#3C3C40] transition hover:border-[#F2BBA3] hover:text-[#E2562B] active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-300",

  /** 纯文字按钮 */
  btnText:
    "inline-flex items-center gap-1 text-[13px] font-medium text-[#E2562B] transition hover:text-[#C64A1E]",

  /** 大上传区：橙红虚线 + 浅橙底（暗色下换深棕底，避免大片亮粉刺眼） */
  dropzone:
    "group flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#F2BBA3] bg-[#FBF2EE] px-6 py-7 text-center transition hover:border-[#E2562B] hover:bg-[#F8E7DF] dark:border-[#7A3B22] dark:bg-[#1E1512] dark:hover:bg-[#251916]",

  /** 状态标签 */
  chip:
    "inline-flex items-center gap-1 rounded-md border border-black/[0.06] bg-white px-2 py-0.5 text-[12px] text-[#5C5C60] dark:border-white/10 dark:bg-white/5 dark:text-slate-300",

  /** 输入框 / 文本域 */
  input:
    "w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-[14.5px] leading-relaxed text-[#1A1A1A] outline-none transition placeholder:text-[#9A9AA0] focus:border-[#F2BBA3] focus:ring-4 focus:ring-[#E2562B]/10 dark:border-white/10 dark:bg-white/5 dark:text-white",

  /** 区块标题 */
  sectionTitle:
    "text-[15px] font-semibold tracking-[-0.01em] text-[#1A1A1A] dark:text-white",

  /** 卡片内小标题（带下边框的条） */
  cardHead:
    "flex items-center gap-2 border-b border-black/[0.05] px-4 py-3 text-[14px] font-semibold text-[#1A1A1A] dark:border-white/5 dark:text-white",

  /** 说明文本 */
  meta: "text-[12.5px] text-[#9A9AA0]",

  /** 正文 */
  body: "text-[14px] leading-relaxed text-[#5C5C60] dark:text-slate-300",
} as const;
