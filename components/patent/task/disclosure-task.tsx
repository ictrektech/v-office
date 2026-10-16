"use client";

/**
 * 交底书生成 —— 三列工作台（项目与材料录入 / Skill 执行工作流 / PI 助手）。
 *
 * 左列管「写什么」：专利类型（对应技能包的 invention / utility_model / design 三个
 * 分支）、材料上传（含整目录扫描）、已解析文件树、可选的成稿模板。
 * 中列管「做到哪了」：技能包流水线 + 候选专利点卡片 + 产物看板。
 * 右列是 PI 助手：快捷斜杠命令 + 对话。
 *
 * 路径约定：材料与模板都经服务端解析成文本、每轮全文注入 prompt（agent 看不到原件），
 * 上传完第一份材料即可发车——案件名取第一个材料的文件名。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  CloudUpload,
  Download,
  FileText,
  Folder,
  FolderGit2,
  FolderTree,
  Loader2,
  Share2,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { useAiChat } from "@/hooks/use-ai-chat";
import { usePageTitle } from "@/hooks/use-page-title";
import { AgentPanel } from "@/components/studio/agent-panel";
import { ArtifactBoard, type ArtifactSpec } from "@/components/studio/artifact-board";
import { cn } from "@/lib/utils";
import { pt } from "../theme";
import { WorkspaceFiles } from "../workspace-files";

/** 专利类型：与技能包 `prompts/{invention,utility_model,design}` 三个分支一一对应 */
type PatentKind = "invention" | "utility_model" | "design";

/** 流水线一步的状态 */
type PipeState = "done" | "doing" | "todo";

function caseNameFrom(files: File[]): string {
  const first = files[0]?.name ?? "";
  return first.replace(/\.[^.]+$/, "").trim();
}

/** 开工指令：把类型说清楚，其余交给技能包的契约 */
function kickoff(kindLabel: string): string {
  return (
    `按「专利交底书」契约，为上面这些材料起草交底书。专利类型：${kindLabel}。\n` +
    "按这个顺序做，每一步只输出该步的成果，不要重复前面已经给过的内容：\n" +
    "1）挖出候选专利点 → 输出「专利点清单」；\n" +
    "2）按类型模板成文 → 输出交底书全文，用 <final-doc> 包裹；\n" +
    "3）逐条列出补强方向。\n" +
    "材料里没有写到的部件、参数、步骤一律不要编，汇总到「待确认清单」。\n" +
    "全程用中文书写，不要中英混排。"
  );
}

/** 相对路径：整目录上传时浏览器给 `webkitRelativePath`，单文件多选时只有文件名 */
function relPath(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return rel && rel.length ? rel : file.name;
}

interface TreeDir {
  name: string;
  path: string;
  dirs: TreeDir[];
  files: { name: string; size: number; index: number }[];
}

/** 把拍平的文件列表拼成目录树（用于「已解析项目文件树」） */
function buildTree(files: File[]): TreeDir {
  const root: TreeDir = { name: "", path: "", dirs: [], files: [] };
  files.forEach((file, index) => {
    const parts = relPath(file).split("/").filter(Boolean);
    const fileName = parts.pop() ?? file.name;
    let node = root;
    let acc = "";
    for (const seg of parts) {
      acc = acc ? `${acc}/${seg}` : seg;
      let next = node.dirs.find((d) => d.name === seg);
      if (!next) {
        next = { name: seg, path: acc, dirs: [], files: [] };
        node.dirs.push(next);
      }
      node = next;
    }
    node.files.push({ name: fileName, size: file.size, index });
  });
  return root;
}

/** 文件类型着色（只用于图标，帮助一眼认出源码 / 文档 / 配置） */
function fileTint(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["py", "ts", "tsx", "js", "jsx", "java", "go", "rs", "c", "cpp", "h"].includes(ext))
    return "text-[#2F7BE0]";
  if (["docx", "doc", "wps"].includes(ext)) return "text-[#2B579A]";
  if (ext === "pdf") return "text-[#DC2626]";
  if (["png", "jpg", "jpeg", "svg", "gif", "webp"].includes(ext)) return "text-[#2FA35C]";
  if (["json", "yaml", "yml", "toml", "xml"].includes(ext)) return "text-[#E9A41C]";
  return "text-[#9A9AA0]";
}

