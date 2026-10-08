"use client";

import { useAppStore, useResolvedLanguage } from "@/store";
import {
  Globe,
  Palette,
  Check,
  Puzzle,
  Star,
  Layers,
  ShieldOff,
} from "lucide-react";
import * as Illustration from "@/components/svg";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { LocaleName, LocaleExtend, Locale, Language } from "@ziziyi/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OfficeTheme } from "@/utils/editor/types";
import { isDarkTheme } from "@/utils/utils";
import { usePageTitle } from "@/hooks/use-page-title";

// Get display name for a language code
function getLanguageLabel(code: Language): string {
  if (code === LocaleExtend.Auto) {
    return "Auto (Detect browser language)";
  }
  return LocaleName[code as keyof typeof LocaleName] || code;
}

/**
 * 上架的语言：主流语言，且编辑器内核（OnlyOffice / Collabora）都真正支持。
 *
 * 这里选什么，网站和编辑器界面就会一起切过去（换算见 utils/editor/locale.ts）。
 * 不再从 @ziziyi/utils 的 languages 全量里筛：可选语言是产品决定，不是"能显示
 * 多少就列多少"——每多列一门都要多维护一份译文，而内核不认的语言只会让编辑器
 * 静默退回英文。新增语言前先确认 toOnlyOfficeLang / toCollaboraLang 认它。
 */
const FEATURED_LANGUAGES: Language[] = [
  LocaleExtend.Auto,
  Locale.ZH_CN,
  Locale.ZH_TW,
  Locale.EN,
  Locale.JA,
  Locale.KO,
  Locale.RU,
  Locale.ES,
  Locale.FR,
];

export function SettingsView() {
  const t = useExtracted();
  usePageTitle(t("Settings — V-Office"));
  const { language, theme, plugins, setState } = useAppStore();
  const zh = useResolvedLanguage().toLowerCase().startsWith("zh");

  // 老用户可能存着一门已被下架的语言（如 hi）：仍然列出来，否则下拉里看不到
  // 当前值，用户会以为自己选的语言丢了。
  const options = FEATURED_LANGUAGES.includes(language)
    ? FEATURED_LANGUAGES
    : [...FEATURED_LANGUAGES, language];

  // "自动"这一项原先写死英文，中文界面里显得很突兀；其余语言名用母语写法，
  // 本来就是给人认自己语言的，不翻译。
  const label = (code: Language) =>
    code === LocaleExtend.Auto
      ? zh
        ? "自动（跟随浏览器语言）"
        : "Auto (detect browser language)"
      : getLanguageLabel(code);

  const themes: {
    id: OfficeTheme;
    label: string;
    Illustration: React.ComponentType<any>;
  }[] = [
    {
      id: "theme-white",
      label: t("Modern Light"),
      Illustration: Illustration.ModernLight,
    },
    {
      id: "theme-light",
      label: t("Light"),
      Illustration: Illustration.Light,
    },

    {
      id: "theme-classic-light",
      label: t("Classic Light"),
      Illustration: Illustration.ClassicLight,
    },
    {
      id: "theme-night",
      label: t("Modern Dark"),
      Illustration: Illustration.ModernDark,
    },
    {
      id: "theme-dark",
      label: t("Dark"),
      Illustration: Illustration.Dark,
    },
    {
      id: "theme-contrast-dark",
      label: t("High Contrast"),
      Illustration: Illustration.ContrastDark,
    },
  ];

  const handleThemeChange = (newTheme: OfficeTheme) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ui-theme");
      localStorage.removeItem("ui-theme-id");

      const themeValue = isDarkTheme(newTheme) ? "dark" : "light";
      document.cookie = `theme=${themeValue}; path=/`;
    }
    setState({ theme: newTheme });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("Settings")}</h1>
        <p className="text-text-secondary">
          {t("Configure your preferred language and editor theme.")}
        </p>
      </div>

      <div className="space-y-8">
        {/* Language Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Globe className="w-5 h-5 text-primary" />
            <h2>{t("Language")}</h2>
          </div>
          <Select
            value={language}
            onValueChange={(value) => setState({ language: value as Language })}
          >
            <SelectTrigger className="w-80">
              <SelectValue placeholder={t("Select language")}>
                {label(language)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((code) => (
                <SelectItem
                  key={code}
                  value={code}
                  textValue={`${code} ${label(code)}`}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">{label(code)}</span>
                    <span className="text-muted-foreground text-xs">
                      {code === LocaleExtend.Auto ? "auto" : code}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {zh
              ? "这里选什么，编辑器（OnlyOffice / Collabora）的界面语言就会跟着变成什么；内核不支持的语言已从列表中去掉。"
              : "The editor (OnlyOffice / Collabora) UI follows whatever you pick here. Languages the engines do not ship are not listed."}
          </p>
        </section>

        {/* Theme Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Palette className="w-5 h-5 text-primary" />
            <h2>{t("Editor Theme")}</h2>
          </div>
          <div className="grid grid-cols-2 min-[450px]:grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={cn(
                  "flex flex-col gap-3 p-3 rounded-xl border transition-all text-left group",
                  theme === t.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md"
                    : "border-border hover:border-primary/30 hover:bg-sidebar-hover",
                )}
              >
                <div
                  className={cn(
                    "w-full aspect-5/3 rounded-lg border border-border/50 shadow-inner overflow-hidden flex items-center justify-center p-0 bg-secondary/10",
                  )}
                >
                  <div className="w-full h-full transition-transform duration-500 group-hover:scale-105">
                    <t.Illustration className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    {t.label}
                  </span>
                  {theme === t.id && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Puzzle className="w-5 h-5 text-primary" />
            <h2>{t("Plugins")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: "featured", label: t("Load Featured Plugins"), icon: Star },
              { id: "all", label: t("Load All Plugins"), icon: Layers },
              { id: "none", label: t("Disable Plugins"), icon: ShieldOff },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setState({ plugins: mode.id as any })}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all text-left group relative",
                  plugins === mode.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/15 shadow-sm"
                    : "border-border hover:border-primary/20 hover:bg-sidebar-hover",
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0",
                    plugins === mode.id
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-text-secondary group-hover:bg-primary/10 group-hover:text-primary",
                  )}
                >
                  <mode.icon className="w-[18px] h-[18px]" />
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0 pr-1">
                  <span className="text-xs font-bold leading-none truncate pr-2">
                    {mode.label}
                  </span>
                  {plugins === mode.id && (
                    <Check
                      className="w-3.5 h-3.5 text-primary shrink-0"
                      strokeWidth={3}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="p-6 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-2xl">
        <p className="text-sm text-yellow-800 dark:text-yellow-200/80 leading-relaxed">
          {t(
            "Changing these settings will affect the OnlyOffice editor interface. Some changes may require reloading the editor to take full effect.",
          )}
        </p>
      </div>
    </div>
  );
}
