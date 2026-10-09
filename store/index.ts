import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { EditorServer } from "@/utils/editor/server";
import {
  Language,
  Locale,
  LocaleExtend,
  standardizeLocale,
} from "@ziziyi/utils";
import { readVOSLocale, watchVOSLocale } from "@/utils/vos/locale";
import { type OfficeTheme, type PluginMode } from "@/utils/editor/types";

/**
 * 把语言设置解析成真正生效的语言。
 *
 * `auto`（设置里的"跟随 VOS"）的优先级是：**VOS 门户的语言 → 浏览器语言**。
 * 应用跑在门户的同域 iframe 里，门户选的语言写在共享的 localStorage 中（读取
 * 见 utils/vos/locale.ts）；独立部署没有门户，就读不到、回落浏览器语言。
 */
function resolveLanguage(language: Language, vosLanguage: Locale | null): Locale {
  if (language !== LocaleExtend.Auto) return language as Locale;
  if (vosLanguage) return vosLanguage;
  const browserLang =
    typeof navigator !== "undefined"
      ? navigator.language ||
        (navigator as Navigator & { userLanguage?: string }).userLanguage
      : "en";
  return standardizeLocale(browserLang || "en");
}

/** Word 文档（doc/docx）解析内核偏好，默认 OnlyOffice */
export type WordEngine = "onlyoffice" | "collabora";

interface AppState {
  // Document State
  server: EditorServer;

  // Settings State
  language: Language;
  theme: OfficeTheme;
  plugins: PluginMode;
  wordEngine: WordEngine;

  /**
   * VOS 门户当前的语言（跟随 VOS 时的来源），读不到为 null。
   *
   * 不进持久化：它是外部环境的状态，不该被缓存成"用户的选择"。
   */
  vosLanguage: Locale | null;

  // Actions
  setState: (
    state: Partial<
      Pick<AppState, "language" | "theme" | "plugins" | "wordEngine">
    >,
  ) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Document Initial State
      server: new EditorServer({
        getState: () => get(),
      }),

      // Settings Initial State
      language: LocaleExtend.Auto,
      theme: "theme-white",
      plugins: "featured",
      wordEngine: "onlyoffice",

      // 首屏就读一次（同步），否则会先按浏览器语言渲染一帧再跳到门户语言
      vosLanguage: typeof window === "undefined" ? null : readVOSLocale(),

      // Settings Actions
      setState: (newState) => set((state) => ({ ...state, ...newState })),
    }),
    {
      name: "office-state",
      // Only persist settings, skip server instance
      partialize: (state) => ({
        language: state.language, 
        theme: state.theme,
        plugins: state.plugins,
        wordEngine: state.wordEngine,
      }),
    },
  ),
);

/**
 * Hook to check if persist rehydration has completed.
 * Returns false during SSR and before localStorage state is loaded,
 * then true once the persisted state has been applied.
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const unsub = useAppStore.persist.onFinishHydration(callback);
      return unsub;
    },
    () => useAppStore.persist.hasHydrated(),
    () => false, // SSR: always false
  );
}

/**
 * Hook to get the resolved language (reactive).
 * 语言设置变化、或门户语言变化时都会重渲染（编辑器据此重建界面语言）。
 */
export function useResolvedLanguage(): Locale {
  return useAppStore((state) =>
    resolveLanguage(state.language, state.vosLanguage),
  );
}

/**
 * 跟随 VOS：门户改了语言就写回 store，于是整个应用（含 OnlyOffice /
 * Collabora 的界面语言）一起切过去。
 *
 * 模块加载即挂上（仅浏览器），不依赖组件挂载点——门户语言可能在任何页面变化。
 */
if (typeof window !== "undefined") {
  watchVOSLocale((next) => {
    if (useAppStore.getState().vosLanguage === next) return;
    useAppStore.setState({ vosLanguage: next });
  });
}
