// 校验「跟随 VOS」的语言解析：拿门户真实写出的键/值形状喂给 utils/vos/locale.ts。
//
// 这些形状不是凭空设想的——当前门户（vivibit-web-business）用自己的命名空间
// `VIVIBIT-<版本>-<环境>` 持久化偏好，同平台已上线的 WeKnora 读的也是
// `preferences-locale` + `VIVIBIT-` / `vben-web-antd-` 前缀。门户换写法时，
// 先在这里补一条用例，再改 utils/vos/locale.ts。
//
// 运行：node --experimental-strip-types scripts/check-vos-locale.mjs
import assert from "node:assert/strict";
import {
  isVOSLocaleKey,
  normalizeVOSLocale,
  readVOSLocale,
} from "../utils/vos/locale.ts";

/** 最小 localStorage 替身（只实现本模块用到的接口）。 */
function storage(entries) {
  const values = new Map(Object.entries(entries));
  return {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    clear: () => values.clear(),
  };
}

/** 门户当前的键：VIVIBIT-<版本>-<环境>-<偏好项> */
const key = (version, suffix = "preferences-locale") =>
  `VIVIBIT-${version}-prod-${suffix}`;

// 当前门户的键 + 持久化包装
assert.equal(readVOSLocale(storage({ [key("5.5.9")]: '{"value":"zh-CN"}' })), "zh-CN");
assert.equal(readVOSLocale(storage({ [key("5.5.9")]: '{"value":"zh-TW"}' })), "zh-TW");
// 裸串与 JSON 字符串也要认
assert.equal(readVOSLocale(storage({ [key("5.5.9")]: '"zh-TW"' })), "zh-TW");
assert.equal(readVOSLocale(storage({ [key("5.5.9")]: "en-US" })), "en");
// 门户升级后新旧键并存 → 必须取新的（否则会一直跟随升级前的语言）
assert.equal(
  readVOSLocale(
    storage({
      [key("5.5.9")]: '{"value":"zh-CN"}',
      [key("5.5.10")]: '{"value":"en-US"}',
    }),
  ),
  "en",
);
// 最新的键坏掉（半截 JSON）→ 继续往下找，而不是放弃跟随
assert.equal(
  readVOSLocale(
    storage({
      [key("5.5.10")]: "{broken",
      "vben-web-antd-5.0-prod-preferences-locale": '"zh-TW"',
    }),
  ),
  "zh-TW",
);
// 语言藏在偏好组里（{app:{locale}}）→ 繁体地区码要归成繁中
assert.equal(
  readVOSLocale(storage({ [key("5.5.11", "app-locale")]: '{"app":{"locale":"zh-HK"}}' })),
  "zh-TW",
);
// 根键优先于命名空间键
assert.equal(
  readVOSLocale(
    storage({
      [key("5.5.10")]: '{"value":"zh-CN"}',
      "preferences-locale": '{"value":"zh-TW"}',
    }),
  ),
  "zh-TW",
);
// 不认识的语言 → null（交回调用方回落浏览器语言，而不是硬塞英文）
assert.equal(readVOSLocale(storage({ [key("5.5.9")]: '{"value":"xx-YY"}' })), null);
// 本应用自己的设置项、以及别的偏好项都不许被当成语言
assert.equal(readVOSLocale(storage({ "office-state": '{"state":{"language":"zh-CN"}}' })), null);
assert.equal(readVOSLocale(storage({ [key("5.5.9", "preferences-theme")]: '{"value":"dark"}' })), null);
// 空存储 / 值为 null / 存储不可用（内嵌浏览器可能直接抛）
assert.equal(readVOSLocale(storage({})), null);
assert.equal(readVOSLocale(storage({ [key("5.5.9")]: '{"value":null}' })), null);
assert.equal(
  readVOSLocale(
    new Proxy(
      {},
      {
        get: () => {
          throw new Error("Access denied");
        },
      },
    ),
  ),
  null,
);
// 键名识别
assert.equal(isVOSLocaleKey("VIVIBIT-5.5.9-prod-preferences-locale"), true);
assert.equal(isVOSLocaleKey("vben-web-antd-5.0-prod-preferences-locale"), true);
assert.equal(isVOSLocaleKey("preferences-locale"), true);
assert.equal(isVOSLocaleKey("office-state"), false);
assert.equal(isVOSLocaleKey("VIVIBIT-5.5.9-prod-preferences-theme"), false);
assert.equal(isVOSLocaleKey("weknora-locale-mode"), false);
// 语言码归一化
assert.equal(normalizeVOSLocale("zh-Hant-TW"), "zh-TW");
assert.equal(normalizeVOSLocale("zh_Hans_CN"), "zh-CN");
assert.equal(normalizeVOSLocale("zh-MO"), "zh-TW");
assert.equal(normalizeVOSLocale("ja-JP"), "ja");
assert.equal(normalizeVOSLocale("pt-BR"), "pt-BR");
assert.equal(normalizeVOSLocale("es-MX"), "es");
assert.equal(normalizeVOSLocale("auto"), null);
assert.equal(normalizeVOSLocale("english"), null);
assert.equal(normalizeVOSLocale(123), null);

console.log("跟随 VOS 的语言解析：全部断言通过");
