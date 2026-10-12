import type { Metadata } from "next";
import { VisualSpecView } from "@/components/patent/visual-spec-view";

export const metadata: Metadata = {
  title: "专利栏目视觉规范",
  description: "专利栏目视觉规范：色板、圆角、阴影、字阶与组件默认样式。",
};

export default function PatentSpecPage() {
  return <VisualSpecView />;
}