interface PointCard {
  title: string;
  body: string;
  level: "高" | "中" | "低" | null;
}

function levelOf(text: string): PointCard["level"] {
  const m = /(高|中|低)\s*可行性/.exec(text) ?? /可行性\s*[:：]\s*(高|中|低)/.exec(text);
  return (m?.[1] as PointCard["level"]) ?? null;
}

/**
 * 把「专利点清单」的 markdown 拆成卡片。
 *
 * 只按标题行切（`##`/`###`/`[点N]`）：模型写清单时用的就是这几种，猜得再花
 * 反而会把正文切碎；切不出来就退化成「还没有清单」的空态。
 */
function parsePointCards(markdown: string): PointCard[] {
  const cards: PointCard[] = [];
  let cur: { title: string; body: string[] } | null = null;
  const push = () => {
    if (!cur) return;
    const body = cur.body.join("\n").trim();
    cards.push({ title: cur.title, body, level: levelOf(`${cur.title}\n${body}`) });
  };
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    const head = /^#{2,4}\s+(.+)$/.exec(line);
    const bracket = /^(?:[-*]\s*)?\[(?:点|填)\s*\d+\]\s*(.+)$/.exec(line);
    const title = (head?.[1] ?? bracket?.[1])?.replace(/\*\*/g, "").trim();
    if (title) {
      push();
      cur = { title, body: [] };
    } else if (cur) {
      cur.body.push(raw);
    }
  }
  push();
  return cards.slice(0, 8);
}

const LEVEL_TINT: Record<string, string> = {
  高: "bg-[#FBF2EE] text-[#E2562B] dark:bg-[#2A1A14]",
  中: "bg-[#E9F1FD] text-[#2F7BE0] dark:bg-[#152233]",
  低: "bg-black/[0.04] text-[#9A9AA0] dark:bg-white/10",
};

