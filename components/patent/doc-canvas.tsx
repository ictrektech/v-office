"use client";

import { useExtracted } from "next-intl";
import {
  AlignLeft,
  Bold,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquarePlus,
  Table,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiDraft } from "@/utils/ai/client";
import { vp } from "./visual-spec";

/**
 * 文档画布：渲染**服务端草稿**（真值），不是本地拼的字符串。
 *
 * 交互约定（改稿滑不滑就靠它）：
 * - 点某一段 = 选中它，右侧下一次指令就作用在这一段（编号与补丁契约一致）
 * - 有待确认变更的段落左侧亮琥珀条，先看得到「哪几段会被改」
 * - 点「全文」不选段落，就是整篇重写/续写
 */
export function DocCanvas({
  draft,
  selectedAnchor,
  onSelectBlock,
  pendingAnchors,
  toolbar = true,
  className,
}: {
  draft: AiDraft | null;
  selectedAnchor?: string;
  onSelectBlock: (anchor: string | undefined) => void;
  /** 有未确认变更的段落编号 */
  pendingAnchors?: string[];
  toolbar?: boolean;
  className?: string;
}) {
  const t = useExtracted();
  const blocks = draft?.blocks ?? [];
  const pending = new Set(pendingAnchors ?? []);

  return (
    <div className={cn("flex min-w-0 flex-1 flex-col", className)}>
      {toolbar ? (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[#E7EAF0] px-4 py-2 dark:border-white/10">
          <span className="mr-1 shrink-0 rounded-md bg-[#F5F7FB] px-2 py-1 text-[12px] text-[#475569] dark:bg-white/5 dark:text-slate-300">
            {t({ id: "Heading 2", message: "Heading 2" })}
          </span>
          <span className="mr-2 shrink-0 rounded-md bg-[#F5F7FB] px-2 py-1 text-[12px] text-[#475569] dark:bg-white/5 dark:text-slate-300">
            {t({ id: "Font", message: "Font" })}
          </span>
          {[Bold, Italic, Underline, Link2].map((Icon, i) => (
            <button key={i} type="button" className={vp.iconBtn} title={t({ id: "Draft", message: "Draft" })}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-[#E7EAF0] dark:bg-white/10" />
          {[AlignLeft, List, ListOrdered, Table, Highlighter, MessageSquarePlus].map((Icon, i) => (
            <button key={i} type="button" className={vp.iconBtn}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <span className={cn(vp.meta, "ml-auto hidden shrink-0 text-[11.5px] md:block")}>
            {selectedAnchor
              ? `${t({ id: "Selected clause", message: "Selected clause" })} ${selectedAnchor}`
              : t({
                  id: "Click a clause to target it",
                  message: "Click a clause to target it, or just describe the change",
                })}
          </span>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar md:px-12">
        <div className="mx-auto w-full max-w-[46rem]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h1 className="text-[22px] font-semibold leading-snug tracking-[-0.01em] text-[#0F172A] dark:text-white">
              {draft?.title || t({ id: "Untitled draft", message: "Untitled draft" })}
            </h1>
            {blocks.length ? (
              <span className={cn(vp.chip, "shrink-0")}>
                {t({
                  id: "N blocks",
                  message: "{count} clauses",
                  values: { count: String(blocks.length) },
                })}
              </span>
            ) : null}
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E7EAF0] p-6 text-[13px] leading-relaxed text-[#94A3B8] dark:border-white/10">
              {t({
                id: "Canvas empty hint",
                message:
                  "The draft appears here as the agent writes. Upload materials or describe the invention in the panel on the right — the first version lands automatically.",
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {blocks.map((block) => {
                const isSelected = selectedAnchor === block.anchor;
                const isPending = pending.has(block.anchor) || pending.has("全文");
                return (
                  <section
                    key={block.anchor}
                    onClick={() => onSelectBlock(isSelected ? undefined : block.anchor)}
                    className={cn(
                      "group relative cursor-pointer rounded-xl border-l-[3px] px-3 py-2 transition-colors",
                      isSelected
                        ? "border-l-[#2563EB] bg-[#F7F9FF]"
                        : isPending
                          ? "border-l-[#F59E0B] hover:bg-[#FFFBF3]"
                          : "border-l-transparent hover:bg-[#F9FAFC] dark:hover:bg-white/5",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute -left-9 top-2 hidden w-6 text-right text-[11px] tabular-nums md:block",
                        isSelected ? "text-[#2563EB]" : "text-[#CBD5E1] group-hover:text-[#94A3B8]",
                      )}
                    >
                      {block.anchor}
                    </span>
                    {block.heading ? (
                      <h2 className={cn(vp.docHeading, "mb-1.5")}>{block.heading}</h2>
                    ) : null}
                    {block.text ? (
                      <p className={vp.docText}>{block.text}</p>
                    ) : null}
                    {isPending ? (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10.5px] font-medium text-[#B45309]">
                        {t({ id: "Pending change", message: "Pending change" })}
                      </span>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}

          <p className={cn(vp.meta, "mt-8 text-center")}>
            {t({
              id: "Draft footer note",
              message:
                "Draft produced by the patent skill — verify facts before filing. Saved to My Documents as Markdown.",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
