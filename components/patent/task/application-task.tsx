"use client";

/**
 * 申请文件四件套 —— 严格照设计稿（案件信息 + 四件套 tab + PI 助手 + 底部导出）。
 *
 * 与交底页的差别：这里没有「上传即开工」，而是**先把交底定稿、再逐件生成**——
 * 设计稿就是这个样子：案件信息在最上面，四件套用 tab 摊开，右边助手随时追问，
 * 底部一个「保存并导出」收口。所以中列不做任务进度，直接做 tab。
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  FileText,
  FolderOpen,
  Lightbulb,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { useAiChat } from "@/hooks/use-ai-chat";
import { usePageTitle } from "@/hooks/use-page-title";
import { AgentPanel } from "@/components/studio/agent-panel";
import { cn } from "@/lib/utils";
import { pt } from "../theme";
import { WorkspaceFiles } from "@/components/studio/workspace-files";

/** 四件套的 tab（设计稿：说明书 / 权利要求书 / 摘要 / 附图） */
const TABS = [
  {
    key: "description",
    label: "说明书",
    prompt:
      "只输出「说明书」全文，按技术领域 / 背景技术 / 发明内容 / 附图说明 / 具体实施方式分章成文，用 <final-doc> 包裹。",
  },
  {
    key: "claims",
    label: "权利要求书",
    prompt:
      "只输出「权利要求书」全文：独权写必要技术特征，从属权要逐层收窄，每条权要的每个特征都要能在说明书里找到支撑，用 <final-doc> 包裹。",
  },
  {
    key: "abstract",
    label: "摘要",
    prompt: "只输出「摘要」全文，300 字以内，用 <final-doc> 包裹。",
  },
  {
    key: "figures",
    label: "附图",
    prompt: "只输出「附图」清单：逐幅说明图号、图名与附图标记。",
  },
] as const;

