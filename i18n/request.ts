import { Locale } from "@ziziyi/utils";
import { getRequestConfig } from "next-intl/server";
import { getTimeZone } from "./config";

// 静态导出（output: export）下服务端无法按 Accept-Language 区分访客语言，
// 首屏 HTML 只能按这里写死的默认语言渲染；客户端 I18nProvider 挂载后再按
// 浏览器语言切换。默认取中文：中文用户首屏即中文、无语言闪烁。
const defaultLocale = Locale.ZH_CN;

export default getRequestConfig(async () => {
  // const locale = (await requestLocale) || defaultLocale;
  const locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: getTimeZone(locale),
  };
});
