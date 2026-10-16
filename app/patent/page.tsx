import type { Metadata } from "next";
import { PatentHome } from "@/components/patent/patent-home";

export const metadata: Metadata = {
  title: "AI 专利工作室",
  description:
    "AI 专利工作室：上传材料或粘贴专利文本，挖专利点、查新、成文交底书，并转成申请文件四件套。",
};

export default function PatentPage() {
  return <PatentHome />;
}