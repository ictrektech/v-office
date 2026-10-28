import { Suspense } from "react";
import type { Metadata } from "next";
import { CopyrightWorkbench } from "@/components/patent/software-copyright/copyright-workbench";

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
    <div className="flex h-full items-center justify-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C9C9CF] border-t-transparent" />
    </div>
  );
}

export default function PatentCopyrightPage() {
  return (
    <Suspense fallback={<CopyrightFallback />}>
      <CopyrightWorkbench />
    </Suspense>
  );
}
