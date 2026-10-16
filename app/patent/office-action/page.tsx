import { Suspense } from "react";
import type { Metadata } from "next";
import { OfficeActionTask } from "@/components/patent/task/office-action-task";

export const metadata: Metadata = {
  title: "审查答复",
  description:
    "审查答复：上传国知局下发的审查意见通知书，助手逐条拆解缺陷、逐条起草答复，最后汇总成意见陈述书。",
};

/**
 * 这页要用 `useSearchParams` 读 `?case=`（从案件进来时恢复同一条会话），
 * 静态导出下必须包一层 Suspense 边界，否则构建期直接报错。
 */
function OfficeActionFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0e0e0e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2562B] border-t-transparent" />
    </div>
  );
}

export default function PatentOfficeActionPage() {
  return (
    <Suspense fallback={<OfficeActionFallback />}>
      <OfficeActionTask />
    </Suspense>
  );
}
