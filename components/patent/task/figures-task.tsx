"use client";

/**
 * 附图 / 线稿 —— 三列工作台（附图列表 / 附图画布 / PI 助手）。
 *
 * 这一页对应设计稿右下那一块，也是 A 类五大功能里先前漏掉的一项。刻意不依赖
 * 服务端脚本：`mermaid_render.py`、`structure_lineart_compose.py` 那条路要先开
 * shell 才能跑，而这里让模型直接给矢量图（内联 SVG 或 mermaid）、前端渲染——
 * 出图不依赖任何脚本权限。脚本那条路通了以后，只要它把 PNG 落到产物里，画布会
 * 直接显示（见 `figure-canvas.tsx` 的 image 分支）。
 *
 * 附图沿用 `patent-disclosure` 技能包：附图本来就是交底书的一部分，所以从
 * 「最近案件」点进来用 `resumeFrom` 恢复那条会话，图和稿子才在同一个上下文里。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, FileText, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useAiChat } from "@/hooks/use-ai-chat";
import { usePageTitle } from "@/hooks/use-page-title";
import { AgentPanel } from "@/components/studio/agent-panel";
import { cn } from "@/lib/utils";
import { pt } from "../theme";
import { WorkspaceFiles } from "../workspace-files";
import { FigureCanvas } from "../figures/figure-canvas";

/**
 * 两个口径：交底插图（能改、带色也行）与申请附图（黑白、件号锁定、合规范）。
 * 同一批图，两套要求——申请附图那一版是要递给国知局的，标准完全不同。
 */
type FigureUsage = "disclosure" | "application";

/** 三张附图对应交底书里真实会有的三种图，不是凑数 */
const FIGURES = [
  {
    key: "figure1",
    name: "附图 1 · 系统框图",
    hint: "模块与数据流",
    disclosure:
      "只输出附图 1：系统框图。用 ```mermaid 围栏写 flowchart，方框是系统模块、箭头是数据或控制流；模块名用中文。不要输出任何解释文字。",
    application:
      "只输出附图 1：系统框图（申请附图口径）。用 ```mermaid 围栏写 flowchart，**黑白线条**：不要彩色、不要填充底色、不要阴影；件号写成「101 模块名」挂在模块上，件号必须沿用说明书里已登记的编号，不得自创。不要输出任何解释文字。",
  },
  {
    key: "figure2",
    name: "附图 2 · 方法流程图",
    hint: "步骤 S1/S2…",
    disclosure:
      "只输出附图 2：方法流程图。用 ```mermaid 围栏写 flowchart TD，步骤标签里必须带上 S1、S2 这样的编号（写成 S1[\"S1 步骤文字\"]），编号要出现在图上。不要输出任何解释文字。",
    application:
      "只输出附图 2：方法流程图（申请附图口径）。用 ```mermaid 围栏写 flowchart TD，**黑白线条**、无填充无阴影；步骤写成 S1[\"S1 步骤文字\"]，步骤编号与说明书具体实施方式里的步骤一一对应。不要输出任何解释文字。",
  },
  {
    key: "figure3",
    name: "附图 3 · 结构示意图",
    hint: "部件与件号引出线",
    disclosure:
      "只输出附图 3：结构示意图。用内联 <svg …>…</svg> 画部件轮廓与连接关系，每个部件右上角标件号（101、102、103…），从件号画引出线连到部件本体，件号不得自创、沿用正文里的编号。不要输出任何解释文字。",
    application:
      "只输出附图 3：结构示意图（申请附图口径）。用内联 <svg …>…</svg> 画部件轮廓与连接关系，**纯黑白线条**：stroke 用 #000、fill 用 none 或 #fff，不要彩色、不要渐变、不要阴影；每个部件用一个件号（101、102…）并用引出线连到本体，件号必须沿用说明书里已登记的编号。不要输出任何解释文字。",
  },
] as const;

