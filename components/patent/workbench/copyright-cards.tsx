"use client";

/**
 * 软著阶段的两张卡片：申请信息、8 步办理进度。
 *
 * 从原 `components/patent/software-copyright/copyright-overview.tsx` 搬过来，
 * 只保留工作台左栏用得上的两块，样式对齐工作台（圆角 22、17px 标题）。
 * 进度事实来自磁盘产物（deriveStepMarks），点击记录只做即时反馈。
 */

import { useCallback, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  EMPTY_INFO,
  PROMPTS,
  SHOT_PROMPTS,
  STEPS,
  analyzePrompt,
  deriveStepMarks,
  mergeStepMarks,
  nextStep,
  readSoftwareInfo,
  readStepMarks,
  writeSoftwareInfo,
  writeStepMark,
  type SoftwareInfo,
  type StepKey,
} from "./copyright";

/** 静态导出会在服务端预渲染一遍，那时没有 localStorage，统一回空值 */
function localInfo(sessionId: string): SoftwareInfo {
  if (typeof window === "undefined" || !sessionId) return EMPTY_INFO;
  return readSoftwareInfo(sessionId) ?? EMPTY_INFO;
}

const FIELD_HINT: Record<keyof SoftwareInfo, string> = {
  name: "必填，最终文件名与页眉都用它",
  version: "如 V1.0",
  owner: "著作权人全称（自然人写姓名）",
  finishDate: "YYYY-MM-DD",
  devEnv: "自己的开发机配置，别留占位",
  runEnv: "软件实际运行环境",
};

