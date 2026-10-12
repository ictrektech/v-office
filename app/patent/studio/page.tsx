import { Suspense } from "react";
import type { Metadata } from "next";
import { PatentStudio } from "@/components/patent/patent-studio";

export const metadata: Metadata = {
  title: "AI 专利撰写室",
  description:
    "AI 专利撰写室：材料扫描、专利点挖掘、轻量查新与交底书成文，改动逐条确认后落文。",
};

/**
 * 撰写室必须知道 `?template=` 才能用对技能包建会话，而静态导出下
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

export default function PatentStudioPage() {
  return (
    <Suspense fallback={<StudioFallback />}>
      <PatentStudio />
    </Suspense>
  );
}