export function DisclosureTask() {
  const t = useExtracted();
  usePageTitle(t({ id: "Disclosure page title", message: "交底书生成" }));

  const searchParams = useSearchParams();
  const resumeFrom = searchParams.get("case") || "";
  const [kind, setKind] = useState<PatentKind>("invention");
  const [files, setFiles] = useState<File[]>([]);
  const [caseTitle, setCaseTitle] = useState(searchParams.get("title") || "");
  const [running, setRunning] = useState(Boolean(resumeFrom));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pointsMd, setPointsMd] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{
    key: string;
    title: string;
    markdown: string;
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const chat = useAiChat({
    skill: "patent-disclosure",
    title: caseTitle,
    paused: !caseTitle && !resumeFrom,
    resumeFrom,
    // 刷新/重开接着上一条线（草稿 + 对话记录都还在）；点「新建案件」（?new=1）才开新的
    persistKey: "ai:patent-disclosure",
    fresh: searchParams.get("new") === "1",
  });

  const kindLabels = useMemo<Record<PatentKind, string>>(
    () => ({
      invention: t({ id: "Kind invention", message: "发明专利" }),
      utility_model: t({ id: "Kind utility model", message: "实用新型" }),
      design: t({ id: "Kind design", message: "外观设计" }),
    }),
    [t],
  );
  const kindKeys: PatentKind[] = ["invention", "utility_model", "design"];

  /** 顶部四步（设计稿：填入信息 → 识别交底要素 → 生成交底报告 → 生成 AI 优化版本） */
  const steps = [
    { key: "intake", label: t({ id: "Step intake", message: "填入信息" }) },
    { key: "extract", label: t({ id: "Step extract", message: "识别交底要素" }) },
    { key: "report", label: t({ id: "Step report", message: "生成交底报告" }) },
    { key: "polish", label: t({ id: "Step polish", message: "生成 AI 优化版本" }) },
  ];

  const specs: ArtifactSpec[] = [
    {
      key: "disclosure",
      title: t({ id: "Artifact disclosure", message: "交底书" }),
      hint: t({ id: "Artifact disclosure hint", message: "可交付的正文，Markdown 与 Word" }),
    },
    {
      key: "points",
      title: t({ id: "Artifact patent points", message: "专利点清单" }),
      hint: t({
        id: "Artifact patent points hint",
        message: "候选点及其新颖性与可保护边界",
      }),
      kind: "extra",
    },
  ];

  const has = (key: string) => chat.artifacts.some((a) => a.key === key);

  /** 技能包流水线（对图五项）：产物落地到哪一步，状态就走到哪一步 */
  const pipeline: { key: string; title: string; state: PipeState }[] = [
    {
      key: "scan",
      title: t({ id: "Pipe scan", message: "项目文档与代码扫描" }),
      state: running ? "done" : "todo",
    },
    {
      key: "points",
      title: t({ id: "Pipe points", message: "候选专利点挖掘与确认" }),
      state: has("points") ? "done" : running ? "doing" : "todo",
    },
    {
      key: "prior",
      title: t({ id: "Pipe prior", message: "国知局(CNIPA)联网查新与D1对比" }),
      state: "todo",
    },
    {
      key: "draft",
      title: t({
        id: "Pipe draft",
        message: "交底书分章成文与Mermaid框图生成",
      }),
      state: has("disclosure") ? "done" : "todo",
    },
    {
      key: "archive",
      title: t({ id: "Pipe archive", message: "脱敏自检与时间戳版本归档" }),
      state: chat.lastSaved ? "done" : "todo",
    },
  ];
  const doneCount = pipeline.filter((p) => p.state === "done").length;
  const activeStep = !running ? 0 : has("disclosure") ? 3 : has("points") ? 2 : 1;

  /** 快捷斜杠命令：就是把固定指令塞给助手，省得每次手打 */
  const slashCommands = [
    {
      key: "mine",
      label: t({ id: "Cmd mine patents", message: "挖掘专利点" }),
      prompt:
        "只输出「专利点清单」全文：逐条给出技术要点、可能的新颖点、保护边界与可申请类型建议。",
    },
    {
      key: "prior",
      label: t({ id: "Cmd cnipa search", message: "国知局查新" }),
      prompt: "做一次轻量查新：列出最接近的现有技术（D1、D2…），并逐条对比区别技术特征。",
    },
    {
      key: "mermaid",
      label: t({ id: "Cmd mermaid", message: "生成Mermaid框图" }),
      prompt:
        "按当前方案生成 Mermaid 系统框图（flowchart），件号与正文一致，用 <figure> 包裹。",
    },
    {
      key: "diff",
      label: t({ id: "Cmd version diff", message: "版本对比" }),
      prompt: "对比当前草稿与上一版，列出改动点（新增 / 修改 / 删除）以及改动理由。",
    },
  ];

  /** 候选专利点：清单产物更新一次就重取一次正文 */
  const pointsUpdated = useMemo(
    () => chat.artifacts.find((a) => a.key === "points")?.updated_at ?? 0,
    [chat.artifacts],
  );
  useEffect(() => {
    if (!pointsUpdated) {
      setPointsMd("");
      return;
    }
    let alive = true;
    void chat
      .loadArtifact("points")
      .then((md) => {
        if (alive) setPointsMd(md);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // loadArtifact 是每渲染新建的函数，这里只关心产物有没有更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsUpdated]);
  const pointCards = useMemo(() => parsePointCards(pointsMd), [pointsMd]);

  const tree = useMemo(() => buildTree(files), [files]);

  /** 上传完直接开工：材料进会话 → 发指令 */
  const startedRef = useRef(false);
  useEffect(() => {
    if (running || busy || !chat.sessionId || startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      setBusy(true);
      try {
        for (const f of files) {
          await chat.upload(f);
        }
        setRunning(true);
        await chat.send(kickoff(kindLabels[kind]));
      } catch (err) {
        setError(String(err instanceof Error ? err.message : err));
      } finally {
        setBusy(false);
      }
    })();
  }, [running, busy, chat, files, kind, kindLabels]);

  const generate = async (spec: ArtifactSpec) => {
    const prompts: Record<string, string> = {
      points:
        "只输出「专利点清单」全文：逐条给出技术要点、可能的新颖点、保护边界与可申请类型建议。",
      disclosure: "只输出交底书全文，按类型模板分章成文，用 <final-doc> 包裹。",
    };
    await chat.send(prompts[spec.key] ?? `只输出「${spec.title}」的全文。`);
    await chat.saveArtifactFromDraft(spec.key, spec.title);
  };

  const shareLink = async () => {
    if (!chat.sessionId) return;
    const url = `${window.location.origin}${window.location.pathname}?case=${chat.sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(url);
    }
  };

  /* ── 左列：项目与材料录入 ─────────────────────────────────────────── */
  const left = (
    <section className={cn(pt.card, "flex h-full min-h-0 flex-col overflow-hidden")}>
      <h2 className={pt.cardHead}>
        <FolderTree className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
        {t({ id: "Project and materials", message: "项目与材料录入" })}
      </h2>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 custom-scrollbar">
        {/* 专利类型选择器 */}
        <div>
          <p className="mb-2 text-[11.5px] font-medium text-[#9A9AA0]">
            {t({ id: "Patent type selector", message: "专利类型选择器" })}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {kindKeys.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-[12px] font-medium transition",
                  kind === k
                    ? "bg-[#E2562B] text-white shadow-[0_4px_10px_-6px_rgba(226,86,43,0.9)]"
                    : "border border-black/[0.08] text-[#5C5C60] hover:border-[#F2BBA3] hover:text-[#E2562B] dark:border-white/10 dark:text-slate-300",
                )}
              >
                {kindLabels[k]}
              </button>
            ))}
          </div>
        </div>

        {/* 文件夹扫描与文件上传区 */}
        <div>
          <p className="mb-2 text-[11.5px] font-medium text-[#9A9AA0]">
            {t({ id: "Project scan and upload", message: "文件夹扫描与文件上传区" })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(pt.dropzone, "px-3 py-4")}
            >
              <CloudUpload className="h-5 w-5 text-[#E2562B]" strokeWidth={1.8} />
              <span className="text-[12px] font-medium text-[#1A1A1A] dark:text-white">
                {t({ id: "Click to upload", message: "点击上传技术交底书" })}
              </span>
              <span className="text-[10.5px] text-[#8A8A8F]">
                {t({
                  id: "Upload disclosure hint cad",
                  message: "支持 DOC/PDF/图文 等格式",
                })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => dirRef.current?.click()}
              className={cn(pt.dropzone, "px-3 py-4")}
            >
              <FolderGit2 className="h-5 w-5 text-[#E2562B]" strokeWidth={1.8} />
              <span className="text-[12px] font-medium text-[#1A1A1A] dark:text-white">
                {t({ id: "Pick local project", message: "选择本地项目目录" })}
              </span>
              <span className="text-[10.5px] text-[#8A8A8F]">
                {t({
                  id: "Pick local project hint",
                  message: "扫描本地目录（Git 仓库）",
                })}
              </span>
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const next = Array.from(e.target.files ?? []);
              setFiles((prev) => [...prev, ...next]);
              if (!caseTitle && next[0]) setCaseTitle(caseNameFrom(next));
              e.target.value = "";
            }}
          />
          {/* 整目录上传：浏览器只给 `webkitdirectory` 这一条路（纯前端拿不到本地路径） */}
          <input
            ref={dirRef}
            type="file"
            multiple
            className="hidden"
            {...({ webkitdirectory: "true", directory: "true" } as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={(e) => {
              const next = Array.from(e.target.files ?? []);
              setFiles((prev) => [...prev, ...next]);
              if (!caseTitle && next[0]) setCaseTitle(caseNameFrom(next));
              e.target.value = "";
            }}
          />
        </div>

        {/* 已解析项目文件树：撑满左列剩余高度，空白落在树里而不是卡片下沿 */}
        <div className="flex min-h-[120px] flex-1 flex-col">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11.5px] font-medium text-[#9A9AA0]">
              {t({
                id: "Parsed file tree",
                message: "已解析项目文件树 ({count})",
                values: { count: String(files.length) },
              })}
            </p>
            {files.length ? (
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-[11px] text-[#9A9AA0] transition hover:text-[#DC2626]"
              >
                {t({ id: "Clear all", message: "清空" })}
              </button>
            ) : null}
          </div>
          {files.length ? (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-black/[0.05] p-1.5 custom-scrollbar dark:border-white/5">
              <TreeView
                node={tree}
                depth={0}
                collapsed={collapsed}
                onToggle={(path) =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(path)) next.delete(path);
                    else next.add(path);
                    return next;
                  })
                }
                onRemove={(index) =>
                  setFiles((prev) => prev.filter((_, j) => j !== index))
                }
              />
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-black/[0.1] px-3 py-5 text-center text-[11.5px] text-[#9A9AA0] dark:border-white/10">
              {t({ id: "No files yet", message: "还没有文件" })}
            </p>
          )}
          {running ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#28A05A]">
              <Check className="h-3 w-3" strokeWidth={3} />
              {t({ id: "Files parsed", message: "已解析为文本并交给助手" })}
            </p>
          ) : null}
        </div>

        {/* 成稿模板：材料管「写什么」，模板管「按什么结构写」 */}
        <div className="border-t border-black/[0.05] pt-3.5 dark:border-white/5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1A1A1A] dark:text-white">
              <FileText className="h-3.5 w-3.5 text-[#E2562B]" strokeWidth={2} />
              {t({ id: "Draft template", message: "成稿模板" })}
              <span className="text-[11px] font-normal text-[#9A9AA0]">
                {t({ id: "Optional", message: "可选" })}
              </span>
            </span>
            {chat.template ? (
              <button
                type="button"
                onClick={() => void chat.removeTemplate()}
                className="text-[11px] text-[#9A9AA0] transition hover:text-[#DC2626]"
              >
                {t({ id: "Remove template", message: "移除" })}
              </button>
            ) : null}
          </div>

          {chat.template ? (
            <p className="flex items-center gap-2 rounded-lg border border-black/[0.05] px-2.5 py-2 dark:border-white/5">
              <FileText className="h-3.5 w-3.5 shrink-0 text-[#9A9AA0]" />
              <span className="min-w-0 flex-1 truncate text-[12px] text-[#3C3C40] dark:text-slate-300">
                {chat.template.name}
              </span>
              <Check className="h-3.5 w-3.5 shrink-0 text-[#28A05A]" strokeWidth={2.5} />
            </p>
          ) : (
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed border-black/[0.1] px-2.5 py-2 text-[12px] text-[#6B6B70] transition hover:border-[#F2BBA3] hover:text-[#E2562B] dark:border-white/10 dark:text-slate-400">
              <span>{t({ id: "Upload template", message: "上传模板" })}</span>
              <Upload className="h-3.5 w-3.5" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void chat.uploadTemplate(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-[#9A9AA0]">
            {t({
              id: "Draft template hint",
              message: "不传模板时按技能包默认章节成文；传了则严格按模板的栏目与顺序写。",
            })}
          </p>
        </div>
      </div>
    </section>
  );

  /* ── 中列：Skill 执行工作流 + 产物 ─────────────────────────────────── */
  const center = (
    <section className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <div className={cn(pt.card, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
        <h2 className={pt.cardHead}>
          <Sparkles className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
          {t({ id: "Skill pipeline", message: "Skill 执行工作流（Pipeline）" })}
          <span className="ml-auto text-[11.5px] font-normal text-[#9A9AA0]">
            {doneCount}/{pipeline.length}
          </span>
        </h2>

        <div className="p-4">
          <p className="mb-2 text-[11.5px] font-medium text-[#9A9AA0]">
            {t({ id: "Workflow list", message: "工作流流水线" })}
          </p>
          <ol className="space-y-1.5">
            {pipeline.map((p, i) => (
              <li
                key={p.key}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition",
                  p.state === "doing"
                    ? "border-[#F2BBA3] bg-[#FBF2EE] dark:border-[#7A3B22] dark:bg-[#241713]"
                    : "border-transparent bg-black/[0.015] dark:bg-white/[0.02]",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    p.state === "done"
                      ? "bg-[#E8F7EE] text-[#28A05A]"
                      : p.state === "doing"
                        ? "bg-[#E2562B] text-white"
                        : "bg-black/[0.05] text-[#9A9AA0] dark:bg-white/10",
                  )}
                >
                  {p.state === "done" ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : p.state === "doing" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[12.5px]",
                    p.state === "doing"
                      ? "font-medium text-[#1A1A1A] dark:text-white"
                      : "text-[#5C5C60] dark:text-slate-300",
                  )}
                >
                  {p.title}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                    p.state === "done"
                      ? "bg-[#E8F7EE] text-[#28A05A]"
                      : p.state === "doing"
                        ? "bg-[#E2562B] text-white"
                        : "bg-black/[0.04] text-[#9A9AA0] dark:bg-white/10",
                  )}
                >
                  {p.state === "done"
                    ? t({ id: "Task done", message: "已完成" })
                    : p.state === "doing"
                      ? t({ id: "Pipe doing", message: "执行中" })
                      : t({ id: "Task todo", message: "待处理" })}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-black/[0.05] p-4 dark:border-white/5">
          <p className="mb-2 text-[11.5px] font-medium text-[#9A9AA0]">
            {t({ id: "Candidate points", message: "更新：候选专利点卡片区" })}
          </p>
          {pointCards.length ? (
            <div className="space-y-2">
              {pointCards.map((c, i) => (
                <article
                  key={`${c.title}-${i}`}
                  className="rounded-lg border border-black/[0.06] bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-[#1A1A1A] dark:text-white">
                      [点{i + 1}] {c.title}
                    </h4>
                    {c.level ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-medium",
                          LEVEL_TINT[c.level],
                        )}
                      >
                        {t({
                          id: "Feasibility",
                          message: "{level}可行性",
                          values: { level: c.level },
                        })}
                      </span>
                    ) : null}
                  </div>
                  {c.body ? (
                    <p className="mt-1.5 line-clamp-3 text-[11.5px] leading-relaxed text-[#8A8A8F]">
                      {c.body.replace(/[*#>`]/g, "").trim()}
                    </p>
                  ) : null}
                  <div className="mt-2 flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        void chat.send(
                          `确认专利点「${c.title}」，继续下一步：查新与成文。`,
                        )
                      }
                      disabled={!running || chat.streaming}
                      className="rounded-md border border-[#F2BBA3] px-2 py-0.5 text-[11px] font-medium text-[#E2562B] transition hover:bg-[#FBF2EE] disabled:opacity-40 dark:hover:bg-[#2A1A14]"
                    >
                      {t({ id: "Confirm point", message: "确认" })}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void chat.send(
                          `改写专利点「${c.title}」：保留技术方案，按权利要求口径重写标题与要点。`,
                        )
                      }
                      disabled={!running || chat.streaming}
                      className="rounded-md border border-black/[0.1] px-2 py-0.5 text-[11px] font-medium text-[#5C5C60] transition hover:border-black/25 disabled:opacity-40 dark:border-white/15 dark:text-slate-300"
                    >
                      {t({ id: "Edit point", message: "编辑" })}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-black/[0.1] px-3 py-6 text-center text-[11.5px] text-[#9A9AA0] dark:border-white/10">
              {t({
                id: "Points empty",
                message: "完成「候选专利点挖掘」后，专利点会显示在这里。",
              })}
            </p>
          )}
        </div>

        <p className="border-t border-black/[0.05] bg-black/[0.015] px-4 py-3 text-[11.5px] leading-relaxed text-[#8A8A8F] dark:border-white/5 dark:bg-[#121213]">
          {t({
            id: "Points next hint",
            message:
              "选中后将自动进入下一步查新与成文；无法自动识别的交底要素（CAD 细节、附图、特殊参数）可手动补传。",
          })}
        </p>
      </div>

      {running ? (
        <div className={cn(pt.card, "relative min-h-[300px] overflow-hidden")}>
          <ArtifactBoard
            specs={specs}
            artifacts={chat.artifacts}
            active={chat.activeArtifact}
            streaming={chat.streaming}
            busyKey={busyKey}
            onGenerate={(spec) => {
              setBusyKey(spec.key);
              void generate(spec).finally(() => setBusyKey(null));
            }}
            onPreview={async (spec) => {
              setBusyKey(spec.key);
              try {
                setPreview({
                  key: spec.key,
                  title: spec.title,
                  markdown: await chat.loadArtifact(spec.key),
                });
              } finally {
                setBusyKey(null);
              }
            }}
            onRemove={(spec) => void chat.removeArtifact(spec.key)}
            onSaveToDocs={async (spec) => {
              setBusyKey(spec.key);
              try {
                await chat.openArtifact(spec.key);
                await chat.saveNow();
              } finally {
                setBusyKey(null);
              }
            }}
            preview={preview}
            onClosePreview={() => setPreview(null)}
            extraTitle={t({ id: "Process drafts", message: "过程稿" })}
          />
        </div>
      ) : null}

      {/* 技能脚本产出的交付件（Word / Excel / 图）：能下载，也能收进「我的文档」 */}
      {running ? (
        <WorkspaceFiles
          sessionId={chat.sessionId}
          refreshKey={chat.artifacts.length}
        />
      ) : null}
    </section>
  );

  return (
    <div className="flex min-h-screen flex-col bg-white px-6 py-6 dark:bg-[#0F0F10]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col">
        {/* 标题区 */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#F2703F] to-[#D8411C] text-white shadow-[0_6px_14px_-8px_rgba(216,65,28,0.9)]">
              <FileText className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <h1 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-[#1A1A1A] dark:text-white">
                {t({ id: "Disclosure page title", message: "交底书生成" })}
              </h1>
              <p className="mt-0.5 text-[11.5px] text-[#8A8A8F]">
                {t({
                  id: "Disclosure page subtitle",
                  message:
                    "基于 patent-disclosure 技能包，AI 专利点挖掘与合规写作，提升交底书质量",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void chat.saveNow()}
              disabled={!running}
              className={cn(pt.btnGhost, "disabled:opacity-40")}
            >
              <Download className="h-3.5 w-3.5" />
              {t({ id: "Export", message: "导出" })}
            </button>
            <button
              type="button"
              onClick={() => void shareLink()}
              disabled={!chat.sessionId}
              className={cn(pt.btnGhost, "disabled:opacity-40")}
            >
              <Share2 className="h-3.5 w-3.5" />
              {copied
                ? t({ id: "Link copied", message: "已复制" })
                : t({ id: "Share", message: "分享" })}
            </button>
          </div>
        </div>

        {/* 步骤条 */}
        <ol className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 dark:border-white/10 dark:bg-[#171719]">
          {steps.map((s, i) => {
            const done = i < activeStep;
            const on = i === activeStep;
            return (
              <li key={s.key} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                    on
                      ? "bg-[#E2562B] text-white"
                      : done
                        ? "bg-[#E8F7EE] text-[#28A05A]"
                        : "bg-black/[0.05] text-[#9A9AA0] dark:bg-white/10",
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-[12.5px]",
                    on
                      ? "font-semibold text-[#1A1A1A] dark:text-white"
                      : "text-[#8A8A8F]",
                  )}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 ? (
                  <span className="ml-1 hidden h-px w-8 bg-black/[0.08] sm:block dark:bg-white/10" />
                ) : null}
              </li>
            );
          })}
        </ol>

        {/* 出错时在这里说一句（原来的占位卡已去掉，提示不能跟着丢） */}
        {error ? (
          <p className="mb-4 break-all rounded-xl bg-[#FEF2F2] px-4 py-2.5 text-[12px] text-[#DC2626] dark:bg-[#2A1214]">
            {error}
          </p>
        ) : null}

        {/* 三列：项目与材料 / 工作流 / PI 助手 */}
        <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col">{left}</div>
          <div className="flex min-w-0 flex-col">{center}</div>

          <section
            className={cn(pt.card, "flex h-full min-h-0 flex-col overflow-hidden")}
          >
            <h2 className={pt.cardHead}>
              <Sparkles className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
              <span className="min-w-0 truncate">
                {t({ id: "PI patent assistant", message: "PI 专利助手" })}{" "}
                <span className="font-normal text-[#9A9AA0]">
                  (patent-disclosure)
                </span>
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-[#E8F7EE] px-2 py-0.5 text-[11px] font-medium text-[#28A05A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#28A05A]" />
                {t({ id: "Local running", message: "本地运行" })}
              </span>
            </h2>

            {/* 快捷斜杠命令 */}
            <div className="border-b border-black/[0.05] px-4 py-3 dark:border-white/5">
              <p className="mb-2 text-[11.5px] font-medium text-[#9A9AA0]">
                {t({ id: "Slash commands", message: "快捷斜杠命令" })}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {slashCommands.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => void chat.send(c.prompt)}
                    disabled={!running || chat.streaming}
                    className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-2 text-left text-[11.5px] font-medium text-[#3C3C40] transition hover:border-[#F2BBA3] hover:text-[#E2562B] disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
                  >
                    <Zap className="h-3.5 w-3.5 shrink-0 text-[#E2562B]" strokeWidth={2} />
                    <span className="truncate">
                      /{c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <AgentPanel
                messages={chat.messages}
                materials={chat.materials}
                template={chat.template}
                streaming={chat.streaming}
                blocked={chat.blocked}
                sessionReady={!!chat.sessionId}
                modelLabel={
                  chat.health
                    ? `pi ${chat.health.pi.version ?? ""}`.trim()
                    : undefined
                }
                lastSaved={chat.lastSaved}
                onSend={(text) => void chat.send(text)}
                onStop={chat.stop}
                onUpload={chat.upload}
                onUploadTemplate={(file) => chat.uploadTemplate(file)}
                onRemoveTemplate={() => void chat.removeTemplate()}
                onRemoveMaterial={(name) => void chat.removeMaterial(name)}
                onAcceptChange={(key) => void chat.acceptChange(key)}
                onRejectChange={chat.rejectChange}
                onAcceptAll={() => void chat.acceptAll()}
                onSave={() => void chat.saveNow()}
                panelWidth="w-full"
                className="h-full min-h-0 border-none bg-transparent dark:bg-transparent"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** 文件树：目录可折叠，叶子是文件（按扩展名着色） */
function TreeView({
  node,
  depth,
  collapsed,
  onToggle,
  onRemove,
}: {
  node: TreeDir;
  depth: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <ul className={depth ? "ml-3 border-l border-black/[0.06] pl-1.5 dark:border-white/10" : ""}>
      {node.dirs.map((dir) => {
        const open = !collapsed.has(dir.path);
        return (
          <li key={dir.path}>
            <button
              type="button"
              onClick={() => onToggle(dir.path)}
              className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/5"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 text-[#B4B4BA] transition",
                  open && "rotate-90",
                )}
              />
              <Folder className="h-3.5 w-3.5 shrink-0 text-[#E9A41C]" strokeWidth={1.8} />
              <span className="truncate text-[11.5px] text-[#5C5C60] dark:text-slate-300">
                {dir.name}/
              </span>
            </button>
            {open ? (
              <TreeView
                node={dir}
                depth={depth + 1}
                collapsed={collapsed}
                onToggle={onToggle}
                onRemove={onRemove}
              />
            ) : null}
          </li>
        );
      })}
      {node.files.map((file) => (
        <li
          key={`${file.name}-${file.index}`}
          className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 transition hover:bg-black/[0.03] dark:hover:bg-white/5"
        >
          <FileText
            className={cn("h-3.5 w-3.5 shrink-0", fileTint(file.name))}
            strokeWidth={1.8}
          />
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-[#5C5C60] dark:text-slate-300">
            {file.name}
          </span>
          <span className="shrink-0 text-[10.5px] text-[#B4B4BA]">
            {Math.max(1, Math.round(file.size / 1024))}K
          </span>
          <button
            type="button"
            onClick={() => onRemove(file.index)}
            className="shrink-0 text-[#B4B4BA] opacity-0 transition group-hover:opacity-100 hover:text-[#DC2626]"
          >
            <X className="h-3 w-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default DisclosureTask;
