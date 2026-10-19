"use client";

/**
 * 软件著作权工作台。
 *
 * 和「四件套」的差别：软著是一条**有强制门禁的长流程**（项目分析 → 业务理解 →
 * 申请表字段 → 代码选材 → 手册 → 截图 → 正式资料），每一步都要用户确认后才能
 * 往下走。所以中列不做文档 tab，而是把这条流水线摊开：每行一个阶段，按钮点下去
 * 就是给 agent 一条明确指令；agent 跑完（`chat.send` 返回）该行才置为已完成。
 *
 * 源码包不在这里拆：`.zip` 直接交给服务端解成 `project/`，回来的项目概况
 * （文件数 / 源码行数 / 主要语言）就是申请表里「源程序量」的现实依据。
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Check,
  FileArchive,
  FileText,
  FolderOpen,
  Layers,
  Loader2,
  Monitor,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { useAiChat } from "@/hooks/use-ai-chat";
import { usePageTitle } from "@/hooks/use-page-title";
import { AgentPanel } from "@/components/studio/agent-panel";
import { WorkspaceFiles } from "@/components/studio/workspace-files";
import { getAiProject, type AiProject } from "@/utils/ai/client";
import { cn } from "@/lib/utils";
import { pt } from "../theme";

/** 每个阶段发给 agent 的指令。措辞要和技能里的「页面按钮 → 指令」表对齐。 */
const PROMPTS = {
  analyze:
    "开始软著办理。请先检查运行环境，再分析 project/ 下的项目源码；如果没有 project/ 就提示我上传源码包。" +
    "工作目录用 outputs/软著。报告识别到的框架、源码文件数、源程序总行数（含空行）。",
  business:
    "项目已确认。按 SKILL.md 第 1 步生成业务理解草稿到 outputs/软著/草稿/，" +
    "然后把行业、目标用户、核心价值、主要功能、操作手册模块（manual_modules）列给我确认。",
  application:
    "确认代码材料，继续：生成 outputs/软著/草稿/申请表信息.md（页数用抽取结果），" +
    "并列出需要我补全的字段（著作权人、日期、硬件/系统环境等）。",
  selection:
    "确认业务理解，继续：记录 business 门禁，生成代码文件候选清单，" +
    "按最能体现软件真实功能的文件给出选择建议，并估算能凑多少页。",
  extract:
    "确认代码选材（按你的建议执行）。记录 code-selection 门禁，抽取代码材料，" +
    "报告生成的是前30页/后30页还是全部，以及总页数。",
  manual:
    "确认申请表信息，继续：记录 application-fields 门禁，生成操作手册草稿到 outputs/软著/草稿/操作手册.md，" +
    "按真实页面逐章写，并完成操作手册自检记录（至少三轮）。",
  skipShots:
    "这次不截图。记录 screenshot-method 门禁（method=skip），手册里保留可见的截图预留位置。",
  freeShots:
    "我用自行上传的截图。截图在 materials/ 里，请复制到 outputs/软著/用户截图 并按手册模块顺序加数字前缀，" +
    "然后记录 screenshot-method 门禁（method=user-supplied）并整理截图清单。",
  build:
    "确认草稿，生成正式资料：记录 markdown 门禁，运行 build_docx_from_md.py 生成 Word 和 TXT，" +
    "报告产物清单、代码页数和仍需我人工核对的地方。",
} as const;

type StepKey = "analyze" | "business" | "application" | "selection" | "extract" | "manual" | "shots" | "build";

const STEPS: { key: StepKey; title: string; desc: string }[] = [
  { key: "analyze", title: "项目分析", desc: "读源码包，算源程序量与项目结构" },
  { key: "business", title: "业务理解", desc: "行业、目标用户、核心功能与手册模块" },
  { key: "selection", title: "代码选材", desc: "挑最能体现功能的源码，估算页数" },
  { key: "extract", title: "抽取代码材料", desc: "前 30 页 / 后 30 页或全部代码" },
  { key: "application", title: "申请表信息", desc: "软件全称、版本号、环境、功能说明" },
  { key: "manual", title: "操作手册", desc: "按真实页面逐章写，含自检记录" },
  { key: "shots", title: "截图", desc: "上传截图或明确跳过（保留预留位）" },
  { key: "build", title: "正式资料", desc: "生成 Word/TXT 并校验页数" },
];

