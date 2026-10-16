import { Suspense } from "react";
import type { Metadata } from "next";
import { FiguresTask } from "@/components/patent/task/figures-task";

export const metadata: Metadata = {
  title: "附图 / 线稿",
  description:
    "附图 / 线稿：按交底书正文里的编号出系统框图、方法流程图与结构示意图，矢量图可直接进 Word。",
};

/** 页面要读 `?case=` 才能恢复某个案件的会话，静态导出下需要一层 Suspense 边界 */
function FiguresFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0e0e0e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4542F] border-t-transparent" />
    </div>
  );
}

export default function PatentFiguresPage() {
  return (
    <Suspense fallback={<FiguresFallback />}>
      <FiguresTask />
    </Suspense>
  );
}