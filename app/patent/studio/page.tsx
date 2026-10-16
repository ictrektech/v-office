import { Suspense } from "react";
import type { Metadata } from "next";
import { DisclosureTask } from "@/components/patent/task/disclosure-task";

export const metadata: Metadata = {
  title: "专利交底书",
  description:
    "专利交底书：上传材料或填写要件，AI 挖专利点、做轻量查新，再按国知局口径成文，产出 Markdown 与 Word。",
};

/**
 * 交底页必须知道 `?template=` / `?variant=` 才能挑对类型的字段清单与产出契约，
 * 而静态导出下 `useSearchParams` 需要一层 Suspense 边界（否则构建期直接报错）。
 * 预渲染出来的是这份骨架，客户端接管后立刻换成真实界面。
 */
function DisclosureFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0e0e0e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4542F] border-t-transparent" />
    </div>
  );
}

export default function PatentDisclosurePage() {
  return (
    <Suspense fallback={<DisclosureFallback />}>
      <DisclosureTask />
    </Suspense>
  );
}
