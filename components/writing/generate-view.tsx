"use client";

/**
 * 公文写作 · 生成过程与成稿导出视图（纯展示 + 导出逻辑）。
 *
 * 阶段轨道仿真实写稿流程：✍️写手起草 → 🔍审查把关 → ✏️推稿复写 → 📋审核复核 → 🏛️审批定稿。
 * 流式内容按阶段分卡片：审查意见红卡、推稿复写白卡、思考过程可折叠。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X2tConverter } from "@/utils/editor/x2t";
import { AvsFileType } from "@/utils/editor/types";

export type StreamKind =
  | "parse"
  | "draft"
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
  { key: "review", icon: "🔍", label: "审查把关" },
  { key: "rewrite", icon: "✏️", label: "推稿复写" },
  { key: "audit", icon: "📋", label: "审核复核" },
  { key: "finalize", icon: "🏛️", label: "审批定稿" },
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
  onStop: () => void;
  onBackToConfig: () => void;
  onRevise: (instruction: string) => void;
  onUndo: () => void;
}

export function GenerateView({
  items,
  stageLabel,
  exporting,
  materialChars,
  error,
  result,
  revising,
  onStop,
  onBackToConfig,
  onRevise,
  onUndo,
}: GenerateViewProps) {
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
              {exporting ? "正在生成文档并上传…" : "五阶段协作中"}
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
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-gray-900">
                  <span className="text-[#D93025] mr-2">三</span>成稿与导出
                </h2>
                <span className="text-[12px] text-gray-400">
                  导出前已自动同步定稿内容
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ExportWord file={result.files.find((f) => f.kind === "docx")} />
                <ExportPdf file={result.files.find((f) => f.kind === "docx")} />
                <ExportExcel file={result.files.find((f) => f.kind === "xlsx")} />
                <button
                  disabled
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-300 cursor-not-allowed"
                  title="后续版本支持"
                >
                  🖼️ 下载 PPT
                </button>
                <span className="text-[12px] text-gray-400">
                  Word / PDF 按文种版式排版（红头文件含 GB/T 9704-2012 红头）
                </span>
              </div>
              <button
                onClick={onBackToConfig}
                className="mt-4 text-[13px] text-[#007AFF] hover:underline"
              >
                ← 调整设置重新生成
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
              </div>
            </div>
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

// ── 单张流式卡片 ───────────────────────────────────────────────────────────

function StreamCard({ item }: { item: StreamItem }) {
  const [thinkingOpen, setThinkingOpen] = useState(false);
  useEffect(() => {
    if (item.status === "active" && item.thinking) setThinkingOpen(true);
  }, [item.status, item.thinking]);

  const isReview = item.kind === "review";
  const isAudit = item.kind === "audit";
  const cardCls = isReview
    ? "bg-[#FFF5F3] border-[#FFD5CC]"
    : isAudit
      ? "bg-[#FFFBEB] border-[#FDE9B8]"
      : "bg-white border-black/5";
  const titleCls = isReview ? "text-[#D93025]" : isAudit ? "text-[#B45309]" : "text-gray-900";

  return (
    <div className={"rounded-2xl border shadow-sm p-5 " + cardCls}>
      <div className="flex items-center justify-between">
        <h3 className={"text-[14px] font-semibold " + titleCls}>
          {kindIcon(item.kind)} {item.title}
          {item.status === "active" && (
            <span className="ml-2 text-[12px] font-normal text-gray-400">进行中…</span>
          )}
        </h3>
        {item.status === "done" && <span className="text-[12px] text-gray-400">已完成</span>}
      </div>

      {item.tools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {item.tools.slice(-6).map((t, i) => (
            <span
              key={i}
              className="rounded-md bg-gray-100 text-gray-500 text-[12px] px-2 py-0.5"
            >
              🔧 {t}
            </span>
          ))}
        </div>
      )}

      {item.thinking && (
        <div className="mt-3">
          <button
            onClick={() => setThinkingOpen((v) => !v)}
            className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            💭 思考过程 {thinkingOpen ? "收起" : "展开"}
          </button>
          {thinkingOpen && (
            <div className="mt-1.5 rounded-xl bg-gray-50 px-4 py-3 text-[13px] leading-6 text-gray-500 italic whitespace-pre-wrap break-words">
              {item.thinking}
            </div>
          )}
        </div>
      )}

      {item.text && (
        <div
          className={
            "mt-3 text-[15px] leading-7 whitespace-pre-wrap break-words " +
            (isReview ? "text-[#7A2B20]" : isAudit ? "text-[#6B4A0E]" : "text-gray-800")
          }
        >
          {item.text}
        </div>
      )}
    </div>
  );
}

function kindIcon(kind: StreamKind): string {
  switch (kind) {
    case "draft":
      return "✍️";
    case "review":
      return "🔍";
    case "rewrite":
      return "✏️";
    case "audit":
      return "📋";
    case "finalize":
      return "🏛️";
    case "revise":
      return "🪄";
    default:
      return "📄";
  }
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

function ExportWord({ file }: { file?: ResultFile }) {
  if (!file) {
    return (
      <button
        disabled
        className="rounded-xl bg-gray-100 px-4 py-2.5 text-[14px] font-medium text-gray-300 cursor-not-allowed"
      >
        📄 下载 Word
      </button>
    );
  }
  return (
    <a
      href={file.url}
      download={file.name}
      className="inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-4 py-2.5 text-[14px] font-medium text-white shadow-sm hover:bg-[#0071EB] active:scale-[0.98] transition"
    >
      📄 下载 Word
    </a>
  );
}

function ExportExcel({ file }: { file?: ResultFile }) {
  if (!file) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-300 cursor-not-allowed"
        title="定稿中未包含表格"
      >
        📊 下载 Excel
      </button>
    );
  }
  return (
    <a
      href={file.url}
      download={file.name}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:border-gray-300 active:scale-[0.98] transition"
    >
      📊 下载 Excel
    </a>
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
      const resp = await fetch(file.url);
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
        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-300 cursor-not-allowed"
      >
        📕 下载 PDF
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={failed ? "PDF 转换失败，请重试" : undefined}
      className={
        "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-medium transition active:scale-[0.98] " +
        (failed
          ? "border-[#FFD5CC] text-[#D93025] bg-[#FFF5F3]"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
      }
    >
      {busy ? "⏳ 转换中…" : failed ? "📕 重试 PDF" : "📕 下载 PDF"}
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
