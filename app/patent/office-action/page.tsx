import type { Metadata } from "next";
import { OfficeActionTask } from "@/components/patent/task/office-action-task";

export const metadata: Metadata = {
  title: "审查意见答复",
  description:
    "审查意见答复：上传审查意见通知书，AI 逐条分析并生成答复意见草稿与意见陈述书。",
};

export default function PatentOfficeActionPage() {
  return <OfficeActionTask />;
}
