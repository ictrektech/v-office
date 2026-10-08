"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { formatFileSize, formatRelativeTime } from "@/utils/recent-files";
import type { PublishConflict } from "@/utils/vos/storage";

interface PublishConflictDialogProps {
  language: string;
  /** 待写入公共目录的那份文件（「我的文档」里的） */
  mine: { name: string; size: number; modified: number };
  conflict: PublishConflict;
  /** 正在执行覆盖 / 改名 */
  busy: boolean;
  /** 正在重新拉取"公共目录里那版"的最新信息 */
  refreshing: boolean;
  onCancel: () => void;
  onOverwrite: () => void;
  onRename: () => void;
  onRefresh: () => void;
}

/**
 * 「存入公共目录」撞上同名文件时的决策对话框。
 *
 * 以前这里只有一句"请先重命名后再存"——没有出路，用户只能回「我的文档」改名
 * 再存一遍，而且没人告诉他公共目录里那份是谁、什么时候放的。现在给出三条明确
 * 出路：覆盖 / 保留两者（服务端改名）/ 取消，并且把两边的信息摆在一起对比。
 *
 * 覆盖一定会再走一次二次确认：它是这条链路上唯一不可逆的动作（服务端会留底，
 * 但用户不该在不知情的情况下按下去）。
 */
export default function PublishConflictDialog({
  language,
  mine,
  conflict,
  busy,
  refreshing,
  onCancel,
  onOverwrite,
  onRename,
  onRefresh,
}: PublishConflictDialogProps) {
  const zh = language.toLowerCase().startsWith("zh");
  const [confirming, setConfirming] = useState(false);

  const current = conflict.current;
  // 覆盖只在这三种情况下可用：正常情况下、或"版本变了"（用户重新看过之后再确认）
  const canOverwrite =
    conflict.reason === "target-exists" || conflict.reason === "version-changed";

  const describeReason = () => {
    switch (conflict.reason) {
      case "version-changed":
        return zh
          ? "这份文件在你确认之前又被更新过一次。请重新看过下面的信息再决定。"
          : "This file was updated again after you confirmed. Review the details below and decide again.";
      case "in-use":
        return zh
          ? `${conflict.holder || "其他用户"} 正在编辑这份文件。为避免把对方正在改的内容冲掉，暂时不能覆盖。`
          : `${conflict.holder || "Another user"} is editing this file. Overwriting is blocked so their edits are not wiped out.`;
      case "name-exhausted":
        return zh
          ? "自动改名失败（同名文件太多）。请先在「我的文档」里重命名你的文件。"
          : "Automatic renaming failed (too many files with that name). Rename your file in My Documents first.";
      case "busy":
        return zh
          ? "公共目录正忙，请稍后重试。"
          : "The public folder is busy. Try again in a moment.";
      default:
        return zh
          ? "公共目录里已经有同名文件。请选择怎么处理。"
          : "A file with the same name already exists in the public folder.";
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-[520px] rounded-2xl bg-popover p-7 shadow-2xl ring-1 ring-foreground/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {zh ? "公共目录里已有同名文件" : "That name is taken"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {describeReason()}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-border p-3">
            <div className="mb-1.5 font-semibold text-foreground">
              {zh ? "公共目录里的" : "In the public folder"}
            </div>
            <div className="break-all text-muted-foreground">
              {current?.name || mine.name}
            </div>
            <div className="mt-1 text-muted-foreground">
              {current?.size !== undefined ? formatFileSize(current.size) : "—"}
              {current?.modified
                ? ` · ${formatRelativeTime(current.modified * 1000)}`
                : ""}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="mb-1.5 font-semibold text-foreground">
              {zh ? "你的这份" : "Yours"}
            </div>
            <div className="break-all text-muted-foreground">{mine.name}</div>
            <div className="mt-1 text-muted-foreground">
              {formatFileSize(mine.size)} ·{" "}
              {formatRelativeTime(mine.modified * 1000)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={busy || refreshing}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {zh ? "刷新对比信息" : "Refresh details"}
        </button>

        {confirming && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            {zh
              ? `确认要用你的这份替换公共目录里的「${current?.name || mine.name}」吗？旧内容会被归档到 .v-office-history，可以由管理员取回。`
              : `Replace “${current?.name || mine.name}” in the public folder with your copy? The previous content is archived under .v-office-history and can be recovered by an administrator.`}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            {zh ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onRename}
            disabled={busy}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar-hover disabled:opacity-50"
          >
            {zh ? "保留两者（自动改名）" : "Keep both (auto-rename)"}
          </button>
          <button
            type="button"
            onClick={() => (confirming ? onOverwrite() : setConfirming(true))}
            disabled={busy || !canOverwrite}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirming
              ? zh
                ? "确认覆盖"
                : "Overwrite"
              : zh
                ? "覆盖"
                : "Overwrite"}
          </button>
        </div>
      </div>
    </div>
  );
}
