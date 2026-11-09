"use client";

/**
 * 全局历史记录：把各阶段的 AI 会话按技能归类展示。
 *
 * 数据只有会话元信息（标题 / 技能 / 更新时间 / 轮次），
 * 点「继续办理」回到对应工作台并恢复这条会话。
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Search, Trash2 } from "lucide-react";
import { useIsChineseUI } from "@/store";
import { deleteAiSession, listAiSessions, type AiSessionMeta } from "@/utils/ai/client";

type TabKey = "all" | "disclosure" | "application" | "oa" | "full" | "copyright";

const SKILLS: Record<string, { label: string; labelEn: string; tab: Exclude<TabKey, "all"> }> = {
  "patent-docket": { label: "全流程", labelEn: "Full Process", tab: "full" },
  "patent-disclosure": { label: "交底书", labelEn: "Invention Disclosure", tab: "disclosure" },
  "patent-application": { label: "申请文件", labelEn: "Application Documents", tab: "application" },
  "patent-oa": { label: "审查答复", labelEn: "Office Action Response", tab: "oa" },
  "software-copyright": { label: "软件著作权", labelEn: "Software Copyright", tab: "copyright" },
};

const TABS: { key: TabKey; label: string; labelEn: string }[] = [
  { key: "all", label: "全部", labelEn: "All" },
  { key: "full", label: "全流程", labelEn: "Full Process" },
  { key: "disclosure", label: "交底书", labelEn: "Invention Disclosure" },
  { key: "application", label: "申请文件", labelEn: "Application Documents" },
  { key: "oa", label: "审查答复", labelEn: "Office Action Response" },
  { key: "copyright", label: "软件著作权", labelEn: "Software Copyright" },
];

const GROUPS = ["today", "yesterday", "week", "earlier"] as const;
type GroupKey = (typeof GROUPS)[number];

const GROUP_LABELS: Record<GroupKey, { zh: string; en: string }> = {
  today: { zh: "今天", en: "Today" },
  yesterday: { zh: "昨天", en: "Yesterday" },
  week: { zh: "近 7 天", en: "Past 7 days" },
  earlier: { zh: "更早", en: "Earlier" },
};

const DAY = 86_400_000;

function toMs(value?: number): number {
  if (!value) return 0;
  return value > 1e12 ? value : value * 1000;
}

function groupOf(ms: number): GroupKey {
  if (!ms) return "earlier";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ms >= today) return "today";
  if (ms >= today - DAY) return "yesterday";
  if (ms >= today - 6 * DAY) return "week";
  return "earlier";
}

function formatTime(ms: number): string {
  if (!ms) return "—";
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function hrefOf(item: AiSessionMeta, tab: Exclude<TabKey, "all">): string {
  /* 软著已并入工作台的第五个任务，历史记录统一回 /patent（旧路径仍可跳转） */
  return `/patent?mode=${tab}&case=${item.id}`;
}

