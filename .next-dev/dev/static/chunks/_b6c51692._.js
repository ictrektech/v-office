(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/tailwind-merge@3.4.0/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/hooks/use-page-title.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "usePageTitle",
    ()=>usePageTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
function usePageTitle(title) {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "usePageTitle.useEffect": ()=>{
            document.title = title;
        }
    }["usePageTitle.useEffect"], [
        title
    ]);
}
_s(usePageTitle, "OD7bBpZva5O2jO+Puf00hKivP7c=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/public/patent/templates.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v([{"id":"disclosure","name":"专利交底书","description":"从材料挖专利点 → 轻量查新 → 按国知局口径成文，产出 Markdown + Word。","kind":"disclosure","skillEntry":"skills/patent-disclosure","outputs":["交底书.md","交底书.docx","查新与区别定位.md"],"fields":[{"key":"title","label":"发明名称","hint":"主题 + 类型，避免商标与夸大用词","required":true},{"key":"field","label":"技术领域","hint":"本发明所属的技术领域","required":true},{"key":"background","label":"背景技术","hint":"现有技术方案及其出处","required":true},{"key":"defect","label":"现有技术缺陷","hint":"逐条列问题，不要空喊创新性强","required":true},{"key":"purpose","label":"发明目的","hint":"要解决的技术问题","required":true},{"key":"solution","label":"技术方案","hint":"必要技术特征 + 从属特征","required":true,"inferred":true},{"key":"effects","label":"有益效果","hint":"与缺陷一一对应","required":true},{"key":"embodiments","label":"实施例","hint":"至少一个可实施的具体方案","required":true},{"key":"figures","label":"附图说明","hint":"框图 / 结构图 / 流程图编号与说明","inferred":true},{"key":"alternatives","label":"替代方案","hint":"扩展保护范围用","inferred":true},{"key":"uncertain","label":"待确认清单","hint":"未披露部件只写这里，不进权要","inferred":true}],"variants":[{"id":"invention","name":"发明","note":"方法 / 系统 / 工艺类方案，默认主路径","skillEntry":"skills/patent-disclosure/prompts/invention","outputs":["交底书.md","交底书.docx","查新与区别定位.md"],"fields":[{"key":"title","label":"发明名称","hint":"主题 + 类型，避免商标与夸大用词","required":true},{"key":"field","label":"技术领域","hint":"本发明所属的技术领域","required":true},{"key":"background","label":"背景技术","hint":"现有技术方案及其出处","required":true},{"key":"defect","label":"现有技术缺陷","hint":"逐条列问题，不要空喊创新性强","required":true},{"key":"purpose","label":"发明目的","hint":"要解决的技术问题","required":true},{"key":"solution","label":"技术方案","hint":"必要技术特征 + 从属特征","required":true,"inferred":true},{"key":"effects","label":"有益效果","hint":"与缺陷一一对应","required":true},{"key":"embodiments","label":"实施例","hint":"至少一个可实施的具体方案","required":true},{"key":"figures","label":"附图说明","hint":"框图 / 结构图 / 流程图编号与说明","inferred":true},{"key":"alternatives","label":"替代方案","hint":"扩展保护范围用","inferred":true},{"key":"uncertain","label":"待确认清单","hint":"未披露部件只写这里，不进权要","inferred":true}],"nameEn":"Invention","noteEn":"Method / system / process — the default path."},{"id":"utility","name":"实用新型","note":"结构类方案，产出件号表与结构图","skillEntry":"skills/patent-disclosure/prompts/utility_model","outputs":["交底书.md","交底书.docx","structure_schema.json","figure_plan.yaml"],"fields":[{"key":"title","label":"实用新型名称","required":true},{"key":"field","label":"技术领域","required":true},{"key":"parts","label":"部件清单","hint":"件号由脚本统一分配，禁止自创","required":true},{"key":"structure","label":"连接关系","hint":"部件之间的位置与连接","required":true},{"key":"effect","label":"有益效果","required":true},{"key":"figures","label":"结构图清单","hint":"每个部件至少出现在一张图中","required":true}],"nameEn":"Utility Model","noteEn":"Structural solution: parts list and structure figures."},{"id":"design","name":"外观设计","note":"视觉类方案，产出视图清单与线稿","skillEntry":"skills/patent-disclosure/prompts/design","outputs":["交底书.md","交底书.docx","appearance_schema.json","视图线稿"],"fields":[{"key":"title","label":"外观设计名称","required":true},{"key":"product","label":"产品用途","required":true},{"key":"designPoints","label":"设计要点","hint":"形状 / 图案 / 色彩及其结合","required":true},{"key":"views","label":"视图清单","hint":"主视图 / 后视图 / 立体图等","required":true},{"key":"omitted","label":"省略视图说明","inferred":true}],"nameEn":"Design","noteEn":"Visual solution: view list and line drawings."}],"nameEn":"Patent Disclosure","descriptionEn":"Mine the invention from your materials, run a light prior-art check, and draft to CNIPA practice — Markdown + Word."},{"id":"application-four","name":"申请文件四件套","description":"已有交底 → 权利要求书 / 说明书 / 摘要 / 附图。须指定交底目录。","kind":"application","skillEntry":"skills/patent-application","outputs":["权利要求书.md","说明书.md","摘要.md","附图.docx"],"fields":[{"key":"disclosureDir","label":"交底目录","hint":"须为已定稿交底（含 schema）","required":true},{"key":"claimStrategy","label":"权要布局","hint":"独权必要特征 + 从属阶梯","required":true},{"key":"supportCheck","label":"支持性自查","hint":"权要特征需在说明书有支撑"}],"nameEn":"Application Four-Piece Set","descriptionEn":"From a settled disclosure: description, claims, abstract and figures."},{"id":"office-action","name":"审查意见答复","description":"对照审查意见逐条答复，草稿确认后出陈述正文 Word。","kind":"office-action","skillEntry":"skills/patent-oa","outputs":["答复草稿.md","意见陈述.docx"],"fields":[{"key":"notice","label":"审查意见通知","required":true},{"key":"claims","label":"当前权要","required":true},{"key":"amendments","label":"修改方案","hint":"修改后的权要与修改依据","required":true},{"key":"arguments","label":"创造性说理","hint":"区别特征 + 技术效果"}],"nameEn":"Office Action Reply","descriptionEn":"Reply to each examiner objection, then export the statement as a Word file."}]);}),
"[project]/utils/patent/templates.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getDisclosureTemplates",
    ()=>getDisclosureTemplates,
    "getPatentTemplate",
    ()=>getPatentTemplate,
    "getPatentTemplates",
    ()=>getPatentTemplates,
    "getTemplateVariants",
    ()=>getTemplateVariants,
    "getTemplatesByKind",
    ()=>getTemplatesByKind,
    "localizeTemplate",
    ()=>localizeTemplate,
    "localizeVariant",
    ()=>localizeVariant,
    "resolveVariant",
    ()=>resolveVariant
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$public$2f$patent$2f$templates$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/public/patent/templates.json (json)");
;
/**
 * 专利栏目独立模板。
 *
 * 与 Office 文件模板（`utils/templates.ts` → `public/files/templates.json`）分开维护：
 * 那边是「下载一个 docx 去编辑」，这边是「一份字段清单 + 一个 skill 入口 + 产出契约」。
 * 模板只承载入口与字段，流程细则仍以 patent-disclosure-skill 的
 * 各子包的 SKILL.md 与 prompts/ 为准，避免两头维护。
 */ const TEMPLATES = __TURBOPACK__imported__module__$5b$project$5d2f$public$2f$patent$2f$templates$2e$json__$28$json$29$__["default"];
function getPatentTemplates() {
    return TEMPLATES;
}
function getPatentTemplate(id) {
    return TEMPLATES.find((t)=>t.id === id);
}
function getTemplatesByKind(kind) {
    return TEMPLATES.filter((t)=>t.kind === kind);
}
function getDisclosureTemplates() {
    return getTemplatesByKind("disclosure");
}
function getTemplateVariants(tpl) {
    return tpl?.variants ?? [];
}
function resolveVariant(tpl, variantId) {
    const variants = getTemplateVariants(tpl);
    if (!variants.length) return undefined;
    return variants.find((v)=>v.id === variantId) ?? variants[0];
}
function localizeTemplate(tpl, isZh) {
    if (isZh) return {
        name: tpl.name,
        description: tpl.description
    };
    return {
        name: tpl.nameEn || tpl.name,
        description: tpl.descriptionEn || tpl.description
    };
}
function localizeVariant(variant, isZh) {
    if (isZh) return {
        name: variant.name,
        note: variant.note
    };
    return {
        name: variant.nameEn || variant.name,
        note: variant.noteEn ?? variant.note
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/studio/visual-spec.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * 专利栏目视觉规范（单一事实源）。
 *
 * 依据设计稿（浅色、卡片化、蓝调强调、柔和阴影）抽取成一组令牌与
 * 组合类名，页面只引用这里，避免各页各写一套 `text-[#...]`。
 * 令牌同时被 `app/patent/spec/page.tsx` 渲染成可查看的规范页。
 */ /** 基础色板 */ __turbopack_context__.s([
    "VP_COLORS",
    ()=>VP_COLORS,
    "VP_SEVERITY",
    ()=>VP_SEVERITY,
    "VP_SPEC_GROUPS",
    ()=>VP_SPEC_GROUPS,
    "vp",
    ()=>vp
]);
const VP_COLORS = {
    /** 强调色（主操作、选中态、数据条）——iOS 系统蓝，比网页蓝更圆润耐看 */ accent: "#007AFF",
    /** 强调色浅底（选中行、标签底） */ accentSoft: "#EAF4FF",
    /** 语义色 */ success: "#16A34A",
    successSoft: "#ECFDF3",
    warning: "#D97706",
    warningSoft: "#FFF7ED",
    danger: "#DC2626",
    dangerSoft: "#FEF2F2",
    /** 文本 */ ink: "#0F172A",
    inkMid: "#475569",
    inkSoft: "#94A3B8",
    /** 线与底 */ line: "#E7EAF0",
    canvas: "#F5F7FB",
    surface: "#FFFFFF"
};
const VP_SEVERITY = {
    high: {
        text: "text-[#DC2626]",
        bg: "bg-[#FEF2F2]",
        dot: "bg-[#DC2626]"
    },
    mid: {
        text: "text-[#D97706]",
        bg: "bg-[#FFF7ED]",
        dot: "bg-[#D97706]"
    },
    low: {
        text: "text-[#2563EB]",
        bg: "bg-[#EFF4FF]",
        dot: "bg-[#2563EB]"
    }
};
const vp = {
    /** 全屏工作台外壳：浅色渐变底，深色跟随主题 */ shell: "h-screen overflow-hidden bg-[#F2F2F7] text-[#0F172A] antialiased dark:bg-[#0B0B0B] dark:text-white",
    /** 顶级卡片（大面板、列表卡）——iOS 的大圆角 + 极轻投影 */ card: "rounded-3xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-18px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#141414]",
    /** 次级卡片（卡内小卡、统计格） */ subCard: "rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-white/8 dark:bg-white/[0.03]",
    /** 悬浮态（可点击卡片/行） */ hoverable: "transition-all duration-200 hover:-translate-y-0.5 hover:border-[#CFE3FF] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_40px_-20px_rgba(0,122,255,0.35)]",
    /** 主按钮 */ btnPrimary: "inline-flex items-center gap-1.5 rounded-2xl bg-[#007AFF] px-4 py-2.5 text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_20px_-12px_rgba(0,122,255,0.9)] transition hover:bg-[#0062CC] active:scale-[0.98]",
    /** 次按钮 */ btnGhost: "inline-flex items-center gap-1.5 rounded-2xl border border-black/[0.06] bg-white px-4 py-2.5 text-[15px] font-medium text-[#475569] transition hover:border-[#CFE3FF] hover:text-[#0F172A] active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
    /** 纯文字按钮 */ btnText: "inline-flex items-center gap-1 text-[14px] text-[#64748B] transition hover:text-[#007AFF]",
    /** 分割胶囊（Tab / 分段控件）容器 —— iOS 的 segmented control */ segGroup: "inline-flex items-center gap-1 rounded-full border border-black/[0.05] bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/5",
    /** 分割胶囊选中态 / 未选中态 */ segOn: "rounded-full bg-white px-4 py-2 text-[14px] font-medium text-[#0F172A] shadow-[0_1px_3px_rgba(0,0,0,0.10)]",
    segOff: "rounded-full px-4 py-2 text-[14px] font-medium text-[#64748B] transition hover:text-[#0F172A]",
    /** 状态标签 */ chip: "inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[13px] text-[#475569] dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
    /** 输入框 / 底栏输入区 —— 字号跟着面板正文走，不再是「小一号」的观感 */ input: "w-full rounded-2xl border border-black/[0.07] bg-white px-4 py-3 text-[15px] leading-relaxed text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#9CC9FF] focus:ring-4 focus:ring-[#007AFF]/10 dark:border-white/10 dark:bg-white/5 dark:text-white",
    /** 图标按钮 */ iconBtn: "inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B] transition hover:bg-black/[0.04] hover:text-[#0F172A] dark:hover:bg-white/10 dark:hover:text-white",
    /** 正文段落（文档画布） */ docText: "text-[15px] leading-[1.95] text-[#1F2937] dark:text-slate-200",
    docHeading: "text-[16.5px] font-semibold text-[#0F172A] dark:text-white",
    /** 字阶 */ h1: "text-[21px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-white",
    h2: "text-[17px] font-semibold text-[#0F172A] dark:text-white",
    label: "text-[12.5px] font-medium uppercase tracking-[0.08em] text-[#94A3B8]",
    meta: "text-[13.5px] text-[#94A3B8]",
    body: "text-[14.5px] leading-relaxed text-[#475569] dark:text-slate-300"
};
const VP_SPEC_GROUPS = [
    {
        title: "色板",
        items: [
            {
                name: "accent",
                value: VP_COLORS.accent,
                desc: "主操作 / 选中 / 数据强调"
            },
            {
                name: "accentSoft",
                value: VP_COLORS.accentSoft,
                desc: "强调色浅底"
            },
            {
                name: "success",
                value: VP_COLORS.success,
                desc: "通过 / 已完成"
            },
            {
                name: "warning",
                value: VP_COLORS.warning,
                desc: "待确认 / 中风险"
            },
            {
                name: "danger",
                value: VP_COLORS.danger,
                desc: "高风险 / 驳回"
            },
            {
                name: "ink",
                value: VP_COLORS.ink,
                desc: "主文本"
            },
            {
                name: "inkMid",
                value: VP_COLORS.inkMid,
                desc: "次文本"
            },
            {
                name: "inkSoft",
                value: VP_COLORS.inkSoft,
                desc: "占位 / 说明"
            },
            {
                name: "line",
                value: VP_COLORS.line,
                desc: "描边"
            },
            {
                name: "canvas",
                value: VP_COLORS.canvas,
                desc: "页面底色"
            }
        ]
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/patent/patent-home.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PatentHome",
    ()=>PatentHome
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next-intl@4.7.0_next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19._ad6175bb892ccee3b398db7087b15c16/node_modules/next-intl/dist/esm/development/react-client/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$use$2d$intl$40$4$2e$7$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$use$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/use-intl@4.7.0_react@19.2.3/node_modules/use-intl/dist/esm/development/react.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-client] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$flask$2d$conical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FlaskConical$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/flask-conical.js [app-client] (ecmascript) <export default as FlaskConical>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/house.js [app-client] (ecmascript) <export default as Home>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$palette$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Palette$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/palette.js [app-client] (ecmascript) <export default as Palette>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pen$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PenLine$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/pen-line.js [app-client] (ecmascript) <export default as PenLine>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/scale.js [app-client] (ecmascript) <export default as Scale>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$stamp$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stamp$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/stamp.js [app-client] (ecmascript) <export default as Stamp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$page$2d$title$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/use-page-title.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/patent/templates.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/studio/visual-spec.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
/** 工作对象的配色（iOS 系统色：蓝 / 绿 / 灰） */ const KIND_META = {
    disclosure: {
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$flask$2d$conical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FlaskConical$3e$__["FlaskConical"],
        cls: "bg-[#EAF4FF] text-[#007AFF]"
    },
    application: {
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
        cls: "bg-[#E8F9EC] text-[#34C759]"
    },
    "office-action": {
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$stamp$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stamp$3e$__["Stamp"],
        cls: "bg-[#EFEFF4] text-[#8E8E93]"
    }
};
/** 工作对象文案（静态分支：next-intl 提取器要求消息可静态分析）。 */ function KindLabel({ kind }) {
    _s();
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTranslations"])();
    switch(kind){
        case "disclosure":
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: t("Disclosure", void 0, void 0, "Disclosure")
            }, void 0, false);
        case "application":
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: t("Application", void 0, void 0, "Application")
            }, void 0, false);
        default:
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: t("Office action", void 0, void 0, "Office action")
            }, void 0, false);
    }
}
_s(KindLabel, "EV6W0cDz/TmKpT68zo6scSiJBSk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTranslations"]
    ];
});
_c = KindLabel;
function PatentHome() {
    _s1();
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTranslations"])();
    const locale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$use$2d$intl$40$4$2e$7$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$use$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLocale"])();
    const isZh = locale.toLowerCase().startsWith("zh");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$page$2d$title$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePageTitle"])(t("Patent Workbench", void 0, void 0, "Patent Workbench"));
    const templates = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPatentTemplates"])();
    // 文案在数组里就地求值（每次调用都是字面量，构建期可静态提取）
    const entries = [
        {
            href: "/patent/studio",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$flask$2d$conical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FlaskConical$3e$__["FlaskConical"],
            title: t("AI Patent Studio", void 0, void 0, "AI Patent Studio"),
            badge: t("Core", void 0, void 0, "Core"),
            desc: t("Studio card desc", void 0, void 0, "Core workspace: materials → mining → prior-art → disclosure draft.")
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["vp"].shell, "overflow-y-auto custom-scrollbar"),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto w-full max-w-6xl px-8 pb-16 pt-12",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-10 flex flex-wrap items-end justify-between gap-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-[#007AFF] shadow-[0_2px_4px_rgba(0,0,0,0.06),0_12px_28px_-14px_rgba(0,122,255,0.9)]",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__["Scale"], {
                                        className: "h-7 w-7 text-white",
                                        strokeWidth: 1.8
                                    }, void 0, false, {
                                        fileName: "[project]/components/patent/patent-home.tsx",
                                        lineNumber: 70,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 69,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                            className: "text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] dark:text-white",
                                            children: t("Patent Workbench", void 0, void 0, "Patent Workbench")
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 73,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "mt-1 text-[15.5px] leading-relaxed text-[#6E6E73] dark:text-slate-400",
                                            children: t("Workbench subtitle", void 0, void 0, "Disclosure drafting and application review, powered by the patent skill.")
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 76,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 72,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/patent/patent-home.tsx",
                            lineNumber: 68,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap items-center gap-2.5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/patent/studio?template=disclosure",
                                    className: "inline-flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_10px_24px_-14px_rgba(0,122,255,0.9)] transition hover:bg-[#0062CC] active:scale-[0.98]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pen$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PenLine$3e$__["PenLine"], {
                                            className: "h-4.5 w-4.5"
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 85,
                                            columnNumber: 15
                                        }, this),
                                        t("Start a patent draft", void 0, void 0, "Start a patent draft")
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 84,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/patent/spec",
                                    className: "inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-medium text-[#1C1C1E] shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05] transition hover:bg-[#F2F2F7] active:scale-[0.98] dark:bg-white/10 dark:text-white",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$palette$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Palette$3e$__["Palette"], {
                                            className: "h-4.5 w-4.5"
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 89,
                                            columnNumber: 15
                                        }, this),
                                        t("Visual Spec", void 0, void 0, "Visual Spec")
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 88,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/",
                                    className: "inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-medium text-[#1C1C1E] shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05] transition hover:bg-[#F2F2F7] active:scale-[0.98] dark:bg-white/10 dark:text-white",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"], {
                                            className: "h-4.5 w-4.5"
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 94,
                                            columnNumber: 15
                                        }, this),
                                        t("Back to V-Office", void 0, void 0, "V-Office Home")
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 93,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/patent/patent-home.tsx",
                            lineNumber: 82,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/patent/patent-home.tsx",
                    lineNumber: 67,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-12 grid grid-cols-1 gap-5 md:grid-cols-2",
                    children: entries.map((e)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: e.href,
                            className: "group flex flex-col rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(0,0,0,0.28)] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_24px_48px_-24px_rgba(0,122,255,0.35)] dark:bg-[#141414] dark:ring-white/10",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-5 flex items-center gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF4FF] dark:bg-[#007AFF]/15",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(e.icon, {
                                                className: "h-7 w-7 text-[#007AFF]",
                                                strokeWidth: 1.8
                                            }, void 0, false, {
                                                fileName: "[project]/components/patent/patent-home.tsx",
                                                lineNumber: 105,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 104,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                    className: "text-[20px] font-semibold leading-tight tracking-[-0.01em] text-[#0F172A] dark:text-white",
                                                    children: e.title
                                                }, void 0, false, {
                                                    fileName: "[project]/components/patent/patent-home.tsx",
                                                    lineNumber: 108,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "mt-0.5 inline-block rounded-full bg-[#EFEFF4] px-2.5 py-0.5 text-[12.5px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-slate-300",
                                                    children: e.badge
                                                }, void 0, false, {
                                                    fileName: "[project]/components/patent/patent-home.tsx",
                                                    lineNumber: 111,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 107,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7] text-[#8E8E93] transition-all group-hover:bg-[#007AFF] group-hover:text-white dark:bg-white/10",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                className: "h-4.5 w-4.5"
                                            }, void 0, false, {
                                                fileName: "[project]/components/patent/patent-home.tsx",
                                                lineNumber: 116,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 115,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 103,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[15.5px] leading-relaxed text-[#6E6E73] dark:text-slate-400",
                                    children: e.desc
                                }, void 0, false, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 119,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, e.href, true, {
                            fileName: "[project]/components/patent/patent-home.tsx",
                            lineNumber: 102,
                            columnNumber: 30
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/patent/patent-home.tsx",
                    lineNumber: 101,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-[22px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-white",
                            children: t("Templates", void 0, void 0, "Or start from a template")
                        }, void 0, false, {
                            fileName: "[project]/components/patent/patent-home.tsx",
                            lineNumber: 127,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 text-[15px] leading-relaxed text-[#6E6E73] dark:text-slate-400",
                            children: t("Templates subtitle", void 0, void 0, "Click any card to draft with that template — its skill, field list and output contract come along.")
                        }, void 0, false, {
                            fileName: "[project]/components/patent/patent-home.tsx",
                            lineNumber: 130,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/patent/patent-home.tsx",
                    lineNumber: 126,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
                    children: templates.map((tpl)=>{
                        const meta = KIND_META[tpl.kind];
                        const Icon = meta.icon;
                        // 模板名跟随界面语言（英文名同时也是落盘 docx 的文件名来源）
                        const loc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localizeTemplate"])(tpl, isZh);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: tpl.kind === "application" ? "/patent/application" : tpl.kind === "office-action" ? "/patent/office-action" : `/patent/studio?template=${tpl.id}`,
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group flex flex-col rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_20px_44px_-26px_rgba(0,122,255,0.4)] dark:bg-[#141414] dark:ring-white/10"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-4 flex items-center gap-2.5",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex h-9 w-9 items-center justify-center rounded-xl", meta.cls),
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                                className: "h-4.5 w-4.5",
                                                strokeWidth: 1.9
                                            }, void 0, false, {
                                                fileName: "[project]/components/patent/patent-home.tsx",
                                                lineNumber: 144,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 143,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-full px-2.5 py-1 text-[12.5px] font-semibold", meta.cls),
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KindLabel, {
                                                kind: tpl.kind
                                            }, void 0, false, {
                                                fileName: "[project]/components/patent/patent-home.tsx",
                                                lineNumber: 147,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 146,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 142,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[#0F172A] dark:text-white",
                                    children: loc.name
                                }, void 0, false, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 151,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-2 flex-1 text-[15px] leading-relaxed text-[#6E6E73] dark:text-slate-400",
                                    children: loc.description
                                }, void 0, false, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 154,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-5 flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex min-w-0 flex-1 flex-wrap items-center gap-2",
                                            children: tpl.variants?.length ? tpl.variants.map((v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "shrink-0 rounded-full bg-[#EAF4FF] px-3 py-1.5 text-[13.5px] font-semibold text-[#007AFF] dark:bg-[#007AFF]/15",
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localizeVariant"])(v, isZh).name
                                                }, v.id, false, {
                                                    fileName: "[project]/components/patent/patent-home.tsx",
                                                    lineNumber: 162,
                                                    columnNumber: 69
                                                }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "shrink-0 rounded-full bg-[#EFEFF4] px-3 py-1.5 text-[13.5px] font-semibold text-[#6E6E73] dark:bg-white/10 dark:text-slate-300",
                                                children: t("N fields", {
                                                    count: String(tpl.fields.length)
                                                }, void 0, "{count} fields")
                                            }, void 0, false, {
                                                fileName: "[project]/components/patent/patent-home.tsx",
                                                lineNumber: 164,
                                                columnNumber: 39
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 161,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[14.5px] font-semibold text-[#007AFF]",
                                            children: [
                                                t("Use this template", void 0, void 0, "Use this template"),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                    className: "h-4 w-4 transition group-hover:translate-x-0.5"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/patent/patent-home.tsx",
                                                    lineNumber: 173,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/patent/patent-home.tsx",
                                            lineNumber: 171,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/patent/patent-home.tsx",
                                    lineNumber: 160,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, tpl.id, true, {
                            fileName: "[project]/components/patent/patent-home.tsx",
                            lineNumber: 141,
                            columnNumber: 17
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/components/patent/patent-home.tsx",
                    lineNumber: 135,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/patent/patent-home.tsx",
            lineNumber: 65,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/patent/patent-home.tsx",
        lineNumber: 64,
        columnNumber: 13
    }, this);
}
_s1(PatentHome, "eDPvRHYxK7jbBulLNybFiqXzIto=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTranslations"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$use$2d$intl$40$4$2e$7$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$use$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLocale"],
        __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$page$2d$title$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePageTitle"]
    ];
});
_c1 = PatentHome;
var _c, _c1;
__turbopack_context__.k.register(_c, "KindLabel");
__turbopack_context__.k.register(_c1, "PatentHome");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_b6c51692._.js.map