export function ApplicationTask() {
  const t = useExtracted();
  usePageTitle(t({ id: "Application task title", message: "申请文件四件套" }));

  const searchParams = useSearchParams();
  const resumeFrom = searchParams.get("case") || "";
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<string>("description");
  const [files, setFiles] = useState<File[]>([]);
  const [inventors, setInventors] = useState([{ name: "", phone: "", email: "" }]);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chat = useAiChat({
    skill: "patent-application",
    title: "Application Four-Piece Set",
    paused: !files.length && !resumeFrom,
    resumeFrom,
    // 刷新/重开接着上一条线：四件套产物与对话记录都还在
    persistKey: "ai:patent-application",
  });

  const has = (key: string) => chat.artifacts.some((a) => a.key === key);
  const doneCount = TABS.filter((x) => has(x.key)).length;
  const modelLabel = chat.health
    ? `pi ${chat.health.pi.version ?? ""}`.trim()
    : undefined;

  const generate = async (key: string) => {
    const item = TABS.find((x) => x.key === key);
    if (!item) return;
    setBusyKey(key);
    setError(null);
    try {
      await chat.send(item.prompt);
      await chat.saveArtifactFromDraft(item.key, item.label);
      const body = await chat.loadArtifact(item.key);
      setBodies((prev) => ({ ...prev, [key]: body }));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusyKey(null);
    }
  };

  /** 交底传上来 → 立刻起草第一件（说明书） */
  const startedRef = useRef(false);
  useEffect(() => {
    if (!files.length || !chat.sessionId || startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      const brief = inventors.some((p) => p.name.trim())
        ? `发明人：${inventors
            .filter((p) => p.name.trim())
            .map((p) => `${p.name.trim()}${p.phone ? `（${p.phone}）` : ""}`)
            .join("、")}`
        : "";
      await chat.upload(
        new File([brief || "（以上传的技术交底为准）"], "application-info.md", {
          type: "text/markdown",
        }),
      );
      for (const f of files) {
        await chat.upload(f);
      }
      await generate("description");
    })();
  }, [files, chat, inventors]);

  /* ── 左列：案件信息 ─────────────────────────────────────────────── */
  const left = (
    <div className="space-y-4">
      <section className={pt.card}>
        <h2 className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-3 text-[14px] font-semibold text-[#1A1A1A] dark:border-white/5 dark:text-white">
          <FolderOpen className="h-4 w-4 text-[#D4542F]" strokeWidth={2} />
          {t({ id: "Case info", message: "案件信息" })}
        </h2>
        <div className="space-y-3 p-4">
          <div>
            <span className="mb-1.5 block text-[12.5px] font-medium text-[#6B6B70] dark:text-slate-400">
              {t({ id: "Inventor info", message: "发明人信息" })}
            </span>
            <div className="space-y-2">
              {inventors.map((p, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input
                    className={cn(pt.input, "text-[12.5px]")}
                    placeholder={t({ id: "Placeholder inventor name", message: "姓名" })}
                    value={p.name}
                    onChange={(e) =>
                      setInventors((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    className={cn(pt.input, "text-[12.5px]")}
                    placeholder={t({ id: "Placeholder inventor phone", message: "电话" })}
                    value={p.phone}
                    onChange={(e) =>
                      setInventors((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, phone: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    className={cn(pt.input, "text-[12.5px]")}
                    placeholder={t({ id: "Placeholder inventor email", message: "邮箱" })}
                    value={p.email}
                    onChange={(e) =>
                      setInventors((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, email: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setInventors((prev) => [...prev, { name: "", phone: "", email: "" }])
                }
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#D4542F]"
              >
                <Plus className="h-3 w-3" />
                {t({ id: "Add inventor", message: "添加发明人" })}
              </button>
            </div>
          </div>

          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-[#6B6B70] dark:text-slate-400">
              <Upload className="h-3.5 w-3.5 text-[#D4542F]" />
              {t({ id: "Material upload", message: "材料上传" })}
            </span>
            <ul className="mb-2 space-y-1.5">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-black/[0.05] px-2.5 py-2 dark:border-white/5"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[#9A9AA0]" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#3C3C40] dark:text-slate-300">
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="shrink-0 text-[#9A9AA0] transition hover:text-[#DC2626]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg bg-[#D4542F] px-3 py-2 text-[12.5px] font-medium text-white transition hover:bg-[#B8441F]"
            >
              {t({ id: "Upload disclosure cta", message: "上传交底书" })}
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
          </div>

          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-[#6B6B70] dark:text-slate-400">
              <FolderOpen className="h-3.5 w-3.5 text-[#D4542F]" />
              {t({ id: "Disclosure pick", message: "交底书选择" })}
            </span>
            <p className="rounded-lg bg-[#FBFBFC] px-3 py-2 text-[11.5px] leading-relaxed text-[#8A8A8F] dark:bg-[#121213]">
              {t({
                id: "Disclosure pick hint",
                message: "从最近案件里选，或直接上传交底书文件。",
              })}
            </p>
          </div>
        </div>
      </section>
    </div>
  );

  /* ── 中列：四件套 tab ───────────────────────────────────────────── */
  const center = (
    <section className={cn(pt.card, "flex h-full flex-col overflow-hidden")}>
      <div className="flex items-center gap-1 border-b border-black/[0.05] px-3 py-2.5 dark:border-white/5">
        {TABS.map((x) => {
          const on = tab === x.key;
          const done = has(x.key);
          return (
            <button
              key={x.key}
              type="button"
              onClick={() => setTab(x.key)}
              className={cn(
                "relative rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition",
                on
                  ? "bg-[#FDF1EC] text-[#D4542F]"
                  : "text-[#6B6B70] hover:bg-black/[0.04] dark:text-slate-400 dark:hover:bg-white/5",
              )}
            >
              {x.label}
              {done ? (
                <Check className="ml-1 inline h-3 w-3 text-[#2FA05A]" strokeWidth={3} />
              ) : null}
            </button>
          );
        })}
        <span className="ml-auto text-[11.5px] text-[#9A9AA0]">
          {doneCount}/{TABS.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {(() => {
          const item = TABS.find((x) => x.key === tab) ?? TABS[0];
          const body = bodies[item.key];
          return (
            <div className="flex h-full flex-col">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-[#1A1A1A] dark:text-white">
                  {item.label}
                </h3>
                {body ? (
                  <span className="rounded-md bg-[#EAF7EE] px-2 py-0.5 text-[11px] font-medium text-[#2FA05A]">
                    {t({ id: "Generated", message: "已生成" })}
                  </span>
                ) : null}
              </div>

              {body ? (
                <pre className="min-h-[320px] flex-1 whitespace-pre-wrap rounded-xl border border-black/[0.06] bg-[#FBFBFC] p-4 font-sans text-[13px] leading-relaxed text-[#3C3C40] dark:border-white/5 dark:bg-[#121213] dark:text-slate-300">
                  {body}
                </pre>
              ) : (
                <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#F3C3AC] bg-[#FDF1EC] px-6 text-center">
                  <Sparkles className="h-6 w-6 text-[#D4542F]" strokeWidth={1.7} />
                  <p className="mt-2 text-[13.5px] font-medium text-[#3C3C40] dark:text-slate-300">
                    {t({ id: "Not generated", message: "还没生成" })}
                  </p>
                  <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-[#9A9AA0]">
                    {t({
                      id: "Not generated hint",
                      message: "上传交底书后助手会自动起草这一件，也可以手动让助手重写。",
                    })}
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void generate(item.key)}
                  disabled={!!busyKey || !chat.sessionId}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4542F] px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-[#B8441F] disabled:opacity-40"
                >
                  {busyKey === item.key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {body
                    ? t({ id: "Redraft", message: "重新生成" })
                    : t({ id: "Generate now", message: "立即生成" })}
                </button>
                {body ? (
                  <button
                    type="button"
                    onClick={() => void chat.removeArtifact(item.key)}
                    className="rounded-lg px-3 py-2 text-[12.5px] text-[#9A9AA0] transition hover:text-[#DC2626]"
                  >
                    {t({ id: "Delete", message: "删除" })}
                  </button>
                ) : null}
                {error ? (
                  <span className="text-[12px] text-[#DC2626]">{error}</span>
                ) : null}
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );

  return (
    <div className="flex h-full flex-col bg-[#F7F7F8] dark:bg-[#0F0F10]">
      <div className="flex-1 overflow-y-auto px-8 py-6 pb-28 custom-scrollbar">
        {/* 标题区 */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF1EC] text-[#D4542F] dark:bg-[#2A1A14]">
              <FileText className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div>
              <h1 className="text-[20px] font-bold leading-tight tracking-[-0.02em] text-[#1A1A1A] dark:text-white">
                {t({ id: "Application page title", message: "申请文件四件套" })}
              </h1>
              <p className="mt-1 text-[12.5px] text-[#8A8A8F]">
                {t({
                  id: "Application page subtitle",
                  message: "技术交底转说明书、权利要求书、摘要与附图",
                })}
              </p>
            </div>
          </div>
          <span className="rounded-md bg-[#FDF3E3] px-2.5 py-1 text-[11.5px] font-medium text-[#C98A16]">
            {t({ id: "Drafting", message: "撰写中" })}
          </span>
        </div>

        {/* 案件信息 + 四件套 + PI 助手 */}
        <div className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)_21rem]">
          <div className="min-w-0 space-y-4">
            {left}
            {/* 技能脚本产出的四件套 Word / 图：能下载，也能收进「我的文档」 */}
            <WorkspaceFiles
              sessionId={chat.sessionId}
              refreshKey={chat.artifacts.length}
            />
          </div>
          <div className="min-w-0">{center}</div>

          <div className="min-w-0 space-y-4">
            <section
              className={cn(pt.card, "flex h-[520px] flex-col overflow-hidden")}
            >
              <h2 className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-3 text-[14px] font-semibold text-[#1A1A1A] dark:border-white/5 dark:text-white">
                <Sparkles className="h-4 w-4 text-[#D4542F]" strokeWidth={2} />
                {t({ id: "PI assistant", message: "PI 助手" })}
                <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-[#EAF7EE] px-2 py-0.5 text-[11px] font-medium text-[#2FA05A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2FA05A]" />
                  {t({ id: "Local running", message: "本地运行" })}
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
                  onRemoveMaterial={(name) => void chat.removeMaterial(name)}
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
                <Lightbulb className="h-4 w-4 text-[#D4542F]" strokeWidth={2} />
                {t({ id: "Legal assistant", message: "智能法律助手" })}
              </h3>
              <ul className="mt-2.5 space-y-1.5">
                {[
                  t({ id: "Legal tip 1", message: "检查权利要求是否被说明书支持" }),
                  t({ id: "Legal tip 2", message: "提示独权必要特征是否写全" }),
                  t({ id: "Legal tip 3", message: "核对摘要字数与术语一致性" }),
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-1.5 text-[11.5px] text-[#6B6B70] dark:text-slate-400">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#D4542F]" />
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {/* 底部：保存并导出 */}
      <div className="shrink-0 border-t border-black/[0.06] bg-white/90 px-8 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0F0F10]/85">
        <button
          type="button"
          onClick={() => void chat.saveNow()}
          disabled={!doneCount}
          className="mx-auto flex w-full max-w-[220px] items-center justify-center gap-1.5 rounded-lg bg-[#D4542F] px-4 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-[#B8441F] disabled:opacity-40"
        >
          {t({ id: "Save and export", message: "保存并导出" })}
        </button>
      </div>
    </div>
   );
}
