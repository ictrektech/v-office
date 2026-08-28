import type { Metadata } from "next";
import { ApiGuideView } from "@/components/main/api-guide-view";

export const metadata: Metadata = {
  title: "API Guide — ZIZIYI Office",
  description: "Use the authenticated ZIZIYI Office document storage API.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ApiGuidePage() {
  return <ApiGuideView />;
}
