import { Suspense } from "react";
import type { Metadata } from "next";
import { WritingStudio } from "@/components/writing/writing-studio";

export const metadata: Metadata = {
  title: "AI 写作工作台",
  description:
    "AI 写作工作台：Collabora 编辑器 + AI 对话，按文种模板五阶段协作（起草/审查/推稿/定稿），AI 改动直接落进打开着的文档。",
};

/**
 * 工作台必须知道 `?template=` 才能用对文种结构建会话，而静态导出下
 * `useSearchParams` 需要一层 Suspense 边界（否则构建期直接报错）。
 * 预渲染出来的是这份骨架，客户端接管后立刻换成真实界面。
 */
function StudioFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0e0e0e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
    </div>
  );
}

export default function WritingStudioPage() {
  return (
    <Suspense fallback={<StudioFallback />}>
      <WritingStudio />
    </Suspense>
  );
}
