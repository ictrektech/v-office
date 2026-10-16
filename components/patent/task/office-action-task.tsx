"use client";

/**
 * 审查答复 —— 左右对照工作台（通知书分条 / 逐条答复 / PI 助手）。
 *
 * 与另外三页的根本差别：这里的「最小单元」是**通知书里的一条意见**，不是一篇
 * 文档。所以左边是分条列表、中间是选中那一条的答复，进度按「条」算。
 *
 * 分条交给助手做（它读用户上传的通知书原件），前端只负责解析成条目并允许
 * **人工增删改**——漏掉一条意见是灾难性的，纯自动不能信。
 *
 * 技能包（patent-oa）自己的护栏也要遵守：禁止写稿前停下来等用户勾选策略、
 * 禁止做成「策略卡片墙」。所以这里是 AI 定完策略、把理由讲出来，人来推翻。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Download,
  FileText,
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

/** 通知书分条结果的 artifact key */
const NOTICE_KEY = "notice-items";

/** 答复草稿的 artifact key（第 N 条 → `oa-N`） */
const answerKey = (index: number) => `oa-${index + 1}`;

interface NoticeItem {
  /** 条目标题，例如「权要 1 不具备创造性」 */
  title: string;
  /** 审查员观点原文（含引用） */
  body: string;
  /** 抓出来的法条 */
  statute: string;
  /** 抓出来的对比文件号 */
  refs: string;
}

const STATUTE_RE =
  /(?:专利法|专利法实施细则|实施细则)[^，。；、\n]{0,24}?第\s*[0-9一二三四五六七八九十]+\s*条(?:第\s*\d+\s*款)?/g;
const REF_RE = /\b(?:CN|US|EP|JP|KR|WO)\s?\d{6,}[A-Z]?\d?\b/g;

/** 标题行：`## xxx` 或 `第 1 条：xxx` 都认 */
function headTitle(line: string): string | null {
  const heading = /^#{2,4}\s+(.+)$/.exec(line);
  if (heading) return heading[1].replace(/\*\*/g, "").trim();
  const numbered = /^\[?第\s*([0-9一二三四五六七八九十]+)\s*条\]?[：:\s]*(.*)$/.exec(line);
  if (numbered) return `第 ${numbered[1]} 条 ${numbered[2]}`.trim();
  return null;
}

/**
 * 把「通知书分条」的 markdown 拆成条目。
 *
 * 只按标题切（`##` / `第 N 条`）：助手本来就按这个口径写，猜得再花只会把正文
 * 切碎；切不出来就退化成空态，让人手动加。
 */
function parseNotice(markdown: string): NoticeItem[] {
  const items: NoticeItem[] = [];
  let cur: { title: string; body: string[] } | null = null;
  const push = () => {
    if (!cur) return;
    const body = cur.body.join("\n").trim();
    const statutes = Array.from(new Set(body.match(STATUTE_RE) ?? []));
    const refs = Array.from(new Set(body.match(REF_RE) ?? []));
    items.push({
      title: cur.title,
      body,
      statute: statutes.join(" / "),
      refs: refs.join("、"),
    });
  };
  for (const raw of markdown.split("\n")) {
    const title = headTitle(raw.trim());
    if (title) {
      push();
      cur = { title, body: [] };
    } else if (cur) {
      cur.body.push(raw);
    }
  }
  push();
  return items;
}

/** 分条指令：明确要求「一条一段、带法条与对比文件号」 */
const SPLIT_PROMPT =
  "读上面这份审查意见通知书（原件在 materials/ 下，先用 tools/pdf_text.py 抽取），" +
  "把它拆成逐条缺陷清单。每条按这个格式输出，不要写别的内容：\n\n" +
  "## 第 N 条：<一句话概括这条意见>\n" +
  "- 法条：<审查员引用的法条，没有就写“未引用”>\n" +
  "- 对比文件：<CN… 等，没有就写“无”>\n" +
  "- 审查员观点：<原文要点，尽量保留关键表述>\n" +
  "用 <final-doc> 与 </final-doc> 包裹整份清单。";

