"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

interface PublishOverwriteDialogProps {
  language: string;
  /** 即将写入公共目录的那个文件名 */
  name: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 「存入公共目录」撞上同名文件时的一句确认。
 *
 * 这里刻意只做一次确认，不做版本比对、也不提供"另存为"：同名直接覆盖是既定行为，
 * 而覆盖掉的那一版服务端会留底，用户在文件列表的「版本」里能取回或退回——所以
 * 需要的只是"别手滑"，不是一套决策流程。
 */
export default function PublishOverwriteDialog({
  language,
  name,
  busy,
  onCancel,
  onConfirm,
}: PublishOverwriteDialogProps) {
  const zh = language.toLowerCase().startsWith("zh");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-[460px] max-w-[92vw] rounded-2xl bg-popover p-7 shadow-2xl ring-1 ring-foreground/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {zh ? "公共目录里已有同名文件" : "That name is taken"}
            </h2>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {zh
                ? `将用你这份「${name}」直接覆盖它。被覆盖的那一版会留底，之后能在文件列表的「版本」里取回或退回。`
                : `Your “${name}” will overwrite the existing file. The version it replaces is archived and can be restored from “Version history”.`}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {zh ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {zh ? "覆盖" : "Overwrite"}
          </button>
        </div>
      </div>
    </div>
  );
}
