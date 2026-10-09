"use client";

/**
 * 「跟随 VOS」— 读取 VOS 门户当前的语言。
 *
 * 应用运行在门户的**同域 iframe** 里，与门户共享同一份 localStorage，所以门户
 * 选的语言是**可读**的，键形如：
 *
 *   VIVIBIT-<版本>-<环境>-preferences-locale      ← 当前门户（命名空间由门户拼）
 *   vben-web-antd-<…>-preferences-locale          ← 更早的门户
 *   preferences-locale                            ← 少数部署写在根键上
 *
 * 值的写法各版本不一，一律容错解析：
 *
 *   zh-CN                    裸串
 *   "zh-CN"                  JSON 字符串
 *   {"value":"zh-CN"}        门户持久化层的包装
 *   {"app":{"locale":"…"}}   语言藏在偏好组里
 *
 * 三条设计约定：
 *
 *   1. 读不到就返回 null，**不要**自己猜一个语言：独立部署（非 VOS）下没有门户，
 *      回落浏览器语言才是对的。调用方负责回落。
 *   2. 门户的语言 API（`window.vos_platform.getState()` /
 *      `broadcast.on('locale-change')`）是新版本才有的能力——**当前部署的门户
 *      注入的对象只有 oauth2，没有语言相关方法**。所以这里把它当锦上添花：有就
 *      用来拿即时通知，没有就靠同源 storage 事件，两条路互不依赖。
 *   3. 多个候选键时优先"明确写了语言"的键，再按版本号新的优先（门户升级后旧键
 *      会残留，取到旧键就会一直跟随旧语言）。
 */

import { Locale, locales } from "@ziziyi/utils";

/** 门户存语言的键后缀，按优先级从高到低。 */
export const VOS_LOCALE_KEY_SUFFIXES = ["-preferences-locale", "-app-locale"] as const;
/** 少数部署把语言写在根键上。 */
export const VOS_BARE_LOCALE_KEYS = ["preferences-locale", "app-locale"] as const;
/** 门户用命名空间前缀把一组键隔开（值由门户运行时拼出，这里只认前缀）。 */
export const VOS_KEY_PREFIXES = ["VIVIBIT-", "vben-web-antd-"] as const;

/** 对象里表示语言的字段名——门户的偏好组里就叫 `locale`。 */
const LOCALE_FIELDS = ["locale", "lang", "language"] as const;
/**
 * 包装层字段：门户持久化层会把状态塞在这些字段下面。
 * `preferences` / `app` 是偏好组的组名——语言可能藏在 `{app:{locale}}` 里。
 */
const WRAPPER_FIELDS = ["value", "data", "state", "preferences", "app"] as const;

/**
 * BCP-47 形状（zh、zh-CN、sr-Latn-RS）。
 * 用来把"版本号""时间戳"这类碰巧长得很像的值挡在门外（它们不以字母开头）。
 */
const BCP47_RE = /^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$/i;

