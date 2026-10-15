"use client";

/**
 * AI 写作工作台——薄壳。
 *
 * 全部机制在 `components/studio/ai-studio.tsx`（与专利撰写室共用的工作台：
 * 打开即 Collabora、AI 零刷新写进活文档、发指令前先落盘回读、上传模板按结构
 * 成文）。这里只负责写作栏目自己的三件事：文种模板解析、栏目文案、图标。
 */

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useExtracted } from "next-intl";
import { PenLine } from "lucide-react";
import { AiStudio, type AiStudioTemplate } from "@/components/studio/ai-studio";
import { getWritingTemplate } from "@/utils/writing/templates";

/**
 * 解析 URL 上的文种模板（`/writing/studio?template=notice`）。
 *
 * 首次渲染就要拿到：它决定会话用哪个文种结构与哪条会话线。写作栏内部用的是
 * 中文文种名（「通知」），这里同时接受中文名，方便从栏内各处直接跳过来。
 */
function resolveTemplate(id: string): AiStudioTemplate | null {
  const tpl = getWritingTemplate(id);
  if (!tpl) return null;
  return {
    id: tpl.id,
    name: tpl.name,
    // 写作栏全部文种共用 writing 技能包；结构差异由模板字段与 prompts 承载
    skill: "writing",
  };
}

export function WritingStudio() {
  const t = useExtracted();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template") || "";
  const template = useMemo(() => resolveTemplate(templateId), [templateId]);

  return (
    <AiStudio
      skill="writing"
      title={template?.name ?? t({ id: "AI Writing", message: "AI Writing" })}
      // 每个文种一条独立会话线，别让「通知」的稿子串到「请示」里
      persistKey={`writing:studio:${template?.id ?? "default"}`}
      template={template}
      pageTitle={t({ id: "AI Writing", message: "AI Writing" })}
      defaultTitle={t({ id: "AI Writing", message: "AI Writing" })}
      subtitle={t({
        id: "Writing studio subtitle",
        message: "Five-stage collaboration — draft, review, revise and finalize, right in the document.",
      })}
      backHref="/writing"
      icon={PenLine}
      nav={[
        {
          href: "/writing",
          label: t({ id: "AI Writing", message: "AI Writing" }),
          active: false,
        },
        {
          href: "/writing/studio",
          label: t({ id: "Writing Studio", message: "Writing Studio" }),
          active: true,
        },
      ]}
    />
  );
}
