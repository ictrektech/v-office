"use client";

import { useCallback, useEffect, useState } from "react";
import { useExtracted } from "next-intl";
import { Bot, Check, Loader2, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  aiHealth,
  getAiSettings,
  putAiSettings,
  type AiHealth,
  type AiSettings,
} from "@/utils/ai/client";

const FIELD =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none transition placeholder:text-text-secondary focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

const THINKING = ["", "off", "minimal", "low", "medium", "high"] as const;

/**
 * 设置页「AI 模型」区块：把网关、模型、密钥与资源护栏交给用户自己配。
 *
 * 密钥只存在服务端（`/data/.ai/settings/<user>.json`，0600），接口只回
 * 「配没配」；这里留空就是不修改。护栏（并发/超时）放在同一个面板，
 * 因为它们是同一个取舍：跑得快还是跑得稳。
 */
export function AiSettingsSection() {
  const t = useExtracted();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [thinking, setThinking] = useState("");
  const [allowShell, setAllowShell] = useState(false);
  const [concurrency, setConcurrency] = useState("1");
  const [turnTimeout, setTurnTimeout] = useState("900");
  const [idleTimeout, setIdleTimeout] = useState("240");
  const [state, setState] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const apply = useCallback((data: AiSettings) => {
    setSettings(data);
    setBaseUrl(data.base_url || "");
    setModel(data.model || "");
    setThinking(data.thinking || "");
    setAllowShell(!!data.allow_shell);
    setConcurrency(String(data.max_concurrency ?? 1));
    setTurnTimeout(String(data.turn_timeout_s ?? 900));
    setIdleTimeout(String(data.idle_timeout_s ?? 240));
    setApiKey("");
  }, []);

  // 首屏加载：初始态就是 loading，effect 里先 await 再 setState，
  // 避免「在 effect 里同步 setState」引发的级联渲染
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getAiSettings();
        if (!alive) return;
        apply(data);
        setState("idle");
        void aiHealth()
          .then((h) => alive && setHealth(h))
          .catch(() => alive && setHealth(null));
      } catch (err) {
        if (!alive) return;
        setState("error");
        setMessage(String(err));
      }
    })();
    return () => {
      alive = false;
    };
  }, [apply]);

  const save = async () => {
    setState("saving");
    setMessage(null);
    try {
      const patch: Record<string, unknown> = {
        base_url: baseUrl.trim(),
        model: model.trim(),
        thinking,
        allow_shell: allowShell,
        max_concurrency: Math.max(1, Math.min(8, Number(concurrency) || 1)),
        turn_timeout_s: Math.max(30, Math.min(7200, Number(turnTimeout) || 900)),
        idle_timeout_s: Math.max(15, Math.min(3600, Number(idleTimeout) || 240)),
      };
      // 留空 = 不改密钥（服务端只回「配没配」，拿不到明文）
      if (apiKey.trim()) patch.api_key = apiKey.trim();
      apply(await putAiSettings(patch));
      setState("saved");
      setMessage(t({ id: "Saved", message: "Saved" }));
    } catch (err) {
      setState("error");
      setMessage(String(err));
    }
  };

  const testConnection = async () => {
    setState("loading");
    setMessage(null);
    try {
      const h = await aiHealth();
      setHealth(h);
      setState("idle");
      setMessage(
        h.pi.available
          ? `${t({ id: "Pi available", message: "Pi available" })} · ${h.pi.version ?? ""}`
          : t({ id: "Pi not installed", message: "Pi not installed on the server" }),
      );
    } catch (err) {
      setState("error");
      setMessage(String(err));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Bot className="h-5 w-5 text-primary" />
        <h2>{t({ id: "AI model", message: "AI model" })}</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        {t({
          id: "AI settings hint",
          message:
            "Applies to the patent workbench and AI writing. The key is stored on the app backend only (never returned by the API); leave it blank to keep the current one.",
        })}
      </p>

      {state === "loading" && !settings ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("Loading...")}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">
                {t({ id: "Gateway base URL", message: "Gateway base URL" })}
              </span>
              <input
                className={FIELD}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={
                  settings?.effective_base_url || "https://api.deepseek.com/v1"
                }
                spellCheck={false}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">
                {t({ id: "Model ID", message: "Model ID" })}
              </span>
              <input
                className={FIELD}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="deepseek-chat"
                spellCheck={false}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">
                {t({ id: "API key", message: "API key" })}
                {settings?.has_api_key ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-green-600">
                    <Check className="h-3 w-3" />
                    {t({ id: "Configured", message: "Configured" })}
                  </span>
                ) : null}
              </span>
              <input
                className={FIELD}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  settings?.has_api_key
                    ? t({ id: "Leave blank to keep", message: "Leave blank to keep" })
                    : "sk-..."
                }
                autoComplete="off"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">
                {t({ id: "Thinking level", message: "Thinking level" })}
              </span>
              <select
                className={FIELD}
                value={thinking}
                onChange={(e) => setThinking(e.target.value)}
              >
                {THINKING.map((level) => (
                  <option key={level || "default"} value={level}>
                    {level || t({ id: "Model default", message: "Model default" })}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 能力边界：默认不给 shell，开了也仍然降权 + 提示词护栏 */}
          <div className="space-y-3 border-t border-border pt-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={allowShell}
                onChange={(e) => setAllowShell(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              />
              <span>
                <span className="text-sm font-medium">
                  {t({
                    id: "Allow local commands",
                    message: "Allow local commands (bash)",
                  })}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t({
                    id: "Allow local commands hint",
                    message:
                      "On by default: the skill packages do most of their work in tools/*.py (format conversion, material gates, claim audits, Word export), so the agent needs shell to run them. It runs as a non-root user inside its own session directory, with network/install commands forbidden by policy.",
                  })}
                </span>
              </span>
            </label>

            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-xs text-text-secondary">
                <span className="font-medium">{t({ id: "Active tools", message: "Active tools" })}</span>
                {" · "}
                <code className="font-mono">{settings?.effective_tools || "read,write,edit"}</code>
                {" · "}
                <span className="font-mono">--no-mcp --no-extensions</span>
              </p>
              {settings?.policy_text ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-text-secondary">
                    {t({ id: "System policy in force", message: "System policy in force" })}
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-text-secondary">
                    {settings.policy_text}
                  </pre>
                </details>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">
                {t({ id: "Concurrency per user", message: "Concurrency per user" })}
              </span>
              <input
                className={FIELD}
                type="number"
                min={1}
                max={8}
                value={concurrency}
                onChange={(e) => setConcurrency(e.target.value)}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">
                {t({ id: "Turn timeout (s)", message: "Turn timeout (s)" })}
              </span>
              <input
                className={FIELD}
                type="number"
                min={30}
                max={7200}
                value={turnTimeout}
                onChange={(e) => setTurnTimeout(e.target.value)}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">
                {t({ id: "Idle timeout (s)", message: "Idle timeout (s)" })}
              </span>
              <input
                className={FIELD}
                type="number"
                min={15}
                max={3600}
                value={idleTimeout}
                onChange={(e) => setIdleTimeout(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={state === "saving"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
            >
              {state === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t("Save")}
            </button>
            <button
              type="button"
              onClick={() => void testConnection()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-sidebar-hover"
            >
              <PlugZap className="h-3.5 w-3.5" />
              {t({ id: "Test", message: "Test" })}
            </button>

            {message ? (
              <span
                className={cn(
                  "text-xs",
                  state === "error" ? "text-destructive" : "text-text-secondary",
                )}
              >
                {message}
              </span>
            ) : null}

            {health ? (
              <span className="ml-auto text-xs text-text-secondary">
                {health.pi.available
                  ? `pi ${health.pi.version ?? ""} · ${t({
                      id: "N running",
                      message: "{count} running",
                      values: { count: String(health.running.length) },
                    })}`
                  : t({ id: "Pi not installed", message: "Pi not installed on the server" })}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
