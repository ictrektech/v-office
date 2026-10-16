"use client";

/**
 * 公文写作 —— 任务式工作台（**不挂 Collabora**）。
 *
 * 与专利交底页同一套形态：先把要件填全 → 再逐个产出 → 每份各自过目。
 * 文种结构仍由 `public/writing/templates.json` 承载（23 个文种的字段清单），
 * 流程细则以 `writing` 技能包的 SKILL.md 与 prompts/ 为准，避免两头维护。
 *
 * 栏目首页（`writing-view.tsx`）产出一份稿子后，那个「带进工作台」按钮会把
 * markdown + 标题写进 sessionStorage 再跳过来；这里启动时把它灌进会话，
 * 于是「栏内产出的稿子」和「工作台里的 AI 对话」仍是同一份文档。
 *
 * 会话标题 = 公文标题（它同时是落盘 docx 的文件名来源），所以会话要等标题
 * 定下来再建：`useAiChat` 的 `paused` 就是干这个的。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CircleHelp,
  FileText,
  Info,
  Lightbulb,
  PenLine,
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
} from "@/components/studio/task-shell";
import { TaskWorkbench } from "@/components/studio/task-workbench";
import {
  getWritingTemplate,
  getWritingTemplates,
} from "@/utils/writing/templates";
import type { WritingKind } from "@/utils/writing/types";

const ACCENT = "#1D1D1F";

/** 栏目首页交接成稿用的 sessionStorage 键（沿用旧撰写室的键，别让那边改） */
const HANDOFF_KEY = "ai-studio:handoff";

/** 待办：交接成稿（灌草稿）或发材料 + 起手话术 */
type Pending =
  | { kind: "handoff"; markdown: string; title: string }
  | { kind: "start"; brief: File; files: File[]; kickoff: string };

