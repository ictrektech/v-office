"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Code2,
  Download,
  FileUp,
  Pencil,
  KeyRound,
  List,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useResolvedLanguage } from "@/store";
import { whoAmI } from "@/utils/vos/storage";

const GATEWAY_PATH = "/api/com.ictrek.v-office";

function CopyCode({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-slate-950 text-slate-100">
      <pre className="overflow-x-auto p-4 pr-12 text-xs leading-6">
        <code>{children}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded-lg border border-white/10 bg-white/10 p-2 text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Copy"
      >
        {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function ApiGuideView() {
  const language = useResolvedLanguage();
  const zh = language.toLowerCase().startsWith("zh");
  const [username, setUsername] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://<vos-host>");

  usePageTitle(zh ? "API 接入指南 — V-Office" : "API Guide — V-Office");

  useEffect(() => {
    setOrigin(window.location.origin);
    whoAmI().then(setUsername).catch(() => setUsername(null));
  }, []);

  const base = `${origin}${GATEWAY_PATH}`;
  const examples = useMemo(
    () => ({
      setup: `BASE='${base}'\nTOKEN='<VOS access token>'\nAUTH="Authorization: Bearer $TOKEN"`,
      list: `curl -s "$BASE/api/v1/files" -H "$AUTH" | jq`,
      download: `curl -L "$BASE/api/v1/files/report.docx" \\\n  -H "$AUTH" -o report.docx`,
      upload: `curl -X PUT "$BASE/api/v1/files/report.docx" \\\n  -H "$AUTH" -H 'Content-Type: application/octet-stream' \\\n  --data-binary @report.docx`,
      rename: `curl -X PATCH "$BASE/api/v1/files/report.docx" -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"quarterly-report.docx"}'`,
      remove: `curl -X DELETE "$BASE/api/v1/files/report.docx" -H "$AUTH"`,
      agent: `# 先确认 token 归属，再操作该账户的专属目录\ncurl -s "$BASE/api/v1/me" -H "$AUTH"\n\n# 文件名含空格或中文时必须 URL 编码\nNAME=$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))' 'Agent 报告.docx')\ncurl -X PUT "$BASE/api/v1/files/$NAME" -H "$AUTH" \\\n  -H 'Content-Type: application/octet-stream' --data-binary @report.docx`,
    }),
    [base],
  );

  const endpoints = [
    ["GET", "/api/v1/me", zh ? "确认 Token 所属用户" : "Resolve token owner"],
    ["GET", "/api/v1/files", zh ? "列出当前用户文档" : "List current user's files"],
    ["GET", "/api/v1/files/<name>", zh ? "打开或下载文档" : "Open or download a file"],
    ["PUT", "/api/v1/files/<name>", zh ? "新建或覆盖文档" : "Create or overwrite a file"],
    ["PATCH", "/api/v1/files/<name>", zh ? "重命名文档" : "Rename a file"],
    ["DELETE", "/api/v1/files/<name>", zh ? "删除文档" : "Delete a file"],
    ["GET", "/api/v1/health", zh ? "健康检查（无需认证）" : "Health check (no auth)"],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Code2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {zh ? "API 接入指南" : "API Guide"}
            </h1>
            <p className="text-sm text-text-secondary">
              {zh
                ? "让本机 Agent 和自动化程序安全读写当前 VOS 用户的文档目录。"
                : "Let local agents and automations securely manage the current VOS user's documents."}
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {zh ? "按用户隔离" : "Per-user isolation"}
          </div>
          <p className="text-sm leading-6 text-text-secondary">
            {zh
              ? "Bearer Token 决定文件归属。接口只能访问应用私有存储 documents/<用户名>/，不能读取其他用户目录。"
              : "The Bearer token determines ownership. The API is confined to private app storage under documents/<username>/ and cannot read another user's directory."}
          </p>
          {username && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs font-medium">
              <UserCircle2 className="h-4 w-4 text-primary" />
              {zh ? "当前用户" : "Current user"}: {username}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <KeyRound className="h-5 w-5 text-amber-600" />
            {zh ? "Agent 认证" : "Agent authentication"}
          </div>
          <p className="text-sm leading-6 text-text-secondary">
            {zh
              ? "使用专用 VOS 账号通过标准 OIDC 授权码流程获取 access_token，并保存 refresh_token 做静默续期。当前 VOS 不支持 client_credentials；不要把 Token 写入代码或日志。"
              : "Use a dedicated VOS account and the standard OIDC authorization-code flow. Store its refresh token for renewal. VOS does not currently support client_credentials; never embed tokens in code or logs."}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{zh ? "接口地址" : "Endpoint"}</h2>
        <CopyCode>{examples.setup}</CopyCode>
        <div className="overflow-hidden rounded-2xl border border-border">
          {endpoints.map(([method, path, description], index) => (
            <div
              key={`${method}-${path}`}
              className={`grid gap-2 p-4 md:grid-cols-[80px_1fr_1fr] ${index ? "border-t border-border" : ""}`}
            >
              <span className="w-fit rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">
                {method}
              </span>
              <code className="break-all text-sm">{path}</code>
              <span className="text-sm text-text-secondary">{description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xl font-bold">{zh ? "常用操作" : "Common operations"}</h2>
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold"><List className="h-4 w-4 text-primary" />{zh ? "列出文档" : "List files"}</h3>
          <CopyCode>{examples.list}</CopyCode>
        </div>
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold"><Download className="h-4 w-4 text-primary" />{zh ? "下载文档" : "Download a file"}</h3>
          <CopyCode>{examples.download}</CopyCode>
        </div>
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold"><FileUp className="h-4 w-4 text-primary" />{zh ? "上传或覆盖" : "Upload or overwrite"}</h3>
          <CopyCode>{examples.upload}</CopyCode>
        </div>
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold"><Pencil className="h-4 w-4 text-primary" />{zh ? "重命名文档" : "Rename a file"}</h3>
          <CopyCode>{examples.rename}</CopyCode>
        </div>
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold"><Trash2 className="h-4 w-4 text-red-500" />{zh ? "删除文档" : "Delete a file"}</h3>
          <CopyCode>{examples.remove}</CopyCode>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border p-5">
        <h2 className="text-xl font-bold">{zh ? "Agent 推荐流程" : "Recommended agent flow"}</h2>
        <CopyCode>{examples.agent}</CopyCode>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-text-secondary">
          <li>{zh ? "支持 docx、xlsx、pptx、pdf、odt、ods、odp、csv、txt、md。" : "Supported: docx, xlsx, pptx, pdf, odt, ods, odp, csv, txt and md."}</li>
          <li>{zh ? "单文件最大 100 MB；同名 PUT 会原子覆盖原文件。" : "Maximum file size is 100 MB; PUT atomically overwrites a file with the same name."}</li>
          <li>{zh ? "文件名必须进行 URL 编码，且不能包含路径或 ..。" : "URL-encode file names; paths and .. are rejected."}</li>
          <li>{zh ? "401 表示 Token 缺失或失效；404 表示当前用户目录中不存在该文件。" : "401 means the token is missing or invalid; 404 means the file does not exist in this user's directory."}</li>
        </ul>
      </section>
    </div>
  );
}
