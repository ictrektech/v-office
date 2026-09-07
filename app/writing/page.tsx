import type { Metadata } from "next";
import { WritingView } from "@/components/writing/writing-view";

export const metadata: Metadata = {
  title: "AI 公文写作",
  description: "上传政策材料，AI 五阶段协作起草、审查、推稿、定稿公文，支持导出 Word / PDF / Excel。",
};

export default function WritingPage() {
  return <WritingView />;
}
