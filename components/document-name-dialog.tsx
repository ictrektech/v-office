"use client";

import { type FormEvent, useState } from "react";

interface DocumentNameDialogProps {
  suggestedName: string;
  extension: string;
  language: string;
  onCancel: () => void;
  onSave: (name: string) => void;
}

export default function DocumentNameDialog({
  suggestedName,
  extension,
  language,
  onCancel,
  onSave,
}: DocumentNameDialogProps) {
  const zh = language.toLowerCase().startsWith("zh");
  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name
      .trim()
      .replace(new RegExp(`\\.${extension}$`, "i"), "");
    if (!trimmed) {
      setError(zh ? "请输入文件名" : "Enter a file name");
      return;
    }
    if (/[\\/:*?"<>|]/.test(trimmed) || trimmed.length > 180) {
      setError(
        zh
          ? "文件名包含无效字符或过长"
          : "The file name is invalid or too long",
      );
      return;
    }
    onSave(`${trimmed}.${extension}`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-[420px] rounded-2xl bg-popover p-7 shadow-2xl ring-1 ring-foreground/10"
      >
        <h2 className="text-lg font-semibold text-foreground">
          {zh ? "保存文档" : "Save document"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {zh
            ? "请输入文件名，文档将保存到你的专属目录。"
            : "Enter a file name. The document will be saved in your private folder."}
        </p>
        <div className="mt-5 flex items-center rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
          <input
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            aria-label={zh ? "文件名" : "File name"}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none"
          />
          <span className="pr-3 text-sm text-muted-foreground">.{extension}</span>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            {zh ? "取消" : "Cancel"}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {zh ? "保存" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
