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
  FileCode2,
  FileText,
  Files,
  FolderOpen,
  Layers,
  ListTree,
  MessageSquareText,
  PenLine,
  PenTool,
  Image as ImageIcon,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { AiMaterial } from "@/utils/ai/client";
import {
  inferSlot,
  isSlotFor,
  readSlotMap,
  slotsFor,
  type SlotKey,
} from "./material-slots";
import {
  STAGE_LIST,
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
  rows: OutputRow[];
  onModeChange: (next: StageKey) => void;
  onUpload: (slot: SlotKey, files: FileList) => void;
  onRemoveMaterial: (name: string) => void;
  onOpenPreview: (target: PreviewTarget) => void;
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
  rows,
  onModeChange,
  onUpload,
  onRemoveMaterial,
  onOpenPreview,
  onDownload,
}: CaseOverviewProps) {
  const router = useRouter();
  const [modeOpen, setModeOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<SlotKey>("other");
  const inputRef = useRef<HTMLInputElement>(null);
  const slotMap = readSlotMap();
  const slots = slotsFor(config.key);

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

  return (
    <div className="mx-auto w-full max-w-[clamp(640px,66vw,1040px)] px-10 pb-16 pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11.5px] font-medium text-[#8A8B91]">进行中 · {config.label}</p>
        <p className="truncate text-[10.5px] text-[#9A9BA1]">{meta}</p>
      </div>
      <h1 className="mt-2 text-[23px] font-bold leading-tight tracking-[-0.01em] text-[#0F0F11]">
        {title}
      </h1>

      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-[#0F0F11]">本次任务</h2>
          <span className="text-[10.5px] font-medium text-[#9A9BA1]">每个阶段一条会话</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setModeOpen((value) => !value)}
            className="flex h-11 w-full items-center gap-3 rounded-xl border border-[#E2E2E5] bg-white px-3.5 text-left shadow-[0_1px_2px_rgba(15,15,17,0.03)] transition hover:border-[#CFCFD4]"
          >
            <span className="text-[13px] font-semibold text-[#0F0F11]">{config.label}</span>
            <span className="min-w-0 truncate text-[11.5px] font-medium text-[#8A8B91]">{config.hint}</span>
            <ChevronDown className="ml-auto h-4 w-4 flex-none text-[#8A8B91]" />
          </button>

          {modeOpen ? (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setModeOpen(false)} />
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-xl border border-[#EAEAEC] bg-white p-1.5 shadow-[0_16px_36px_-16px_rgba(20,20,22,0.22)]">
                {STAGE_LIST.map((stage) => (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => {
                      onModeChange(stage.key);
                      setModeOpen(false);
                    }}
                    className="flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition hover:bg-[#F4F4F5]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium text-[#151517]">
                        {stage.label}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-relaxed text-[#9A9BA1]">
                        {stage.hint}
                      </span>
                    </span>
                    {stage.key === config.key ? (
                      <Check className="mt-1 h-3.5 w-3.5 flex-none text-[#151517]" />
                    ) : null}
                  </button>
                ))}
                <div className="my-1 border-t border-[#F1F1F3]" />
                <button
                  type="button"
                  onClick={() => {
                    setModeOpen(false);
                    router.push("/patent/copyright");
                  }}
                  className="flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition hover:bg-[#F4F4F5]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-[#0F0F11]">
                      软件著作权
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-relaxed text-[#9A9BA1]">
                      申请表、操作手册、源码前后 30 页
                    </span>
                  </span>
                  <ArrowUpRight className="mt-1 h-3.5 w-3.5 flex-none text-[#9A9BA1]" />
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#0F0F11]">
            材料
            <span className="rounded bg-[#F1F1F3] px-1.5 py-0.5 text-[10px] font-medium text-[#9A9BA1]">
              {materials.length}
            </span>
          </h2>
          <span className="text-[10.5px] text-[#9A9BA1]">按当前阶段要求</span>
        </div>

        <div className="divide-y divide-[#F1F1F3] rounded-xl border border-[#EAEAEC] bg-white">
          {slots.map((slot) => {
            const Icon = SLOT_ICONS[slot.key];
            const files = slotFiles(slot.key);
            return (
              <div key={slot.key} className="group flex items-center gap-3 px-3.5 py-2.5">
                <Icon className="h-4 w-4 flex-none text-[#9A9BA1]" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0F0F11]">
                    {slot.label}
                    {slot.required ? (
                      <span className="rounded bg-[#F1F1F3] px-1.5 py-0.5 text-[9.5px] font-medium text-[#5F6066]">
                        必需
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-[10.5px] text-[#9A9BA1]">
                    {files.length > 0 ? files.map((file) => file.name).join("、") : slot.hint}
                  </p>
                </div>
                {files.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      files.forEach((file) => onRemoveMaterial(file.name))
                    }
                    title="移除本行全部材料"
                    className="flex h-6 w-6 flex-none items-center justify-center rounded text-[#C9C9CF] opacity-0 transition hover:bg-[#F4F4F5] hover:text-[#5F6066] group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => pickFile(slot.key)}
                  className="flex-none text-[11.5px] text-[#5F6066] transition hover:text-[#151517]"
                >
                  {files.length > 0 ? "更换" : "上传"}
                </button>
              </div>
            );
          })}
        </div>
        {missing.length > 0 ? (
          <p className="mt-2 text-[10.5px] leading-relaxed text-[#8A8B91]">
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
              onUpload(pendingSlot, event.target.files);
            }
            event.target.value = "";
          }}
        />
      </section>

      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#0F0F11]">
            产出物
            <span className="rounded bg-[#F1F1F3] px-1.5 py-0.5 text-[10px] font-medium text-[#9A9BA1]">
              {rows.length}
            </span>
          </h2>
          <span className="text-[10.5px] text-[#9A9BA1]">点任意一行预览</span>
        </div>

        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-y border-[#EAEAEC] text-[10.5px] text-[#9A9BA1]">
              <th className="w-[48%] py-2 font-normal">文件</th>
              <th className="w-[16%] py-2 font-normal">阶段</th>
              <th className="w-[16%] py-2 font-normal">状态</th>
              <th className="w-[14%] py-2 font-normal">更新</th>
              <th className="w-[6%] py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F1F3]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[11.5px] text-[#9A9BA1]">
                  还没有产出，先在对话里说一句开始
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() =>
                    onOpenPreview(
                      row.kind === "artifact"
                        ? { kind: "artifact", key: row.artifactKey ?? "", name: row.name }
                        : { kind: "file", path: row.path ?? "", name: row.name },
                    )
                  }
                  className="cursor-pointer transition hover:bg-[#FAFAFB]"
                >
                  <td className="py-2.5 pr-3">
                    <span className="flex min-w-0 items-center gap-2">
                      {(() => {
                        const Icon = rowFileIcon(row.name, row.kind);
                        return <Icon className="h-3.5 w-3.5 flex-none text-[#9A9BA1]" />;
                      })()}
                      <span className="truncate text-[12px] font-medium text-[#0F0F11]">{row.name}</span>
                    </span>
                  </td>
                  <td className="truncate py-2.5 pr-3 text-[11.5px] text-[#5F6066]">
                    {row.stage}
                  </td>
                  <td className="py-2.5 pr-3 text-[11.5px] text-[#5F6066]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3EA05C]" />
                      已生成
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-[11px] text-[#9A9BA1]">
                    {formatClock(row.time)}
                  </td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      title="下载"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDownload(row);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-[#C9C9CF] transition hover:bg-[#F1F1F3] hover:text-[#5F6066]"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
