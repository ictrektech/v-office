"use client";

/**
 * 专利工作台入口：只维护「当前任务 + 当前案件」，具体交给 StageWorkspace。
 *
 * 每个阶段一条会话；换阶段 / 换案件 / 新建案件都通过换 key 重新挂载，
 * 组件内部不需要处理技能切换。
 */

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearPersistedSession } from "@/hooks/use-ai-chat";
import {
  STAGE_LIST,
  isStageKey,
  persistKeyFor,
  type StageKey,
} from "./config";
import { StageWorkspace } from "./stage-workspace";

export function PatentWorkbench() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") ?? "";
  const [mode, setMode] = useState<StageKey>(
    isStageKey(initialMode) ? initialMode : "disclosure",
  );
  const [caseId, setCaseId] = useState(searchParams.get("case") ?? "");
  const [nonce, setNonce] = useState(0);

  const switchMode = (next: StageKey) => {
    if (next === mode) return;
    setMode(next);
    setCaseId("");
  };

  const newCase = () => {
    STAGE_LIST.forEach((stage) => clearPersistedSession(persistKeyFor(stage.key)));
    setCaseId("");
    setNonce((value) => value + 1);
  };

  return (
    <StageWorkspace
      key={`${mode}:${caseId}:${nonce}`}
      mode={mode}
      caseId={caseId}
      onModeChange={switchMode}
      onPickCase={setCaseId}
      onNewCase={newCase}
    />
  );
}
