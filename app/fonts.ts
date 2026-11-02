import localFont from "next/font/local";

/**
 * 界面西文/数字字体。
 *
 * 之前只写了一套系统字体栈，`ui-rounded` 排在第一位——那是只有 Safari 认的
 * 通用族，Chrome / Windows / Linux 全部跳过，最终落到 Segoe UI 或 Roboto。
 * Roboto 是 Android 的默认字体，这就是「字体太像安卓」的来源。
 *
 * 仓库里本来就有 Inter（assets/，此前只给 OG 图用），这里把它真正接到页面上：
 * 构建期 next/font 会切子集、生成 woff2 并带 size-adjust 回退，数字和西文
 * 立刻变清晰；中文继续交给系统圆体（苹方 / HarmonyOS Sans / MiSans / 雅黑）。
 */
export const uiSans = localFont({
  src: [
    { path: "../assets/Inter_24pt-Regular.ttf", weight: "400", style: "normal" },
    { path: "../assets/Inter_24pt-Medium.ttf", weight: "500", style: "normal" },
    { path: "../assets/Inter_24pt-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../assets/Inter_24pt-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-ui-sans",
  display: "swap",
  // 回退字体不做尺寸微调：中文系统字面本来就和 Inter 不同，强行 size-adjust
  // 反而会让中英混排忽大忽小，看起来更「糊」。
  adjustFontFallback: false,
  fallback: [
    "PingFang SC",
    "HarmonyOS Sans SC",
    "MiSans",
    "Source Han Sans SC",
    "Microsoft YaHei UI",
    "Noto Sans SC",
  ],
});