export function WritingTask() {
  const t = useExtracted();
  usePageTitle(t({ id: "Writing task title", message: "Official Document" }));

  const searchParams = useSearchParams();
  const [templateId, setTemplateId] = useState(
    () => searchParams.get("template") || "",
  );
  const templates = useMemo(() => getWritingTemplates(), []);
  const tpl = useMemo(
    () => getWritingTemplate(templateId) ?? templates[0],
    [templateId, templates],
  );

  const [step, setStep] = useState<"form" | "work">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  /** 会话标题（= 公文标题 = 落盘 docx 的文件名来源） */
  const [caseTitle, setCaseTitle] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const chat = useAiChat({
    skill: "writing",
    title: caseTitle,
    // 标题没定之前不建会话：建错标题就得把已经导出的 docx 改名
    paused: !caseTitle,
    // 刷新/重开接着上一条线：成稿与对话记录都还在
    persistKey: "ai:writing",
  });

  const fields = tpl?.fields ?? [];
  /** 红头文种的「标题」要素在 f3，其他文种按标签找「标题」 */
  const titleFieldKey =
    fields.find((f) => f.key === "f3")?.key ??
    fields.find((f) => f.label.includes("标题"))?.key ??
    fields[0]?.key ??
    "";
  const docTitle = (values[titleFieldKey] ?? "").trim();
  const anyField = fields.some((f) => (values[f.key] ?? "").trim());
  const ready = anyField || files.length > 0;

  /** 文案必须在组件内取：模块级常量里不能调 t()（翻译依赖 React 上下文） */
  const steps: TaskStep[] = [
    {
      key: "config",
      label: t({ id: "Step pick type", message: "Document type" }),
      hint: t({ id: "Step pick type hint", message: "23 types" }),
    },
    {
      key: "facts",
      label: t({ id: "Step fill in", message: "Fill in" }),
      // 不用「Step fill in hint」：申请页那条的中文是「专利基本信息」，串到写作页会读着别扭
      hint: t({ id: "Step fill in writing hint", message: "Essentials and sources" }),
    },
    {
      key: "draft",
      label: t({ id: "Step draft doc", message: "Draft" }),
      hint: t({ id: "Step draft doc hint", message: "Five-section draft" }),
    },
    {
      key: "final",
      label: t({ id: "Step finalize doc", message: "Finalize" }),
      hint: t({ id: "Step finalize doc hint", message: "Store or export Word" }),
    },
  ];

  const specs: ArtifactSpec[] = [
    {
      key: "deliverable",
      title: t({ id: "Artifact deliverable", message: "正稿" }),
      hint: t({
        id: "Artifact deliverable hint",
        message: "The finished text, ready for Word",
      }),
    },
    {
      key: "selfcheck",
      title: t({ id: "Artifact self check", message: "Self-check" }),
      hint: t({
        id: "Artifact self check hint",
        message: "Compliance, format and wording to confirm",
      }),
      kind: "extra",
    },
  ];

  const has = (key: string) => chat.artifacts.some((a) => a.key === key);
  const activeStep = step === "form" ? (anyField || files.length ? 1 : 0) : has("deliverable") ? 3 : 2;

  const kindLabel = (kind: WritingKind) =>
    kind === "redhead"
      ? t({ id: "Writing kind redhead", message: "Red-head documents" })
      : kind === "report"
        ? t({ id: "Writing kind report", message: "Reports" })
        : t({ id: "Writing kind misc", message: "Other documents" });

  const grouped = useMemo(() => {
    const order: WritingKind[] = ["redhead", "report", "misc"];
    return order
      .map((k) => ({ kind: k, items: templates.filter((tpl) => tpl.kind === k) }))
      .filter((g) => g.items.length);
  }, [templates]);

  const planned = [
    {
      icon: FileText,
      title: t({ id: "Artifact deliverable", message: "正稿" }),
      desc: t({
        id: "Planned deliverable desc",
        message: "Full text in the structure this document type requires",
      }),
    },
    {
      icon: Sparkles,
      title: t({ id: "Artifact self check", message: "Self-check" }),
      desc: t({
        id: "Planned self check desc",
        message: "What still needs a human decision before it goes out",
      }),
    },
  ];

  /** 栏目首页交接过来的成稿：启动时灌进会话（顺序：会话先建好） */
  useEffect(() => {
    let payload: { markdown?: string; title?: string };
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) return;
      sessionStorage.removeItem(HANDOFF_KEY);
      payload = JSON.parse(raw) as { markdown?: string; title?: string };
    } catch {
      return; // 交接数据损坏：忽略，按本会话原状走
    }
    if (!payload.markdown?.trim()) return;
    const fallback = getWritingTemplate(templateId) ?? templates[0];
    const name = (payload.title || "").trim() || fallback?.name || "";
    if (!name) return;
    // 推到微任务里再改状态：effect 体里同步 setState 会触发级联渲染
    queueMicrotask(() => {
      setStep("work");
      setCaseTitle(name);
      setPending({ kind: "handoff", markdown: payload.markdown ?? "", title: name });
    });
    // 只在挂载时读一次：交接是一次性的，读完即删
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 会话就绪后补发材料与起手话术（顺序不能颠倒：先材料，再指令） */
  const dispatchedRef = useRef(false);
  useEffect(() => {
    if (!pending || !chat.sessionId || dispatchedRef.current) return;
    dispatchedRef.current = true;
    const job = pending;
    if (job.kind === "handoff") {
      void chat.importDraft(job.markdown, job.title);
      return;
    }
    void (async () => {
      try {
        await chat.upload(job.brief);
        for (const f of job.files) {
          await chat.upload(f);
        }
        setStep("work");
        await chat.send(job.kickoff);
      } catch (err) {
        setError(String(err instanceof Error ? err.message : err));
        setStep("work");
      }
    })();
  }, [pending, chat]);

  /** 表单 → 工作台：要件与材料一起交给 agent */
  const startWork = () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const brief = [
      `文种：${tpl?.name ?? ""}`,
      tpl?.redhead ? "版式：红头（GB/T 9704-2012 六要素）" : "",
      ...fields
        .filter((f) => (values[f.key] ?? "").trim())
        .map((f) => `${f.label}：${(values[f.key] ?? "").trim()}`),
    ]
      .filter(Boolean)
      .join("\n");
    setCaseTitle(docTitle || tpl?.name || "");
    setPending({
      kind: "start",
      brief: new File([brief], "写作要件.md", { type: "text/markdown" }),
      files,
      kickoff:
        `按「${tpl?.name ?? "公文"}」的规范起草这份文件。\n` +
        "① 先按该文种的结构要素成文，全文用 <final-doc> 包裹；\n" +
        "② 红头文种必须给全六要素（发文机关标志、发文字号、标题、主送机关、正文、落款与成文日期），发文字号未知就写「待编号」，不要编造；\n" +
        "③ 再自查合规、格式与用语，把需要人工确认的点单独列成「自查清单」。",
    });
    setBusy(false);
  };

  const generate = async (spec: ArtifactSpec) => {
    const prompts: Record<string, string> = {
      deliverable: "只输出成稿全文，用 <final-doc> 包裹；不要重复自查清单的内容。",
      selfcheck:
        "只输出「自查清单」全文：逐条列出合规、格式与用语上还需要人工确认的点，以及建议的改法。",
    };
    await chat.send(prompts[spec.key] ?? `只输出「${spec.title}」的全文。`);
    await chat.saveArtifactFromDraft(spec.key, spec.title);
  };

  const aside = (
    <>
      <AsideCard
        icon={Sparkles}
        title={t({ id: "Planned outputs title", message: "What gets generated" })}
      >
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
          <li>1. {t({ id: "Usage writing 1", message: "Pick the document type" })}</li>
          <li>2. {t({ id: "Usage writing 2", message: "Fill in the essentials and upload any source files" })}</li>
          <li>3. {t({ id: "Usage writing 3", message: "Draft it, then review the self-check list" })}</li>
          <li>4. {t({ id: "Usage writing 4", message: "Store it, or export Word" })}</li>
        </ol>
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#F2F2F7] px-3 py-2.5 text-[13px] leading-relaxed text-[#6E6E73] dark:bg-white/5 dark:text-slate-400">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
          {t({
            id: "Tip writing",
            message:
              "Blank fields are left for the AI to infer from your materials; a missing document number stays 「待编号」.",
          })}
        </p>
      </AsideCard>
    </>
  );

  return (
    <TaskShell
      accent={ACCENT}
      badge={t({ id: "Writing badge", message: "New official document" })}
      title={t({ id: "Writing task title", message: "Official Document" })}
      subtitle={t({
        id: "Writing task subtitle",
        message:
          "23 document types, red-head layout included — draft, self-check and finalize.",
      })}
      icon={PenLine}
      steps={steps}
      activeStep={activeStep}
      backHref="/writing"
      backLabel={t({ id: "Back", message: "Back" })}
      assistantLabel={t({ id: "AI assistant", message: "AI assistant" })}
      aside={step === "form" ? aside : undefined}
    >
      {step === "form" ? (
        <div>
          <FormSection
            index={1}
            title={t({ id: "Section doc type", message: "Document type" })}
          >
            <Field label={t({ id: "Field doc type", message: "Type" })} required>
              <select
                className={inputClass("appearance-none")}
                value={tpl?.id ?? ""}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  setValues({});
                }}
              >
                {grouped.map((g) => (
                  <optgroup key={g.kind} label={kindLabel(g.kind)}>
                    {g.items.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            {tpl?.description ? (
              <p className="-mt-2 text-[13px] leading-relaxed text-[#6E6E73] dark:text-slate-400">
                {tpl.description}
              </p>
            ) : null}
          </FormSection>

          <FormSection
            index={2}
            title={t({ id: "Section doc facts", message: "Essentials" })}
          >
            <p className="mb-5 text-[13.5px] leading-relaxed text-[#6E6E73] dark:text-slate-400">
              {t({
                id: "Section doc facts hint",
                message:
                  "Fill in what you know. Anything left blank is inferred from your materials, never invented.",
              })}
            </p>
            {fields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                hint={f.hint || undefined}
                counter={`${(values[f.key] ?? "").length}/800`}
              >
                <textarea
                  className={inputClass("resize-y leading-relaxed")}
                  rows={f.key === titleFieldKey ? 2 : 3}
                  maxLength={800}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                />
              </Field>
            ))}
          </FormSection>

          <FormSection
            index={3}
            title={t({ id: "Section materials", message: "Materials" })}
          >
            <Field
              label={t({ id: "Upload materials", message: "Upload materials" })}
              hint={t({
                id: "Upload writing materials hint",
                message: "Policy documents, minutes, data sheets or an earlier draft",
              })}
            >
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-black/[0.12] bg-[#F7F7FA] px-4 py-8 transition hover:border-[#9CC9FF] hover:bg-[#F2F7FF] dark:border-white/15 dark:bg-white/[0.03]"
                >
                  <Upload className="h-6 w-6 text-[#007AFF]" />
                  <span className="text-[14.5px] font-medium text-[#0F172A] dark:text-white">
                    {t({
                      id: "Upload materials cta",
                      message: "Drop source files or an earlier draft here",
                    })}
                  </span>
                  <span className="text-[13px] text-[#94A3B8]">
                    {t({
                      id: "Upload writing materials hint",
                      message: "Policy documents, minutes, data sheets or an earlier draft",
                    })}
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

          {error ? (
            <p className="mb-4 rounded-2xl bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]">
              {error}
            </p>
          ) : null}
          {chat.blocked ? (
            <p className="mb-4 rounded-2xl bg-[#FFF7ED] px-4 py-3 text-[14px] text-[#B45309]">
              {chat.blocked}
            </p>
          ) : null}

          <button
            type="button"
            onClick={startWork}
            disabled={!ready || busy}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_10px_24px_-14px_rgba(0,0,0,0.5)] transition active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {busy
              ? t({ id: "Submitting", message: "Submitting…" })
              : t({ id: "Next writing", message: "Next: draft it" })}
            <span aria-hidden="true">→</span>
          </button>
          {!ready ? (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#94A3B8]">
              <CircleHelp className="h-3.5 w-3.5" />
              {t({
                id: "Required writing",
                message: "Fill in at least one field, or upload a source file",
              })}
            </p>
          ) : null}
        </div>
      ) : (
        <TaskWorkbench
          chat={chat}
          specs={specs}
          title={t({ id: "Writing task title", message: "Official Document" })}
          onGenerate={generate}
          extraTitle={t({ id: "Process drafts", message: "Process drafts" })}
        />
      )}
    </TaskShell>
  );
}