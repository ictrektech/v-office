import type { Metadata } from "next";
import { ApplicationTask } from "@/components/patent/task/application-task";

export const metadata: Metadata = {
  title: "申请文件四件套",
  description:
    "申请文件四件套：填写专利基本信息与上传技术交底，AI 逐份生成说明书、权利要求书、摘要与附图。",
};

export default function PatentApplicationPage() {
  return <ApplicationTask />;
}
