/**
 * 编辑器内核界面语言：应用语言（BCP-47）→ 各内核自己的语言码。
 *
 * 为什么不能把应用语言原样丢给编辑器：
 *
 *   - OnlyOffice 的语言包文件名和 BCP-47 并不对齐。简体中文是 `zh`（不是
 *     `zh-CN`），繁体是 `zh-tw`（小写，`zh-TW` 匹配不到），葡萄牙语（葡萄牙）
 *     是 `pt-pt`，而 `pt` 反而是巴西葡语。码对不上时 OnlyOffice 不报错、不
 *     告警，只是静默退回英文——中文用户点开文档，编辑器外壳却是英文界面。
 *   - Collabora（coolwsd）走标准 BCP-47（en-US / zh-CN / ja-JP…），而且默认
 *     只跟随浏览器语言：不显式下发 `lang`，应用内切了语言编辑器也不会跟着变。
 *
 * 两张表都以「内核实际支持的语言」为准，查不到就退回英文（en / en-US），
 * 保证任何语言下都不会出现空白或半截界面。
 */

/**
 * OnlyOffice DocumentServer 自带的界面语言。
 *
 * 取值来自镜像内 web-apps 各编辑器 locale 目录下的语言包文件名（DS 9.3.x），
 * 不是凭 BCP-47 猜的——只用这份清单才能保证下发出去的语言码真的有语言包。
 */
const ONLYOFFICE_LANGS = new Set([
  "ar", "az", "be", "bg", "ca", "cs", "da", "de", "el", "en", "es", "eu",
  "fi", "fr", "gl", "he", "hu", "hy", "id", "it", "ja", "ko", "lo", "lv",
  "ms", "nl", "no", "pl", "pt", "pt-pt", "ro", "ru", "si", "sk", "sl", "sq",
  "sr", "sr-cyrl", "sv", "tr", "uk", "ur", "vi", "zh", "zh-tw",
]);

/**
 * 应用语言 → OnlyOffice 语言码的例外映射（键为小写）。
 *
 * 只列「同名对不上」的：中文、葡语、拉美西语、繁体旧码。其余同名语言直接
 * 走 ONLYOFFICE_LANGS 命中，无需逐条抄一遍。
 */
const ONLYOFFICE_ALIASES: Record<string, string> = {
  "zh-cn": "zh",
  zh: "zh",
  "zh-hans": "zh",
  "zh-tw": "zh-tw",
  "zh-hant": "zh-tw",
  "zh-hk": "zh-tw",
  "pt-pt": "pt-pt",
  "pt-br": "pt",
  "es-419": "es",
  "sr-latn": "sr",
};

/**
 * 把应用语言换算成 OnlyOffice 的 `editorConfig.lang`。
 *
 * 命中不了任何语言码时退回 `en`：英文是所有 DocumentServer 部署都必然自带
 * 的语言包，也是唯一「退过去一定不出问题」的选项。
 */
export function toOnlyOfficeLang(locale?: string | null): string {
  const key = (locale || "").trim().toLowerCase();
  if (!key) return "en";
  const alias = ONLYOFFICE_ALIASES[key];
  if (alias) return alias;
  if (ONLYOFFICE_LANGS.has(key)) return key;
  // 区域变体（de-AT / fr-CA 之类）先退到基础语言，仍不支持才退英文
  const base = key.split("-")[0];
  if (ONLYOFFICE_LANGS.has(base)) return base;
  return "en";
}

/**
 * 这门语言能不能真的传到编辑器内核（否则编辑器会静默变成英文界面）。
 *
 * 设置页只上架了几门主流语言（见 settings-view.tsx 的 FEATURED_LANGUAGES），
 * 这个判定留给"要不要把某门语言加进上架名单"时核对用：口径与 toOnlyOfficeLang
 * 完全一致（OnlyOffice 的支持面比 Collabora 窄，以它为准），避免出现"名单里
 * 看着支持、实际退回英文"的错位。
 */
export function isEditorLanguage(locale?: string | null): boolean {
  const key = (locale || "").trim().toLowerCase();
  if (!key) return false;
  if (ONLYOFFICE_ALIASES[key]) return true;
  if (ONLYOFFICE_LANGS.has(key)) return true;
  return ONLYOFFICE_LANGS.has(key.split("-")[0]);
}

/**
 * 应用语言 → Collabora 界面语言的例外映射（键为小写）。
 *
 * Collabora 用的是标准 BCP-47，大部分语言原样可用；这里只补「只有基础语言、
 * Collabora 需要区域精度」的几条，以及 `no`（Collabora 里是 nb-NO）。
 */
const COLLABORA_ALIASES: Record<string, string> = {
  en: "en-US",
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  "zh-tw": "zh-TW",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es-ES",
  "es-419": "es-MX",
  "pt-br": "pt-BR",
  "pt-pt": "pt-PT",
  no: "nb-NO",
  sv: "sv-SE",
  da: "da-DK",
  fi: "fi-FI",
  cs: "cs-CZ",
  el: "el-GR",
  he: "he-IL",
  vi: "vi-VN",
  id: "id-ID",
  uk: "uk-UA",
};

/** BCP-47 形状：语言 + 可选子标签（en、zh-CN、sr-Latn-RS）。 */
const BCP47_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/;

/**
 * 把应用语言换算成 Collabora 的 `lang`。
 *
 * Collabora 对不认识的界面语言会自行退回英文，所以这里不必穷举支持列表；
 * 只需保证下发的是合法 BCP-47 形状，并且区域大小写规范（Collabora 的
 * 语言包键是 `zh-CN` 这种区域大写形式，`zh-cn` 会匹配不上）。
 */
export function toCollaboraLang(locale?: string | null): string {
  const key = (locale || "").trim().toLowerCase();
  if (!key || !BCP47_RE.test(key)) return "en-US";
  const alias = COLLABORA_ALIASES[key];
  if (alias) return alias;
  // 归一化区域子标签大小写：zh-cn → zh-CN、sr-latn-rs → sr-Latn-RS
  return key
    .split("-")
    .map((part, index) =>
      index === 0
        ? part
        : part.length === 4
          ? part[0].toUpperCase() + part.slice(1) // 脚本：latn → Latn
          : part.toUpperCase(), // 区域：cn → CN
    )
    .join("-");
}
