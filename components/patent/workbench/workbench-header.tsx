"use client";

/**
 * 工作台顶栏：返回、案件切换、保存 / 导出。
 *
 * 案件 = 当前技能包下的一条会话；切换案件只换会话 id，不换页面。
 */

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, Download, History, Plus, Scale } from "lucide-react";
import { listAiSessions, type AiSessionMeta } from "@/utils/ai/client";

interface WorkbenchHeaderProps {
  title: string;
  skill: string;
  currentSessionId: string | null;
  onBack: () => void;
  onPickCase: (sessionId: string) => void;
  onNewCase: () => void;
  onSave: () => void;
  onExport: () => void;
  /** 进入全局历史记录页 */
  onHistory?: () => void;
  /** 品牌名与图标；默认专利工作台 */
  brandLabel?: string;
  brandMark?: ReactNode;
}

export function WorkbenchHeader({
  title,
  skill,
  currentSessionId,
  onBack,
  onPickCase,
  onNewCase,
  onSave,
  onExport,
  onHistory,
  brandLabel = "专利工作台",
  brandMark,
}: WorkbenchHeaderProps) {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<AiSessionMeta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    listAiSessions()
      .then((list) => {
        if (!alive) return;
        setCases(
          list
            .filter((item) => item.skill === skill)
            .sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0)),
        );
      })
      .catch(() => alive && setCases([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, skill]);

  return (
    <header className="flex h-14 flex-none items-center gap-3 border-b border-[#EAEAEC] bg-white px-6">
      <button
        type="button"
        onClick={onBack}
        title="返回"
        className="flex h-7 w-7 items-center justify-center rounded-md text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-[#151517] text-white">
        {brandMark ?? <Scale className="h-3.5 w-3.5" strokeWidth={2} />}
      </span>
      <span className="text-[14.5px] font-bold tracking-normal text-[#0F0F11]">
        {brandLabel}
      </span>
      <span className="h-[15px] w-px bg-[#EAEAEC]" />

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) setLoading(true);
          }}
          className="flex max-w-[280px] items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
        >
          <span className="truncate">{title}</span>
          <ChevronDown className="h-3.5 w-3.5 flex-none text-[#9A9BA1]" />
        </button>

        {open ? (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[300px] rounded-[10px] border border-[#EAEAEC] bg-white p-1.5 shadow-[0_12px_28px_-12px_rgba(20,20,22,0.22)]">
              <p className="px-2.5 py-1.5 text-[11px] text-[#9A9BA1]">案件</p>
              {loading ? (
                <p className="px-2.5 py-3 text-[12px] text-[#9A9BA1]">正在加载…</p>
              ) : cases.length === 0 ? (
                <p className="px-2.5 py-3 text-[12px] text-[#9A9BA1]">这个阶段还没有案件</p>
              ) : (
                cases.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onPickCase(item.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition hover:bg-[#F4F4F5]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-[#151517]">
                        {item.title || "未命名案件"}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-[#9A9BA1]">
                        {item.updated_at
                          ? new Date(item.updated_at * 1000).toLocaleDateString("zh-CN")
                          : "—"}
                      </span>
                    </span>
                    {item.id === currentSessionId ? (
                      <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#151517]" />
                    ) : null}
                  </button>
                ))
              )}
              <div className="my-1 h-px bg-[#F1F1F3]" />
              <button
                type="button"
                onClick={() => {
                  onNewCase();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-[12.5px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
              >
                <Plus className="h-3.5 w-3.5" />
                新建案件
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {onHistory ? (
          <button
            type="button"
            onClick={onHistory}
            className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
          >
            <History className="h-3.5 w-3.5" />
            历史
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          className="h-8 rounded-md px-3 text-[12.5px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517]"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex h-8 items-center gap-1.5 rounded-md bg-[#151517] px-3.5 text-[12.5px] font-medium text-white transition hover:bg-black"
        >
          <Download className="h-3.5 w-3.5" />
          导出
        </button>
      </div>
    </header>
  );
}
