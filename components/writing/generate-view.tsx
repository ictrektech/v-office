"use client";

/**
 * 公文写作 · 生成过程与成稿导出视图（纯展示 + 导出逻辑）。
 *
 * 阶段轨道仿真实写稿流程：✍️写手起草 → 🔍审查把关 → ✏️推稿复写 → 📋审核复核 → 🏛️审批定稿。
 * 流式内容按阶段分卡片：审查意见红卡、推稿复写白卡、思考过程可折叠。
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronRight,
  CloudUpload,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  ScrollText,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { X2tConverter } from "@/utils/editor/x2t";
import { AvsFileType } from "@/utils/editor/types";
import { API_BASE, authHeaders } from "@/utils/writing/client";
import { isVOSMode } from "@/utils/vos/fastpath";

export type StreamKind =
  | "parse"
  | "draft"
  | "reviewfix"
  | "signoff"
  // 旧五阶段（历史会话恢复）
  | "review"
  | "rewrite"
  | "audit"
  | "finalize"
  | "revise";

export interface StreamItem {
  key: string;
  kind: StreamKind;
  title: string;
  status: "active" | "done";
  round?: number;
  text: string;
  thinking: string;
  tools: string[];
}

export interface ResultFile {
  name: string;
  url: string;
  kind: "docx" | "xlsx";
}

export interface ResultData {
  title: string;
  content: string;
  files: ResultFile[];
  /** 可撤销次数（= 已执行且可回退的修改版本次数） */
  revisions?: number;
}

interface StagePill {
  key: StreamKind;
  icon: string;
  label: string;
}

const STAGES: StagePill[] = [
  { key: "draft", icon: "✍️", label: "写手起草" },
  { key: "reviewfix", icon: "🔍", label: "审查改稿" },
  { key: "signoff", icon: "🏛️", label: "审批定稿" },
];

interface GenerateViewProps {
  items: StreamItem[];
  stageLabel: string;
  exporting: boolean;
  materialChars: number | null;
  error: string | null;
  result: ResultData | null;
  /** 局部微调是否进行中（输入框禁用） */
  revising: boolean;
  /** 微调/撤销失败提示（成稿后主错误卡不渲染，在微调区直接显示） */
  reviseError?: string | null;
  /** 写作会话 id（有则可回放修订过程） */
  historySessionId?: string;
  onStop: () => void;
  onBackToConfig: () => void;
  onRevise: (instruction: string) => void;
  onUndo: () => void;
  /** 重置：从 0 开始（清空生成流与成稿，保留材料与配置） */
  onReset: () => void;
  /** 上传到云端：把当前成稿导出并上传 v-office 云存储（VOS 模式显示按钮） */
  onUploadCloud: () => Promise<{ ok: boolean; message: string }>;
}

