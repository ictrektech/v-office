"use client";

/**
 * 软著左栏：申请信息 → 材料 → 办理进度 → 产出物。
 *
 * 只负责展示和把操作转给工作台；进度顺序、门禁含义都来自 steps.ts。
 */

import { useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Database,
  Download,
  FileArchive,
  FileText,
  Loader2,
  Monitor,
  X,
} from "lucide-react";
import type { AiProject } from "@/utils/ai/client";
import {
  STEPS,
  type SoftwareInfo,
  type StepKey,
  type StepMark,
} from "./steps";
import {
  COPYRIGHT_SLOTS,
  type CopyrightSlot,
} from "./materials";
import { formatClock, type OutputRow, type PreviewTarget } from "../workbench/config";

export interface SlotFile {
  name: string;
  size: number;
}

interface CopyrightOverviewProps {
  started: boolean;
  info: SoftwareInfo;
  onInfoChange: (patch: Partial<SoftwareInfo>) => void;
  meta: string;
  project: AiProject | null;
  materialsBySlot: Record<CopyrightSlot, SlotFile[]>;
  shotsReady: boolean;
  marks: Partial<Record<StepKey, StepMark>>;
  current: StepKey | null;
  busy: StepKey | null;
  /** 会话是否已建好；没建好时步骤按钮不可点 */
  ready: boolean;
  uploadHint: string;
  rows: OutputRow[];
  error: string | null;
  canStart: boolean;
  onStart: () => void;
  onRun: (key: StepKey) => void;
  onSkipShots: () => void;
  onUploadShots: (files: FileList) => void;
  onUpload: (slot: CopyrightSlot, files: FileList) => void;
  onRemove: (slot: CopyrightSlot, name: string) => void;
  onOpenPreview: (target: PreviewTarget) => void;
  onDownload: (row: OutputRow) => void;
  onOpenKnowledge: () => void;
}

const SLOT_ICONS = {
  source: FileArchive,
  requirements: FileText,
  screens: Monitor,
  other: FileText,
} as const;