export function FiguresTask() {
  const t = useExtracted();
  usePageTitle(t({ id: "Figures task title", message: "Figures & Line Drawings" }));

  const searchParams = useSearchParams();
  const resumeFrom = searchParams.get("case") || "";
  const [caseTitle, setCaseTitle] = useState(searchParams.get("title") || "");
  const [activeKey, setActiveKey] = useState<string>(FIGURES[0].key);
  /** 用途口径：交底插图（素材，随便改）/ 申请附图（定稿，黑白合规范） */
  const [usage, setUsage] = useState<FigureUsage>("disclosure");
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chat = useAiChat({
    skill: "patent-disclosure",
    title: caseTitle,
    paused: !caseTitle && !resumeFrom,
    resumeFrom,
    // 刷新/重开接着上一条线：图与画布内容都还在
    persistKey: "ai:patent-figures",
  });

  const active = FIGURES.find((f) => f.key === activeKey) ?? FIGURES[0];
  const has = (key: string) => chat.artifacts.some((a) => a.key === key);

  /** 当前图源码里出现的件号（101、102…）——登记出来给人核对，避免和说明书对不上 */
  const partNumbers = useMemo(() => {
    const src = bodies[active.key] ?? "";
    return Array.from(
      new Set(src.match(/\b(?:10[1-9]|1[1-9]\d|[2-9]\d\d)\b/g) ?? []),
    );
  }, [bodies, active.key]);
  const modelLabel = chat.health
    ? `pi ${chat.health.pi.version ?? ""}`.trim()
    : undefined;

  /** 拉已画好的附图正文进画布（刷新或恢复案件后，画布不能是空的） */
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!chat.sessionId || !chat.artifacts.length) return;
    const wanted = chat.artifacts.filter((a) => FIGURES.some((f) => f.key === a.key));
    if (!wanted.length || loadedRef.current) return;
    loadedRef.current = true;
    void (async () => {
      const entries = await Promise.all(
        FIGURES.map(async (f): Promise<[string, string] | null> => {
          if (!wanted.some((a) => a.key === f.key)) return null;
          try {
            return [f.key, await chat.loadArtifact(f.key)];
          } catch {
            return null;
          }
        }),
      );
      const map: Record<string, string> = {};
      for (const e of entries) {
        if (e) map[e[0]] = e[1];
      }
      if (Object.keys(map).length) setBodies((prev) => ({ ...prev, ...map }));
    })();
  }, [chat, chat.artifacts]);

  const generate = async (key: string) => {
    const fig = FIGURES.find((f) => f.key === key);
    if (!fig) return;
    setBusyKey(key);
    setError(null);
    try {
      await chat.send(fig[usage]);
      await chat.saveArtifactFromDraft(fig.key, fig.name);
      const body = await chat.loadArtifact(fig.key);
      setBodies((prev) => ({ ...prev, [fig.key]: body }));
      setActiveKey(fig.key);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusyKey(null);
    }
  };

  /* ── 左列：案件 + 附图列表 ──────────────────────────────────────── */
  const left = (
    <div className="space-y-4">
      <section className={pt.card}>
        <h2 className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold text-[#1A1A1A] dark:text-white">
          <FileText className="h-4 w-4 text-[#D4542F]" strokeWidth={2} />
          {t({ id: "Section case basics", message: "The case" })}
        </h2>
        <label className="mb-1.5 block text-[13px] font-medium text-[#5C5C60] dark:text-slate-300">
          {t({ id: "Field case name", message: "Case name" })}
        </label>
        <input
          className={pt.input}
          value={caseTitle}
          maxLength={120}
          placeholder={t({
            id: "Placeholder case name",
            message: "e.g. A method and system for batch job scheduling",
          })}
          onChange={(e) => setCaseTitle(e.target.value)}
        />
        <p className={cn(pt.meta, "mt-2 text-[12px] leading-relaxed")}>
          {t({
            id: "Figures case hint",
            message: "附图跟交底书共用一个案件：在右边说明方案，助手按正文里的编号出图。",
          })}
        </p>
      </section>

      <section className={cn(pt.card, "overflow-hidden")}>
        <h2 className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-3 text-[14.5px] font-semibold text-[#1A1A1A] dark:border-white/5 dark:text-white">
          <Sparkles className="h-4 w-4 text-[#D4542F]" strokeWidth={2} />
          {t({ id: "Figure list", message: "Figures" })}
        </h2>
        <ul>
          {FIGURES.map((f) => {
            const done = has(f.key);
            const on = activeKey === f.key;
            return (
              <li
                key={f.key}
                className={cn(
                  "border-b border-black/[0.05] last:border-0 dark:border-white/5",
                  on && "bg-[#FDF9F7] dark:bg-white/[0.04]",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveKey(f.key)}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                      done
                        ? "bg-[#E8F9EC] text-[#2FA05A]"
                        : "bg-black/[0.05] text-[#9A9AA0] dark:bg-white/10",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" strokeWidth={3} /> : f.key.slice(-1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-[#1A1A1A] dark:text-white">
                      {f.name}
                    </span>
                    <span className="block text-[12px] text-[#9A9AA0]">{f.hint}</span>
                  </span>
                </button>
                <div className="flex items-center gap-1.5 px-4 pb-3">
                  <button
                    type="button"
                    onClick={() => void generate(f.key)}
                    disabled={!!busyKey || !chat.sessionId}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#D4542F] px-2.5 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-[#B8441F] disabled:opacity-40"
                  >
                    {busyKey === f.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {done
                      ? t({ id: "Redraw", message: "Redraw" })
                      : t({ id: "Draft it", message: "Draw it" })}
                  </button>
                  {done ? (
                    <button
                      type="button"
                      onClick={() => void chat.removeArtifact(f.key)}
                      className="ml-auto rounded-lg p-1.5 text-[#9A9AA0] transition hover:bg-black/[0.05] hover:text-[#DC2626] dark:hover:bg-white/10"
                      title={t({ id: "Remove", message: "Remove" })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );

  return (
    <div className={cn(pt.shell, "flex flex-col")}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white/85 px-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#0F0F10]/80">
        <a
          href="/patent"
          className="inline-flex items-center gap-1.5 text-[13.5px] text-[#5C5C60] transition hover:text-[#1A1A1A] dark:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {t({ id: "Back", message: "Back" })}
        </a>
        <span className="ml-auto text-[13px] text-[#9A9AA0]">
          {t({ id: "AI assistant", message: "AI assistant" })}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-[1560px] px-6 pb-8 pt-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FDF1EC] text-[#D4542F] dark:bg-[#2A1A14]">
                <FileText className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <div>
                <h1 className="text-[20px] font-bold leading-tight tracking-[-0.02em] text-[#1A1A1A] dark:text-white">
                  {t({ id: "Figures task title", message: "Figures & Line Drawings" })}
                </h1>
                <p className={cn(pt.meta, "mt-0.5")}>
                  {t({
                    id: "Figures task subtitle",
                    message:
                      "Block diagrams, flow charts and structure drawings with part numbers.",
                  })}
                </p>
              </div>
            </div>

            {/* 用途口径：交底插图随便改；申请附图是要递上去的，黑白 + 件号锁定 */}
            <div className="inline-flex items-center gap-1 rounded-lg border border-black/[0.08] p-1 dark:border-white/10">
              {(["disclosure", "application"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUsage(u)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition",
                    usage === u
                      ? "bg-[#E2562B] text-white"
                      : "text-[#5C5C60] hover:text-[#E2562B] dark:text-slate-300",
                  )}
                >
                  {u === "disclosure"
                    ? t({ id: "Usage disclosure figure", message: "交底插图" })
                    : t({ id: "Usage application figure", message: "申请附图" })}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)_23rem]">
            <div className="min-w-0 space-y-4">
              {left}
              {/* 技能脚本渲染出的图（PNG/SVG）会落到案件目录，这里能下载也能收进文档 */}
              <WorkspaceFiles
                sessionId={chat.sessionId}
                refreshKey={chat.artifacts.length}
              />
            </div>

            <div className={cn(pt.card, "flex min-h-[520px] flex-col overflow-hidden")}>
              <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.05] px-4 py-3 dark:border-white/5">
                <h2 className="text-[14px] font-semibold text-[#1A1A1A] dark:text-white">
                  {active.name}
                </h2>
                <span className={pt.chip}>{active.hint}</span>
                {error ? (
                  <span className="ml-auto text-[12.5px] text-[#DC2626]">{error}</span>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 bg-[#FBFBFC] dark:bg-[#121213]">
                {bodies[active.key] ? (
                  <FigureCanvas markdown={bodies[active.key]} title={active.name} />
                ) : (
                  <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 px-6 text-center">
                    <Sparkles className="h-7 w-7 text-[#D4542F]" strokeWidth={1.7} />
                    <p className="text-[14px] font-medium text-[#5C5C60] dark:text-slate-300">
                      {t({ id: "Figure empty", message: "Not drawn yet" })}
                    </p>
                    <p className="max-w-sm text-[12.5px] leading-relaxed text-[#9A9AA0]">
                      {chat.sessionId
                        ? t({
                            id: "Figure empty hint",
                            message:
                              "点左边的「画一版」，或先在右边把方案说清楚——助手按正文里的件号出图。",
                          })
                        : t({
                            id: "Figure need name",
                            message: "先在上面填个案件名，助手才有料可画。",
                          })}
                    </p>
                  </div>
                )}
              </div>

              {/* 件号登记 + 回流：图里的件号必须和说明书对得上，改完要能推回正文 */}
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-black/[0.05] px-4 py-2.5 dark:border-white/5">
                <span className="text-[11.5px] font-medium text-[#9A9AA0]">
                  {t({ id: "Part numbers", message: "件号登记" })}
                </span>
                {partNumbers.length ? (
                  partNumbers.map((n) => (
                    <span
                      key={n}
                      className="rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-[#5C5C60] dark:bg-white/10 dark:text-slate-300"
                    >
                      {n}
                    </span>
                  ))
                ) : (
                  <span className="text-[11.5px] text-[#B4B4BA]">
                    {t({ id: "No part numbers", message: "这张图里还没件号" })}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      void chat.send(
                        `对照材料和交底书正文，校验「${active.name}」里的件号是否与正文一致：` +
                          "列出正文里出现的部件与编号、这张图里出现的编号，" +
                          "指出不一致或图上缺失的，只列问题、不要重画。",
                      )
                    }
                    disabled={!chat.sessionId || chat.streaming}
                    className="rounded-md border border-black/[0.1] px-2 py-1 text-[11px] font-medium text-[#5C5C60] transition hover:border-black/25 disabled:opacity-40 dark:border-white/15 dark:text-slate-300"
                  >
                    {t({ id: "Check part numbers", message: "校验件号" })}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void chat.send(
                        `把「${active.name}」插入交底书正文的附图位置：` +
                          "在正文对应位置写上「图 N …」的引用，件号与图保持一致；" +
                          "只改这一处，不要重写全文。",
                      )
                    }
                    disabled={!chat.sessionId || chat.streaming}
                    className="rounded-md border border-[#F2BBA3] px-2 py-1 text-[11px] font-medium text-[#E2562B] transition hover:bg-[#FBF2EE] disabled:opacity-40 dark:hover:bg-[#2A1A14]"
                  >
                    {t({ id: "Push to draft", message: "推入正文" })}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#171719] xl:h-[calc(100vh-13rem)]">
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
                className="border-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