export function GenerateView({
  items,
  stageLabel,
  exporting,
  materialChars,
  error,
  result,
  revising,
  reviseError,
  historySessionId,
  onStop,
  onBackToConfig,
  onRevise,
  onUndo,
  onUploadCloud,
  onReset,
}: GenerateViewProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const [reviseDraft, setReviseDraft] = useState("");

  // 同页布局：页面是唯一滚动容器，新卡片/成稿出现时平滑滚到流区底部
  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    const last = el.lastElementChild as HTMLElement | null;
    last?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, result, error]);

  const submitRevise = useCallback(() => {
    const text = reviseDraft.trim();
    if (!text || revising) return;
    onRevise(text);
    setReviseDraft("");
  }, [reviseDraft, revising, onRevise]);

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* 阶段轨道 */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {STAGES.map((s, i) => {
            const state = stageState(items, s.key);
            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-300 text-xs">→</span>}
                <span
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-colors " +
                    (state === "active"
                      ? "bg-[#007AFF] text-white border-[#007AFF] shadow-sm"
                      : state === "done"
                        ? "bg-[#EAF3FF] text-[#007AFF] border-[#CCE4FF]"
                        : "bg-white text-gray-400 border-gray-200")
                  }
                >
                  <span className="text-[13px]">{s.icon}</span>
                  {s.label}
                  {state === "done" && <span className="text-[11px]">✓</span>}
                </span>
              </div>
            );
          })}
        </div>
        {!result && (
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg bg-[#2C2C2E] text-white/90 text-[13px] px-3 py-1.5">
              <span className={"inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white " + (exporting ? "" : "animate-spin")} />
              {exporting ? "正在生成文档并上传…" : "三阶段协作中"}
            </span>
            {stageLabel && (
              <span className="text-[13px] text-[#D93025] font-medium">{stageLabel}</span>
            )}
            <button
              onClick={onStop}
              className="ml-auto text-[13px] text-gray-500 hover:text-[#D93025] transition-colors"
            >
              停止生成
            </button>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && !result && (
        <div className="bg-white rounded-2xl border border-[#FFD5CC] bg-[#FFF5F3] p-5">
          <div className="text-[14px] text-[#D93025] font-medium">生成失败</div>
          <div className="mt-1 text-[14px] text-gray-600 break-all">{error}</div>
          <button
            onClick={onBackToConfig}
            className="mt-3 rounded-full bg-[#007AFF] text-white text-[14px] font-medium px-5 py-2 hover:bg-[#0071EB] active:scale-[0.98] transition"
          >
            返回修改
          </button>
        </div>
      )}

      {/* 流式内容 */}
      <div ref={streamRef} className="flex flex-col gap-4">
        {materialChars !== null && (
          <div className="text-[13px] text-gray-400 px-1">
            📄 已解析参考材料，共 {materialChars} 字
          </div>
        )}
        {items.map((item) => (
          <StreamCard key={item.key} item={item} />
        ))}

        {/* 成稿与导出 */}
        {result && (
          <>
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] items-center justify-center text-white shadow-sm">
                    <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                  </span>
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#1D1D1F]">文档导出</h2>
                    <p className="text-[12px] text-gray-400 mt-0.5">选择导出格式，开始下载您的文档</p>
                  </div>
                </div>
                <span className="text-[12px] text-gray-400 flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  导出后自动同步至稿内库
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ExportWord file={result.files.find((f) => f.kind === "docx")} />
                <ExportPdf file={result.files.find((f) => f.kind === "docx")} />
                <ExportExcel file={result.files.find((f) => f.kind === "xlsx")} />
                <UploadCloudButton onUpload={onUploadCloud} />
                <button
                  disabled
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[14px] font-medium text-gray-300 cursor-not-allowed"
                  title="后续版本支持"
                >
                  <span className="flex w-6 h-6 rounded-lg bg-orange-100 items-center justify-center text-orange-500">
                    <Presentation className="w-3.5 h-3.5" strokeWidth={2} />
                  </span>
                  下载 PPT
                </button>
                {historySessionId && (
                  <button
                    onClick={() => setHistoryOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[14px] font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 active:scale-[0.98] transition"
                    title="回放五阶段修订过程"
                  >
                    <span className="flex w-6 h-6 rounded-lg bg-gray-100 items-center justify-center text-gray-500">
                      <ScrollText className="w-3.5 h-3.5" strokeWidth={2} />
                    </span>
                    修订过程
                  </button>
                )}
              </div>
              <button
                onClick={onBackToConfig}
                className="mt-5 text-[13px] text-[#007AFF] hover:underline flex items-center gap-1"
              >
                <span className="inline-block rotate-180">←</span> 调整设置重新生成
              </button>
            </div>

            {/* 定稿预览 */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-8 md:p-10">
              <DocPreview content={result.content} title={result.title} />
            </div>

            {/* 局部微调 */}
            <div className="bg-white rounded-2xl border border-black/6 shadow-sm p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F]">
                  局部微调
                </h3>
                <span className="text-[12px] text-gray-300">
                  AI 按指令修订全文，其余内容保持原样
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={reviseDraft}
                  onChange={(e) => setReviseDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) submitRevise();
                  }}
                  placeholder="如：把落款改为「市政务服务和数据局」；第二段补充数据来源"
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-primary transition placeholder:text-gray-300"
                />
                <button
                  onClick={submitRevise}
                  disabled={!reviseDraft.trim() || revising}
                  className={
                    "rounded-xl px-5 text-[14px] font-medium transition-all " +
                    (reviseDraft.trim() && !revising
                      ? "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed")
                  }
                >
                  {revising ? "修订中…" : "发送"}
                </button>
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                {reviseError && !revising && !exporting && (
                  <span className="text-[12.5px] text-[#D93025] break-all">
                    ⚠ {reviseError}
                  </span>
                )}
                {(revising || exporting) && (
                  <span className="flex items-center gap-2 text-[12.5px] text-gray-400">
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-200 border-t-primary animate-spin" />
                    {exporting ? "正在回退并重新导出文档…" : "正在按指令修订，完成后自动更新成稿与导出文件"}
                  </span>
                )}
                {(result.revisions ?? 0) > 0 && !revising && !exporting && (
                  <button
                    onClick={onUndo}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] text-gray-500 hover:text-[#D93025] hover:border-[#FFD5CC] active:scale-[0.97] transition"
                    title="回退到上一版成稿，并重新导出文件"
                  >
                    ↩ 撤销本次修改
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("重置后将从 0 开始重新生成（材料与写作设置保留）。确定重置？")) {
                      onReset();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] text-gray-400 hover:text-gray-700 hover:border-gray-300 active:scale-[0.97] transition"
                  title="从 0 开始：清空生成过程与成稿（材料与写作设置保留）"
                >
                  ⟲ 重置
                </button>
              </div>
            </div>

            {historyOpen && historySessionId && (
              <HistorySheet
                sessionId={historySessionId}
                onClose={() => setHistoryOpen(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── 阶段状态 ───────────────────────────────────────────────────────────────

function stageState(items: StreamItem[], key: StreamKind): "active" | "done" | "pending" {
  const related = items.filter((it) => it.kind === key);
  if (related.some((it) => it.status === "active")) return "active";
  if (related.length > 0 && related.every((it) => it.status === "done")) return "done";
  return "pending";
}

// ── 单张流式卡片（仿网页版大模型消息：角色头像 + 思考折叠 + markdown 正文）──

/** 阶段 → 头像（渐变底 + 单字）与点缀色 */
const KIND_META: Record<StreamKind, { char: string; grad: string }> = {
  parse: { char: "析", grad: "from-[#A6ADB8] to-[#7C838E]" },
  draft: { char: "写", grad: "from-[#5CA1FA] to-[#2E6FE5]" },
  // 三阶段新管线
  reviewfix: { char: "改", grad: "from-[#FF6A61] to-[#E5452F]" },
  signoff: { char: "定", grad: "from-[#4A4A4E] to-[#1D1D1F]" },
  // 旧五阶段（历史会话恢复）
  review: { char: "审", grad: "from-[#FF6A61] to-[#E5452F]" },
  rewrite: { char: "推", grad: "from-[#FF8F4D] to-[#EC5B22]" },
  audit: { char: "核", grad: "from-[#F2B33D] to-[#D98E0B]" },
  finalize: { char: "定", grad: "from-[#4A4A4E] to-[#1D1D1F]" },
  revise: { char: "调", grad: "from-[#38C6B9] to-[#0FA396]" },
};

function StreamCard({ item }: { item: StreamItem }) {
  const meta = KIND_META[item.kind] ?? KIND_META.parse;
  /** 只有最终输出（审批定稿 / 局部微调的正文）才作为正文展示，其余阶段产出一律算思考过程 */
  const isFinalOutput = item.kind === "signoff" || item.kind === "revise";

  // DeepSeek 逻辑：中间阶段的全部产出（思考 + 文本 + 工具）都是「思考过程」
  const thinkingAll =
    isFinalOutput || !item.text
      ? item.thinking
      : item.thinking + (item.thinking ? "\n\n" : "") + item.text;
  /** 思考是否结束：整卡完成，或定稿/微调卡已开始流出正文 */
  const thinkingDone = item.status === "done" || (isFinalOutput && !!item.text);

  // 折叠：思考中自动展开、结束自动折叠；用户手动切换后不再自动
  const [open, setOpen] = useState(false);
  const touchedRef = useRef(false);
  const startRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!thinkingDone && thinkingAll && startRef.current === null) {
      startRef.current = Date.now();
    }
    if (thinkingDone && startRef.current !== null) {
      const sec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      setElapsed((prev) => prev ?? sec);
    }
    if (!touchedRef.current) {
      if (!thinkingDone && (thinkingAll || item.status === "active")) setOpen(true);
      else if (thinkingDone) setOpen(false);
    }
  }, [thinkingDone, thinkingAll, item.status]);

  // 思考流式输出：面板打开时始终滚到底部，像正在逐字思考
  useEffect(() => {
    const el = bodyRef.current;
    if (el && open) el.scrollTop = el.scrollHeight;
  }, [thinkingAll, open]);

  const toggle = () => {
    touchedRef.current = true;
    setOpen((v) => !v);
  };

  const hasBody = isFinalOutput && !!item.text;

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm px-5 py-4">
      {/* 角色头部 */}
      <div className="flex items-center gap-2.5">
        <span
          className={
            "flex w-7 h-7 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-b text-white text-[12px] font-medium shadow-sm " +
            meta.grad
          }
        >
          {meta.char}
        </span>
        <span className="text-[14px] font-semibold text-gray-900">{item.title}</span>
        {item.status === "active" ? (
          <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            工作中…
          </span>
        ) : (
          <span className="text-[12px] text-gray-300">已完成</span>
        )}
      </div>

      {/* 思考过程：DeepSeek 式折叠面板 */}
      {(!thinkingDone || thinkingAll) && (
        <div
          className={
            "mt-3 " + (hasBody && !open ? "border-b border-black/5 pb-2.5" : "")
          }
        >
          <button
            onClick={toggle}
            className={
              "flex items-center gap-1.5 text-[13px] transition-colors " +
              (thinkingDone ? "text-gray-400 hover:text-gray-600" : "text-[#007AFF]")
            }
          >
            {thinkingDone ? (
              <ChevronRight
                className={"w-3.5 h-3.5 transition-transform " + (open ? "rotate-90" : "")}
              />
            ) : (
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            )}
            {thinkingDone
              ? `已深度思考${elapsed ? `（用时 ${elapsed} 秒）` : ""}`
              : "思考中…"}
          </button>
          {open && (thinkingAll || item.tools.length > 0) && (
            <div
              ref={bodyRef}
              className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-[#F7F8FA] px-4 py-3"
            >
              {thinkingAll && (
                <div className="text-[13px] leading-6 text-gray-500 whitespace-pre-wrap break-words">
                  {thinkingAll}
                </div>
              )}
              {item.tools.length > 0 && (
                <div className={"flex flex-wrap gap-x-4 gap-y-1 " + (thinkingAll ? "mt-2.5" : "")}>
                  {item.tools.slice(-8).map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-[12px] text-gray-400"
                    >
                      <Wrench className="w-3 h-3" strokeWidth={1.75} />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 最终输出：markdown 正文（仅审批定稿 / 局部微调） */}
      {hasBody && (
        <div className="mt-3">
          <Md text={item.text} />
        </div>
      )}
    </div>
  );
}

// ── 轻量 Markdown 渲染（标题 / 列表 / 表格 / 引用 / 代码块 / 粗体 / 行内码）──

function Md({ text }: { text: string }) {
  return (
    <div className="text-[14.5px] leading-7 text-gray-800 space-y-2 break-words">
      {renderBlocks(text)}
    </div>
  );
}

function renderInline(s: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={k++} className="font-semibold text-gray-900">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code key={k++} className="rounded bg-gray-100 px-1 py-0.5 text-[12.5px] text-gray-700">
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

const BLOCK_START = /^(#{1,4}\s|[-*]\s|\d+[.、)]\s|>|\||```)/;

function renderBlocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }
    // 代码块
    if (t.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) {
        buf.push(lines[i] ?? "");
        i++;
      }
      i++;
      out.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-xl bg-[#161618] px-4 py-3 text-[12.5px] leading-6 text-gray-100"
        >
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    // 表格
    if (t.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) {
        const cells = lines[i]!
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={key++} className="overflow-x-auto rounded-xl border border-black/8">
          <table className="w-full border-collapse text-[13px]">
            {head && (
              <thead>
                <tr>
                  {head.map((c, j) => (
                    <th
                      key={j}
                      className="border-b border-black/8 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600"
                    >
                      {renderInline(c)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, r) => (
                <tr key={r} className={r % 2 === 1 ? "bg-gray-50/60" : ""}>
                  {row.map((c, j) => (
                    <td key={j} className="border-b border-black/5 px-3 py-2 text-gray-700">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    // 标题
    const h = t.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      const big = (h[1]?.length ?? 3) <= 2;
      out.push(
        <div
          key={key++}
          className={
            (big
              ? "mt-4 mb-1 text-[16px] font-semibold text-gray-900 "
              : "mt-3 mb-1 text-[14.5px] font-semibold text-gray-900 ") + "first:mt-0"
          }
        >
          {renderInline(h[2] ?? "")}
        </div>,
      );
      i++;
      continue;
    }
    // 引用
    if (t.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith(">")) {
        buf.push(lines[i]!.trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        <blockquote
          key={key++}
          className="border-l-2 border-gray-200 pl-3 text-[13.5px] leading-6 text-gray-500"
        >
          {renderInline(buf.join("\n"))}
        </blockquote>,
      );
      continue;
    }
    // 无序列表
    if (/^[-*]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    // 有序列表
    if (/^\d+[.、)]\s*/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.、)]\s*/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").trim().replace(/^\d+[.、)]\s*/, ""));
        i++;
      }
      out.push(
        <ol key={key++} className="list-decimal space-y-1 pl-5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    // 段落（连续普通行合并）
    const buf: string[] = [t];
    i++;
    while (i < lines.length) {
      const nt = (lines[i] ?? "").trim();
      if (!nt || BLOCK_START.test(nt)) break;
      buf.push(nt);
      i++;
    }
    out.push(
      <p key={key++} className="whitespace-pre-wrap">
        {renderInline(buf.join("\n"))}
      </p>,
    );
  }
  return out;
}

// ── 导出按钮 ───────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * 带鉴权下载：/writing/file 需要 Bearer JWT，普通 <a href> 带不了请求头
 * （浏览器直接 401），必须 fetch 成 blob 再触发保存。
 */
async function authedDownload(file: ResultFile): Promise<void> {
  const resp = await fetch(file.url, { headers: await authHeaders() });
  if (!resp.ok) throw new Error(`下载失败（${resp.status}）`);
  downloadBlob(new Blob([await resp.arrayBuffer()]), file.name);
}

/** 上传到云端：把当前成稿（生成/微调后最新版）导出并上传 v-office 云存储（仅 VOS 模式显示） */
function UploadCloudButton({
  onUpload,
}: {
  onUpload: () => Promise<{ ok: boolean; message: string }>;
}) {
  const [vos, setVos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    void isVOSMode().then(setVos);
  }, []);
  if (!vos) return null;

  const click = async () => {
    if (busy) return;
    setBusy(true);
    setDone(false);
    setFailed(null);
    try {
      const r = await onUpload();
      if (r.ok) {
        setDone(true);
        window.setTimeout(() => setDone(false), 2500);
      } else {
        setFailed(r.message || "上传失败");
      }
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={click}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium active:scale-[0.98] transition ${
        failed
          ? "border-[#F2B8B5] bg-[#FCE8E6] text-[#D93025]"
          : done
            ? "border-gray-200 bg-gray-50 text-gray-500"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
      }`}
      title="把当前成稿导出并上传到云端文件"
    >
      <span className="flex w-6 h-6 rounded-lg bg-indigo-100 items-center justify-center text-indigo-500">
        <CloudUpload className="w-3.5 h-3.5" strokeWidth={2} />
      </span>
      {busy ? "上传中…" : done ? "已上传云端" : failed ? "上传失败，点击重试" : "上传到云端"}
    </button>
  );
}

function ExportWord({ file }: { file?: ResultFile }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const onClick = useCallback(async () => {
    if (!file || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await authedDownload(file);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [file, busy]);
  if (!file) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[14px] font-medium text-gray-300 cursor-not-allowed"
      >
        <span className="flex w-6 h-6 rounded-lg bg-blue-100 items-center justify-center text-blue-500">
          <FileText className="w-3.5 h-3.5" strokeWidth={2} />
        </span>
        下载 Word
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium shadow-sm transition active:scale-[0.98] " +
        (failed
          ? "border border-[#FFD5CC] bg-[#FFF5F3] text-[#D93025]"
          : "bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-white hover:opacity-90")
      }
    >
      <span className="flex w-6 h-6 rounded-lg bg-white/20 items-center justify-center text-white">
        <FileText className="w-3.5 h-3.5" strokeWidth={2} />
      </span>
      {busy ? "下载中…" : failed ? "下载失败，点击重试" : "下载 Word"}
      {!busy && !failed && <Check className="w-4 h-4" strokeWidth={2.5} />}
    </button>
  );
}

function ExportExcel({ file }: { file?: ResultFile }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const onClick = useCallback(async () => {
    if (!file || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await authedDownload(file);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [file, busy]);
  if (!file) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[14px] font-medium text-gray-300 cursor-not-allowed"
        title="定稿中未包含表格"
      >
        <span className="flex w-6 h-6 rounded-lg bg-green-100 items-center justify-center text-green-500">
          <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={2} />
        </span>
        下载 Excel
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium transition active:scale-[0.98] " +
        (failed
          ? "border-[#FFD5CC] bg-[#FFF5F3] text-[#D93025]"
          : "border-gray-200 bg-white text-green-600 hover:border-gray-300")
      }
    >
      <span className="flex w-6 h-6 rounded-lg bg-green-100 items-center justify-center text-green-500">
        <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={2} />
      </span>
      {busy ? "下载中…" : failed ? "下载失败，点击重试" : "下载 Excel"}
    </button>
  );
}

function ExportPdf({ file }: { file?: ResultFile }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const onClick = useCallback(async () => {
    if (!file || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const resp = await fetch(file.url, { headers: await authHeaders() });
      if (!resp.ok) throw new Error(`获取文档失败（${resp.status}）`);
      const buf = await resp.arrayBuffer();
      const converter = new X2tConverter();
      const result = await converter.convert({
        data: buf,
        fileFrom: "input.docx",
        fileTo: "output.pdf",
        formatFrom: AvsFileType.AVS_FILE_DOCUMENT_DOCX,
        formatTo: AvsFileType.AVS_FILE_CROSSPLATFORM_PDF,
      });
      if (!result.output) throw new Error("转换失败");
      downloadBlob(
        new Blob([result.output as BlobPart], {
          type: "application/pdf",
        }),
        file.name.replace(/\.docx$/, ".pdf"),
      );
    } catch (err) {
      console.error("[writing] pdf export failed:", err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [file, busy]);

  if (!file) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[14px] font-medium text-gray-300 cursor-not-allowed"
      >
        <span className="flex w-6 h-6 rounded-lg bg-red-100 items-center justify-center text-red-500">
          <FileText className="w-3.5 h-3.5" strokeWidth={2} />
        </span>
        下载 PDF
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={failed ? "PDF 转换失败，请重试" : undefined}
      className={
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium transition active:scale-[0.98] " +
        (failed
          ? "border-[#FFD5CC] text-[#D93025] bg-[#FFF5F3]"
          : "border-gray-200 bg-white text-red-500 hover:border-gray-300")
      }
    >
      <span className="flex w-6 h-6 rounded-lg bg-red-100 items-center justify-center text-red-500">
        <FileText className="w-3.5 h-3.5" strokeWidth={2} />
      </span>
      {busy ? "转换中…" : failed ? "重试 PDF" : "下载 PDF"}
    </button>
  );
}

// ── 定稿预览（轻量 Markdown 渲染，仿宋正文风格）────────────────────────────

function DocPreview({ content, title }: { content: string; title: string }) {
  const blocks = parsePreview(content);
  return (
    <div
      className="text-[17px] leading-8 text-gray-900"
      style={{ fontFamily: '"FangSong", "STFangsong", "仿宋", "FangSong_GB2312", serif' }}
    >
      <h1 className="text-center text-[24px] font-bold mb-8" style={{ fontFamily: '"Songti SC", "SimSun", serif' }}>
        {title}
      </h1>
      {blocks.map((b, i) => {
        if (b.type === "table") {
          return (
            <div key={i} className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((c, j) => (
                        <td
                          key={j}
                          className={
                            "border border-gray-300 px-3 py-1.5 text-center " +
                            (r === 0 ? "font-semibold bg-gray-50" : "")
                          }
                        >
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.type === "h1") {
          return (
            <p key={i} className="font-bold mt-5 mb-1">
              {b.text}
            </p>
          );
        }
        if (b.type === "h2") {
          return (
            <p key={i} className="font-semibold mt-4 mb-1">
              {b.text}
            </p>
          );
        }
        return (
          <p key={i} className="mb-2" style={{ textIndent: b.indent ? "2em" : undefined }}>
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

type PreviewBlock =
  | { type: "p" | "h1" | "h2"; text: string; indent?: boolean }
  | { type: "table"; rows: string[][] };

function parsePreview(content: string): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  const clean = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").trim();
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => clean(c));
        // 跳过 Markdown 分隔行（如 ---|---）
        const isSeparator = cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
        if (!isSeparator) rows.push(cells);
        i++;
      }
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }
    const t = line.trim();
    if (t.startsWith("#### ")) {
      blocks.push({ type: "h2", text: clean(t.slice(5)) });
    } else if (t.startsWith("### ")) {
      blocks.push({ type: "h2", text: clean(t.slice(4)) });
    } else if (t.startsWith("## ")) {
      blocks.push({ type: "h1", text: clean(t.slice(3)) });
    } else if (t.startsWith("# ")) {
      blocks.push({ type: "h1", text: clean(t.slice(2)) });
    } else {
      const isRecipient = clean(t).endsWith("：") && clean(t).length <= 40;
      blocks.push({ type: "p", text: clean(t), indent: !isRecipient });
    }
    i++;
  }
  return blocks;
}

// ── 修订过程回放（历史会话消息 → 按阶段分组） ─────────────────────────────

interface HistoryGroup {
  stage: string;
  prompt: string;
  answer: string;
  thinking: string;
  tools: string[];
}

function HistorySheet({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<HistoryGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(
          `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`,
          { headers, signal: AbortSignal.timeout(20_000) },
        );
        if (!res.ok) throw new Error(`加载失败 (${res.status})`);
        const data = (await res.json()) as {
          messages?: { role: string; content: string; blocks?: string }[];
        };
        setGroups(
          buildHistoryGroups(
            (data.messages ?? []).map((m) => ({
              role: m.role,
              content: m.content ?? "",
              blocks: safeParseBlocks(m.blocks),
            })),
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [sessionId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
        aria-label="关闭"
      />
      <div className="relative h-full w-full max-w-2xl bg-[#F6F6F7] shadow-2xl flex flex-col animate-in slide-in-from-right">
        <div className="h-14 shrink-0 flex items-center px-5 border-b border-black/5 bg-white">
          <ScrollText className="w-4.5 h-4.5 text-gray-400 mr-2.5" strokeWidth={1.75} />
          <div className="text-[15px] font-semibold text-gray-900">修订过程</div>
          <div className="ml-2 text-[12px] text-gray-400">
            五阶段协作的完整记录（草稿 / 审查 / 推稿 / 审核 / 定稿 / 微调）
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {error && (
            <div className="rounded-xl bg-[#FFF5F3] border border-[#FFD5CC] px-4 py-3 text-[13px] text-[#D93025]">
              {error}
            </div>
          )}
          {!error && groups === null && (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在加载修订记录…
            </div>
          )}
          {groups?.length === 0 && (
            <div className="text-center py-16 text-[13px] text-gray-400">
              该会话暂无修订记录
            </div>
          )}
          {groups?.map((g, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[11px] flex items-center justify-center font-medium shrink-0">
                  {i + 1}
                </span>
                <span className="text-[13.5px] font-medium text-gray-900 flex-1 truncate">
                  {g.stage}
                </span>
                <span className="text-[11.5px] text-gray-300 shrink-0">
                  {g.answer ? `${g.answer.length} 字` : "无输出"}
                </span>
                <span
                  className={
                    "text-gray-300 text-[12px] transition-transform " +
                    (openIdx === i ? "rotate-90" : "")
                  }
                >
                  ›
                </span>
              </button>
              {openIdx === i && (
                <div className="px-4 pb-4 space-y-3 border-t border-black/5 pt-3">
                  {g.thinking && (
                    <details className="group">
                      <summary className="cursor-pointer select-none text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                        思考过程（{g.thinking.length} 字）
                      </summary>
                      <div className="mt-2 rounded-xl bg-gray-50 px-3.5 py-3 text-[12.5px] leading-6 text-gray-500 whitespace-pre-wrap">
                        {g.thinking}
                      </div>
                    </details>
                  )}
                  {g.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {g.tools.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {g.prompt && (
                    <details>
                      <summary className="cursor-pointer select-none text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                        阶段指令
                      </summary>
                      <div className="mt-2 rounded-xl bg-gray-50 px-3.5 py-3 text-[12.5px] leading-6 text-gray-500 whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {g.prompt}
                      </div>
                    </details>
                  )}
                  {g.answer ? (
                    <div className="rounded-xl border border-black/5 px-4 py-3 text-[13px] leading-7 text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {g.answer}
                    </div>
                  ) : (
                    <div className="text-[12px] text-gray-300">（该阶段无文本输出）</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function safeParseBlocks(raw: unknown): { type?: string; text?: string; thinking?: string; name?: string }[] {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

/** 消息序列 → 阶段分组：user 消息以【阶段名】开头，其后 assistant 即该阶段产物 */
function buildHistoryGroups(
  messages: { role: string; content: string; blocks: { type?: string; text?: string; thinking?: string; name?: string }[] }[],
): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  let cur: HistoryGroup | null = null;
  for (const m of messages) {
    if (m.role === "user") {
      const match = m.content.match(/^【(.+?)】\s*/);
      if (match) {
        cur = {
          stage: match[1] ?? "",
          prompt: m.content.slice(match[0].length),
          answer: "",
          thinking: "",
          tools: [],
        };
        groups.push(cur);
        continue;
      }
      // 无阶段标记的 user 消息（如【撤销】以外的普通输入）不单独成组
      cur = null;
      continue;
    }
    if (m.role !== "assistant") continue;
    if (!cur) {
      cur = { stage: "其他输出", prompt: "", answer: "", thinking: "", tools: [] };
      groups.push(cur);
    }
    for (const b of m.blocks) {
      if (b.type === "thinking" && b.thinking) cur.thinking += b.thinking;
      else if (b.type === "tool_use" && b.name && !cur.tools.includes(b.name)) {
        cur.tools = [...cur.tools, b.name];
      }
    }
    cur.answer += (cur.answer ? "\n\n" : "") + m.content;
  }
  return groups;
}
