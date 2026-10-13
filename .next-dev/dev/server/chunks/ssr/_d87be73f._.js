module.exports = [
"[project]/i18n/config.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getTimeZone",
    ()=>getTimeZone,
    "timeZones",
    ()=>timeZones
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$ziziyi$2b$utils$40$1$2e$0$2e$2$2f$node_modules$2f40$ziziyi$2f$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@ziziyi+utils@1.0.2/node_modules/@ziziyi/utils/dist/index.mjs [app-rsc] (ecmascript)");
;
const timeZones = {
    [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$ziziyi$2b$utils$40$1$2e$0$2e$2$2f$node_modules$2f40$ziziyi$2f$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Locale"].ZH_CN]: "Asia/Shanghai",
    [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$ziziyi$2b$utils$40$1$2e$0$2e$2$2f$node_modules$2f40$ziziyi$2f$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Locale"].ZH_TW]: "Asia/Taipei",
    [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$ziziyi$2b$utils$40$1$2e$0$2e$2$2f$node_modules$2f40$ziziyi$2f$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Locale"].JA]: "Asia/Tokyo",
    [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$ziziyi$2b$utils$40$1$2e$0$2e$2$2f$node_modules$2f40$ziziyi$2f$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Locale"].KO]: "Asia/Seoul",
    [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$ziziyi$2b$utils$40$1$2e$0$2e$2$2f$node_modules$2f40$ziziyi$2f$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Locale"].EN]: "America/Los_Angeles"
};
function getTimeZone(locale) {
    return timeZones[locale] || "UTC";
}
}),
"[project]/i18n/request.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$ziziyi$2b$utils$40$1$2e$0$2e$2$2f$node_modules$2f40$ziziyi$2f$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@ziziyi+utils@1.0.2/node_modules/@ziziyi/utils/dist/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getRequestConfig$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getRequestConfig$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next-intl@4.7.0_next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19._ad6175bb892ccee3b398db7087b15c16/node_modules/next-intl/dist/esm/development/server/react-server/getRequestConfig.js [app-rsc] (ecmascript) <export default as getRequestConfig>");
var __TURBOPACK__imported__module__$5b$project$5d2f$i18n$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/i18n/config.ts [app-rsc] (ecmascript)");
;
;
;
// 静态导出（output: export）下服务端无法按 Accept-Language 区分访客语言，
// 首屏 HTML 只能按这里写死的默认语言渲染；客户端 I18nProvider 挂载后再按
// 浏览器语言切换。默认取中文：中文用户首屏即中文、无语言闪烁。
const defaultLocale = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$ziziyi$2b$utils$40$1$2e$0$2e$2$2f$node_modules$2f40$ziziyi$2f$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Locale"].ZH_CN;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getRequestConfig$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getRequestConfig$3e$__["getRequestConfig"])(async ()=>{
    // const locale = (await requestLocale) || defaultLocale;
    const locale = defaultLocale;
    return {
        locale,
        messages: (await __turbopack_context__.f({
            "../messages/am.json": {
                id: ()=>"[project]/messages/am.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/am.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/ar.json": {
                id: ()=>"[project]/messages/ar.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/ar.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/bg.json": {
                id: ()=>"[project]/messages/bg.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/bg.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/bn.json": {
                id: ()=>"[project]/messages/bn.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/bn.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/ca.json": {
                id: ()=>"[project]/messages/ca.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/ca.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/cs.json": {
                id: ()=>"[project]/messages/cs.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/cs.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/da.json": {
                id: ()=>"[project]/messages/da.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/da.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/de.json": {
                id: ()=>"[project]/messages/de.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/de.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/el.json": {
                id: ()=>"[project]/messages/el.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/el.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/en.json": {
                id: ()=>"[project]/messages/en.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/en.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/es-419.json": {
                id: ()=>"[project]/messages/es-419.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/es-419.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/es.json": {
                id: ()=>"[project]/messages/es.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/es.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/et.json": {
                id: ()=>"[project]/messages/et.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/et.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/fa.json": {
                id: ()=>"[project]/messages/fa.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/fa.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/fi.json": {
                id: ()=>"[project]/messages/fi.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/fi.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/fil.json": {
                id: ()=>"[project]/messages/fil.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/fil.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/fr.json": {
                id: ()=>"[project]/messages/fr.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/fr.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/gu.json": {
                id: ()=>"[project]/messages/gu.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/gu.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/he.json": {
                id: ()=>"[project]/messages/he.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/he.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/hi.json": {
                id: ()=>"[project]/messages/hi.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/hi.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/hr.json": {
                id: ()=>"[project]/messages/hr.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/hr.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/hu.json": {
                id: ()=>"[project]/messages/hu.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/hu.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/id.json": {
                id: ()=>"[project]/messages/id.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/id.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/it.json": {
                id: ()=>"[project]/messages/it.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/it.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/ja.json": {
                id: ()=>"[project]/messages/ja.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/ja.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/kn.json": {
                id: ()=>"[project]/messages/kn.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/kn.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/ko.json": {
                id: ()=>"[project]/messages/ko.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/ko.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/lt.json": {
                id: ()=>"[project]/messages/lt.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/lt.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/lv.json": {
                id: ()=>"[project]/messages/lv.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/lv.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/ml.json": {
                id: ()=>"[project]/messages/ml.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/ml.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/mr.json": {
                id: ()=>"[project]/messages/mr.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/mr.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/ms.json": {
                id: ()=>"[project]/messages/ms.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/ms.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/nl.json": {
                id: ()=>"[project]/messages/nl.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/nl.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/no.json": {
                id: ()=>"[project]/messages/no.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/no.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/pl.json": {
                id: ()=>"[project]/messages/pl.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/pl.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/pt-BR.json": {
                id: ()=>"[project]/messages/pt-BR.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/pt-BR.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/pt-PT.json": {
                id: ()=>"[project]/messages/pt-PT.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/pt-PT.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/ro.json": {
                id: ()=>"[project]/messages/ro.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/ro.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/ru.json": {
                id: ()=>"[project]/messages/ru.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/ru.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/sk.json": {
                id: ()=>"[project]/messages/sk.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/sk.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/sl.json": {
                id: ()=>"[project]/messages/sl.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/sl.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/sr.json": {
                id: ()=>"[project]/messages/sr.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/sr.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/sv.json": {
                id: ()=>"[project]/messages/sv.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/sv.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/sw.json": {
                id: ()=>"[project]/messages/sw.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/sw.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/ta.json": {
                id: ()=>"[project]/messages/ta.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/ta.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/te.json": {
                id: ()=>"[project]/messages/te.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/te.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/th.json": {
                id: ()=>"[project]/messages/th.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/th.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/tr.json": {
                id: ()=>"[project]/messages/tr.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/tr.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/uk.json": {
                id: ()=>"[project]/messages/uk.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/uk.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/vi.json": {
                id: ()=>"[project]/messages/vi.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/vi.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/zh-CN.json": {
                id: ()=>"[project]/messages/zh-CN.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/zh-CN.json.js [app-rsc] (ecmascript, async loader)")
            },
            "../messages/zh-TW.json": {
                id: ()=>"[project]/messages/zh-TW.json.js [app-rsc] (ecmascript, async loader)",
                module: ()=>__turbopack_context__.A("[project]/messages/zh-TW.json.js [app-rsc] (ecmascript, async loader)")
            }
        }).import(`../messages/${locale}.json`)).default,
        timeZone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$i18n$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getTimeZone"])(locale)
    };
});
}),
"[project]/components/i18n-provider.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "I18nProvider",
    ()=>I18nProvider
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const I18nProvider = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call I18nProvider() from the server but I18nProvider is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/i18n-provider.tsx <module evaluation>", "I18nProvider");
}),
"[project]/components/i18n-provider.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "I18nProvider",
    ()=>I18nProvider
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const I18nProvider = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call I18nProvider() from the server but I18nProvider is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/i18n-provider.tsx", "I18nProvider");
}),
"[project]/components/i18n-provider.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$i18n$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/i18n-provider.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$i18n$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/i18n-provider.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$i18n$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/progress-provider.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProgressProvider",
    ()=>ProgressProvider
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ProgressProvider = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ProgressProvider() from the server but ProgressProvider is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/progress-provider.tsx <module evaluation>", "ProgressProvider");
}),
"[project]/components/progress-provider.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProgressProvider",
    ()=>ProgressProvider
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ProgressProvider = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ProgressProvider() from the server but ProgressProvider is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/progress-provider.tsx", "ProgressProvider");
}),
"[project]/components/progress-provider.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$progress$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/progress-provider.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$progress$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/progress-provider.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$progress$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/components/app-toaster.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppToaster",
    ()=>AppToaster
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const AppToaster = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call AppToaster() from the server but AppToaster is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/app-toaster.tsx <module evaluation>", "AppToaster");
}),
"[project]/components/app-toaster.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppToaster",
    ()=>AppToaster
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const AppToaster = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call AppToaster() from the server but AppToaster is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/app-toaster.tsx", "AppToaster");
}),
"[project]/components/app-toaster.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/app-toaster.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/app-toaster.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/utils/site-path.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Site assets (templates, logos, icons) live at the deployment root. Under
// VOS sub-path deployments NEXT_PUBLIC_BASE_PATH carries that prefix ("" on
// standalone builds); root-absolute URLs must go through sitePath() or they
// resolve against the portal root and 404. Internal routes are exempt —
// next/link and router.push prepend the base path themselves.
__turbopack_context__.s([
    "BASE_PATH",
    ()=>BASE_PATH,
    "sitePath",
    ()=>sitePath
]);
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
function sitePath(path) {
    return `${BASE_PATH}${path}`;
}
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RootLayout,
    "metadata",
    ()=>metadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$next$2b$third$2d$parties$40$16$2e$2$2e$3_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f40$next$2f$third$2d$parties$2f$dist$2f$google$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@next+third-parties@16.2.3_next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3__react@19.2.3/node_modules/@next/third-parties/dist/google/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getMessages$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getMessages$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next-intl@4.7.0_next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19._ad6175bb892ccee3b398db7087b15c16/node_modules/next-intl/dist/esm/development/server/react-server/getMessages.js [app-rsc] (ecmascript) <export default as getMessages>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getLocale$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getLocale$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next-intl@4.7.0_next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19._ad6175bb892ccee3b398db7087b15c16/node_modules/next-intl/dist/esm/development/server/react-server/getLocale.js [app-rsc] (ecmascript) <export default as getLocale>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$i18n$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/i18n-provider.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$progress$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/progress-provider.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/app-toaster.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$site$2d$path$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/site-path.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
const metadata = {
    ...publicSiteUrl ? {
        metadataBase: new URL(publicSiteUrl)
    } : {},
    title: {
        default: "V-Office — Free Online Word, Excel & PowerPoint Editor",
        template: "%s"
    },
    description: "Free online office suite. Open, view, and edit Word, Excel, and PowerPoint documents directly in your browser. No upload, no login — your files stay private.",
    keywords: [
        "web office",
        "online office suite",
        "Word online",
        "Excel online",
        "PowerPoint online",
        "DOCX viewer",
        "DOCX editor",
        "XLSX editor",
        "PPTX editor",
        "open docx online",
        "edit excel online",
        "serverless office",
        "privacy first",
        "V-Office"
    ],
    icons: {
        icon: [
            {
                url: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$site$2d$path$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sitePath"])("/favicon.ico"),
                sizes: "any"
            },
            {
                url: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$site$2d$path$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sitePath"])("/logo.svg"),
                type: "image/svg+xml"
            }
        ],
        apple: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$site$2d$path$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sitePath"])("/logo.png")
    },
    openGraph: {
        siteName: "V-Office",
        type: "website",
        locale: "en_US"
    },
    twitter: {
        card: "summary_large_image",
        creator: "@nicezizi"
    },
    robots: {
        index: true,
        follow: true
    },
    other: {
        "mobile-web-app-capable": "yes",
        "apple-mobile-web-app-capable": "yes",
        "apple-mobile-web-app-title": "V-Office"
    }
};
async function RootLayout({ children }) {
    const messages = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getMessages$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getMessages$3e$__["getMessages"])();
    const locale = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getLocale$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getLocale$3e$__["getLocale"])();
    const preload = ()=>{
        const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || "";
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = theme == "dark" || dark && theme != "light";
        document.documentElement.classList.toggle("dark", isDark);
    };
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "V-Office",
        ...publicSiteUrl ? {
            url: publicSiteUrl
        } : {},
        description: "Open, view, and edit Word, Excel, and PowerPoint documents directly in your browser. No upload, no server — your files stay private.",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD"
        },
        featureList: [
            "Edit DOCX, XLSX, PPTX files",
            "No file upload required",
            "Privacy-first — files stay local",
            "Free templates",
            "Browser extension for drag & drop"
        ]
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("html", {
        suppressHydrationWarning: true,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("head", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("script", {
                        children: `(${preload.toString()})()`
                    }, void 0, false, {
                        fileName: "[project]/app/layout.tsx",
                        lineNumber: 105,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("script", {
                        type: "application/ld+json",
                        dangerouslySetInnerHTML: {
                            __html: JSON.stringify(jsonLd)
                        }
                    }, void 0, false, {
                        fileName: "[project]/app/layout.tsx",
                        lineNumber: 106,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("script", {
                        src: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/runtime-config.js`
                    }, void 0, false, {
                        fileName: "[project]/app/layout.tsx",
                        lineNumber: 112,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/layout.tsx",
                lineNumber: 104,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("body", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$progress$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ProgressProvider"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$i18n$2d$provider$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["I18nProvider"], {
                            initialMessages: messages,
                            initialLocale: locale,
                            children: children
                        }, void 0, false, {
                            fileName: "[project]/app/layout.tsx",
                            lineNumber: 118,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$app$2d$toaster$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["AppToaster"], {}, void 0, false, {
                            fileName: "[project]/app/layout.tsx",
                            lineNumber: 121,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/layout.tsx",
                    lineNumber: 117,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/layout.tsx",
                lineNumber: 116,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$next$2b$third$2d$parties$40$16$2e$2$2e$3_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f40$next$2f$third$2d$parties$2f$dist$2f$google$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["GoogleAnalytics"], {
                gaId: "G-EFLBPT6TS8"
            }, void 0, false, {
                fileName: "[project]/app/layout.tsx",
                lineNumber: 124,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/layout.tsx",
        lineNumber: 103,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=_d87be73f._.js.map