"use client";

/**
 * 左栏案件页：任务选择、材料、产出物清单。
 *
 * 数据都由 useAiChat 和案件文件接口提供，这里只负责展示与把操作转出去。
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronDown,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  Files,
  FolderOpen,
  Layers,
  ListTree,
  Loader2,
  MessageSquareText,
  PenLine,
  PenTool,
  Plus,
  Image as ImageIcon,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { AiMaterial } from "@/utils/ai/client";
import {
  docketPhaseLabel,
  isDocketTerminal,
  type DocketState,
} from "./docket";
import {
  inferSlot,
  isSlotFor,
  readSlotMap,
  slotsFor,
  type SlotKey,
} from "./material-slots";
import {
  STAGE_LIST,
  canOpenOnline,
  formatClock,
  rowFileIcon,
  type OutputRow,
  type PreviewTarget,
  type StageConfig,
  type StageKey,
} from "./config";

interface CaseOverviewProps {
  config: StageConfig;
  title: string;
  meta: string;
  materials: AiMaterial[];
  /** 全流程阶段的案卷进度；其他阶段为 null */
  docket?: DocketState | null;
  rows: OutputRow[];
  onModeChange: (next: StageKey) => void;
  onUpload: (slot: SlotKey, files: File[]) => void;
  onRemoveMaterial: (name: string) => void;
  onOpenPreview: (target: PreviewTarget) => void;
  /** 交给编辑器内核（Collabora / OnlyOffice）在线打开 */
  onOpenOnline: (target: PreviewTarget) => Promise<void> | void;
  onDownload: (row: OutputRow) => void;
}

const SLOT_ICONS: Record<SlotKey, LucideIcon> = {
  inventor: Users,
  project: FolderOpen,
  tex: FileCode2,
  disclosure: PenLine,
  disclosureDir: FolderOpen,
  schema: Boxes,
  figurePlan: ListTree,
  lineart: PenTool,
  photos: ImageIcon,
  applicant: UserRound,
  oaNotice: MessageSquareText,
  applicationDocs: Files,
  prior: Layers,
  vector: Database,
  cases: Archive,
  other: FileText,
};

