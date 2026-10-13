"use client";

/**
 * AI 专利撰写室（核心）——薄壳。
 *
 * 全部机制在 `components/studio/ai-studio.tsx`（专利与公文写作共用的工作台：
 * 打开即 Collabora、AI 零刷新写进活文档、发指令前先落盘回读）。这里只负责
 * 专利栏目自己的三件事：模板解析（含交底书的类型切换）、栏目顶栏、页面文案。
 */

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExtracted, useLocale } from "next-intl";
import { Scale } from "lucide-react";
import { AiStudio, type AiStudioTemplate } from "@/components/studio/ai-studio";
import {
  getPatentTemplate,
  getTemplateVariants,
  localizeTemplate,
  localizeVariant,
  resolveVariant,
} from "@/utils/patent/templates";
import type { PatentTemplate, PatentTemplateVariant } from "@/utils/patent/types";


/**
 * 把模板解析成工作台要的形状。
 *
 * 必须**在首次渲染**就拿到：它决定会话用哪个技能包（patent-disclosure /
 * patent-application …）与哪条会话线，晚一步就会用错技能建出会话来。所以走
 * `useSearchParams`（路由页包了 Suspense 边界）。
 *
 * 交底书一个入口带三种类型（`?variant=utility`），字段清单与产出契约按类型取，
 * 技能名仍取 skillEntry 的第二段（三种类型同技能，本来就是一条链路）。
 */
function toStudioTemplate(
  tpl: PatentTemplate,
  variant: PatentTemplateVariant | undefined,
  isZh: boolean,
): AiStudioTemplate {
  const fields = variant?.fields ?? tpl.fields;
  const loc = localizeTemplate(tpl, isZh);
  const vloc = variant ? localizeVariant(variant, isZh) : null;
  return {
    id: tpl.id,
    // 界面显示用本地化名；sessionTitle 走英文——它会成为落盘 docx 的文件名，
    // 切到英文界面时不该在 Collabora 里开出一份中文文件名的文档
    name: vloc ? `${loc.name}·${vloc.name}` : loc.name,
    sessionTitle: vloc ? `${loc.name} - ${vloc.name}` : loc.name,
    skill: (variant?.skillEntry || tpl.skillEntry || "").split("/")[1] || "patent-disclosure",
    outline: fields.map((f) => f.label).join("、"),
    /** 产出契约写进上下文：agent 按它决定最后落哪几个文件 */
    outputs: variant?.outputs ?? tpl.outputs,
    /** 类型备注（"结构类方案，产出件号表与结构图"）——让 agent 知道这类长什么样 */
    note: variant?.note,
  };
}

export function PatentStudio() {
  const t = useExtracted();
  const locale = useLocale();
  const isZh = locale.toLowerCase().startsWith("zh");
  const router = useRouter();
  const searchParams = useSearchParams();
  /** 从栏目页点进来的模板（决定技能包与会话线与起手话术） */
  const templateId = searchParams.get("template") || "";
  /** 交底书的专利类型（invention / utility / design），默认发明 */
  const variantId = searchParams.get("variant") || "";
  const tpl = useMemo(() => getPatentTemplate(templateId), [templateId]);
  const variants = useMemo(() => getTemplateVariants(tpl), [tpl]);
  const variant = useMemo(() => resolveVariant(tpl, variantId), [tpl, variantId]);
  const template = useMemo(
    () => (tpl ? toStudioTemplate(tpl, variant, isZh) : null),
    [isZh, tpl, variant],
  );

  /** 换类型 = 换一条会话线（成文结构不同，别让实用新型的稿子串到外观设计里） */
  const switchVariant = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", id);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <AiStudio
      skill={template?.skill ?? "patent-disclosure"}
      title={template?.name ?? t({ id: "Patent disclosure", message: "Patent disclosure" })}
      // 每个模板（+ 类型变体）一条独立会话线
      persistKey={`patent:studio:${template?.id ?? "default"}${variant ? `:${variant.id}` : ""}`}
      template={template}
      variants={variants.map((v) => ({
        id: v.id,
        label: localizeVariant(v, isZh).name,
        note: localizeVariant(v, isZh).note,
      }))}
      activeVariant={variant?.id}
      onVariantChange={switchVariant}
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
          href: "/patent/application",
          label: t({ id: "Application Four-Piece", message: "Application Four-Piece Set" }),
          active: false,
        },
      ]}
    />
  );
}
