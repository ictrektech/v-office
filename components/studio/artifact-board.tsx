"use client";

/**
 * 产物看板（申请文件四件套这类「一次要交多份文件」的任务）。
 *
 * 为什么要有这个视图：会话草稿只有一份，而四件套天生要交四份（权利要求书 /
 * 说明书 / 摘要 / 附图）。一份稿子反复覆盖，用户既看不到进度，也不敢在 Word
 * 里改——改了下一份就没了。这里把四份摊开成四张卡，各自状态独立。
 *
 * 与编辑器的衔接：**活动产物**就是编辑器里打开的那份。
 * - 生成某份 → 发一轮指令，AI 落文后把当前稿存成该产物
 * - 在 Word 里打开某份 → 正文灌进会话草稿，走既有的 Collabora 注入（零刷新）
 * - 切换产物前会先把编辑器里的改动存回上一份，避免手改被覆盖
 *
 * 附加产物（如「问题清单」）由栏目侧声明 spec.kind="extra" 排在一行。
 */

import { useMemo, useState } from "react";
import { useExtracted } from "next-intl";
import { Check, FileText, Loader2, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiArtifact } from "@/utils/ai/client";
import { vp } from "./visual-spec";

/** 一份产物的声明（栏目侧从模板产出契约派生） */
export interface ArtifactSpec {
  key: string;
  title: string;
  /** 一句话说明这份文件是什么 */
  hint?: string;
  /** 附加产物（问题清单之类）：小一号，不占主位 */
  kind?: "main" | "extra";
}