export function CaseOverview({
  config,
  title,
  meta,
  materials,
  docket,
  rows,
  onModeChange,
  onUpload,
  onRemoveMaterial,
  onOpenPreview,
  onOpenOnline,
  onDownload,
}: CaseOverviewProps) {
  const router = useRouter();
  const [modeOpen, setModeOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<SlotKey>("other");
  const [dragSlot, setDragSlot] = useState<SlotKey | null>(null);
  const [openingRow, setOpeningRow] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const slots = slotsFor(config.key);

  /**
   * 「哪个文件属于哪一行」记在 localStorage。
   *
   * 这里直接读、不放进 state：首帧 materials 一定是空的（会话还没恢复），
   * 读不到也不会渲染出错误内容；上传后 materials 更新会触发重渲染，映射随之
   * 重新读一次。放进 effect 再 setState 属于「用副作用同步派生值」，会多一轮
   * 渲染，反而更容易闪。
   */
  const slotMap = readSlotMap();

  const slotOf = (name: string): SlotKey => {
    const stored = slotMap[name];
    return stored && isSlotFor(config.key, stored) ? stored : inferSlot(name, config.key);
  };

  const slotFiles = (slot: SlotKey) =>
    materials.filter((material) => slotOf(material.name) === slot);

  const missing = slots.filter(
    (slot) => slot.required && slotFiles(slot.key).length === 0,
  );

  const pickFile = (slot: SlotKey) => {
    setPendingSlot(slot);
    inputRef.current?.click();
  };

  const upload = (slot: SlotKey, files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length) onUpload(slot, list);
  };

  return (
    <div className="font-round mx-auto w-full max-w-[clamp(680px,70vw,1120px)] px-10 pb-24 pt-10">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[13px] font-medium tracking-[0.01em] text-[#6E6E73]">
          进行中 · {config.label}
        </p>
        <p className="truncate text-[12.5px] text-[#8E8E93]">{meta}</p>
      </div>
      <h1 className="mt-3 text-[31px] font-semibold leading-[1.2] tracking-[-0.025em] text-[#0E0E10]">
        {title}
      </h1>

      {docket ? (
        <section className="mt-7 rounded-[22px] border border-[#ECECEF] bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12.5px] text-[#6E6E73]">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#34A853]" />
                案卷 {docket.caseId || "未命名"}
              </p>
              <p className="mt-1 text-[17px] font-semibold tracking-[-0.01em] text-[#0E0E10]">
                {docketPhaseLabel(docket.phase)}
              </p>
            </div>
            <span className="flex-none rounded-full bg-[#F1F1F4] px-2.5 py-1 text-[12px] font-medium text-[#5F6066]">
              第 {docket.round || 1} / {docket.maxRounds || 3} 轮
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#6E6E73]">
            <span>
              未决问题 {docket.openIssues} / {docket.totalIssues}
            </span>
            <span>{isDocketTerminal(docket.phase) ? "已收口" : "进行中"}</span>
            <span className="truncate text-[#8E8E93]">{docket.path}</span>
          </div>
        </section>
      ) : config.key === "full" ? (
        <p className="mt-7 rounded-[18px] border border-dashed border-[#E4E4E8] px-4 py-3 text-[12.5px] leading-relaxed text-[#8E8E93]">
          案卷尚未建立：在对话里说一句开始，助手会生成 docket.yaml，阶段与轮次会显示在这里。
        </p>
      ) : null}

      <section className="mt-9">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0E0E10]">本次任务</h2>
          <span className="text-[12.5px] text-[#8E8E93]">每个阶段一条会话</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setModeOpen((value) => !value)}
            className="flex h-[54px] w-full items-center gap-3 rounded-[20px] border border-[#E4E4E8] bg-white px-4.5 text-left shadow-[0_1px_3px_rgba(15,15,17,0.04)] transition hover:border-[#D2D2D8]"
          >
            <span className="text-[14.5px] font-semibold text-[#0E0E10]">{config.label}</span>
            <span className="min-w-0 truncate text-[13px] font-normal text-[#6E6E73]">
              {config.hint}
            </span>
            <ChevronDown className="ml-auto h-[18px] w-[18px] flex-none text-[#8E8E93]" />
          </button>

          {modeOpen ? (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setModeOpen(false)} />
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-[20px] border border-[#ECECEF] bg-white p-2 shadow-[0_20px_50px_-20px_rgba(20,20,22,0.26)]">
                {STAGE_LIST.map((stage) => (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => {
                      onModeChange(stage.key);
                      setModeOpen(false);
                    }}
                    className="flex w-full items-start gap-2 rounded-2xl px-3 py-3 text-left transition hover:bg-[#F5F5F7]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-[#1C1C1E]">
                        {stage.label}
                      </span>
                      <span className="mt-1 block text-[12.5px] leading-[1.6] text-[#6E6E73]">
                        {stage.hint}
                      </span>
                    </span>
                    {stage.key === config.key ? (
                      <Check className="mt-1 h-4 w-4 flex-none text-[#1C1C1E]" />
                    ) : null}
                  </button>
                ))}
                <div className="my-1.5 border-t border-[#F1F1F3]" />
                <button
                  type="button"
                  onClick={() => {
                    setModeOpen(false);
                    router.push("/patent/copyright");
                  }}
                  className="flex w-full items-start gap-2 rounded-2xl px-3 py-3 text-left transition hover:bg-[#F5F5F7]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[#0E0E10]">
                      软件著作权
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-[1.6] text-[#6E6E73]">
                      申请表、操作手册、源码前后 30 页
                    </span>
                  </span>
                  <ArrowUpRight className="mt-1 h-4 w-4 flex-none text-[#8E8E93]" />
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="mt-9">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-[#0E0E10]">
            材料
            <span className="rounded-full bg-[#F1F1F4] px-2 py-0.5 text-[12px] font-medium text-[#5F6066]">
              {materials.length}
            </span>
          </h2>
          <span className="text-[12.5px] text-[#8E8E93]">按当前阶段要求 · 每行都可传多份</span>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#ECECEF] bg-white">
          {slots.map((slot, index) => {
            const Icon = SLOT_ICONS[slot.key];
            const files = slotFiles(slot.key);
            const dragging = dragSlot === slot.key;
            return (
              <div
                key={slot.key}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragSlot(slot.key);
                }}
                onDragLeave={() => setDragSlot(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragSlot(null);
                  upload(slot.key, event.dataTransfer.files);
                }}
                className={[
                  "flex items-start gap-3.5 px-5 py-4 transition",
                  index > 0 ? "border-t border-[#F2F2F4]" : "",
                  dragging ? "bg-[#F7F7F9]" : "hover:bg-[#FCFCFD]",
                ].join(" ")}
              >
                <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#F4F4F7]">
                  <Icon className="h-[18px] w-[18px] text-[#5F6066]" strokeWidth={1.8} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[15px] font-medium tracking-[-0.005em] text-[#1C1C1E]">
                      {slot.label}
                    </p>
                    {slot.required ? (
                      <span className="rounded-md bg-[#FFF4E5] px-1.5 py-0.5 text-[11.5px] font-medium text-[#A2621A]">
                        必需
                      </span>
                    ) : null}
                    {files.length > 1 ? (
                      <span className="text-[12px] text-[#8E8E93]">{files.length} 份</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] leading-[1.6] text-[#6E6E73]">
                    {dragging ? "松手即上传到这一行" : slot.hint}
                  </p>

                  {files.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {files.map((file) => (
                        <span
                          key={file.name}
                          className="flex h-7 max-w-full items-center gap-1 rounded-full bg-[#F2F2F5] pl-2.5 pr-1 text-[12.5px] text-[#3C3C43]"
                        >
                          <span className="max-w-[240px] truncate">{file.name}</span>
                          <button
                            type="button"
                            title={`移除 ${file.name}`}
                            onClick={() => onRemoveMaterial(file.name)}
                            className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[#8E8E93] transition hover:bg-[#E2E2E7] hover:text-[#1C1C1E]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => pickFile(slot.key)}
                  title="可一次选多个文件，也可以反复添加"
                  className="mt-0.5 flex h-9 flex-none items-center gap-1 rounded-full border border-[#E4E4E8] px-3.5 text-[13px] font-medium text-[#3C3C43] transition hover:border-[#D2D2D8] hover:bg-[#F5F5F7]"
                >
                  {files.length > 0 ? (
                    <>
                      <Plus className="h-4 w-4" />
                      添加
                    </>
                  ) : (
                    "上传"
                  )}
                </button>
              </div>
            );
          })}
        </div>
        {missing.length > 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-[#8E8E93]">
            还缺 {missing.map((slot) => slot.label).join("、")}，补齐后技能才会继续。
          </p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files?.length) {
              upload(pendingSlot, event.target.files);
            }
            event.target.value = "";
          }}
        />
      </section>

      <section className="mt-9">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-[#0E0E10]">
            产出物
            <span className="rounded-full bg-[#F1F1F4] px-2 py-0.5 text-[12px] font-medium text-[#5F6066]">
              {rows.length}
            </span>
          </h2>
          <span className="text-[12.5px] text-[#8E8E93]">点任意一行预览</span>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#ECECEF] bg-white">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-[#F2F2F4] bg-[#FCFCFD] text-[12.5px] text-[#8E8E93]">
                <th className="w-[44%] px-5 py-3 font-normal">文件</th>
                <th className="w-[16%] py-3 font-normal">阶段</th>
                <th className="w-[14%] py-3 font-normal">状态</th>
                <th className="w-[14%] py-3 font-normal">更新</th>
                <th className="w-[12%] px-5 py-3 text-right font-normal">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-[13px] text-[#8E8E93]">
                    还没有产出，先在对话里说一句开始
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const target: PreviewTarget =
                    row.kind === "artifact"
                      ? { kind: "artifact", key: row.artifactKey ?? "", name: row.name }
                      : { kind: "file", path: row.path ?? "", name: row.name };
                  const Icon = rowFileIcon(row.name, row.kind);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onOpenPreview(target)}
                      className="cursor-pointer border-t border-[#F2F2F4] transition first:border-t-0 hover:bg-[#FAFAFB]"
                    >
                      <td className="px-5 py-3.5">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-[#F4F4F7]">
                            <Icon className="h-4 w-4 text-[#5F6066]" strokeWidth={1.8} />
                          </span>
                          <span className="truncate text-[13.5px] font-medium text-[#1C1C1E]">
                            {row.name}
                          </span>
                        </span>
                      </td>
                      <td className="truncate py-3.5 pr-3 text-[13px] text-[#5F6066]">
                        {row.stage}
                      </td>
                      <td className="py-3.5 pr-3 text-[13px] text-[#5F6066]">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
                          已生成
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 text-[12.5px] text-[#8E8E93]">
                        {formatClock(row.time)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {canOpenOnline(target) ? (
                            <button
                              type="button"
                              title="用 Collabora 在线打开"
                              disabled={openingRow === row.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpeningRow(row.id);
                                Promise.resolve(onOpenOnline(target)).finally(
                                  () => setOpeningRow((value) => (value === row.id ? null : value)),
                                );
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[#8E8E93] transition hover:bg-[#F2F2F4] hover:text-[#1C1C1E] disabled:opacity-40"
                            >
                              {openingRow === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            title="下载"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDownload(row);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[#8E8E93] transition hover:bg-[#F2F2F4] hover:text-[#1C1C1E]"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[#8E8E93]">
          Word / Excel / PPT 可直接在线编辑；其余格式先下载。
        </p>
      </section>
    </div>
  );
}
