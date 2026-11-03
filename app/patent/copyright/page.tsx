"use client";

/**
 * 旧入口：软著已并入专利工作台（第 5 个任务）。
 *
 * 这个路由只做跳转，保留它是为了不让用户收藏夹 / 历史记录里的旧链接失效：
 * `/patent/copyright?case=xxx` → `/patent?mode=copyright&case=xxx`。
 * 静态导出下没有服务端 redirect，所以用客户端 replace（不进浏览历史）。
 */

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectToWorkbench() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const query = new URLSearchParams({ mode: "copyright" });
    const caseId = params.get("case");
    if (caseId) query.set("case", caseId);
    router.replace(`/patent?${query.toString()}`);
  }, [params, router]);

  return (
    <div className="flex h-full items-center justify-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C9C9CF] border-t-transparent" />
    </div>
  );
}

export default function LegacyCopyrightPage() {
  return (
    <Suspense fallback={<div className="h-full bg-white" />}>
      <RedirectToWorkbench />
    </Suspense>
  );
}