export function ArtifactBoard({
  specs,
  artifacts,
  active,
  streaming,
  busyKey,
  onGenerate,
  onPreview,
  onRemove,
  onSaveToDocs,
  /** 预览中的产物正文（markdown）；null = 没在预览 */
  preview,
  onClosePreview,
  extraTitle,
}: {
  specs: ArtifactSpec[];
  artifacts: AiArtifact[];
  /** 当前在编辑器里改的那份 */
  active: string;
  streaming: boolean;
  /** 正在处理的产物 key（生成/打开/保存中的那一张卡） */
  busyKey: string | null;
  onGenerate: (spec: ArtifactSpec) => void;
  /** 预览全文（这两个任务不挂 Word 内核，预览就是唯一的内容视图） */
  onPreview: (spec: ArtifactSpec) => void;
  onRemove: (spec: ArtifactSpec) => void;
  onSaveToDocs: (spec: ArtifactSpec) => void;
  preview: { key: string; title: string; markdown: string } | null;
  onClosePreview: () => void;
  /**
   * `kind: "extra"` 那批产物的分区标题。
   *
   * 「问题清单」是申请文件包的口径；交底包的过程稿（专利点清单 / 查新与区别定位）
   * 塞在同一个标题下就成了错标签，所以标题由栏目侧传入。
   */
  extraTitle?: string;
}) {
  const t = useExtracted();
  const [error, setError] = useState<string | null>(null);

  const byKey = useMemo(() => {
    const map: Record<string, AiArtifact> = {};
    for (const a of artifacts) map[a.key] = a;
    return map;
  }, [artifacts]);

  const main = specs.filter((s) => (s.kind ?? "main") === "main");
  const extra = specs.filter((s) => s.kind === "extra");
  const doneCount = main.filter((s) => byKey[s.key]).length;

  const card = (spec: ArtifactSpec) => {
    const found = byKey[spec.key];
    const isActive = active === spec.key;
    const busy = busyKey === spec.key;
    const isExtra = spec.kind === "extra";
    return (
      <div
        key={spec.key}
        className={cn(
          "flex flex-col rounded-3xl bg-white p-5 ring-1 transition",
          isActive
            ? "ring-2 ring-[#D4542F]/50 shadow-[0_2px_6px_rgba(0,0,0,0.05),0_20px_44px_-26px_rgba(212,84,47,0.45)]"
            : "ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        )}
      >
        <div className="mb-3 flex items-start gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              isExtra ? "bg-[#FFF3E0] text-[#FF9500]" : "bg-[#FDF1EC] text-[#D4542F]",
            )}
          >
            {isExtra ? (
              <TriangleAlert className="h-5.5 w-5.5" strokeWidth={1.9} />
            ) : (
              <FileText className="h-5.5 w-5.5" strokeWidth={1.9} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 text-[17px] font-semibold leading-snug text-[#0F172A] dark:text-white">
              {spec.title}
              {found ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F9EC] px-2 py-0.5 text-[12px] font-semibold text-[#34C759]">
                  <Check className="h-3 w-3" />
                  {t({
                    id: "Artifact ready",
                    message: "已完成",
                  })}
                </span>
              ) : null}
              {isActive ? (
                <span className="rounded-full bg-[#D4542F]/10 px-2 py-0.5 text-[12px] font-semibold text-[#D4542F]">
                  {t({ id: "Editing", message: "编辑中" })}
                </span>
              ) : null}
            </h3>
            {spec.hint ? (
              <p className="mt-0.5 text-[13.5px] leading-snug text-[#6E6E73] dark:text-slate-400">
                {spec.hint}
              </p>
            ) : null}
            <p className="mt-1 text-[13px] text-[#94A3B8]">
              {found
                ? t({
                    id: "Artifact stats",
                    message: "{chars} 字 · {at} 更新",
                    values: {
                      chars: String(found.chars ?? 0),
                      at: new Date((found.updated_at ?? 0) * 1000).toLocaleString(),
                    },
                  })
                : t({ id: "Not drafted yet", message: "还没起草" })}
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onGenerate(spec)}
            disabled={streaming || !!busyKey}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#D4542F] px-3.5 py-2 text-[14px] font-semibold text-white transition hover:bg-[#B8441F] active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {found
              ? t({ id: "Redraft", message: "重新起草" })
              : t({ id: "Draft it", message: "起草这份" })}
          </button>
          {found ? (
            <>
              <button
                type="button"
                onClick={() => onPreview(spec)}
                disabled={!!busyKey}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[14px] font-medium text-[#1C1C1E] ring-1 ring-black/[0.07] transition hover:bg-[#F2F2F7] active:scale-[0.98] disabled:opacity-40 dark:bg-white/10 dark:text-white"
              >
                <FileText className="h-4 w-4" />
                {t({ id: "Preview", message: "预览" })}
              </button>
              <button
                type="button"
                onClick={() => onSaveToDocs(spec)}
                disabled={!!busyKey}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[14px] font-medium text-[#1C1C1E] ring-1 ring-black/[0.07] transition hover:bg-[#F2F2F7] active:scale-[0.98] disabled:opacity-40 dark:bg-white/10 dark:text-white"
              >
                {t({ id: "Save to my documents", message: "保存到我的文档" })}
              </button>
            </>
          ) : null}
          {found ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                onRemove(spec);
              }}
              disabled={!!busyKey}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-[#8E8E93] transition hover:bg-[#F2F2F7] hover:text-[#FF3B30] disabled:opacity-40"
              title={t({ id: "Remove", message: "Remove" })}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-white">
              {t({ id: "Deliverables", message: "Deliverables" })}
            </h2>
            <p className="mt-1 text-[15px] text-[#6E6E73] dark:text-slate-400">
              {t({
                id: "Deliverables hint",
                message:
                  "Draft them one by one — each file is kept on its own, so editing one never touches another.",
              })}
            </p>
          </div>
          <span className={cn(vp.chip, "border-none bg-[#FDF1EC] px-3.5 py-2 text-[14px] font-semibold text-[#D4542F]")}>
            {t({
              id: "N of M deliverables",
              message: "{done} / {total} drafted",
              values: { done: String(doneCount), total: String(main.length) },
            })}
          </span>
        </div>

        {error ? (
          <p className="mb-4 rounded-2xl bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]">{error}</p>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {main.map(card)}
        </div>

        {extra.length ? (
          <>
            <h3 className="mb-3 mt-8 text-[17px] font-semibold text-[#0F172A] dark:text-white">
              {extraTitle ?? t({ id: "Open questions", message: "Open questions" })}
            </h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">{extra.map(card)}</div>
          </>
        ) : null}
      </div>

      {/* 预览：不渲染 HTML，原样按 Markdown 文本展示（AI 产物的安全默认） */}
      {preview ? (
        <div className="absolute inset-0 z-40 flex flex-col bg-[#F2F2F7] dark:bg-[#0B0B0B]">
          <div className="flex shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white/90 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#141414]/90">
            <FileText className="h-5 w-5 text-[#D4542F]" />
            <h3 className="text-[19px] font-semibold text-[#0F172A] dark:text-white">
              {preview.title}
            </h3>
            <button
              type="button"
              onClick={onClosePreview}
              className="ml-auto rounded-full bg-black/[0.05] px-3.5 py-2 text-[14px] font-medium text-[#475569] transition hover:bg-black/[0.08] dark:bg-white/10 dark:text-slate-300"
            >
              {t({ id: "Close", message: "Close" })}
            </button>
          </div>
          <div className="relative flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            <article className="mx-auto w-full max-w-3xl whitespace-pre-wrap rounded-3xl bg-white p-8 text-[15px] leading-[1.9] text-[#1F2937] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:bg-[#141414] dark:text-slate-200 dark:ring-white/10">
              {preview.markdown}
            </article>
          </div>
        </div>
      ) : null}
    </div>
  );
}
