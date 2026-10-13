"use client";

/**
 * 审查意见答复 —— 表单驱动的工作台（**不挂 Collabora**）。
 *
 * 这个任务的形态是「把审查意见交上去 → 逐条分析 → 出答复稿」，用户要看到的是
 * **每条意见的处理状态**，不是一个 Word 文档。所以主视图是产物看板
 * （分析报告 / 答复草稿 / 意见陈述书 / 待确认问题），右侧是对话面板。
 */

import { useRef, useState } from "react";
import {
  CircleHelp,
  FileText,
  Info,
  Lightbulb,
  ScanSearch,
  Upload,
  X,
} from "lucide-react";
import { useAiChat } from "@/hooks/use-ai-chat";
import { usePageTitle } from "@/hooks/use-page-title";
import { useExtracted } from "next-intl";
import type { ArtifactSpec } from "@/components/studio/artifact-board";
import {
  AsideCard,
  Field,
  FormSection,
  TaskShell,
  inputClass,
  type TaskStep,
} from "./task-shell";
import { TaskWorkbench } from "./task-workbench";

const ACCENT = "#007AFF";





export function OfficeActionTask() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"form" | "work">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicationNo, setApplicationNo] = useState("");
  const [title, setTitle] = useState("");
  const [applicant, setApplicant] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const t = useExtracted();
  usePageTitle(t({ id: "Office action title", message: "Office Action Reply" }));

  const chat = useAiChat({ skill: "patent-oa", title: "Office Action Reply" });

  /** 文案必须在组件内取：模块级常量里不能调 t()（翻译依赖 React 上下文） */
  const steps: TaskStep[] = [
    { key: "info", label: t({ id: "Step fill in", message: "Fill in" }), hint: t({ id: "Step oa fill hint", message: "Upload the office action" }) },
    { key: "analyze", label: t({ id: "Step analyze", message: "Analyse" }), hint: t({ id: "Step analyze hint", message: "AI reads every objection" }) },
    { key: "reply", label: t({ id: "Step reply", message: "Reply" }), hint: t({ id: "Step reply hint", message: "Draft the responses" }) },
    { key: "export", label: t({ id: "Step export", message: "Export" }), hint: t({ id: "Step export oa hint", message: "File it as Word" }) },
  ];

  const planned = [
    { icon: ScanSearch, title: t({ id: "Artifact analysis", message: "Analysis report" }), desc: t({ id: "Planned analysis desc", message: "Every objection, its clause and its risk" }) },
    { icon: FileText, title: t({ id: "Artifact reply draft", message: "Reply draft" }), desc: t({ id: "Planned reply draft desc", message: "Point-by-point replies with the amended claims" }) },
    { icon: FileText, title: t({ id: "Artifact statement", message: "Statement" }), desc: t({ id: "Planned statement desc", message: "Formatted and ready to file" }) },
    { icon: FileText, title: t({ id: "Planned word doc", message: "Word document" }), desc: t({ id: "Planned word doc desc", message: "Formatted for further editing" }) },
  ];

  const specs: ArtifactSpec[] = [
    { key: "analysis", title: t({ id: "Artifact analysis", message: "Analysis report" }), hint: t({ id: "Artifact analysis hint", message: "Every objection, the clause and its risk level" }) },
    { key: "draft", title: t({ id: "Artifact reply draft", message: "Reply draft" }), hint: t({ id: "Artifact reply draft hint", message: "Point-by-point replies citing the amended claims" }) },
    { key: "statement", title: t({ id: "Artifact statement", message: "Statement" }), hint: t({ id: "Artifact statement hint", message: "The full reply in a filing-ready format" }) },
    { key: "issues", title: t({ id: "Artifact issues", message: "Open questions" }), hint: t({ id: "Artifact oa issues hint", message: "Facts the inventor must confirm first" }), kind: "extra" as const },
  ];

  const ready = applicationNo.trim().length > 0 && title.trim().length > 0 && files.length > 0;

  const startWork = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const brief = [
        `专利申请号：${applicationNo.trim()}`,
        `发明名称：${title.trim()}`,
        `申请人：${applicant.trim() || "（未填）"}`,
        note.trim() ? `其他说明：${note.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      await chat.upload(new File([brief], "申请信息.md", { type: "text/markdown" }));
      for (const f of files) {
        try {
          await chat.upload(f);
        } catch (err) {
          setError(`${f.name}：${String(err)}`);
        }
      }
      setStep("work");
      await chat.send(
        "对照刚上传的审查意见通知书逐条分析：每条意见列出审查员说法、涉及条款、" +
          "本答复的风险等级（高/中/低）和建议的答复或修改方向。" +
          "这一轮只输出《意见分析报告》的全文，用 <final-doc> 包裹。",
      );
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  };

  const generate = async (spec: ArtifactSpec) => {
    await chat.send(
      `继续产出「${spec.title}」。${spec.hint ?? ""}` +
        `只输出这一份文件的全文，用 <final-doc> 包裹；不要重复已产出的其他几份。`,
    );
    await chat.saveArtifactFromDraft(spec.key, spec.title);
  };

  const aside = (
    <>
      <AsideCard icon={ScanSearch} title={t({ id: "Planned outputs title", message: "What gets generated" })}>
        <ul className="space-y-3">
          {planned.map((p) => (
            <li key={p.title} className="flex items-start gap-2.5">
              <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
              <span className="min-w-0">
                <span className="block text-[14.5px] font-medium text-[#0F172A] dark:text-white">
                  {p.title}
                </span>
                <span className="block text-[13px] leading-snug text-[#6E6E73] dark:text-slate-400">
                  {p.desc}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </AsideCard>

      <AsideCard icon={Info} title={t({ id: "Usage title", message: "How it works" })}>
        <ol className="space-y-2 text-[13.5px] leading-relaxed text-[#6E6E73] dark:text-slate-400">
          <li>1. 上传审查意见通知书或相关文档</li>
          <li>2. AI 分析每条审查意见并提取风险点</li>
          <li>3. 生成答复意见草稿或意见陈述书</li>
          <li>4. 导出 Word 文件下载后递交</li>
        </ol>
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#F2F2F7] px-3 py-2.5 text-[13px] leading-relaxed text-[#6E6E73] dark:bg-white/5 dark:text-slate-400">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
          {t({ id: "Tip oa", message: "Upload the office action together with anything the reply depends on." })}
        </p>
      </AsideCard>
    </>
  );

  return (
    <TaskShell
      accent={ACCENT}
      badge={t({ id: "Office action badge", message: "Examination stage" })}
      title={t({ id: "Office action title", message: "Office Action Reply" })}
      subtitle={t({ id: "Office action subtitle", message: "Read the office action, draft the replies, and export a Word statement ready to file." })}
      icon={ScanSearch}
      steps={steps}
      activeStep={step === "form" ? 0 : 3}
      backHref="/patent"
      backLabel={t({ id: "Back", message: "Back" })}
      assistantLabel={t({ id: "AI assistant", message: "AI assistant" })}
      aside={step === "form" ? aside : undefined}
    >
      {step === "form" ? (
        <div>
          <FormSection index={1} title={t({ id: "Section oa application", message: "Application" })}>
            <Field label={t({ id: "Field application no", message: "Application number" })} required>
              <input
                className={inputClass()}
                value={applicationNo}
                placeholder={t({ id: "Placeholder application no", message: "e.g. CN202410123456.7" })}
                onChange={(e) => setApplicationNo(e.target.value)}
              />
            </Field>
            <Field label={t({ id: "Field title", message: "Title" })} required>
              <input
                className={inputClass()}
                value={title}
                placeholder={t({ id: "Placeholder title field", message: "Title of the invention" })}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label={t({ id: "Field applicant", message: "Applicant" })} required>
              <input
                className={inputClass()}
                value={applicant}
                placeholder={t({ id: "Placeholder applicant", message: "Applicant or entity" })}
                onChange={(e) => setApplicant(e.target.value)}
              />
            </Field>
          </FormSection>

          <FormSection index={2} title={t({ id: "Section oa file", message: "Office action file" })}>
            <Field
              label={t({ id: "Upload oa", message: "Upload the office action" })}
              required
              hint={t({ id: "Upload oa hint", message: "PDF or DOCX; images up to 10MB each" })}
            >
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-black/[0.12] bg-[#F7F7FA] px-4 py-8 transition hover:border-[#9CC9FF] hover:bg-[#F2F7FF] dark:border-white/15 dark:bg-white/[0.03]"
                >
                  <Upload className="h-6 w-6 text-[#007AFF]" />
                  <span className="text-[14.5px] font-medium text-[#0F172A] dark:text-white">
                    {t({ id: "Upload oa", message: "Upload the office action" })}
                  </span>
                  <span className="text-[13px] text-[#94A3B8]">
                    {t({ id: "Upload oa hint", message: "PDF or DOCX; images up to 10MB each" })}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
                    e.target.value = "";
                  }}
                />
                {files.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-2xl bg-[#F7F7FA] px-3.5 py-2.5 dark:bg-white/5"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-[#8E8E93]" />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-[#334155] dark:text-slate-300">
                      {f.name}
                    </span>
                    <span className="text-[12.5px] text-[#94A3B8]">
                      {Math.max(1, Math.round(f.size / 1024))} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="text-[#8E8E93] transition hover:text-[#FF3B30]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Field>
          </FormSection>

          <FormSection index={3} title={t({ id: "Section extra", message: "Notes (optional)" })}>
            <Field label={t({ id: "Field notes", message: "Notes" })} counter={`${note.length}/500`}>
              <textarea
                className={inputClass("resize-none")}
                rows={3}
                maxLength={500}
                value={note}
                placeholder={t({ id: "Placeholder notes", message: "Anything the AI should pay special attention to" })}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </FormSection>

          {error ? (
            <p className="mb-4 rounded-2xl bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]">{error}</p>
          ) : null}
          {chat.blocked ? (
            <p className="mb-4 rounded-2xl bg-[#FFF7ED] px-4 py-3 text-[14px] text-[#B45309]">
              {chat.blocked}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void startWork()}
            disabled={!ready || busy}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_10px_24px_-14px_rgba(0,122,255,0.9)] transition active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {busy
              ? t({ id: "Submitting", message: "Submitting…" })
              : t({ id: "Next oa", message: "Next: analyse the objections" })}
            <span aria-hidden="true">→</span>
          </button>
          {!ready ? (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#94A3B8]">
              <CircleHelp className="h-3.5 w-3.5" />
              {t({ id: "Required oa", message: "Application number, title and the office action file are required" })}
            </p>
          ) : null}
        </div>
      ) : (
        <TaskWorkbench chat={chat} specs={specs} title={t({ id: "Office action title", message: "Office Action Reply" })} onGenerate={generate} />
      )}
    </TaskShell>
  );
}