export function HistoryView() {
  const zh = useIsChineseUI();
  const router = useRouter();
  const [sessions, setSessions] = useState<AiSessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [deleting, setDeleting] = useState("");

  useEffect(() => {
    let alive = true;
    listAiSessions()
      .then((list) => {
        if (!alive) return;
        setSessions(list.filter((item) => item.skill && SKILLS[item.skill]));
      })
      .catch((reason) => {
        if (!alive) return;
        setError(
          reason instanceof Error
            ? reason.message
            : zh
              ? "无法读取历史记录"
              : "Unable to load history",
        );
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const visible = sessions
      .filter((item) => {
        const kind = SKILLS[item.skill ?? ""];
        if (!kind) return false;
        if (tab !== "all" && kind.tab !== tab) return false;
        if (!keyword) return true;
        return (item.title || "").toLowerCase().includes(keyword);
      })
      .sort((a, b) => toMs(b.updated_at) - toMs(a.updated_at));

    const buckets = new Map<GroupKey, AiSessionMeta[]>();
    for (const item of visible) {
      const key = groupOf(toMs(item.updated_at));
      const list = buckets.get(key);
      if (list) list.push(item);
      else buckets.set(key, [item]);
    }
    return GROUPS.filter((key) => buckets.has(key)).map((key) => ({
      key,
      items: buckets.get(key) ?? [],
    }));
  }, [sessions, tab, query]);

  const total = grouped.reduce((sum, group) => sum + group.items.length, 0);

  const remove = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setDeleting(id);
    try {
      await deleteAiSession(id);
      setSessions((list) => list.filter((item) => item.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : zh ? "删除失败" : "Delete failed");
    } finally {
      setDeleting("");
      setConfirmId("");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="mx-auto w-full max-w-[clamp(640px,72vw,1080px)] px-10 pb-16 pt-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push("/patent");
            }}
            title={zh ? "返回" : "Back"}
            className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-md text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-[11.5px] font-medium text-[#8A8B91]">
            {zh ? "专利工作台" : "Patent Workbench"}
          </span>
        </div>

        <h1 className="mt-3 text-[23px] font-bold leading-tight tracking-[-0.01em] text-[#0F0F11]">
          {zh ? "历史记录" : "History"}
        </h1>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#8A8B91]">
          {zh
            ? "每个阶段各存一条会话，生成的文档留在这条记录里；只有你自己删除才会清掉。"
            : "Each stage keeps one conversation, and generated documents stay in that record; they are only cleared when you delete them yourself."}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`h-8 rounded-md px-3 text-[12px] font-medium transition ${
                tab === item.key
                  ? "bg-[#151517] text-white"
                  : "text-[#5F6066] hover:bg-[#F4F4F5] hover:text-[#151517]"
              }`}
            >
              {zh ? item.label : item.labelEn}
            </button>
          ))}

          <label className="ml-auto flex h-8 w-[220px] items-center gap-2 rounded-md border border-[#E2E2E5] px-2.5 transition focus-within:border-[#CFCFD4]">
            <Search className="h-3.5 w-3.5 flex-none text-[#9A9BA1]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={zh ? "搜索标题" : "Search titles"}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[#151517] outline-none placeholder:text-[#B0B1B7]"
            />
          </label>
        </div>

        {loading ? (
          <p className="mt-8 text-[11.5px] text-[#9A9BA1]">
            {zh ? "正在加载…" : "Loading…"}
          </p>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-[#EAEAEC] px-4 py-6 text-center">
            <p className="text-[12px] text-[#5F6066]">{error}</p>
            <p className="mt-1 text-[10.5px] text-[#9A9BA1]">
              {zh ? "检查 AI 服务是否已连接" : "Check whether the AI service is connected"}
            </p>
          </div>
        ) : total === 0 ? (
          <div className="mt-8 rounded-xl border border-[#EAEAEC] px-4 py-10 text-center">
            <p className="text-[12px] text-[#5F6066]">
              {sessions.length === 0
                ? zh
                  ? "还没有历史记录"
                  : "No history yet"
                : zh
                  ? "没有匹配的会话"
                  : "No matching conversations"}
            </p>
            <p className="mt-1 text-[10.5px] text-[#9A9BA1]">
              {sessions.length === 0
                ? zh
                  ? "在任一阶段开始一次对话后，这里就会留档"
                  : "Start a conversation in any stage and it will be recorded here"
                : zh
                  ? "换个关键词或切回「全部」"
                  : 'Try another keyword or switch back to "All"'}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {grouped.map((group) => (
              <section key={group.key}>
                <h2 className="mb-2 text-[11px] font-semibold text-[#9A9BA1]">
                  {zh ? GROUP_LABELS[group.key].zh : GROUP_LABELS[group.key].en}
                </h2>
                <div className="divide-y divide-[#F1F1F3] rounded-xl border border-[#EAEAEC] bg-white">
                  {group.items.map((item) => {
                    const kind = SKILLS[item.skill ?? ""];
                    if (!kind) return null;
                    const ms = toMs(item.updated_at);
                    return (
                      <div
                        key={item.id}
                        className="group flex items-center gap-3 px-4 py-3 transition hover:bg-[#FAFAFB]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium text-[#0F0F11]">
                              {item.title || (zh ? "未命名会话" : "Untitled conversation")}
                            </span>
                            <span className="flex-none rounded bg-[#F4F4F5] px-1.5 py-0.5 text-[9.5px] font-medium text-[#5F6066]">
                              {zh ? kind.label : kind.labelEn}
                            </span>
                          </div>
                          <p className="mt-1 text-[10.5px] text-[#9A9BA1]">
                            {formatTime(ms)}
                            {item.files
                              ? zh
                                ? ` · ${item.files} 个文件`
                                : ` · ${item.files} files`
                              : ""}
                            {item.turn
                              ? zh
                                ? ` · ${item.turn} 轮对话`
                                : ` · ${item.turn} turns`
                              : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={deleting === item.id}
                          onClick={() => void remove(item.id)}
                          className={`flex flex-none items-center gap-1 rounded-md px-2 py-1.5 text-[11px] transition disabled:opacity-50 ${
                            confirmId === item.id
                              ? "text-[#151517] bg-[#F4F4F5]"
                              : "text-[#9A9BA1] hover:bg-[#F4F4F5] hover:text-[#5F6066]"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deleting === item.id
                            ? zh
                              ? "删除中"
                              : "Deleting"
                            : confirmId === item.id
                              ? zh
                                ? "确认删除"
                                : "Confirm delete"
                              : zh
                                ? "删除"
                                : "Delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(hrefOf(item, kind.tab))}
                          className="flex flex-none items-center gap-1 rounded-md px-2.5 py-1.5 text-[11.5px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
                        >
                          {zh ? "继续办理" : "Continue"}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
