import type { Metadata } from "next";
import { PatentHome } from "@/components/patent/patent-home";

export const metadata: Metadata = {
  title: "专利工作台",
  description:
    "专利工作台：AI 专利撰写室与申请文件审阅，按独立模板推进交底、查新、成文与核查。",
};

export default function PatentPage() {
  return <PatentHome />;
}
