import { Suspense } from "react";
import type { Metadata } from "next";
import { CopyrightTask } from "@/components/patent/task/copyright-task";

export const metadata: Metadata = {
  title: "软件著作权",
  description:
    "软件著作权申请资料：上传项目源码包，AI 梳理业务、生成申请表信息、操作手册与前 30 页 / 后 30 页代码材料。",
};

/**
 * 工作台要读 `?case=` 才能恢复「最近案件」里点开的那条会话，而静态导出下
 * `useSearchParams` 需要一层 Suspense 边界（否则构建期直接报错）。
 */
function CopyrightFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0e0e0e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2562B] border-t-transparent" />
    </div>
  );
}

export default function PatentCopyrightPage() {
  return (
    <Suspense fallback={<CopyrightFallback />}>
      <CopyrightTask />
    </Suspense>
  );
}