export function CopyrightInfoCard({ sessionId }: { sessionId: string }) {
  /* 初值按会话 id 从本地读；换案件时父级用 key 重挂本组件，不走 effect 同步 */
  const [info, setInfo] = useState<SoftwareInfo>(() => localInfo(sessionId));

  const patch = (key: keyof SoftwareInfo, value: string) => {
    const next = { ...info, [key]: value };
    setInfo(next);
    if (sessionId) writeSoftwareInfo(sessionId, next);
  };

  const fields: { key: keyof SoftwareInfo; label: string; required?: boolean }[] = [
    { key: "name", label: "软件全称", required: true },
    { key: "version", label: "版本号" },
    { key: "owner", label: "著作权人" },
    { key: "finishDate", label: "开发完成日期" },
    { key: "devEnv", label: "开发环境" },
    { key: "runEnv", label: "运行环境" },
  ];

  return (
    <section className="mt-9">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0E0E10]">申请信息</h2>
        <span className="text-[12.5px] text-[#8E8E93]">存在本机，开始办理时自动带给助手</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-[22px] border border-[#ECECEF] bg-white px-5 py-4">
        {fields.map((field) => (
          <label key={field.key} className="min-w-0">
            <span className="flex items-center gap-1.5 text-[12.5px] text-[#6E6E73]">
              {field.label}
              {field.required ? <span className="text-[#C0392B]">*</span> : null}
            </span>
            <input
              value={info[field.key]}
              onChange={(event) => patch(field.key, event.target.value)}
              placeholder={FIELD_HINT[field.key]}
              className="mt-1.5 h-9 w-full rounded-[10px] border border-[#E4E4E8] px-3 text-[13.5px] text-[#1C1C1E] outline-none transition placeholder:text-[#B4B4BA] focus:border-[#C9C9CF]"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

interface ProgressProps {
  sessionId: string;
  files: ReadonlyArray<{ path: string }>;
  streaming: boolean;
  onSend: (prompt: string) => Promise<boolean>;
}

export function CopyrightProgressCard({
  sessionId,
  files,
  streaming,
  onSend,
}: ProgressProps) {
  const [busy, setBusy] = useState<StepKey | null>(null);
  const [error, setError] = useState("");
  /* 点击记录同样在挂载时读一次；父级按 sessionId 设 key，换案件会重挂 */
  const [clicked, setClicked] = useState<
    Partial<Record<StepKey, { done: boolean; at: number }>>
  >(() => (typeof window === "undefined" || !sessionId ? {} : readStepMarks(sessionId)));

  const marks = useMemo(
    () => mergeStepMarks(deriveStepMarks(files), clicked),
    [files, clicked],
  );
  const current = nextStep(marks);
  const doneCount = STEPS.filter((step) => marks[step.key]?.done).length;

  const run = useCallback(
    async (key: StepKey, prompt: string) => {
      if (busy) return;
      if (streaming) {
        setError("助手还在回复，等本轮结束再执行下一步");
        return;
      }
      setBusy(key);
      setError("");
      try {
        const ok = await onSend(prompt);
        if (!ok) throw new Error("本轮没有完成，进度未推进，可重试当前步骤");
        if (sessionId) writeStepMark(sessionId, key);
        setClicked((value) => ({ ...value, [key]: { done: true, at: Date.now() } }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [busy, onSend, sessionId, streaming],
  );

  /** shots 有自己的两条指令（跳过 / 已传），其余走 PROMPTS */
  const promptFor = (key: StepKey): string => {
    if (key === "shots") return SHOT_PROMPTS.skip;
    // 现读 localStorage：用户可能刚在上面的申请信息卡里改了名字
    if (key === "analyze") return analyzePrompt(sessionId ? readSoftwareInfo(sessionId) : null);
    return PROMPTS[key];
  };

  return (
    <section className="mt-9">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-[#0E0E10]">
          办理进度
          <span className="rounded-full bg-[#F1F1F4] px-2 py-0.5 text-[12px] font-medium text-[#5F6066]">
            {doneCount}/{STEPS.length}
          </span>
        </h2>
        <span className="text-[12.5px] text-[#8E8E93]">按顺序点，每一步都等你确认</span>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-[#ECECEF] bg-white">
        {STEPS.map((step, index) => {
          const done = Boolean(marks[step.key]?.done);
          const active = current === step.key;
          const working = busy === step.key;
          return (
            <div
              key={step.key}
              className={[
                "flex items-start gap-3.5 px-5 py-3.5",
                index > 0 ? "border-t border-[#F2F2F4]" : "",
                active ? "bg-[#FCFCFD]" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11.5px] font-medium",
                  done
                    ? "bg-[#E8F5EC] text-[#2E7D45]"
                    : active
                      ? "bg-[#111113] text-white"
                      : "bg-[#F1F1F4] text-[#8E8E93]",
                ].join(" ")}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-[#1C1C1E]">{step.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-[1.6] text-[#6E6E73]">{step.desc}</p>
              </div>

              {step.key === "shots" ? (
                <div className="mt-0.5 flex flex-none items-center gap-1.5">
                  <button
                    type="button"
                    disabled={Boolean(busy) || streaming}
                    onClick={() => void run("shots", SHOT_PROMPTS.upload)}
                    className="h-8 rounded-full border border-[#E4E4E8] px-3 text-[12.5px] font-medium text-[#3C3C43] transition hover:border-[#D2D2D8] hover:bg-[#F5F5F7] disabled:opacity-40"
                  >
                    已传截图
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy) || streaming}
                    onClick={() => void run("shots", SHOT_PROMPTS.skip)}
                    className="h-8 rounded-full bg-[#111113] px-3 text-[12.5px] font-medium text-white transition hover:bg-black disabled:opacity-40"
                  >
                    {working ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "跳过截图"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(busy) || streaming}
                  onClick={() => void run(step.key, promptFor(step.key))}
                  className={[
                    "mt-0.5 flex h-8 flex-none items-center rounded-full px-3 text-[12.5px] font-medium transition disabled:opacity-40",
                    done
                      ? "border border-[#E4E4E8] text-[#3C3C43] hover:border-[#D2D2D8] hover:bg-[#F5F5F7]"
                      : active
                        ? "bg-[#111113] text-white hover:bg-black"
                        : "border border-[#E4E4E8] text-[#6E6E73] hover:border-[#D2D2D8] hover:bg-[#F5F5F7]",
                  ].join(" ")}
                >
                  {working ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : done ? (
                    "重跑"
                  ) : (
                    "执行"
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error ? <p className="mt-3 text-[12.5px] leading-relaxed text-[#C0392B]">{error}</p> : null}
    </section>
  );
}