export function CopyrightTask() {
  const t = useExtracted();
  usePageTitle(t({ id: "Copyright page title", message: "软件著作权" }));

  const searchParams = useSearchParams();
  const resumeFrom = searchParams.get("case") || "";

  const zipRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("V1.0");
  const [owner, setOwner] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [devEnv, setDevEnv] = useState("");
  const [runEnv, setRunEnv] = useState("");
  const [sourceZip, setSourceZip] = useState<File | null>(null);
  const [docs, setDocs] = useState<File[]>([]);
  const [project, setProject] = useState<AiProject | null>(null);
  const [done, setDone] = useState<Partial<Record<StepKey, boolean>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = name.trim() || t({ id: "Copyright default title", message: "软件著作权申请" });
  const chat = useAiChat({
    skill: "software-copyright",
    title,
    paused: !started && !resumeFrom,
    resumeFrom,
    persistKey: "ai:software-copyright",
  });

  const mark = (key: StepKey) => setDone((prev) => ({ ...prev, [key]: true }));

  /* 恢复案件时把项目概况拉回来（项目在 project/，概况存在会话目录） */
  useEffect(() => {
    const sid = chat.sessionId;
    if (!sid || project) return;
    void (async () => {
      try {
        const info = await getAiProject(sid);
        if (info) setProject(info);
      } catch {
        /* 没有项目包就是 null，不用报错 */
      }
    })();
  }, [chat.sessionId, project]);

  const brief = useCallback(
    () =>
      [
        `- 软件全称：${name.trim()}`,
        `- 版本号：${version.trim() || "V1.0"}`,
        `- 著作权人：${owner.trim() || "（待确认）"}`,
        `- 开发完成日期：${finishDate.trim() || "（待确认）"}`,
        `- 开发环境：${devEnv.trim() || "（待确认）"}`,
        `- 运行环境：${runEnv.trim() || "（待确认）"}`,
      ].join("\n"),
    [name, version, owner, finishDate, devEnv, runEnv],
  );

  /* 会话建好后把表单与文件送上去，再开第一步 */
  useEffect(() => {
    if (!started || !chat.sessionId || startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      setBusy("start");
      setError(null);
      try {
        await chat.upload(
          new File(
            [`# 软著申请基本信息\n\n${brief()}\n`],
            "软著申请信息.md",
            { type: "text/markdown" },
          ),
        );
        if (sourceZip) {
          const res = await chat.upload(sourceZip);
          if (res.project) setProject(res.project);
        }
        for (const file of docs) {
          await chat.upload(file);
        }
        await chat.send(PROMPTS.analyze);
        mark("analyze");
      } catch (err) {
        setError(String(err instanceof Error ? err.message : err));
      } finally {
        setBusy(null);
      }
    })();
  }, [started, chat, brief, sourceZip, docs]);

  /** 跑一个阶段：发指令，跑完才置完成 */
  const run = async (key: StepKey, prompt: string) => {
    if (!chat.sessionId || busy) return;
    setBusy(key);
    setError(null);
    try {
      await chat.send(prompt);
      mark(key);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(null);
    }
  };

  const modelLabel = chat.health ? `pi ${chat.health.pi.version ?? ""}`.trim() : undefined;
  const doneCount = STEPS.filter((s) => done[s.key]).length;
  const canStart = Boolean(name.trim()) && !busy;

  /* ── 左列：软件信息 / 源码包 / 材料 ─────────────────────────────── */
  const left = (
    <div className="space-y-4">
      <section className={pt.card}>
        <h2 className={pt.cardHead}>
          <Building2 className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
          {t({ id: "Copyright software info", message: "软件信息" })}
        </h2>
        <div className="space-y-3 p-4">
          <Field label={t({ id: "Copyright software name", message: "软件全称" })} required>
            <input
              className={cn(pt.input, "text-[13px]")}
              placeholder={t({ id: "Copyright name placeholder", message: "如：XX 智能办公管理系统" })}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={started || Boolean(resumeFrom)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t({ id: "Copyright version", message: "版本号" })}>
              <input
                className={cn(pt.input, "text-[13px]")}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={started || Boolean(resumeFrom)}
              />
            </Field>
            <Field label={t({ id: "Copyright owner", message: "著作权人" })}>
              <input
                className={cn(pt.input, "text-[13px]")}
                placeholder={t({ id: "Copyright owner placeholder", message: "公司或个人" })}
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                disabled={started || Boolean(resumeFrom)}
              />
            </Field>
          </div>
          <Field label={t({ id: "Copyright finish date", message: "开发完成日期" })}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B4B4BA]" />
              <input
                className={cn(pt.input, "text-[13px]")}
                placeholder="2026-08-31"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
                disabled={started || Boolean(resumeFrom)}
              />
            </div>
          </Field>
          <Field label={t({ id: "Copyright dev env", message: "开发环境" })}>
            <div className="relative">
              <Monitor className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B4B4BA]" />
              <input
                className={cn(pt.input, "text-[13px]")}
                placeholder={t({ id: "Copyright dev env placeholder", message: "如：Windows 10 / 16G 内存" })}
                value={devEnv}
                onChange={(e) => setDevEnv(e.target.value)}
                disabled={started || Boolean(resumeFrom)}
              />
            </div>
          </Field>
          <Field label={t({ id: "Copyright run env", message: "运行环境" })}>
            <input
              className={cn(pt.input, "text-[13px]")}
              placeholder={t({ id: "Copyright run env placeholder", message: "如：Windows 10 及以上 / Chrome" })}
              value={runEnv}
              onChange={(e) => setRunEnv(e.target.value)}
              disabled={started || Boolean(resumeFrom)}
            />
          </Field>
        </div>
      </section>

      <section className={pt.card}>
        <h2 className={pt.cardHead}>
          <FileArchive className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
          {t({ id: "Copyright source package", message: "项目源码包" })}
        </h2>
        <div className="space-y-3 p-4">
          {sourceZip && !project ? (
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.05] px-2.5 py-2 dark:border-white/5">
              <FileArchive className="h-3.5 w-3.5 shrink-0 text-[#E2562B]" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#3C3C40] dark:text-slate-300">
                {sourceZip.name}
              </span>
              <button
                type="button"
                onClick={() => setSourceZip(null)}
                className="shrink-0 text-[#9A9AA0] transition hover:text-[#DC2626]"
                aria-label={t({ id: "Remove", message: "移除" })}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {project ? (
            <dl className="grid grid-cols-2 gap-2">
              <Stat label={t({ id: "Copyright file count", message: "文件数" })} value={project.files} />
              <Stat label={t({ id: "Copyright source files", message: "源码文件" })} value={project.source_files} />
              <Stat
                label={t({ id: "Copyright source lines", message: "代码行数（估算）" })}
                value={project.source_lines}
                span
              />
            </dl>
          ) : (
            <p className="text-[12px] leading-relaxed text-[#9A9AA0]">
              {t({
                id: "Copyright source hint",
                message: "把项目打包成 ZIP（排除 node_modules、.git、dist）传上来，服务端会解开并统计源程序量。",
              })}
            </p>
          )}

          <button
            type="button"
            onClick={() => zipRef.current?.click()}
            disabled={started || Boolean(resumeFrom) || Boolean(project)}
            className={cn(
              "w-full rounded-lg border border-dashed border-[#F2BBA3] bg-[#FBF2EE] px-3 py-2.5 text-[12.5px] font-medium text-[#E2562B] transition hover:border-[#E2562B] disabled:opacity-50 dark:border-[#7A3B22] dark:bg-[#1E1512]",
            )}
          >
            {project
              ? t({ id: "Copyright source uploaded", message: "源码包已解析" })
              : t({ id: "Copyright upload source", message: "上传项目源码 ZIP" })}
          </button>
          <input
            ref={zipRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setSourceZip(file);
              e.target.value = "";
            }}
          />

          {project?.languages?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {project.languages.slice(0, 4).map((lang) => (
                <span key={lang.name} className={pt.chip}>
                  {lang.name} · {lang.files}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className={pt.card}>
        <h2 className={pt.cardHead}>
          <FolderOpen className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
          {t({ id: "Copyright other docs", message: "其它材料" })}
        </h2>
        <div className="space-y-2 p-4">
          <ul className="space-y-1.5">
            {docs.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-black/[0.05] px-2.5 py-2 dark:border-white/5"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-[#9A9AA0]" />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#3C3C40] dark:text-slate-300">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}
                  className="shrink-0 text-[#9A9AA0] transition hover:text-[#DC2626]"
                  aria-label={t({ id: "Remove", message: "移除" })}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => docRef.current?.click()}
            disabled={started || Boolean(resumeFrom)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12.5px] font-medium text-[#3C3C40] transition hover:border-[#F2BBA3] hover:text-[#E2562B] disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            <Upload className="h-3.5 w-3.5" />
            {t({ id: "Copyright upload docs", message: "上传需求/设计/测试文档" })}
          </button>
          <input
            ref={docRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              setDocs((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <WorkspaceFiles sessionId={chat.sessionId} refreshKey={doneCount} />
    </div>
  );

  /* ── 中列：办理流程 ─────────────────────────────────────────────── */
  const center = (
    <section className={cn(pt.card, "flex h-full flex-col overflow-hidden")}>
      <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-3 dark:border-white/5">
        <Layers className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
        <h2 className="text-[14px] font-semibold text-[#1A1A1A] dark:text-white">
          {t({ id: "Copyright pipeline", message: "办理流程" })}
        </h2>
        <span className="ml-auto text-[11.5px] text-[#9A9AA0]">
          {doneCount}/{STEPS.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-4">
        {STEPS.map((step, i) => {
          const isDone = Boolean(done[step.key]);
          const running = busy === step.key;
          const isShots = step.key === "shots";
          return (
            <div
              key={step.key}
              className={cn(
                "rounded-xl border px-3.5 py-3 transition",
                isDone
                  ? "border-[#CDEBDA] bg-[#F6FCF8] dark:border-[#1F4A33] dark:bg-[#12211A]"
                  : "border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#171719]",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold",
                    isDone
                      ? "bg-[#2FA05A] text-white"
                      : "bg-[#FBF2EE] text-[#E2562B] dark:bg-[#2A1A14]",
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-[#1A1A1A] dark:text-white">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#9A9AA0]">
                    {step.desc}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isShots ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void run("shots", PROMPTS.skipShots)}
                        disabled={!chat.sessionId || Boolean(busy)}
                        className="rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-[12px] font-medium text-[#5C5C60] transition hover:border-[#F2BBA3] hover:text-[#E2562B] disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
                      >
                        {t({ id: "Copyright skip shots", message: "跳过" })}
                      </button>
                      <button
                        type="button"
                        onClick={() => void run("shots", PROMPTS.freeShots)}
                        disabled={!chat.sessionId || Boolean(busy)}
                        className="rounded-lg bg-[#FBF2EE] px-2.5 py-1.5 text-[12px] font-medium text-[#E2562B] transition hover:bg-[#F6E4DA] disabled:opacity-40 dark:bg-[#2A1A14]"
                      >
                        {t({ id: "Copyright use shots", message: "已上传" })}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        // 截图阶段有独立两个按钮，走不到这里
                        if (step.key === "shots") return;
                        void run(step.key, PROMPTS[step.key]);
                      }}
                      disabled={!chat.sessionId || Boolean(busy)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-40",
                        isDone
                          ? "border border-black/[0.08] text-[#5C5C60] hover:border-[#F2BBA3] hover:text-[#E2562B] dark:border-white/10 dark:text-slate-300"
                          : "bg-[#E2562B] text-white hover:bg-[#C64A1E]",
                      )}
                    >
                      {running ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {isDone
                        ? t({ id: "Copyright rerun", message: "重跑" })
                        : t({ id: "Copyright run", message: "执行" })}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {error ? (
          <p className="flex items-start gap-1.5 rounded-lg bg-[#FDECEC] px-3 py-2 text-[12px] text-[#C0392B]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );

  return (
    <div className="flex h-full flex-col bg-[#F7F7F8] dark:bg-[#0F0F10]">
      <div className="flex-1 overflow-y-auto px-8 py-6 pb-24 custom-scrollbar">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBF2EE] text-[#E2562B] dark:bg-[#2A1A14]">
              <FileArchive className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div>
              <h1 className="text-[20px] font-bold leading-tight tracking-[-0.02em] text-[#1A1A1A] dark:text-white">
                {t({ id: "Copyright page title", message: "软件著作权" })}
              </h1>
              <p className="mt-1 text-[12.5px] text-[#8A8A8F]">
                {t({
                  id: "Copyright page subtitle",
                  message: "从真实源码生成申请表信息、操作手册与前后 30 页代码材料",
                })}
              </p>
            </div>
          </div>
          <span className="rounded-md bg-[#FBF2EE] px-2.5 py-1 text-[11.5px] font-medium text-[#E2562B]">
            {t({ id: "Copyright badge", message: "中国软著登记" })}
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)_21rem]">
          <div className="min-w-0 space-y-4">{left}</div>
          <div className="min-w-0">{center}</div>

          <div className="min-w-0 space-y-4">
            <section className={cn(pt.card, "flex h-[560px] flex-col overflow-hidden")}>
              <h2 className={pt.cardHead}>
                <Sparkles className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
                {t({ id: "Copyright assistant", message: "PI 助手" })}
                <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-[#EAF7EE] px-2 py-0.5 text-[11px] font-medium text-[#2FA05A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2FA05A]" />
                  {t({ id: "Copyright local running", message: "本地运行" })}
                </span>
              </h2>
              <div className="min-h-0 flex-1">
                <AgentPanel
                  messages={chat.messages}
                  materials={chat.materials}
                  template={chat.template}
                  streaming={chat.streaming}
                  blocked={chat.blocked}
                  sessionReady={!!chat.sessionId}
                  modelLabel={modelLabel}
                  lastSaved={chat.lastSaved}
                  onSend={(text) => void chat.send(text)}
                  onStop={chat.stop}
                  onUpload={chat.upload}
                  onUploadTemplate={(file) => chat.uploadTemplate(file)}
                  onRemoveTemplate={() => void chat.removeTemplate()}
                  onRemoveMaterial={(material) => void chat.removeMaterial(material)}
                  onAcceptChange={(key) => void chat.acceptChange(key)}
                  onRejectChange={chat.rejectChange}
                  onAcceptAll={() => void chat.acceptAll()}
                  onSave={() => void chat.saveNow()}
                  className="border-none h-full min-h-0"
                />
              </div>
            </section>

            <section className={cn(pt.card, "p-4")}>
              <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-[#1A1A1A] dark:text-white">
                <Check className="h-4 w-4 text-[#E2562B]" strokeWidth={2.5} />
                {t({ id: "Copyright delivery", message: "交付物" })}
              </h3>
              <ul className="mt-2.5 space-y-1.5 text-[11.5px] leading-relaxed text-[#6B6B70] dark:text-slate-400">
                <li>申请表信息.txt（官网填报对照）</li>
                <li>操作手册.docx</li>
                <li>代码(前30页).docx / 代码(后30页).docx</li>
                <li>生成报告.md（页数与校验记录）</li>
              </ul>
            </section>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-black/[0.06] bg-white/90 px-8 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0F0F10]/85">
        {started || resumeFrom ? (
          <button
            type="button"
            onClick={() => void run("build", PROMPTS.build)}
            disabled={!chat.sessionId || Boolean(busy) || !done.manual}
            className="mx-auto flex w-full max-w-[260px] items-center justify-center gap-1.5 rounded-lg bg-[#E2562B] px-4 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-[#C64A1E] disabled:opacity-40"
          >
            {busy === "build" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {t({ id: "Copyright build", message: "生成正式资料" })}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStarted(true)}
            disabled={!canStart}
            className="mx-auto flex w-full max-w-[260px] items-center justify-center gap-1.5 rounded-lg bg-[#E2562B] px-4 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-[#C64A1E] disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t({ id: "Copyright start", message: "开始办理" })}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[#6B6B70] dark:text-slate-400">
        {label}
        {required ? <span className="ml-0.5 text-[#E2562B]">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
  span,
}: {
  label: string;
  value: number;
  span?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-[#FBFBFC] px-3 py-2 dark:bg-[#121213]",
        span && "col-span-2",
      )}
    >
      <dt className="text-[11px] text-[#9A9AA0]">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#1A1A1A] dark:text-white">
        {value.toLocaleString("zh-CN")}
      </dd>
    </div>
  );
}
