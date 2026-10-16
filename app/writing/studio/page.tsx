import { Suspense } from "react";
import type { Metadata } from "next";
import { WritingTask } from "@/components/writing/task/writing-task";

export const metadata: Metadata = {
  title: "公文写作",
  description:
    "公文写作：选文种、填要件、上传素材，AI 按五阶段协作成文并自查，产出 Markdown 与 Word。",
};

/**
 * 工作台必须知道 `?template=` 才能用对文种结构建会话，而静态导出下
 * `useSearchParams` 需要一层 Suspense 边界（否则构建期直接报错）。
 * 预渲染出来的是这份骨架，客户端接管后立刻换成真实界面。
 */
function WritingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0e0e0e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1D1D1F] border-t-transparent" />
    </div>
  );
}

export default function WritingStudioPage() {
  return (
    <Suspense fallback={<WritingFallback />}>
      <WritingTask />
    </Suspense>
  );
}