export function OfficeActionTask() {
  const t = useExtracted();
  usePageTitle(t({ id: "Office action title", message: "审查答复" }));

  const searchParams = useSearchParams();
  const resumeFrom = searchParams.get("case") || "";
  const [caseTitle, setCaseTitle] = useState(searchParams.get("title") || "");
  const [noticeMd, setNoticeMd] = useState("");
  const [manual, setManual] = useState<NoticeItem[]>([]);
  const [active, setActive] = useState(0);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);

  const chat = useAiChat({
    skill: "patent-oa",
    title: caseTitle,
    paused: !caseTitle && !resumeFrom,
    resumeFrom,
    // 刷新/重开接着上一条线：分条结果与逐条答复都还在
    persistKey: "ai:patent-oa",
    fresh: searchParams.get("new") === "1",
  });

  /** 分条结果：助手解析出来的 + 人工补的 */
  const parsed = useMemo(() => parseNotice(noticeMd), [noticeMd]);
  const items = useMemo(() => [...parsed, ...manual], [parsed, manual]);

  const hasAnswer = (index: number) =>
    chat.artifacts.some((a) => a.key === answerKey(index));
  const doneCount = items.filter((_, i) => hasAnswer(i)).length;

  /** 分条产物更新一次，就把正文取回来重新解析 */
  const noticeUpdated = useMemo(
    () => chat.artifacts.find((a) => a.key === NOTICE_KEY)?.updated_at ?? 0,
    [chat.artifacts],
  );
  useEffect(() => {
    if (!noticeUpdated) {
      setNoticeMd("");
      return;
    }
    let alive = true;
    void chat
      .loadArtifact(NOTICE_KEY)
      .then((md) => {
        if (alive) setNoticeMd(md);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // loadArtifact 每次渲染都是新函数，这里只关心产物有没有更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeUpdated]);

  /** 上传通知书 → 自动分条；上传即开工 */
  useEffect(() => {
    if (startedRef.current || !chat.sessionId || !caseTitle) return;
    startedRef.current = true;
    void (async () => {
      setBusyKey("split");
      try {
        await chat.send(SPLIT_PROMPT);
        await chat.saveArtifactFromDraft(
          NOTICE_KEY,
          t({ id: "Notice items", message: "通知书分条" }),
        );
        const md = await chat.loadArtifact(NOTICE_KEY);
        setNoticeMd(md);
      } catch (err) {
        setError(String(err instanceof Error ? err.message : err));
      } finally {
        setBusyKey(null);
      }
    })();
  }, [chat, caseTitle, t]);

  /** 起草某一条的答复 */
  const draft = useCallback(
    async (item: NoticeItem, index: number) => {
      const key = answerKey(index);
      setBusyKey(key);
      setError(null);
      try {
        await chat.send(
          `针对上面清单里的「${item.title}」这一条起草答复。\n\n` +
            "要求：\n" +
            "1）先概括审查员观点，再写申请人意见，一一对应；\n" +
            "2）创造性类缺陷按审查指南的三步法组织理由（最接近的现有技术 → " +
            "区别技术特征与实际解决的技术问题 → 是否显而易见）；\n" +
            "3）需要修改权利要求时，明确写出改了哪一条、加了什么特征、为什么" +
            "不超范围；不需要修改就说明只争辩的理由；\n" +
            "4）只输出这一条的答复正文，用 <final-doc> 包裹，不要输出其他条目。",
        );
        await chat.saveArtifactFromDraft(
          key,
          t(
            { id: "Answer for item", message: "第 {n} 条答复", values: { n: String(index + 1) } },
          ),
        );
        const body = await chat.loadArtifact(key);
        setBodies((prev) => ({ ...prev, [key]: body }));
      } catch (err) {
        setError(String(err instanceof Error ? err.message : err));
      } finally {
        setBusyKey(null);
      }
    },
    [chat, t],
  );

  /** 汇总成意见陈述书并落「我的文档」 */
  const exportStatement = async () => {
    setSaving(true);
    setError(null);
    try {
      await chat.send(
        "把上面各条答复汇总成《意见陈述书》正文：先写受理信息与感谢语，" +
          "再逐条对应（一、二、三…），最后写修改说明（改了哪些权要、为什么）。" +
          "用 <final-doc> 包裹全文。",
      );
      await chat.saveNow();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  };

  const removeManual = (index: number) =>
    setManual((prev) => prev.filter((_, i) => i !== index));

  const current = items[active];

  /* ── 左列：通知书分条 ─────────────────────────────────────────────── */
  const left = (
    <section className={cn(pt.card, "flex h-full min-h-0 flex-col overflow-hidden")}>
      <h2 className={pt.cardHead}>
        <FileText className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
        {t({ id: "Notice items", message: "通知书分条" })}
        <span className="ml-auto text-[11.5px] font-normal text-[#9A9AA0]">
          {items.length}
        </span>
      </h2>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 custom-scrollbar">
        {items.map((item, i) => (
          <button
            key={`${item.title}-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "w-full rounded-lg border px-3 py-2.5 text-left transition",
              i === active
                ? "border-[#F2BBA3] bg-[#FBF2EE] dark:border-[#7A3B22] dark:bg-[#241713]"
                : "border-black/[0.06] hover:border-[#F2BBA3] dark:border-white/10",
            )}
          >
            <span className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  hasAnswer(i)
                    ? "bg-[#E8F7EE] text-[#28A05A]"
                    : "bg-black/[0.05] text-[#9A9AA0] dark:bg-white/10",
                )}
              >
                {hasAnswer(i) ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium leading-snug text-[#1A1A1A] dark:text-white">
                  {item.title}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {item.statute ? (
                    <span className="rounded bg-[#FDECF2] px-1.5 py-0.5 text-[10.5px] text-[#D9538A] dark:bg-[#2A1620]">
                      {item.statute}
                    </span>
                  ) : null}
                  {item.refs ? (
                    <span className="rounded bg-[#E9F1FD] px-1.5 py-0.5 text-[10.5px] text-[#2F7BE0] dark:bg-[#152233]">
                      {item.refs}
                    </span>
                  ) : null}
                </span>
              </span>
            </span>
          </button>
        ))}

        {items.length ? null : (
          <p className="rounded-lg border border-dashed border-black/[0.1] px-3 py-6 text-center text-[11.5px] text-[#9A9AA0] dark:border-white/10">
            {busyKey === "split"
              ? t({ id: "Splitting notice", message: "正在读通知书并分条…" })
              : t({
                  id: "Notice empty",
                  message: "上传审查意见通知书后，助手会逐条拆出来放在这里。",
                })}
          </p>
        )}

        <button
          type="button"
          onClick={() =>
            setManual((prev) => [
              ...prev,
              { title: t({ id: "Untitled item", message: "新条目" }), body: "", statute: "", refs: "" },
            ])
          }
          className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/[0.12] px-3 py-2 text-[12px] text-[#6B6B70] transition hover:border-[#F2BBA3] hover:text-[#E2562B] dark:border-white/15 dark:text-slate-400"
        >
          <Plus className="h-3.5 w-3.5" />
          {t({ id: "Add item manually", message: "手动加一条" })}
        </button>
      </div>
    </section>
  );

  /* ── 中列：选中那一条的答复 ───────────────────────────────────────── */
  const center = (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <div className={cn(pt.card, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
        <h2 className={pt.cardHead}>
          <Sparkles className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
          {current
            ? t(
                {
                  id: "Answer heading",
                  message: "第 {n} 条答复",
                  values: { n: String(active + 1) },
                },
              )
            : t({ id: "Answer", message: "答复" })}
          <span className="ml-auto text-[11.5px] font-normal text-[#9A9AA0]">
            {doneCount}/{items.length}
          </span>
        </h2>

        {current ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 custom-scrollbar">
            <div>
              <p className="mb-1.5 flex items-center gap-2">
                <span className="text-[12.5px] font-semibold text-[#1A1A1A] dark:text-white">
                  {current.title}
                </span>
                {manual.includes(current) ? (
                  <button
                    type="button"
                    onClick={() => removeManual(manual.indexOf(current))}
                    className="text-[#9A9AA0] transition hover:text-[#DC2626]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </p>
              <div className="rounded-lg border border-black/[0.06] bg-black/[0.015] p-3 text-[12px] leading-relaxed whitespace-pre-wrap text-[#5C5C60] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                {current.body ||
                  t({ id: "Item body empty", message: "（这条没有正文，可在右侧助手补充）" })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void draft(current, active)}
                disabled={!chat.sessionId || chat.streaming}
                className={cn(pt.btnPrimary, "disabled:opacity-40")}
              >
                {busyKey === answerKey(active) ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {hasAnswer(active)
                  ? t({ id: "Redraft answer", message: "重新起草这条答复" })
                  : t({ id: "Draft answer", message: "起草这条答复" })}
              </button>
              <span className="text-[11.5px] text-[#9A9AA0]">
                {t({
                  id: "Strategy by agent",
                  message: "策略由助手判定并给理由，不认可就让它改",
                })}
              </span>
            </div>

            <div>
              <p className="mb-1.5 text-[11.5px] font-medium text-[#9A9AA0]">
                {t({ id: "Answer draft", message: "答复草稿" })}
              </p>
              {bodies[answerKey(active)] ? (
                <div className="rounded-lg border border-black/[0.06] p-3 text-[12px] leading-relaxed whitespace-pre-wrap text-[#3C3C40] dark:border-white/10 dark:text-slate-300">
                  {bodies[answerKey(active)]}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-black/[0.1] px-3 py-6 text-center text-[11.5px] text-[#9A9AA0] dark:border-white/10">
                  {t({
                    id: "Answer empty",
                    message: "还没起草。点上面的按钮，助手会按三步法写这一条。",
                  })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <FileText className="h-6 w-6 text-[#E2562B]" strokeWidth={1.7} />
            <p className="mt-2 text-[13px] font-medium text-[#3C3C40] dark:text-slate-300">
              {t({ id: "Upload notice first", message: "先上传审查意见通知书" })}
            </p>
            <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-[#9A9AA0]">
              {t({
                id: "Upload notice hint",
                message:
                  "原件直接交给助手，它抽正文、逐条拆意见；拆完可以人工增删，再逐条起草答复。",
              })}
            </p>
          </div>
        )}
      </div>

      {/* 意见陈述 Word、驳回映射 Excel 这类交付件都会落到案件目录里 */}
      {chat.sessionId ? (
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#F2703F] to-[#D8411C] text-white shadow-[0_6px_14px_-8px_rgba(216,65,28,0.9)]">
              <FileText className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <h1 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-[#1A1A1A] dark:text-white">
                {t({ id: "Office action title", message: "审查答复" })}
              </h1>
              <p className="mt-0.5 text-[11.5px] text-[#8A8A8F]">
                {t({
                  id: "Office action subtitle",
                  message: "上传官方审查意见通知书，逐条答复并出意见陈述",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void exportStatement()}
            disabled={!items.length || saving}
            className={cn(pt.btnGhost, "disabled:opacity-40")}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {t({ id: "Export statement", message: "汇总并导出意见陈述" })}
          </button>
        </div>

        {/* 案件条：案件名 + 上传通知书 */}
        <div className={cn(pt.card, "mb-4 flex flex-wrap items-center gap-3 px-4 py-3")}>
          <FileText className="h-4 w-4 shrink-0 text-[#E2562B]" strokeWidth={2} />
          <input
            value={caseTitle}
            onChange={(e) => setCaseTitle(e.target.value)}
            placeholder={t({ id: "Case name", message: "案件名" })}
            className="min-w-[180px] flex-1 border-none bg-transparent text-[13.5px] font-medium text-[#1A1A1A] outline-none placeholder:text-[#B4B4BA] dark:text-white"
          />
          <span className="text-[11.5px] text-[#9A9AA0]">
            {t({ id: "Notice hint", message: "审查意见通知书 PDF / 补正通知书" })}
          </span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!chat.sessionId || !!busyKey}
            className={cn(pt.btnGhost, "disabled:opacity-40")}
          >
            <Upload className="h-3.5 w-3.5" />
            {t({ id: "Upload notice", message: "上传通知书" })}
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (!caseTitle) setCaseTitle(f.name.replace(/\.[^.]+$/, ""));
              setBusyKey("split");
              void chat
                .upload(f)
                .catch((err) => setError(String(err)))
                .finally(() => setBusyKey(null));
            }}
          />
        </div>

        {error ? (
          <p className="mb-4 break-all rounded-xl bg-[#FEF2F2] px-4 py-2.5 text-[12px] text-[#DC2626] dark:bg-[#2A1214]">
            {error}
          </p>
        ) : null}

        {/* 三列：分条 / 答复 / 助手 */}
        <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col">{left}</div>
          <div className="flex min-w-0 flex-col">{center}</div>

          <section
            className={cn(pt.card, "flex h-full min-h-0 flex-col overflow-hidden")}
          >
            <h2 className={pt.cardHead}>
              <Sparkles className="h-4 w-4 text-[#E2562B]" strokeWidth={2} />
              <span className="min-w-0 truncate">
                {t({ id: "PI patent assistant", message: "PI 专利助手" })}{" "}
                <span className="font-normal text-[#9A9AA0]">(patent-oa)</span>
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-[#E8F7EE] px-2 py-0.5 text-[11px] font-medium text-[#28A05A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#28A05A]" />
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
                modelLabel={
                  chat.health ? `pi ${chat.health.pi.version ?? ""}`.trim() : undefined
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

export default OfficeActionTask;
