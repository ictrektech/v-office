import type { Metadata } from "next";
import { PatentReview } from "@/components/patent/patent-review";

export const metadata: Metadata = {
  title: "申请文件审阅",
  description:
    "申请文件审阅：权要与说明书对照交底逐条核查，行内标注与批注栏联动（骨架）。",
};

export default function PatentReviewPage() {
  return <PatentReview />;
}