/** 键是不是"门户存语言"的键。 */
export function isVOSLocaleKey(key: string): boolean {
  const lower = key.toLowerCase();
  if ((VOS_BARE_LOCALE_KEYS as readonly string[]).includes(lower)) return true;
  if (!VOS_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
  return VOS_LOCALE_KEY_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

/**
 * 候选键的优先级：根键 > 明确后缀 > 其它命名空间键。
 * （当前只收「根键 + 明确后缀」，第三档留给将来门户改名时扩后缀用。）
 */
function keyRank(key: string): number {
  const lower = key.toLowerCase();
  if ((VOS_BARE_LOCALE_KEYS as readonly string[]).includes(lower)) return 2;
  if (VOS_LOCALE_KEY_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return 1;
  return 0;
}

/**
 * 把 VOS 给的值归一化成本应用的语言码。
 *
 * 认不出来一律返回 null（交回调用方回落），**不要返回 en**：VOS 说了个我们不
 * 认识的语言时，跟随浏览器语言比硬塞英文更不容易出错。
 */
export function normalizeVOSLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null;
  const key = value.trim().replace(/_/g, "-").toLowerCase();
  if (!key || !BCP47_RE.test(key)) return null;
  // 中文要**先判脚本/地区**：语言表里 zh-CN 排在 zh-TW 前面，只看"基础语言是
  // zh"会把 zh-HK / zh-Hant 归到简中，而这些写法在门户里都代表繁体用户。
  if (/^zh-(?:tw|hk|mo|hant)(?:-|$)/.test(key)) return Locale.ZH_TW;
  if (key === "zh" || /^zh-(?:cn|sg|hans)(?:-|$)/.test(key)) return Locale.ZH_CN;
  // 语言表里的写法是有大小写的规范写法（pt-BR / es-419），而 VOS 可能给任意
  // 大小写，所以按小写比对，命中后用表里的写法返回。
  const canonical = locales.find((item) => item.toLowerCase() === key);
  if (canonical) return canonical;
  const [base] = key.split("-");
  return locales.find((item) => item.toLowerCase() === base) ?? null;
}

/**
 * 从任意形状里挑出语言串：优先看 `locale` / `lang` / `language` 字段，
 * 其次钻进 `value` / `data` / `state` 这类包装层。
 */
function pickLocaleValue(raw: unknown, depth = 0): string | null {
  if (depth > 3 || raw == null) return null;
  if (typeof raw === "string") return BCP47_RE.test(raw.trim()) ? raw : null;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const hit = pickLocaleValue(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  for (const field of LOCALE_FIELDS) {
    for (const name of Object.keys(record)) {
      if (name.toLowerCase() !== field) continue;
      const hit = pickLocaleValue(record[name], depth + 1);
      if (hit) return hit;
    }
  }
  for (const wrapper of WRAPPER_FIELDS) {
    const hit = pickLocaleValue(record[wrapper], depth + 1);
    if (hit) return hit;
  }
  return null;
}

/** 裸串原样返回；JSON（对象/字符串/数组）解析后返回；坏 JSON 返回原文。 */
function parseStoredValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const looksJson =
    trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith('"');
  if (!looksJson) return trimmed;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function defaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // 内嵌浏览器里访问 localStorage 可能直接抛（存储被禁）。
    return null;
  }
}

/**
 * 读门户当前语言；读不到返回 null。
 *
 * 候选键按"根键 > 明确后缀 > 版本号新"排序，逐个解析，**第一个能解析出语言的
 * 胜出**——最新的那个键坏掉（半截 JSON、值是被删掉的 null）时会继续往下找，
 * 而不是直接放弃。
 */
export function readVOSLocale(storage: Storage | null = defaultStorage()): Locale | null {
  if (!storage) return null;
  let keys: string[];
  try {
    keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => typeof key === "string" && isVOSLocaleKey(key),
    );
  } catch {
    return null;
  }

  keys.sort((a, b) => {
    const rank = keyRank(b) - keyRank(a);
    if (rank !== 0) return rank;
    // 版本号按数字比较：5.5.10 要排在 5.5.9 前面（字典序会反）
    return b.localeCompare(a, undefined, { numeric: true });
  });

  for (const key of keys) {
    try {
      const raw = storage.getItem(key);
      if (raw == null) continue;
      const locale = normalizeVOSLocale(pickLocaleValue(parseStoredValue(raw)));
      if (locale) return locale;
    } catch {
      // 单个键读失败不影响其它候选
    }
  }
  return null;
}

/** 新版本门户可能注入的语言 API（当前部署没有，故整体可选）。 */
interface VOSLocaleBridge {
  getState?: () => Promise<{ locale?: unknown }>;
  broadcast?: {
    on?: (
      event: "locale-change",
      handler: (state: { locale?: unknown }) => void,
    ) => (() => void) | void;
  };
}

function localeBridge(): VOSLocaleBridge | null {
  if (typeof window === "undefined") return null;
  const platform = (window as unknown as { vos_platform?: VOSLocaleBridge }).vos_platform;
  if (!platform) return null;
  const hasSnapshot = typeof platform.getState === "function";
  const hasBroadcast = typeof platform.broadcast?.on === "function";
  // 老门户注入的对象里没有这两样（只有 oauth2），直接当没有语言 API
  return hasSnapshot || hasBroadcast ? platform : null;
}

/**
 * 订阅门户语言的变化。
 *
 * 主力是**同源 storage 事件**：门户改了语言会写 localStorage，同源的其它标签/
 * iframe 会收到事件（当前标签不会，所以补一个 focus 兜底：用户从门户切回来时
 * 重新读一次）。新版本门户若提供语言 API，再用它拿即时通知——两条路各自独立，
 * 谁在都能工作。
 */
export function watchVOSLocale(apply: (locale: Locale | null) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const readAndApply = () => apply(readVOSLocale());

  window.addEventListener("storage", readAndApply);
  window.addEventListener("focus", readAndApply);

  const bridge = localeBridge();
  let stopBridge: (() => void) | undefined;
  if (bridge) {
    let revision = 0;
    const applySnapshot = (state: { locale?: unknown }) => {
      const locale = normalizeVOSLocale(state?.locale);
      // 门户 API 给了个认不出的值时不清理已有结果，避免把已知语言打回浏览器语言
      if (locale) apply(locale);
    };
    try {
      // 先订阅、再取快照：启动期间发生的变更才不会被迟到的快照盖掉
      const stop = bridge.broadcast?.on?.("locale-change", (state) => {
        revision += 1;
        applySnapshot(state);
      });
      stopBridge = typeof stop === "function" ? stop : undefined;
      const snapshotRevision = revision;
      void bridge
        .getState?.()
        .then((state) => {
          if (revision === snapshotRevision) applySnapshot(state);
        })
        .catch(() => undefined);
    } catch {
      // 门户 API 行为不稳定时静默降级到 storage 事件
    }
  }

  return () => {
    window.removeEventListener("storage", readAndApply);
    window.removeEventListener("focus", readAndApply);
    stopBridge?.();
  };
}
