"use client";

/**
 * 申请文件四件套 —— 表单驱动的工作台（**不挂 Collabora**）。
 *
 * 文案口径：界面文字一律 `t({ id, message })`（message 为英文 = source locale），
 * 译文在 `messages/{locale}.json`；**提交给 agent 的那段中文是模型工作语言，不译**。
 */

import { useRef, useState } from "react";
import {
  CircleHelp,
  FileText,
  Files,
  Info,
  Lightbulb,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { useAiChat } from "@/hooks/use-ai-chat";
import { usePageTitle } from "@/hooks/use-page-title";
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

const ACCENT = "#34C759";

export function ApplicationTask() {
  const t = useExtracted();
  usePageTitle(t({ id: "Application task title", message: "Application Four-Piece Set" }));

  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"form" | "work">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patentType, setPatentType] = useState("invention");
  const [title, setTitle] = useState("");
  const [field, setField] = useState("");
  const [solution, setSolution] = useState("");
  const [note, setNote] = useState("");
  const [inventors, setInventors] = useState([{ name: "", phone: "", email: "" }]);
  const [files, setFiles] = useState<File[]>([]);

  const chat = useAiChat({ skill: "patent-application", title: "Application Four-Piece Set" });
  const ready = title.trim().length > 0 && field.trim().length > 0 && solution.trim().length > 0;

  /** 文案必须在组件内取：模块级常量里不能调 t()（翻译依赖 React 上下文） */
  const steps: TaskStep[] = [
    { key: "info", label: t({ id: "Step fill in", message: "Fill in" }), hint: t({ id: "Step fill in hint", message: "Patent basics" }) },
    { key: "draft", label: t({ id: "Step generate files", message: "Generate files" }), hint: t({ id: "Step generate files hint", message: "AI drafts the application" }) },
    { key: "edit", label: t({ id: "Step edit", message: "Edit" }), hint: t({ id: "Step edit hint", message: "Review and refine each file" }) },
    { key: "export", label: t({ id: "Step export", message: "Export" }), hint: t({ id: "Step export hint", message: "Store as Word or PDF" }) },
  ];

  const planned = [
    { icon: FileText, title: t({ id: "Artifact description", message: "Description" }), desc: t({ id: "Planned description desc", message: "Five-section structure from the disclosure" }) },
    { icon: Files, title: t({ id: "Artifact claims", message: "Claims" }), desc: t({ id: "Planned claims desc", message: "An independent claim plus dependent claims" }) },
    { icon: FileText, title: t({ id: "Artifact abstract", message: "Abstract" }), desc: t({ id: "Planned abstract desc", message: "300 characters or fewer" }) },
    { icon: FileText, title: t({ id: "Artifact figures", message: "Figures" }), desc: t({ id: "Planned figures desc", message: "Drawn from the figure description" }) },
  ];

  const specs: ArtifactSpec[] = [
    { key: "claims", title: t({ id: "Artifact claims", message: "Claims" }), hint: t({ id: "Artifact claims hint", message: "Independent claim plus a dependent ladder" }) },
    { key: "description", title: t({ id: "Artifact description", message: "Description" }), hint: t({ id: "Artifact description hint", message: "Field / background / summary / figures / embodiments" }) },
    { key: "abstract", title: t({ id: "Artifact abstract", message: "Abstract" }), hint: t({ id: "Artifact abstract hint", message: "300 characters or fewer" }) },
    { key: "figures", title: t({ id: "Artifact figures", message: "Figures" }), hint: t({ id: "Artifact figures hint", message: "Numbered figures matching the description" }) },
    { key: "issues", title: t({ id: "Artifact issues", message: "Open questions" }), hint: t({ id: "Artifact issues hint", message: "Unsupported claims or missing facts — never blocks the files" }), kind: "extra" },
  ];

  const patentTypes = [
    { id: "invention", label: t({ id: "Patent type invention", message: "Invention" }) },
    { id: "utility", label: t({ id: "Patent type utility", message: "Utility model" }) },
    { id: "design", label: t({ id: "Patent type design", message: "Design" }) },
  ];

  /** 表单 → 工作台：填好的信息与交底文件一起交给 agent（这段中文是模型工作语言） */
  const startWork = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const brief = [
        `专利类型：${patentTypes.find((p) => p.id === patentType)?.label ?? patentType}`,
        `发明名称：${title.trim()}`,
        `技术领域：${field.trim()}`,
        `技术方案内容：\n${solution.trim()}`,
        inventors.some((p) => p.name.trim())
          ? `发明人：${inventors.filter((p) => p.name.trim()).map((p) => `${p.name.trim()}${p.phone ? `（${p.phone}）` : ""}${p.email ? ` ${p.email}` : ""}`).join("、")}`
          : "",
        note.trim() ? `其他说明：${note.trim()}` : "",
      ].filter(Boolean).join("\n");
      await chat.upload(new File([brief], "application-info.md", { type: "text/markdown" }));
      for (const f of files) {
        try {
          await chat.upload(f);
        } catch (err) {
          setError(`${f.name}: ${String(err)}`);
        }
      }
      setStep("work");
      await chat.send(
        "按申请文件四件套的契约，为上面这份申请信息起草四份文件。" +
          "先只起草权利要求书：独权写必要技术特征，从属权要逐层收窄，每条权要的每个特征都要能在技术方案里找到支撑。" +
          "用 <final-doc> 包裹这一份的全文。",
      );
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  };

  const generate = async (spec: ArtifactSpec) => {
    await chat.send(
      `继续起草「${spec.title}」。${spec.hint ?? ""}只输出这一份文件的全文，用 <final-doc> 包裹；不要重复已起草的其他几份。`,
    );
    await chat.saveArtifactFromDraft(spec.key, spec.title);
  };

  const aside = (
    <>
      <AsideCard icon={Sparkles} title={t({ id: "Planned outputs title", message: "What gets generated" })}>
        <ul className="space-y-3">
          {planned.map((p) => (
            <li key={p.title} className="flex items-start gap-2.5">
              <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
              <span className="min-w-0">
                <span className="block text-[14.5px] font-medium text-[#0F172A] dark:text-white">{p.title}</span>
                <span className="block text-[13px] leading-snug text-[#6E6E73] dark:text-slate-400">{p.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </AsideCard>
      <AsideCard icon={Info} title={t({ id: "Usage title", message: "How it works" })}>
        <ol className="space-y-2 text-[13.5px] leading-relaxed text-[#6E6E73] dark:text-slate-400">
          <li>1. {t({ id: "Usage app 1", message: "Fill in the basics and upload the disclosure" })}</li>
          <li>2. {t({ id: "Usage app 2", message: "The AI drafts each file in turn" })}</li>
          <li>3. {t({ id: "Usage app 3", message: "Preview each file; request changes in the panel" })}</li>
          <li>4. {t({ id: "Usage app 4", message: "Store the files you like, or export Word" })}</li>
        </ol>
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#F2F2F7] px-3 py-2.5 text-[13px] leading-relaxed text-[#6E6E73] dark:bg-white/5 dark:text-slate-400">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
          {t({ id: "Tip app", message: "On an internal network files are parsed locally and never leave it." })}
        </p>
      </AsideCard>
    </>
  );

  return (
    <TaskShell
      accent={ACCENT}
      badge={t({ id: "Application badge", message: "New patent application" })}
      title={t({ id: "Application task title", message: "Application Four-Piece Set" })}
      subtitle={t({
        id: "Application task subtitle",
        message: "Turn a technical disclosure into a description, claims, abstract and figures.",
      })}
      icon={Files}
      steps={steps}
      activeStep={step === "form" ? 0 : 3}
      backHref="/patent"
      backLabel={t({ id: "Back", message: "Back" })}
      assistantLabel={t({ id: "AI assistant", message: "AI assistant" })}
      aside={step === "form" ? aside : undefined}
    >
      {step === "form" ? (
        <div>
          <FormSection index={1} title={t({ id: "Section application info", message: "Patent basics" })}>
            <Field label={t({ id: "Field patent type", message: "Patent type" })} required>
              <div className="flex flex-wrap gap-5">
                {patentTypes.map((p) => (
                  <label key={p.id} className="inline-flex cursor-pointer items-center gap-2 text-[14.5px] text-[#0F172A] dark:text-white">
                    <input type="radio" name="patentType" className="sr-only" checked={patentType === p.id} onChange={() => setPatentType(p.id)} />
                    <span
                      className={
                        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition " +
                        (patentType === p.id ? "border-[#34C759]" : "border-black/[0.15] dark:border-white/20")
                      }
                    >
                      {patentType === p.id ? <span className="h-2.5 w-2.5 rounded-full bg-[#34C759]" /> : null}
                    </span>
                    {p.label}
                  </label>
                ))}
              </div>
            </Field>

            <Field label={t({ id: "Field title", message: "Title" })} required counter={`${title.length}/500`}>
              <input className={inputClass()} value={title} maxLength={500} placeholder={t({ id: "Placeholder title", message: "e.g. A device for …" })} onChange={(e) => setTitle(e.target.value)} />
            </Field>

            <Field label={t({ id: "Field technical field", message: "Technical field" })} required counter={`${field.length}/500`}>
              <textarea className={inputClass("resize-none")} rows={2} maxLength={500} value={field} placeholder={t({ id: "Placeholder technical field", message: "e.g. computer, communications, mechanical" })} onChange={(e) => setField(e.target.value)} />
            </Field>

            <Field label={t({ id: "Field solution", message: "Technical solution" })} required counter={`${solution.length}/3000`}>
              <textarea className={inputClass("resize-y leading-relaxed")} rows={6} maxLength={3000} value={solution} placeholder={t({ id: "Placeholder solution", message: "Describe the problem, the solution and the implementation details" })} onChange={(e) => setSolution(e.target.value)} />
            </Field>

            <Field label={t({ id: "Field inventors", message: "Inventors" })} hint={t({ id: "Hint optional", message: "(optional)" })}>
              <div className="space-y-3">
                {inventors.map((p, i) => (
                  <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input className={inputClass()} placeholder={t({ id: "Placeholder inventor name", message: "Inventor name" })} value={p.name} onChange={(e) => setInventors((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <input className={inputClass()} placeholder={t({ id: "Placeholder inventor phone", message: "Phone (optional)" })} value={p.phone} onChange={(e) => setInventors((prev) => prev.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />
                    <input className={inputClass()} placeholder={t({ id: "Placeholder inventor email", message: "Email (optional)" })} value={p.email} onChange={(e) => setInventors((prev) => prev.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
                  </div>
                ))}
                <button type="button" onClick={() => setInventors((prev) => [...prev, { name: "", phone: "", email: "" }])} className="text-[14px] font-medium text-[#007AFF]">
                  {t({ id: "Add inventor", message: "+ Add inventor" })}
                </button>
              </div>
            </Field>
          </FormSection>

          <FormSection index={2} title={t({ id: "Section disclosure", message: "Disclosure file" })}>
            <Field
              label={t({ id: "Upload disclosure", message: "Upload the disclosure (optional)" })}
              hint={t({ id: "Upload disclosure hint", message: "PDF, DOCX or images; text can be pasted; 30MB per file" })}
            >
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-black/[0.12] bg-[#F7F7FA] px-4 py-8 transition hover:border-[#9CC9FF] hover:bg-[#F2F7FF] dark:border-white/15 dark:bg-white/[0.03]"
                >
                  <Upload className="h-6 w-6 text-[#007AFF]" />
                  <span className="text-[14.5px] font-medium text-[#0F172A] dark:text-white">
                    {t({ id: "Upload disclosure", message: "Upload the disclosure (optional)" })}
                  </span>
                  <span className="text-[13px] text-[#94A3B8]">
                    {t({ id: "Upload disclosure hint", message: "PDF, DOCX or images; text can be pasted; 30MB per file" })}
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
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-2xl bg-[#F7F7FA] px-3.5 py-2.5 dark:bg-white/5">
                    <FileText className="h-4 w-4 shrink-0 text-[#8E8E93]" />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-[#334155] dark:text-slate-300">{f.name}</span>
                    <span className="text-[12.5px] text-[#94A3B8]">{Math.max(1, Math.round(f.size / 1024))} KB</span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-[#8E8E93] transition hover:text-[#FF3B30]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Field>
          </FormSection>

          <FormSection index={3} title={t({ id: "Section extra", message: "Notes (optional)" })}>
            <Field label={t({ id: "Field notes", message: "Notes" })} counter={`${note.length}/500`}>
              <textarea className={inputClass("resize-none")} rows={3} maxLength={500} value={note} placeholder={t({ id: "Placeholder notes", message: "Anything the AI should pay special attention to" })} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </FormSection>

          {error ? <p className="mb-4 rounded-2xl bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]">{error}</p> : null}
          {chat.blocked ? (
            <p className="mb-4 rounded-2xl bg-[#FFF7ED] px-4 py-3 text-[14px] text-[#B45309]">{chat.blocked}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void startWork()}
            disabled={!ready || busy}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_10px_24px_-14px_rgba(52,199,89,0.9)] transition active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {busy ? t({ id: "Submitting", message: "Submitting…" }) : t({ id: "Next app", message: "Next: generate the application" })}
            <span aria-hidden="true">→</span>
          </button>
          {!ready ? (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#94A3B8]">
              <CircleHelp className="h-3.5 w-3.5" />
              {t({ id: "Required app", message: "Title, technical field and solution are required" })}
            </p>
          ) : null}
        </div>
      ) : (
        /* 工作台：左产物看板 + 右对话面板 —— 刻意不放 Word 编辑器 */
        <TaskWorkbench chat={chat} specs={specs} title={t({ id: "Application task title", message: "Application Four-Piece Set" })} onGenerate={generate} />
      )}
    </TaskShell>
  );
}
