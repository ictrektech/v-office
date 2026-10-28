"use client";

/**
 * 软著入口：只维护「当前案件」。
 *
 * 换案件 / 新建案件都通过换 key 重新挂载工作区，会话与步骤状态不用手动清。
 */

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearPersistedSession } from "@/hooks/use-ai-chat";
import { COPYRIGHT_PERSIST_KEY } from "./steps";
import { CopyrightWorkspace } from "./copyright-workspace";

export function CopyrightWorkbench() {
  const searchParams = useSearchParams();
  const [caseId, setCaseId] = useState(searchParams.get("case") ?? "");
  const [nonce, setNonce] = useState(0);

  return (
    <CopyrightWorkspace
      key={`${caseId}:${nonce}`}
      caseId={caseId}
      onPickCase={setCaseId}
      onNewCase={() => {
        clearPersistedSession(COPYRIGHT_PERSIST_KEY);
        setCaseId("");
        setNonce((value) => value + 1);
      }}
    />
  );
}