export function CopyrightOverview({
  started,
  info,
  onInfoChange,
  meta,
  project,
  materialsBySlot,
  shotsReady,
  marks,
  current,
  busy,
  ready,
  uploadHint,
  rows,
  error,
  canStart,
  onStart,
  onRun,
  onSkipShots,
  onUploadShots,
  onUpload,
  onRemove,
  onOpenPreview,
  onDownload,
  onOpenKnowledge,
}: CopyrightOverviewProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const shotRef = useRef<HTMLInputElement>(null);
  const [pendingSlot, setPendingSlot] = useState<CopyrightSlot>("requirements");

  const doneCount = STEPS.filter((step) => marks[step.key]?.done).length;
  const title = info.name.trim()
    ? [info.name.trim(), info.version.trim()].filter(Boolean).join(" ")
    : "软件著作权申请";
  const currentStep = STEPS.find((step) => step.key === current);

  const pick = (slot: CopyrightSlot) => {
    setPendingSlot(slot);
    pickerRef.current?.click();
  };

  return (
    <div className="mx-auto w-full max-w-[clamp(640px,66vw,1040px)] px-10 pb-16 pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#8A8B91]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${started ? "bg-[#3EA05C]" : "bg-[#C9C9CF]"}`}
          />
          软著申请 · {started ? "进行中" : "新建"}
        </p>
        <p className="truncate text-[10.5px] text-[#9A9BA1]">{meta}</p>
      </div>
      <h1 className="mt-2 text-[23px] font-bold leading-tight tracking-[-0.01em] text-[#0F0F11]">
        {title}
      </h1>
      <p className="mt-1.5 text-[11.5px] font-medium text-[#8A8B91]">
        {started
          ? `已过 ${doneCount}/${STEPS.length} 步 · 当前：${currentStep?.title ?? "全部完成"}`
          : "填写申请信息，上传源码包，然后开始办理"}
      </p>

      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-[#0F0F11]">申请信息</h2>
          <span className="text-[10.5px] text-[#9A9BA1]">
            {started ? "以申请表信息草稿为准" : "带 * 为必填"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#EAEAEC] bg-[#F1F1F3]">
          <InfoCell label="软件全称" required>
            {started ? (
              <ReadValue value={info.name} />
            ) : (
              <input
                value={info.name}
                onChange={(event) => onInfoChange({ name: event.target.value })}
                placeholder="如：智能仓储管理系统"
                className={inputClass}
              />
            )}
          </InfoCell>
          <InfoCell label="版本号">
            {started ? (
              <ReadValue value={info.version} />
            ) : (
              <input
                value={info.version}
                onChange={(event) => onInfoChange({ version: event.target.value })}
                className={inputClass}
              />
            )}
          </InfoCell>
          <InfoCell label="著作权人">
            {started ? (
              <ReadValue value={info.owner} />
            ) : (
              <input
                value={info.owner}
                onChange={(event) => onInfoChange({ owner: event.target.value })}
                placeholder="公司或个人"
                className={inputClass}
              />
            )}
          </InfoCell>
          <InfoCell label="开发完成日期">
            {started ? (
              <ReadValue value={info.finishDate} />
            ) : (
              <input
                type="date"
                value={info.finishDate}
                onChange={(event) => onInfoChange({ finishDate: event.target.value })}
                className={inputClass}
              />
            )}
          </InfoCell>
          <InfoCell label="开发环境">
            {started ? (
              <ReadValue value={info.devEnv} />
            ) : (
              <input
                value={info.devEnv}
                onChange={(event) => onInfoChange({ devEnv: event.target.value })}
                placeholder="如：Windows 11 · IntelliJ IDEA"
                className={inputClass}
              />
            )}
          </InfoCell>
          <InfoCell label="运行环境">
            {started ? (
              <ReadValue value={info.runEnv} />
            ) : (
              <input
                value={info.runEnv}
                onChange={(event) => onInfoChange({ runEnv: event.target.value })}
                placeholder="如：Windows / Linux · JDK 17"
                className={inputClass}
              />
            )}
          </InfoCell>
        </div>

        {!started ? (
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-[10.5px] leading-relaxed text-[#9A9BA1]">
              源码包可以稍后补；助手会先提示上传，再继续分析。
            </p>
            <button
              type="button"
              onClick={onStart}
              disabled={!canStart}
              className="h-8 flex-none rounded-[10px] bg-[#151517] px-4 text-[12.5px] font-semibold text-white shadow-[0_1px_2px_rgba(15,15,17,0.12)] transition hover:bg-black disabled:bg-[#D8D8DC] disabled:shadow-none"
            >
              开始办理
            </button>
          </div>
        ) : null}
      </section>

      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#0F0F11]">
            材料
            <span className="rounded bg-[#F1F1F3] px-1.5 py-0.5 text-[10px] font-medium text-[#9A9BA1]">
              {COPYRIGHT_SLOTS.reduce(
                (total, slot) => total + materialsBySlot[slot.key].length,
                0,
              )}
            </span>
          </h2>
          <span className="text-[10.5px] text-[#9A9BA1]">{uploadHint}</span>
        </div>

        <div className="divide-y divide-[#F1F1F3] rounded-xl border border-[#EAEAEC] bg-white">
          {COPYRIGHT_SLOTS.map((slot) => {
            const Icon = SLOT_ICONS[slot.key];
            const files = materialsBySlot[slot.key];
            const locked = slot.key === "source" && started && Boolean(project);
            return (
              <div key={slot.key} className="group flex items-center gap-3 px-3.5 py-2.5">
                <Icon className="h-4 w-4 flex-none text-[#9A9BA1]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-[#0F0F11]">{slot.label}</p>
                  <p className="mt-0.5 truncate text-[10.5px] text-[#9A9BA1]">
                    {slot.key === "source" && project
                      ? `${project.files} 个文件 · ${project.source_files} 个源码文件 · ${project.source_lines.toLocaleString("zh-CN")} 行`
                      : files.length > 0
                        ? slot.key === "screens"
                          ? `${files.length} 张：${files.map((file) => file.name).join("、")}`
                          : files.map((file) => file.name).join("、")
                        : slot.hint}
                  </p>
                </div>
                {files.length > 0 && !locked ? (
                  <button
                    type="button"
                    onClick={() => files.forEach((file) => onRemove(slot.key, file.name))}
                    title="移除本行全部材料"
                    className="flex h-6 w-6 flex-none items-center justify-center rounded text-[#C9C9CF] opacity-0 transition hover:bg-[#F4F4F5] hover:text-[#5F6066] group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {locked ? (
                  <span className="flex-none text-[11.5px] text-[#9A9BA1]">已解析</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => pick(slot.key)}
                    className="flex-none text-[11.5px] font-medium text-[#5F6066] transition hover:text-[#0F0F11]"
                  >
                    {files.length > 0 ? "更换" : "上传"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <input
          ref={pickerRef}
          type="file"
          multiple
          accept={pendingSlot === "source" ? ".zip" : undefined}
          hidden
          onChange={(event) => {
            if (event.target.files?.length) {
              onUpload(pendingSlot, event.target.files);
            }
            event.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={onOpenKnowledge}
          className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-[#E2E2E5] px-3.5 py-3 text-left transition hover:border-[#CFCFD4] hover:bg-[#FAFAFB]"
        >
          <Database className="h-4 w-4 flex-none text-[#9A9BA1]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] text-[#5F6066]">从知识库获取材料</span>
            <span className="mt-0.5 block text-[10.5px] text-[#9A9BA1]">
              连接 WeKnora，取项目源码或说明文档
            </span>
          </span>
          <ChevronRight className="h-4 w-4 flex-none text-[#C9C9CF]" />
        </button>
      </section>

      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#0F0F11]">
            办理进度
            <span className="rounded bg-[#F1F1F3] px-1.5 py-0.5 text-[10px] font-medium text-[#9A9BA1]">
              {doneCount}/{STEPS.length}
            </span>
          </h2>
          <span className="text-[10.5px] text-[#9A9BA1]">每步确认后才往下走</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#EAEAEC] bg-white">
          {STEPS.map((step, index) => {
            const mark = marks[step.key];
            const done = Boolean(mark?.done);
            const active = started && current === step.key;
            const running = busy === step.key;
            return (
              <div
                key={step.key}
                className={`relative flex items-start gap-3 border-b border-[#F1F1F3] px-3.5 py-2.5 last:border-b-0 ${
                  active ? "bg-[#FAFAFB] before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[#151517]" : ""
                }`}
              >
                <span
                  className={`mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[9.5px] ${
                    done
                      ? "bg-[#F1F1F3] text-[#5F6066]"
                      : active
                        ? "bg-[#151517] text-white"
                        : "border border-[#EAEAEC] bg-white text-[#C9C9CF]"
                  }`}
                >
                  {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`flex items-center gap-1.5 text-[12.5px] font-medium ${
                      done ? "text-[#5F6066]" : active ? "text-[#0F0F11]" : "text-[#9A9BA1]"
                    }`}
                  >
                    {step.title}
                    {active ? (
                      <span className="rounded border border-[#EAEAEC] px-1 py-px text-[9.5px] text-[#9A9BA1]">
                        需要确认
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-[#9A9BA1]">{step.desc}</p>
                </div>

                {active ? (
                  step.key === "shots" ? (
                    <div className="flex flex-none items-center gap-1.5 pt-px">
                      <button
                        type="button"
                        onClick={onSkipShots}
                        disabled={!ready || Boolean(busy)}
                        className="h-[26px] rounded border border-[#EAEAEC] px-2.5 text-[11px] text-[#5F6066] transition hover:bg-[#F4F4F5] hover:text-[#151517] disabled:opacity-40"
                      >
                        本次跳过
                      </button>
                      <button
                        type="button"
                        onClick={() => (shotsReady ? onRun("shots") : shotRef.current?.click())}
                        disabled={!ready || Boolean(busy)}
                        className="flex h-[26px] items-center gap-1 rounded bg-[#151517] px-2.5 text-[11px] font-medium text-white transition hover:bg-black disabled:opacity-40"
                      >
                        {running ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {shotsReady ? "使用已传截图" : "上传截图"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRun(step.key)}
                      disabled={!ready || Boolean(busy)}
                      className="flex h-[26px] flex-none items-center gap-1 rounded bg-[#151517] px-3 text-[11px] font-medium text-white transition hover:bg-black disabled:opacity-40"
                    >
                      {running ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {running ? "执行中" : "执行"}
                    </button>
                  )
                ) : done ? (
                  <>
                    <span className="flex-none pt-px text-[10.5px] text-[#3EA05C]">已完成</span>
                    <span className="flex-none pt-px text-[10.5px] text-[#9A9BA1]">
                      {formatClock((mark?.at ?? 0) / 1000)}
                    </span>
                  </>
                ) : (
                  <span className="flex-none pt-px text-[10.5px] text-[#9A9BA1]">待办</span>
                )}
              </div>
            );
          })}
        </div>

        <input
          ref={shotRef}
          type="file"
          multiple
          accept="image/*"
          hidden
          onChange={(event) => {
            if (event.target.files?.length) onUploadShots(event.target.files);
            event.target.value = "";
          }}
        />

        {error ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-[#FDECEC] px-3 py-2 text-[11.5px] text-[#C0392B]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
            {error}
          </p>
        ) : null}
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
              <th className="w-[46%] py-2 font-normal">文件</th>
              <th className="w-[18%] py-2 font-normal">阶段</th>
              <th className="w-[16%] py-2 font-normal">状态</th>
              <th className="w-[14%] py-2 font-normal">更新</th>
              <th className="w-[6%] py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F1F3]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[11.5px] text-[#9A9BA1]">
                  {started ? "还没有产出，按进度执行下一步" : "开始办理后，产出物会显示在这里"}
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
                      <FileText className="h-3.5 w-3.5 flex-none text-[#9A9BA1]" />
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

const inputClass =
  "h-6 w-full border-b border-transparent bg-transparent text-[12.5px] text-[#151517] outline-none transition placeholder:text-[#C9C9CF] focus:border-[#C9C9CF]";

function InfoCell({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="bg-white px-3.5 py-2.5">
      <p className="mb-1 text-[10px] font-medium text-[#8A8B91]">
        {label}
        {required ? <span className="ml-0.5 text-[#C0392B]">*</span> : null}
      </p>
      {children}
    </div>
  );
}

function ReadValue({ value }: { value: string }) {
  return (
    <p className={`truncate text-[12.5px] ${value ? "text-[#151517]" : "text-[#C9C9CF]"}`}>
      {value || "—"}
    </p>
  );
}
