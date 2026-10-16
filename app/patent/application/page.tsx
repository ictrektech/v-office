import { Suspense } from "react";
import type { Metadata } from "next";
import { ApplicationTask } from "@/components/patent/task/application-task";

export const metadata: Metadata = {
  title: "申请文件四件套",
  description:
    "申请文件四件套：填写专利基本信息与上传技术交底，AI 逐份生成说明书、权利要求书、摘要与附图。",
};

/**
 * 工作台要读 `?case=` 才能恢复「最近案件」里点开的那条会话，而静态导出下
 * `useSearchParams` 需要一层 Suspense 边界（否则构建期直接报错）。
 */
function ApplicationFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0e0e0e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#34C759] border-t-transparent" />
    </div>
  );
}

export default function PatentApplicationPage() {
  return (
    <Suspense fallback={<ApplicationFallback />}>
      <ApplicationTask />
    </Suspense>
  );
}