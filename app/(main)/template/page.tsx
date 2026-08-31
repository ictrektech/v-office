import type { Metadata } from "next";
import { TemplateView } from "@/components/main/template-view";
import { getTemplates } from "@/utils/templates";

const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
const templateUrl = publicSiteUrl ? `${publicSiteUrl}/template` : undefined;

export const metadata: Metadata = {
  title:
    "Free Office Templates — Word, Excel & PowerPoint | V-Office",
  description:
    "Download free professional templates for Word documents, Excel spreadsheets, and PowerPoint presentations. No login required — open and edit directly in your browser.",
  keywords: [
    "free office templates",
    "free Word template",
    "free Excel template",
    "free PowerPoint template",
    "resume template free",
    "spreadsheet template free",
    "presentation template free",
    "document template online",
    "V-Office",
  ],
  ...(templateUrl ? { alternates: { canonical: templateUrl } } : {}),
  openGraph: {
    title: "Free Office Templates — Word, Excel & PowerPoint | V-Office",
    description:
      "Free professional templates for Word, Excel, and PowerPoint. Edit directly in your browser — no login needed.",
    ...(templateUrl ? { url: templateUrl } : {}),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Office Templates — Word, Excel & PowerPoint | V-Office",
    description:
      "Free professional templates for Word, Excel, and PowerPoint. Edit directly in your browser.",
  },
};

export default function TemplatePage() {
  const templates = getTemplates();
  return <TemplateView initialTemplates={templates} />;
}
