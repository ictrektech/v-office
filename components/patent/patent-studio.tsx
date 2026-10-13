"use client";

/**
 * AI 专利撰写室（核心）——薄壳。
 *
 * 全部机制在 `components/studio/ai-studio.tsx`（专利与公文写作共用的工作台：
 * 打开即 Collabora、AI 零刷新写进活文档、发指令前先落盘回读）。这里只负责
 * 专利栏目自己的三件事：模板解析、栏目顶栏、页面文案。
 */

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useExtracted } from "next-intl";
import { Scale } from "lucide-react";
import { AiStudio, type AiStudioTemplate } from "@/components/studio/ai-studio";
import { getPatentTemplate } from "@/utils/patent/templates";

/**
 * 解析 URL 上的模板（`/patent/studio?template=disclosure-invention`）。
 *
 * 必须**在首次渲染**就拿到：它决定会话用哪个技能包（patent-application /
 * patent-oa …）与哪条会话线，晚一步就会用错技能建出会话来。所以走
 * `useSearchParams`（路由页包了 Suspense 边界）。
 */
function resolveTemplate(id: string): AiStudioTemplate | null {
  const tpl = id ? getPatentTemplate(id) : undefined;
  if (!tpl) return null;
  return {
    id: tpl.id,
    name: tpl.name,
    skill: (tpl.skillEntry || "").split("/")[1] || "patent-disclosure",
    outline: (tpl.fields ?? []).map((f) => f.label).join("、"),
  };
}

export function PatentStudio() {
  const t = useExtracted();
  const searchParams = useSearchParams();
  /** 从栏目页点进来的模板（决定技能包、会话线与起手话术） */
  const templateId = searchParams.get("template") || "";
  const template = useMemo(() => resolveTemplate(templateId), [templateId]);

  return (
    <AiStudio
      skill={template?.skill ?? "patent-disclosure"}
      title={template?.name ?? t({ id: "Patent disclosure", message: "Patent disclosure" })}
      // 每个模板一条独立会话线，别让「发明交底书」的稿子串到「审查意见答复」里
      persistKey={`patent:studio:${template?.id ?? "default"}`}
      template={template}
      pageTitle={t({ id: "AI Patent Studio", message: "AI Patent Studio" })}
      defaultTitle={t({ id: "Patent disclosure", message: "Patent disclosure" })}
      subtitle={t({
        id: "Studio subtitle",
        message: "Mine, search and draft — the patent skill drives every stage.",
      })}
      backHref="/patent"
      icon={Scale}
      // 专利撰写对话要看得清权利要求全文，面板比公文写作那边宽一档
      panelWidth="w-[32rem]"
      nav={[
        {
          href: "/patent/studio",
          label: t({ id: "Patent Studio", message: "Patent Studio" }),
          active: true,
        },
        {
          href: "/patent/review",
          label: t({ id: "Document Review", message: "Document Review" }),
          active: false,
        },
        {
          href: "/patent/spec",
          label: t({ id: "Visual Spec", message: "Visual Spec" }),
          active: false,
        },
      ]}
    />
  );
}
