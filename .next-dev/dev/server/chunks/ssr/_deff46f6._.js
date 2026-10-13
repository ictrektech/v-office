module.exports = [
"[project]/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/tailwind-merge@3.4.0/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
}),
"[project]/hooks/use-page-title.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "usePageTitle",
    ()=>usePageTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
;
function usePageTitle(title) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        document.title = title;
    }, [
        title
    ]);
}
}),
"[project]/utils/ai/client.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AI_BASE",
    ()=>AI_BASE,
    "aiHealth",
    ()=>aiHealth,
    "applyAiPatches",
    ()=>applyAiPatches,
    "authHeaders",
    ()=>authHeaders,
    "chatStream",
    ()=>chatStream,
    "createAiSession",
    ()=>createAiSession,
    "deleteAiArtifact",
    ()=>deleteAiArtifact,
    "deleteAiMaterial",
    ()=>deleteAiMaterial,
    "deleteAiSession",
    ()=>deleteAiSession,
    "deleteAiTemplate",
    ()=>deleteAiTemplate,
    "exportAiDocx",
    ()=>exportAiDocx,
    "fetchAiArtifact",
    ()=>fetchAiArtifact,
    "fetchAiDraftHtml",
    ()=>fetchAiDraftHtml,
    "getAiSettings",
    ()=>getAiSettings,
    "getAiState",
    ()=>getAiState,
    "importAiDocx",
    ()=>importAiDocx,
    "importAiDraft",
    ()=>importAiDraft,
    "listAiArtifacts",
    ()=>listAiArtifacts,
    "listAiSessions",
    ()=>listAiSessions,
    "putAiSettings",
    ()=>putAiSettings,
    "saveAiArtifact",
    ()=>saveAiArtifact,
    "saveAiDraft",
    ()=>saveAiDraft,
    "stopAiSession",
    ()=>stopAiSession,
    "uploadAiMaterial",
    ()=>uploadAiMaterial,
    "uploadAiTemplate",
    ()=>uploadAiTemplate
]);
/**
 * AI 客户端：对接本应用自己的 AI 服务（`server/ai.py`，Pi agent 托管）。
 *
 * 走的是 storage 服务同一个前缀 `/api/com.ictrek.v-office/api/v1/ai/*`：
 * VOS 网关剥前缀后转发到 storage 容器，本地 dev 由 next.config.ts 的 rewrite
 * 转发到 localhost:5000 —— 因此**不需要新增容器、也不需要新增网关路由**。
 *
 * 鉴权沿用 VOS OIDC Fastpath 令牌（与文档存储同一套，服务端复用同一个
 * `current_username` 校验）；独立部署下服务端 `V_OFFICE_AUTH_DISABLED=1`，
 * 不带令牌也能用。
 *
 * 对话是 SSE 单向流（比 WebSocket 轻，断线即取消），事件类型见 server/ai.py。
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$vos$2f$fastpath$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/vos/fastpath.ts [app-ssr] (ecmascript)");
"use client";
;
const AI_BASE = process.env.NEXT_PUBLIC_AI_API || "/api/com.ictrek.v-office/api/v1/ai";
async function authHeaders() {
    try {
        const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$vos$2f$fastpath$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVOSAccessToken"])();
        return token ? {
            Authorization: `Bearer ${token}`
        } : {};
    } catch  {
        return {};
    }
}
async function aiFetch(path, init = {}, retry = true) {
    const resp = await fetch(`${AI_BASE}${path}`, {
        ...init,
        headers: {
            ...init.headers || {},
            ...await authHeaders()
        }
    });
    if (resp.status === 401 && retry) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$vos$2f$fastpath$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clearVOSAuthCache"])();
        return aiFetch(path, init, false);
    }
    return resp;
}
async function jsonOrThrow(resp) {
    if (!resp.ok) {
        const body = await resp.json().catch(()=>({}));
        throw new Error(body.detail || `请求失败（${resp.status}）`);
    }
    return await resp.json();
}
async function aiHealth() {
    const resp = await aiFetch("/health", {
        cache: "no-store"
    });
    return jsonOrThrow(resp);
}
async function getAiSettings() {
    const resp = await aiFetch("/settings", {
        cache: "no-store"
    });
    return jsonOrThrow(resp);
}
async function putAiSettings(patch) {
    const resp = await aiFetch("/settings", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(patch)
    });
    return jsonOrThrow(resp);
}
async function createAiSession(title = "", skill = "") {
    const resp = await aiFetch("/sessions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title,
            skill
        })
    });
    return jsonOrThrow(resp);
}
async function listAiSessions() {
    const resp = await aiFetch("/sessions", {
        cache: "no-store"
    });
    return (await jsonOrThrow(resp)).sessions;
}
async function deleteAiSession(sid) {
    await aiFetch(`/sessions/${encodeURIComponent(sid)}`, {
        method: "DELETE"
    });
}
async function stopAiSession(sid) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/stop`, {
        method: "POST"
    });
    if (!resp.ok) return false;
    const body = await resp.json();
    return !!body.stopped;
}
async function getAiState(sid) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/state`, {
        cache: "no-store"
    });
    return jsonOrThrow(resp);
}
async function uploadAiMaterial(sid, file) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/materials?name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: await file.arrayBuffer()
    });
    return jsonOrThrow(resp);
}
async function deleteAiMaterial(sid, name) {
    await aiFetch(`/sessions/${encodeURIComponent(sid)}/materials/${encodeURIComponent(name)}`, {
        method: "DELETE"
    });
}
async function uploadAiTemplate(sid, file) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/template?name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: await file.arrayBuffer()
    });
    const data = await jsonOrThrow(resp);
    return data.template;
}
async function deleteAiTemplate(sid) {
    await aiFetch(`/sessions/${encodeURIComponent(sid)}/template`, {
        method: "DELETE"
    });
}
async function listAiArtifacts(sid) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/artifacts`, {
        cache: "no-store"
    });
    const data = await jsonOrThrow(resp);
    return {
        artifacts: data.artifacts ?? [],
        active: data.active ?? ""
    };
}
async function saveAiArtifact(sid, key, title, markdown) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/artifacts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            key,
            title,
            markdown
        })
    });
    return jsonOrThrow(resp);
}
async function fetchAiArtifact(sid, key) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/artifacts/${encodeURIComponent(key)}`, {
        cache: "no-store"
    });
    return jsonOrThrow(resp);
}
async function deleteAiArtifact(sid, key) {
    await aiFetch(`/sessions/${encodeURIComponent(sid)}/artifacts/${encodeURIComponent(key)}`, {
        method: "DELETE"
    });
}
async function applyAiPatches(sid, patches, save = true) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/apply`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            patches,
            save
        })
    });
    return jsonOrThrow(resp);
}
async function saveAiDraft(sid) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/save`, {
        method: "POST"
    });
    return jsonOrThrow(resp);
}
async function exportAiDocx(sid) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/docx`, {
        method: "POST"
    });
    return jsonOrThrow(resp);
}
async function fetchAiDraftHtml(sid) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/draft-html`);
    const data = await jsonOrThrow(resp);
    return data.html || "";
}
async function importAiDocx(sid, name) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/import-docx`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name
        })
    });
    return (await jsonOrThrow(resp)).draft;
}
async function importAiDraft(sid, markdown, title = "") {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/draft`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            markdown,
            title
        })
    });
    return jsonOrThrow(resp);
}
async function chatStream(sid, { prompt, resume = true, anchor = "", selection = "", save = false, autosave = true, onEvent, signal }) {
    const resp = await aiFetch(`/sessions/${encodeURIComponent(sid)}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            prompt,
            resume,
            anchor,
            selection,
            save,
            autosave
        }),
        signal
    });
    if (!resp.ok || !resp.body) {
        const body = await resp.json().catch(()=>({}));
        onEvent({
            type: "error",
            message: body.detail || `连接失败（${resp.status}）`
        });
        onEvent({
            type: "closed"
        });
        return;
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
        for(;;){
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {
                stream: true
            });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines){
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const payload = trimmed.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                    onEvent(JSON.parse(payload));
                } catch  {
                // 半行/坏行直接跳过：SSE 下一行还会来
                }
            }
        }
    } catch (err) {
        // AbortError = 用户主动停止，不算错误
        if (!(err instanceof DOMException && err.name === "AbortError")) {
            onEvent({
                type: "error",
                message: `连接中断：${String(err)}`
            });
        }
    } finally{
        onEvent({
            type: "closed"
        });
    }
}
}),
"[project]/hooks/use-ai-chat.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAiChat",
    ()=>useAiChat
]);
/**
 * 栏目级 AI 对话状态机（专利 / 写作共用）。
 *
 * 这一版按「零盘 agent」重写：
 * - agent 只输出文本与 patch，草稿真值在服务端；这里只负责把事件画出来
 * - 「接受」才落文：accept → 服务端 apply → 拉回新草稿 + 已保存文件名
 * - 材料上传返回的是**解析结果**（字数/失败原因），不是文件句柄
 *
 * 重试/超时/并发/进程回收/落盘全在服务端（server/ai.py），前端没有计时器。
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/ai/client.ts [app-ssr] (ecmascript)");
"use client";
;
;
const now = ()=>new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit"
    });
let seq = 0;
const nextId = ()=>`m${Date.now().toString(36)}${(seq++).toString(36)}`;
/** 把 patch 映射成面板能画的变更卡 */ function toChange(patch, messageId) {
    const op = (patch.op || "replace").toLowerCase();
    const full = patch.full || patch.anchor === "all";
    const text = patch.text || "";
    return {
        id: `${messageId}-${patch.anchor}-${op}-${Math.random().toString(36).slice(2, 6)}`,
        key: `${messageId}:${patch.anchor}:${op}`,
        operation: op === "insert" ? "insert" : op === "delete" ? "delete" : "replace",
        anchor: full ? "全文" : String(patch.anchor || ""),
        before: patch.before || "",
        // after 只用于展示（全文可能几万字，别塞进 DOM）；落文用 fullText
        after: full && text.length > 400 ? `${text.slice(0, 400)}…` : text,
        fullText: text,
        reason: full ? "整篇重写" : "按你的要求修改",
        // 服务端已把改动落到草稿与 docx（以 Word 修订呈现），卡片只是摘要，
        // 不再有「点接受」这一步——审阅在编辑器里用 Word 原生修订完成。
        status: patch.status === "applied" ? "applied" : "proposed",
        full
    };
}
/** 会话草稿的 blocks → Markdown（存产物时用；服务端存的是 markdown，这里只是回写） */ function blocksToMarkdown(blocks) {
    return blocks.map((b)=>{
        const body = (b.text || "").trim();
        const heading = (b.heading || "").trim();
        if (heading && body.startsWith(heading)) return body;
        return heading ? `## ${heading}\n\n${body}` : body;
    }).filter(Boolean).join("\n\n");
}
function useAiChat(options) {
    const { skill, title = "", persistKey } = options;
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [draft, setDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [materials, setMaterials] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [template, setTemplate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    /** 产物（四件套这类多文件任务）：清单 + 当前在编辑器里改的那份 */ const [artifacts, setArtifacts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [activeArtifact, setActiveArtifact] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [sessionId, setSessionId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [streaming, setStreaming] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [health, setHealth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [lastSaved, setLastSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [blocked, setBlocked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [draftTitle, setDraftTitle] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(title);
    const abortRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sessionRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const ensureSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (sessionRef.current) return sessionRef.current;
        const meta = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAiSession"])(draftTitle, skill);
        sessionRef.current = meta.id;
        setSessionId(meta.id);
        if (persistKey) {
            try {
                localStorage.setItem(persistKey, meta.id);
            } catch  {
            // 无痕模式忽略
            }
        }
        return meta.id;
    }, [
        draftTitle,
        persistKey,
        skill
    ]);
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const sid = sessionRef.current;
        if (!sid) return;
        try {
            const state = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAiState"])(sid);
            setDraft(state.draft);
            setMaterials(state.materials);
            setTemplate(state.template ?? null);
            setArtifacts(state.artifacts ?? []);
            setActiveArtifact(state.activeArtifact ?? "");
            if (state.draft?.title) setDraftTitle(state.draft.title);
        } catch  {
        // 状态拉取失败不影响对话
        }
    }, []);
    // 初始化：探活 → 建会话 → 拉状态
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let alive = true;
        (async ()=>{
            try {
                const h = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aiHealth"])();
                if (!alive) return;
                setHealth(h);
                if (!h.pi.available) {
                    setBlocked("服务端未安装 pi，请联系管理员");
                    return;
                }
            } catch  {
                if (alive) setBlocked("AI 服务不可用（后端未启动或未部署）");
                return;
            }
            try {
                await ensureSession();
                await refresh();
            } catch  {
                if (alive) setBlocked("无法创建 AI 会话");
            }
        })();
        return ()=>{
            alive = false;
        };
    }, [
        ensureSession,
        refresh
    ]);
    const patchMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((id, patch)=>{
        setMessages((prev)=>prev.map((m)=>m.id === id ? {
                    ...m,
                    ...patch
                } : m));
    }, []);
    const send = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (instruction, options = {})=>{
        const text = instruction.trim();
        if (!text || streaming) return;
        const sid = await ensureSession();
        const agentId = nextId();
        setMessages((prev)=>[
                ...prev,
                {
                    id: nextId(),
                    role: "user",
                    text,
                    at: now(),
                    anchor: options.anchor
                },
                {
                    id: agentId,
                    role: "agent",
                    text: "",
                    at: now(),
                    streaming: true
                }
            ]);
        setStreaming(true);
        setBlocked(null);
        const controller = new AbortController();
        abortRef.current = controller;
        let sawError = false;
        const addNote = (note)=>setMessages((prev)=>prev.map((m)=>m.id === agentId ? {
                        ...m,
                        notes: [
                            ...m.notes ?? [],
                            note
                        ]
                    } : m));
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["chatStream"])(sid, {
                prompt: text,
                anchor: options.anchor || "",
                selection: options.selection || "",
                save: !!options.save,
                signal: controller.signal,
                onEvent: (event)=>{
                    switch(event.type){
                        case "delta":
                            setMessages((prev)=>prev.map((m)=>m.id === agentId ? {
                                        ...m,
                                        text: m.text + String(event.text ?? "")
                                    } : m));
                            break;
                        case "message_end":
                            {
                                const full = String(event.text ?? "");
                                if (full) patchMessage(agentId, {
                                    text: full
                                });
                                break;
                            }
                        case "patch":
                            {
                                const change = toChange(event.patch, agentId);
                                setMessages((prev)=>prev.map((m)=>m.id === agentId ? {
                                            ...m,
                                            changes: [
                                                ...m.changes ?? [],
                                                change
                                            ]
                                        } : m));
                                break;
                            }
                        case "draft":
                            {
                                setDraft(event.draft);
                                const t = event.draft?.title;
                                if (t) setDraftTitle(t);
                                break;
                            }
                        case "saved":
                            setLastSaved(String(event.name ?? ""));
                            break;
                        case "retry":
                            addNote(`模型未响应，自动重试第 ${event.attempt ?? 2} 次`);
                            break;
                        case "tools":
                            {
                                const names = Array.isArray(event.names) ? event.names : [];
                                if (names.length) addNote(`调用工具：${names.join("、")}`);
                                break;
                            }
                        case "warn":
                            addNote(String(event.message ?? ""));
                            break;
                        case "error":
                            {
                                sawError = true;
                                const message = String(event.message ?? "出错了");
                                const partial = String(event.text ?? "");
                                setMessages((prev)=>prev.map((m)=>m.id === agentId ? {
                                            ...m,
                                            streaming: false,
                                            error: true,
                                            text: partial || message,
                                            notes: partial ? [
                                                ...m.notes ?? [],
                                                message
                                            ] : m.notes
                                        } : m));
                                if (event.kind === "preflight") setBlocked(message);
                                break;
                            }
                        default:
                            break;
                    }
                }
            });
        } catch (err) {
            sawError = true;
            patchMessage(agentId, {
                streaming: false,
                error: true,
                text: `发送失败：${String(err)}`
            });
        } finally{
            abortRef.current = null;
            setStreaming(false);
            setMessages((prev)=>prev.map((m)=>m.id === agentId ? {
                        ...m,
                        streaming: false,
                        error: m.error || (sawError ? true : undefined),
                        text: m.text || (sawError ? m.text : "（本轮没有输出）")
                    } : m));
            void refresh();
        }
    }, [
        ensureSession,
        patchMessage,
        refresh,
        streaming
    ]);
    const stop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        abortRef.current?.abort();
        const sid = sessionRef.current;
        if (sid) void (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["stopAiSession"])(sid);
    }, []);
    const reset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        abortRef.current?.abort();
        sessionRef.current = null;
        setSessionId(null);
        setMessages([]);
        setDraft(null);
        setMaterials([]);
        setArtifacts([]);
        setActiveArtifact("");
        setLastSaved(null);
        if (persistKey) {
            try {
                localStorage.removeItem(persistKey);
            } catch  {
            // 忽略
            }
        }
        void ensureSession().then(()=>refresh());
    }, [
        ensureSession,
        persistKey,
        refresh
    ]);
    const upload = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (file)=>{
        const sid = await ensureSession();
        const parsed = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["uploadAiMaterial"])(sid, file);
        await refresh();
        return parsed;
    }, [
        ensureSession,
        refresh
    ]);
    /** 上传模板：解析失败也把结果回给界面（parseError），别静默 */ const uploadTemplate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (file)=>{
        const sid = await ensureSession();
        const uploaded = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["uploadAiTemplate"])(sid, file);
        await refresh();
        return uploaded;
    }, [
        ensureSession,
        refresh
    ]);
    const removeTemplate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const sid = sessionRef.current;
        if (!sid) return;
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteAiTemplate"])(sid);
        await refresh();
    }, [
        refresh
    ]);
    /** 撤掉一份材料：下一轮 prompt 里就不带它了（材料传上去要能收回，所以接了它） */ const removeMaterial = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (name)=>{
        const sid = sessionRef.current;
        if (!sid) return;
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteAiMaterial"])(sid, name);
        await refresh();
    }, [
        refresh
    ]);
    /**
   * 把当前这份稿子存成产物。
   *
   * 取的是**服务端刚落盘的那份**（重新拉 state），不是本地 state：AI 回合的
   * 落文与状态推送有先后，直接读本地 state 可能拿到上一轮的稿子。
   */ const saveArtifactFromDraft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (key, title)=>{
        const sid = sessionRef.current ?? await ensureSession();
        const state = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAiState"])(sid);
        const markdown = blocksToMarkdown(state.draft?.blocks ?? []);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveAiArtifact"])(sid, key, title, markdown);
        await refresh();
    }, [
        ensureSession,
        refresh
    ]);
    /**
   * 在编辑器里打开某份产物：正文灌进会话草稿 → 现有注入机制把它粘进
   * Collabora（零刷新）。同时把 active 切到这份。
   */ const openArtifact = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (key)=>{
        const sid = sessionRef.current ?? await ensureSession();
        const item = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAiArtifact"])(sid, key);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["importAiDraft"])(sid, item.markdown, item.title);
        // 灌草稿不改 active，这里再存一次（内容相同）只为把 active 切过去
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveAiArtifact"])(sid, item.key, item.title, item.markdown);
        await refresh();
    }, [
        ensureSession,
        refresh
    ]);
    /** 只取某份产物的正文（预览用：不动草稿、不切 active） */ const loadArtifact = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (key)=>{
        const sid = sessionRef.current;
        if (!sid) return "";
        const item = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAiArtifact"])(sid, key);
        return item.markdown || "";
    }, []);
    const removeArtifact = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (key)=>{
        const sid = sessionRef.current;
        if (!sid) return;
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteAiArtifact"])(sid, key);
        await refresh();
    }, [
        refresh
    ]);
    const saveNow = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const sid = sessionRef.current;
        if (!sid) return;
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveAiDraft"])(sid);
            setLastSaved(res.saved);
            setDraft(res.draft);
        } catch (err) {
            setBlocked(String(err));
        }
    }, []);
    const importDraft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (markdown, nextTitle = "")=>{
        const sid = await ensureSession();
        const updated = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["importAiDraft"])(sid, markdown, nextTitle || draftTitle);
        setDraft(updated);
        if (updated.title) setDraftTitle(updated.title);
    }, [
        draftTitle,
        ensureSession
    ]);
    /** 出稿：草稿 → docx。失败往上抛，由栏目页决定怎么提示（这里不吞） */ const exportDocx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const sid = await ensureSession();
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["exportAiDocx"])(sid);
        setDraft(res.draft);
        if (res.draft?.title) setDraftTitle(res.draft.title);
        setLastSaved(res.saved);
        return res.saved;
    }, [
        ensureSession
    ]);
    /** 草稿 → HTML（服务端单一渲染管线）：编辑器注入用，前端不渲染 Markdown */ const fetchDraftHtml = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const sid = await ensureSession();
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAiDraftHtml"])(sid);
    }, [
        ensureSession
    ]);
    /** 回读：编辑器里改过的 docx → 草稿。失败也往上抛（回读失败不该静默） */ const importDocx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (name)=>{
        const sid = await ensureSession();
        const updated = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["importAiDocx"])(sid, name);
        setDraft(updated);
        if (updated.title) setDraftTitle(updated.title);
    }, [
        ensureSession
    ]);
    const markChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((changeKey, status)=>{
        setMessages((prev)=>prev.map((m)=>m.changes ? {
                    ...m,
                    changes: m.changes.map((c)=>c.key === changeKey ? {
                            ...c,
                            status
                        } : c)
                } : m));
    }, []);
    const applyChanges = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (changes)=>{
        const sid = sessionRef.current;
        if (!sid || changes.length === 0) return;
        // 全文替换的正文可能很长，展示用 after 已截断，落文要用 fullText
        const patches = changes.map((c)=>({
                anchor: c.full ? "all" : String(c.anchor),
                op: c.operation === "insert" ? "insert" : c.operation === "delete" ? "delete" : "replace",
                text: c.fullText || c.after || "",
                full: !!c.full
            }));
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$ai$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["applyAiPatches"])(sid, patches, true);
            for (const c of changes)if (c.key) markChange(c.key, "accepted");
            setDraft(res.draft);
            if (res.saved) setLastSaved(res.saved);
            if (res.skipped.length) {
                const detail = res.skipped.map((s)=>`第 ${s.anchor} 段：${s.reason}`).join("；");
                setMessages((prev)=>[
                        ...prev,
                        {
                            id: nextId(),
                            role: "agent",
                            text: `有变更没能应用：${detail}`,
                            at: now(),
                            error: true
                        }
                    ]);
            }
        } catch (err) {
            setMessages((prev)=>[
                    ...prev,
                    {
                        id: nextId(),
                        role: "agent",
                        text: `应用变更失败：${String(err)}`,
                        at: now(),
                        error: true
                    }
                ]);
        }
    }, [
        markChange
    ]);
    const acceptChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (changeKey)=>{
        const all = messages.flatMap((m)=>m.changes ?? []);
        const target = all.filter((c)=>c.key === changeKey);
        await applyChanges(target);
    }, [
        applyChanges,
        messages
    ]);
    const rejectChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((changeKey)=>markChange(changeKey, "rejected"), [
        markChange
    ]);
    const acceptAll = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const all = messages.flatMap((m)=>m.changes ?? []);
        await applyChanges(all.filter((c)=>c.status === "proposed"));
    }, [
        applyChanges,
        messages
    ]);
    const pendingChanges = messages.reduce((count, m)=>count + (m.changes ?? []).filter((c)=>c.status === "proposed").length, 0);
    return {
        messages,
        draft,
        materials,
        template,
        sessionId,
        streaming,
        health,
        lastSaved,
        blocked,
        pendingChanges,
        send,
        stop,
        reset,
        upload,
        uploadTemplate,
        removeTemplate,
        removeMaterial,
        artifacts,
        activeArtifact,
        saveArtifactFromDraft,
        openArtifact,
        loadArtifact,
        removeArtifact,
        saveNow,
        importDraft,
        exportDocx,
        fetchDraftHtml,
        importDocx,
        acceptChange,
        rejectChange,
        acceptAll,
        refresh
    };
}
}),
"[project]/utils/editor/collabora.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "COLLABORA_WORD_ENGINE",
    ()=>COLLABORA_WORD_ENGINE,
    "alignCollaboraHost",
    ()=>alignCollaboraHost,
    "announceHostReady",
    ()=>announceHostReady,
    "fetchCollaboraSession",
    ()=>fetchCollaboraSession,
    "fetchCollaboraStatus",
    ()=>fetchCollaboraStatus,
    "flushCollabora",
    ()=>flushCollabora,
    "followCollaboraEnd",
    ()=>followCollaboraEnd,
    "guessExtension",
    ()=>guessExtension,
    "hideCollaboraChrome",
    ()=>hideCollaboraChrome,
    "hideCollaboraSidebar",
    ()=>hideCollaboraSidebar,
    "hideCollaboraWelcomeScreen",
    ()=>hideCollaboraWelcomeScreen,
    "isCollaboraExt",
    ()=>isCollaboraExt,
    "isLegacyOfficeExt",
    ()=>isLegacyOfficeExt,
    "mustCollaborateOnShared",
    ()=>mustCollaborateOnShared,
    "pasteIntoCollabora",
    ()=>pasteIntoCollabora,
    "pushDocumentToStorage",
    ()=>pushDocumentToStorage,
    "saveCollabora",
    ()=>saveCollabora,
    "sendUnoCommand",
    ()=>sendUnoCommand,
    "shouldUseCollabora",
    ()=>shouldUseCollabora,
    "waitForCollaboraDocumentLoaded",
    ()=>waitForCollaboraDocumentLoaded
]);
/**
 * Collabora Online 集成客户端（仅 Word 文档）。
 *
 * 背景：OnlyOffice 内核对 WPS 导出的复杂表单类 Word 文档渲染保真度不足
 * （表格错位、页眉浮动对象被当成正文环绕物、Wingdings 复选框变成乱码），
 * 实测 Collabora（LibreOffice 内核）能正确还原这类文档。
 *
 * 接入方式刻意做得最小：只替换“打开 .doc / .docx”这一个入口，
 * 前端先向 storage 换取一次性 access_token 与编辑器地址，再用 iframe
 * 加载 Collabora；Collabora 通过 WOPI 协议直接读写 storage，
 * 因此保存链路与原有实现一致，Excel/PPT 等其它格式完全不受影响。
 *
 * 默认仍用 OnlyOffice 内核解析；用户可在编辑器里点击按钮手动切换到
 * Collabora（对复杂文档解析能力更强），NEXT_PUBLIC_WORD_ENGINE=collabora
 * 可让 Word 文档默认就走 Collabora。
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$vos$2f$fastpath$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/vos/fastpath.ts [app-ssr] (ecmascript)");
"use client";
;
const STORAGE_API = process.env.NEXT_PUBLIC_STORAGE_API || "/api/com.ictrek.v-office/api/v1";
const COLLABORA_WORD_ENGINE = process.env.NEXT_PUBLIC_WORD_ENGINE === "collabora";
/**
 * 走 Collabora 的扩展名。
 *
 * Word 文档（doc/docx）之外，还包含老版二进制格式（ppt/xls）：x2t 读不好也写不了
 * 这些格式，而 Collabora 就是服务端 LibreOffice，原生读写并按原格式保存——它自己的
 * discovery 对 doc/xls/ppt 都声明了 edit 动作，对 pdf 只有 view_comment（所以 PDF
 * 仍走 OnlyOffice）。
 *
 * 现代格式 xlsx/pptx 也一并纳入：它们是不是**默认**走 Collabora 仍由部署默认
 * （NEXT_PUBLIC_WORD_ENGINE）决定，这里只决定"能不能交给它"——包括编辑器里的手动
 * 切换、以及模板库（13 个模板里 6 个 pptx、2 个 xlsx）。此前漏了这两个，于是模板
 * 里绝大多数连 Collabora 的入口都不出现，和 shouldUseCollabora 注释里写的
 * "现代格式按部署默认"对不上；共享盘文档也早已在用 Collabora 打开 pptx/xlsx
 * （见 SHARED_COLLABORATIVE_EXTS），能力是验证过的。
 */ const COLLABORA_EXTS = new Set([
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx"
]);
/**
 * 老版二进制格式：默认就走 Collabora，不看引擎偏好。
 *
 * OnlyOffice 路线对它们先天不足——x2t 写不出二进制（.doc 输出 0 字节），xls 完全
 * 没有补齐，ppt 还得靠镜像里的 LibreOffice impress；Collabora 是服务端 LibreOffice，
 * 原生读写且按原格式保存，所以这些文件默认交给它。
 */ const LEGACY_EXTS = new Set([
    "doc",
    "ppt",
    "xls"
]);
function isCollaboraExt(ext) {
    return COLLABORA_EXTS.has(normalizeExt(ext));
}
function normalizeExt(ext) {
    return (ext || "").toLowerCase().replace(/^\./, "");
}
function isLegacyOfficeExt(ext) {
    return LEGACY_EXTS.has(normalizeExt(ext));
}
function shouldUseCollabora(ext, override) {
    if (!isCollaboraExt(ext)) return false;
    if (isLegacyOfficeExt(ext)) return true;
    if (override === "collabora") return true;
    if (override === "onlyoffice") return false;
    // 其余（docx/xlsx/pptx 等现代格式）按部署默认
    return COLLABORA_WORD_ENGINE;
}
/**
 * 共享源（NAS / 平台授权的公共目录）文档是否可以多人协同。
 *
 * 共享盘上的同一份文件可能同时被多个人打开，而只有服务端内核（Collabora）能让
 * 大家进同一个文档会话：互见光标、盘上只有一份权威字节（实测：第二个用户加入
 * 只发一次 CheckFileInfo，不再重新拉取文档，两侧状态栏同步变化）。本地内核
 * （OnlyOffice）是浏览器单机渲染，N 个人各改各的内存副本、保存时整份覆盖，
 * 必然互相抹掉——所以共享源文档不看扩展名偏好，也不看用户在设置里选了哪个内核。
 *
 * 刻意排除：pdf（Collabora 只声明批注，不能协同编辑）、txt / md / csv / rtf
 * （多人反复写回语义有坑）。这些继续走原来的单机链路，行为不变。
 */ const SHARED_COLLABORATIVE_EXTS = new Set([
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "odt",
    "ods",
    "odp"
]);
function mustCollaborateOnShared(shared, ext) {
    return shared && SHARED_COLLABORATIVE_EXTS.has(normalizeExt(ext));
}
function hideCollaboraWelcomeScreen(iframe) {
    const SELECTOR = "[class*='iframe-welcome'],[class*='welcome-modal']";
    let observer = null;
    let timer = null;
    const strip = ()=>{
        let removed = 0;
        try {
            const doc = iframe.contentDocument;
            if (!doc) return;
            doc.querySelectorAll(SELECTOR).forEach((node)=>{
                node.remove();
                removed += 1;
            });
        } catch  {
            return; // 跨源：放弃
        }
        if (removed > 0) stopObserving();
    };
    const stopObserving = ()=>{
        observer?.disconnect();
        observer = null;
        if (timer !== null) {
            window.clearTimeout(timer);
            timer = null;
        }
    };
    const attach = ()=>{
        strip();
        try {
            const doc = iframe.contentDocument;
            if (!doc || observer) return;
            observer = new MutationObserver(strip);
            observer.observe(doc.documentElement, {
                childList: true,
                subtree: true
            });
            // 浮层只在首屏出现；最多盯 20 秒就收工，别让观察器常驻
            timer = window.setTimeout(stopObserving, 20_000);
        } catch  {
        /* 跨源：忽略 */ }
    };
    iframe.addEventListener("load", attach);
    attach();
    return ()=>{
        iframe.removeEventListener("load", attach);
        stopObserving();
    };
}
function alignCollaboraHost(editorUrl) {
    const loopback = (h)=>h === "localhost" || h === "127.0.0.1";
    try {
        const url = new URL(editorUrl);
        const pageHost = window.location.hostname;
        if (url.hostname !== pageHost && loopback(url.hostname) && loopback(pageHost)) {
            url.hostname = pageHost;
        }
        return url.toString();
    } catch  {
        return editorUrl;
    }
}
async function fetchCollaboraSession(name, edit = true, sharedTarget, lang, retry = true, /** 会话版本：>0 时服务端给 WOPISrc 换一个 docKey，Collabora 重新读盘（AI 改完刷新用） */ version = 0) {
    const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$vos$2f$fastpath$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVOSAccessToken"])();
    const params = [
        `name=${encodeURIComponent(name)}`,
        `edit=${edit ? 1 : 0}`
    ];
    if (version > 0) params.push(`version=${version}`);
    if (sharedTarget) {
        // 共享源文档：storage 按 source+path 解析原文件并签发对应 WOPI 令牌
        params.push(`source=${encodeURIComponent(sharedTarget.source)}`);
        params.push(`path=${encodeURIComponent(sharedTarget.path)}`);
    }
    if (lang) params.push(`lang=${encodeURIComponent(lang)}`);
    const url = `${STORAGE_API}/wopi/session?${params.join("&")}`;
    let resp;
    try {
        resp = await fetch(url, {
            method: "POST",
            headers: token ? {
                Authorization: `Bearer ${token}`
            } : {},
            // storage 侧探测 Collabora discovery 的上限是 5s，这里留出余量；
            // 超时即视为不可用并回退，不让用户对着空白页干等。
            signal: AbortSignal.timeout(10_000)
        });
    } catch  {
        return null;
    }
    if (resp.status === 401 && retry) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$vos$2f$fastpath$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clearVOSAuthCache"])();
        return fetchCollaboraSession(name, edit, sharedTarget, lang, false, version);
    }
    if (!resp.ok) return null;
    try {
        const data = await resp.json();
        return data?.editorUrl ? data : null;
    } catch  {
        return null;
    }
}
async function pushDocumentToStorage(name, data) {
    const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$vos$2f$fastpath$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVOSAccessToken"])();
    try {
        const resp = await fetch(`${STORAGE_API}/files/${encodeURIComponent(name)}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/octet-stream",
                ...token ? {
                    Authorization: `Bearer ${token}`
                } : {}
            },
            body: new Blob([
                data
            ]),
            signal: AbortSignal.timeout(30_000)
        });
        return resp.ok;
    } catch  {
        return false;
    }
}
function guessExtension(...candidates) {
    for (const candidate of candidates){
        if (!candidate) continue;
        const cleaned = candidate.split("?")[0].split("#")[0];
        const match = cleaned.match(/\.([A-Za-z0-9]{2,5})$/);
        if (match) return match[1].toLowerCase();
    }
    return "";
}
async function fetchCollaboraStatus() {
    const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$vos$2f$fastpath$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVOSAccessToken"])();
    try {
        const resp = await fetch(`${STORAGE_API}/wopi/status`, {
            headers: token ? {
                Authorization: `Bearer ${token}`
            } : {},
            signal: AbortSignal.timeout(5000)
        });
        if (!resp.ok) return "unknown";
        const data = await resp.json();
        if (data.state === "ok" || data.state === "warming_up" || data.state === "unavailable") {
            return data.state;
        }
        return "unknown";
    } catch  {
        return "unknown";
    }
}
/**
 * 往**活着的** Collabora 会话里发指令（postMessage 桥）。
 *
 * 这条桥让「AI 改稿直接出现在用户已打开的文档里」成为可能：不需要重载
 * iframe——AI 的稿子以 HTML 粘进活文档（全选后粘 = 整篇替换），保存走
 * WOPI 写回存储，用户眼看着文档变成新版。agent 因此就是个「坐在同一份
 * 文档里的协作者」：它写完落盘，你刷新看到；你 Ctrl+S 落盘，它下轮读盘。
 *
 * 协议细节全部对照运行中 coolwsd 的前端源码核过（bundle.js 的
 * PostMessageManager + global.js 的握手处理器）。四个坑都踩过，改之前先读：
 * 1. **消息必须是 JSON 字符串**：global.js 的握手处理器是 `JSON.parse(s.data)`，
 *    发对象会进 catch 被静默丢掉——现象是「消息发了，COOL 毫无反应」
 * 2. **必须先握手**：不发 `Host_PostmessageReady`，COOL 一条回调都不回，
 *    后续指令全被 `PostMessage ignored: not ready` 挡掉
 * 3. **必须等 Document_Loaded**：`App_LoadingStatus` 的 Status 变为
 *    `Document_Loaded` 之前发指令，会被 `not loaded yet` 挡掉
 * 4. **Values 是对象**（如 `{Mimetype, Data}`），不是 Name/Value 数组
 */ /** 发一条指令给 COOL（内部统一转 JSON 字符串，见上方注释第 1 条）。 */ function postToCollabora(iframe, message) {
    try {
        iframe.contentWindow?.postMessage(JSON.stringify(message), "*");
    } catch  {
    /* iframe 已卸载（切页面/关标签）：忽略 */ }
}
function announceHostReady(iframe) {
    postToCollabora(iframe, {
        MessageId: "Host_PostmessageReady",
        SendTime: Date.now()
    });
}
function waitForCollaboraDocumentLoaded(timeoutMs = 30_000) {
    return new Promise((resolve)=>{
        let settled = false;
        const finish = (ok)=>{
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            window.removeEventListener("message", onMessage);
            resolve(ok);
        };
        const onMessage = (ev)=>{
            let data = null;
            try {
                data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
            } catch  {
                return;
            }
            if (data?.MessageId === "App_LoadingStatus" && data.Values?.Status === "Document_Loaded") {
                finish(true);
            }
        };
        const timer = window.setTimeout(()=>finish(false), timeoutMs);
        window.addEventListener("message", onMessage);
    });
}
function sendUnoCommand(iframe, command) {
    postToCollabora(iframe, {
        MessageId: "Send_UNO_Command",
        SendTime: Date.now(),
        Values: {
            Command: command
        }
    });
}
function followCollaboraEnd(iframe) {
    sendUnoCommand(iframe, ".uno:GoToEndOfDoc");
}
function pasteIntoCollabora(iframe, html) {
    postToCollabora(iframe, {
        MessageId: "Action_Paste",
        SendTime: Date.now(),
        Values: {
            Mimetype: "text/html",
            Data: html
        }
    });
}
function hideCollaboraChrome(iframe) {
    for (const id of [
        "Hide_Menubar",
        "Hide_Ruler",
        "Hide_StatusBar"
    ]){
        postToCollabora(iframe, {
            MessageId: id,
            SendTime: Date.now()
        });
    }
}
function hideCollaboraSidebar(iframe) {
    postToCollabora(iframe, {
        MessageId: "Hide_Sidebar",
        SendTime: Date.now()
    });
}
function saveCollabora(iframe) {
    postToCollabora(iframe, {
        MessageId: "Action_Save",
        SendTime: Date.now()
    });
}
function flushCollabora(iframe, timeoutMs = 2500) {
    return new Promise((resolve)=>{
        let settled = false;
        const finish = ()=>{
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            window.removeEventListener("message", onMessage);
            resolve();
        };
        const onMessage = (ev)=>{
            let data = null;
            try {
                data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
            } catch  {
                return;
            }
            if (data?.MessageId === "Doc_ModifiedStatus" && data.Values?.Modified === false) finish();
        };
        const timer = window.setTimeout(finish, timeoutMs);
        window.addEventListener("message", onMessage);
        saveCollabora(iframe);
    });
}
}),
"[project]/utils/editor/locale.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isEditorLanguage",
    ()=>isEditorLanguage,
    "toCollaboraLang",
    ()=>toCollaboraLang,
    "toOnlyOfficeLang",
    ()=>toOnlyOfficeLang
]);
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
 */ /**
 * OnlyOffice DocumentServer 自带的界面语言。
 *
 * 取值来自镜像内 web-apps 各编辑器 locale 目录下的语言包文件名（DS 9.3.x），
 * 不是凭 BCP-47 猜的——只用这份清单才能保证下发出去的语言码真的有语言包。
 */ const ONLYOFFICE_LANGS = new Set([
    "ar",
    "az",
    "be",
    "bg",
    "ca",
    "cs",
    "da",
    "de",
    "el",
    "en",
    "es",
    "eu",
    "fi",
    "fr",
    "gl",
    "he",
    "hu",
    "hy",
    "id",
    "it",
    "ja",
    "ko",
    "lo",
    "lv",
    "ms",
    "nl",
    "no",
    "pl",
    "pt",
    "pt-pt",
    "ro",
    "ru",
    "si",
    "sk",
    "sl",
    "sq",
    "sr",
    "sr-cyrl",
    "sv",
    "tr",
    "uk",
    "ur",
    "vi",
    "zh",
    "zh-tw"
]);
/**
 * 应用语言 → OnlyOffice 语言码的例外映射（键为小写）。
 *
 * 只列「同名对不上」的：中文、葡语、拉美西语、繁体旧码。其余同名语言直接
 * 走 ONLYOFFICE_LANGS 命中，无需逐条抄一遍。
 */ const ONLYOFFICE_ALIASES = {
    "zh-cn": "zh",
    zh: "zh",
    "zh-hans": "zh",
    "zh-tw": "zh-tw",
    "zh-hant": "zh-tw",
    "zh-hk": "zh-tw",
    "pt-pt": "pt-pt",
    "pt-br": "pt",
    "es-419": "es",
    "sr-latn": "sr"
};
function toOnlyOfficeLang(locale) {
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
function isEditorLanguage(locale) {
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
 */ const COLLABORA_ALIASES = {
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
    uk: "uk-UA"
};
/** BCP-47 形状：语言 + 可选子标签（en、zh-CN、sr-Latn-RS）。 */ const BCP47_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/;
function toCollaboraLang(locale) {
    const key = (locale || "").trim().toLowerCase();
    if (!key || !BCP47_RE.test(key)) return "en-US";
    const alias = COLLABORA_ALIASES[key];
    if (alias) return alias;
    // 归一化区域子标签大小写：zh-cn → zh-CN、sr-latn-rs → sr-Latn-RS
    return key.split("-").map((part, index)=>index === 0 ? part : part.length === 4 ? part[0].toUpperCase() + part.slice(1) // 脚本：latn → Latn
         : part.toUpperCase()).join("-");
}
}),
"[project]/components/studio/visual-spec.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/components/studio/agent-panel.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AgentPanel",
    ()=>AgentPanel,
    "visibleText",
    ()=>visibleText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next-intl@4.7.0_next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19._ad6175bb892ccee3b398db7087b15c16/node_modules/next-intl/dist/esm/development/react-client/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-ssr] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-ssr] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$corner$2d$down$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CornerDownLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/corner-down-left.js [app-ssr] (ecmascript) <export default as CornerDownLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/file-text.js [app-ssr] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$paperclip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Paperclip$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/paperclip.js [app-ssr] (ecmascript) <export default as Paperclip>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-ssr] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Square$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/square.js [app-ssr] (ecmascript) <export default as Square>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/studio/visual-spec.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
function visibleText(raw) {
    return (raw || "").replace(/<patch\s+[^>]*>[\s\S]*?<\/patch>/gi, "").replace(/<\/?final-doc>/gi, "").replace(/\n{3,}/g, "\n\n").trim();
}
const OP_CLS = {
    insert: "bg-[#ECFDF3] text-[#16A34A]",
    replace: "bg-[#EAF4FF] text-[#007AFF]",
    delete: "bg-[#FEF2F2] text-[#DC2626]"
};
function OperationLabel({ operation }) {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslations"])();
    switch(operation){
        case "insert":
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: t("Insert", void 0, void 0, "Insert")
            }, void 0, false);
        case "delete":
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: t("Delete", void 0, void 0, "Delete")
            }, void 0, false);
        default:
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: t("Replace", void 0, void 0, "Replace")
            }, void 0, false);
    }
}
function AgentPanel({ messages, materials, template, streaming, blocked, sessionReady, modelLabel, lastSaved, onSend, onStop, onUpload, onUploadTemplate, onRemoveTemplate, onAcceptChange, onRejectChange, onAcceptAll, onSave, onRemoveMaterial, initialPrompt, panelWidth, className }) {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslations"])();
    const [tab, setTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("agent");
    const [draft, setDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [uploading, setUploading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [notice, setNotice] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    /** 「参考资料」弹层开关：左模板 / 右材料，两块都不是必须的 */ const [refsOpen, setRefsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const fileRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const templateRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    // ── 消息流跟随（DeepSeek 那种）────────────────────────────────────────
    // 默认贴着底部：模型吐字就往下走。用户一旦手动上滑就"接管"，不再拉回；
    // 滑回底部（或点回到底部）恢复跟随。少了这个，视线会卡在中间跟不上输出。
    const listRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    /** 是否处于跟随态（用户没接管） */ const stickRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(true);
    /** 程序滚动中：别把自己的滚动当成用户上滑 */ const autoScrollRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const [stuck, setStuck] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const lastText = messages[messages.length - 1]?.text ?? "";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = listRef.current;
        if (!el || !stickRef.current) return;
        autoScrollRef.current = true;
        const raf = requestAnimationFrame(()=>{
            el.scrollTop = el.scrollHeight;
            autoScrollRef.current = false;
        });
        return ()=>cancelAnimationFrame(raf);
    }, [
        messages.length,
        lastText,
        tab
    ]);
    /** 用户滚一下：距底 80px 内算"仍在跟随"，否则判定为接管 */ const onListScroll = ()=>{
        const el = listRef.current;
        if (!el || autoScrollRef.current) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        stickRef.current = atBottom;
        setStuck(atBottom);
    };
    /** 点"回到底部"：交还控制权给自动跟随 */ const jumpToBottom = ()=>{
        const el = listRef.current;
        if (!el) return;
        stickRef.current = true;
        setStuck(true);
        autoScrollRef.current = true;
        requestAnimationFrame(()=>{
            el.scrollTop = el.scrollHeight;
            autoScrollRef.current = false;
        });
    };
    // 起手话术只在输入框还空着时填入，绝不覆盖用户已经打的字
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!initialPrompt) return;
        setDraft((current)=>current.trim() ? current : initialPrompt);
    }, [
        initialPrompt
    ]);
    const submit = ()=>{
        const text = draft.trim();
        if (!text || streaming || !sessionReady) return;
        setDraft("");
        onSend(text);
    };
    /** 选完文件先收起弹层；材料与模板走同一套「上传中」提示 */ const resetInput = (input)=>{
        if (input) input.value = "";
    };
    const pickFile = async (file, kind)=>{
        if (!file) return;
        setUploading(file.name);
        setNotice(null);
        try {
            if (kind === "template") {
                if (!onUploadTemplate) return;
                const uploaded = await onUploadTemplate(file);
                setNotice(uploaded.parseError ? uploaded.parseError : `模板已生效：之后每轮都按《${uploaded.name}》的栏目成文`);
            } else {
                if (!onUpload) return;
                const parsed = await onUpload(file);
                setNotice(parsed.parseError ? `${parsed.name}：${parsed.parseError}` : `${t("Material parsed", void 0, void 0, "Material parsed")}：${parsed.name} · ${parsed.chars} ${t("chars", void 0, void 0, "chars")}`);
            }
        } catch (err) {
            setNotice(`上传失败：${String(err)}`);
        } finally{
            setUploading(null);
            resetInput(kind === "template" ? templateRef.current : fileRef.current);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex shrink-0 flex-col border-l border-[#E7EAF0] bg-white dark:border-white/10 dark:bg-[#101010]", panelWidth ?? "w-[23rem]", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 border-b border-[#E7EAF0] px-3 py-2.5 dark:border-white/10",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segGroup, "flex-1 justify-center bg-transparent dark:bg-transparent"),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: ()=>setTab("agent"),
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex-1 text-center", tab === "agent" ? __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOn : __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOff),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: tab === "agent" ? "text-[#007AFF]" : undefined,
                                children: t("Agent", void 0, void 0, "Agent")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 152,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/studio/agent-panel.tsx",
                            lineNumber: 151,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: ()=>setTab("analysis"),
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex-1 text-center", tab === "analysis" ? __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOn : __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOff),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: tab === "analysis" ? "text-[#007AFF]" : undefined,
                                children: t("Analysis", void 0, void 0, "Analysis")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 157,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/studio/agent-panel.tsx",
                            lineNumber: 156,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/studio/agent-panel.tsx",
                    lineNumber: 150,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/studio/agent-panel.tsx",
                lineNumber: 149,
                columnNumber: 7
            }, this),
            blocked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "m-3 flex items-start gap-2 rounded-xl border border-[#FBE3C0] bg-[#FFF9F0] p-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                        className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706]"
                    }, void 0, false, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 165,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0 flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[14px] leading-relaxed text-[#8A5A12]",
                                children: blocked
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 167,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/settings",
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnText, "mt-1.5 text-[#8A5A12] underline"),
                                children: t("Go to settings", void 0, void 0, "Go to settings")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 168,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 166,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/studio/agent-panel.tsx",
                lineNumber: 164,
                columnNumber: 19
            }, this) : null,
            tab === "agent" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: listRef,
                        onScroll: onListScroll,
                        className: "relative flex-1 space-y-4 overflow-y-auto px-4 py-4 custom-scrollbar",
                        children: [
                            messages.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-2xl border border-dashed border-[#E7EAF0] p-4 text-[14px] leading-relaxed text-[#94A3B8] dark:border-white/10",
                                children: t("Studio empty hint", void 0, void 0, "Describe the invention, or upload drawings and test records. The agent reads them and drafts step by step.")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 176,
                                columnNumber: 39
                            }, this) : null,
                            messages.map((m)=>m.role === "user" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col items-end gap-1",
                                    children: [
                                        m.anchor ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].chip, "text-[12.5px]"),
                                            children: [
                                                t("Clause", void 0, void 0, "Clause"),
                                                " ",
                                                m.anchor
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                            lineNumber: 181,
                                            columnNumber: 32
                                        }, this) : null,
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "max-w-[85%] rounded-2xl rounded-br-md bg-[#007AFF] px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-white",
                                            children: [
                                                m.text,
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "mt-1 block text-right text-[12px] text-white/70",
                                                    children: m.at
                                                }, void 0, false, {
                                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                                    lineNumber: 186,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                            lineNumber: 184,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, m.id, true, {
                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                    lineNumber: 180,
                                    columnNumber: 53
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2.5",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "flex h-6 w-6 items-center justify-center rounded-lg bg-[#EAF4FF]",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                        className: "h-3.5 w-3.5 text-[#007AFF]"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                        lineNumber: 191,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                                    lineNumber: 190,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[14px] font-medium text-[#0F172A] dark:text-white",
                                                    children: t("Patent Agent", void 0, void 0, "Patent Agent")
                                                }, void 0, false, {
                                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                                    lineNumber: 193,
                                                    columnNumber: 21
                                                }, this),
                                                m.streaming ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                    className: "h-3.5 w-3.5 animate-spin text-[#007AFF]"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                                    lineNumber: 196,
                                                    columnNumber: 37
                                                }, this) : null,
                                                m.error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "rounded-full bg-[#FEF2F2] px-1.5 py-0.5 text-[12px] font-medium text-[#DC2626]",
                                                    children: t("Error", void 0, void 0, "Error")
                                                }, void 0, false, {
                                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                                    lineNumber: 197,
                                                    columnNumber: 33
                                                }, this) : null
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                            lineNumber: 189,
                                            columnNumber: 19
                                        }, this),
                                        visibleText(m.text) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap", m.error ? "border-[#F6D5D5] bg-[#FEF6F6] text-[#8A2A22]" : "border-[#E7EAF0] bg-[#F9FAFC] text-[#334155] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"),
                                            children: visibleText(m.text)
                                        }, void 0, false, {
                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                            lineNumber: 202,
                                            columnNumber: 43
                                        }, this) : m.streaming ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "rounded-2xl rounded-tl-md border border-[#E7EAF0] bg-[#F9FAFC] px-3.5 py-2.5 text-[15px] text-[#94A3B8]",
                                            children: t("Thinking…", void 0, void 0, "Thinking…")
                                        }, void 0, false, {
                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                            lineNumber: 204,
                                            columnNumber: 46
                                        }, this) : null,
                                        m.notes?.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                            className: "space-y-1 pl-1",
                                            children: m.notes.map((note, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                    className: "text-[13px] text-[#94A3B8]",
                                                    children: [
                                                        "· ",
                                                        note
                                                    ]
                                                }, i, true, {
                                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                                    lineNumber: 209,
                                                    columnNumber: 48
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                            lineNumber: 208,
                                            columnNumber: 39
                                        }, this) : null,
                                        m.changes?.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-2 rounded-2xl border border-[#E7EAF0] bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center justify-between gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[14px] font-medium text-[#0F172A] dark:text-white",
                                                            children: t("N Proposed Changes", {
                                                                count: String(m.changes.length)
                                                            }, void 0, "{count} Proposed Changes")
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                                            lineNumber: 216,
                                                            columnNumber: 25
                                                        }, this),
                                                        m.changes.some((c)=>c.status === "proposed") ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: onAcceptAll,
                                                            className: "rounded-lg bg-[#16A34A] px-2.5 py-1.5 text-[13.5px] font-medium text-white transition hover:bg-[#15803D] active:scale-[0.98]",
                                                            children: t("Accept All", void 0, void 0, "Accept All")
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                                            lineNumber: 221,
                                                            columnNumber: 74
                                                        }, this) : null
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                                    lineNumber: 215,
                                                    columnNumber: 23
                                                }, this),
                                                m.changes.map((c)=>{
                                                    const key = c.key ?? c.id;
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("rounded-xl border p-2.5 transition-colors", c.status === "accepted" ? "border-[#BBF7D0] bg-[#F6FEF9]" : c.status === "rejected" ? "border-[#E7EAF0] bg-[#F9FAFC] opacity-70" : "border-[#E7EAF0] bg-white dark:border-white/10 dark:bg-transparent"),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "mb-2 flex items-center gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("rounded-full px-1.5 py-0.5 text-[12px] font-medium", OP_CLS[c.operation] ?? OP_CLS.replace),
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(OperationLabel, {
                                                                            operation: c.operation
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                                                            lineNumber: 231,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                                        lineNumber: 230,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[13px] text-[#94A3B8]",
                                                                        children: [
                                                                            t("Clause", void 0, void 0, "Clause"),
                                                                            " ",
                                                                            c.anchor
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                                        lineNumber: 233,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    c.status === "accepted" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                                        className: "ml-auto h-3.5 w-3.5 text-[#16A34A]"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                                        lineNumber: 236,
                                                                        columnNumber: 59
                                                                    }, this) : null
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                lineNumber: 229,
                                                                columnNumber: 29
                                                            }, this),
                                                            c.before ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "mb-1.5 max-h-24 overflow-hidden text-[14px] leading-relaxed text-[#94A3B8] line-through",
                                                                children: c.before
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 42
                                                            }, this) : null,
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "max-h-40 overflow-y-auto text-[14px] leading-relaxed text-[#0F172A] dark:text-white",
                                                                children: c.after
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                lineNumber: 242,
                                                                columnNumber: 29
                                                            }, this),
                                                            c.status === "proposed" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "mt-2 flex items-center gap-1.5",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>onAcceptChange(key),
                                                                        className: "inline-flex items-center gap-1 rounded-lg bg-[#007AFF] px-2.5 py-1.5 text-[13.5px] font-medium text-white transition hover:bg-[#0062CC] active:scale-[0.98]",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                                                className: "h-3 w-3"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                                lineNumber: 248,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            t("Accept", void 0, void 0, "Accept")
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                                        lineNumber: 247,
                                                                        columnNumber: 33
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>onRejectChange(key),
                                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnGhost, "px-2.5 py-1.5 text-[13.5px]"),
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                                                className: "h-3 w-3"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                                lineNumber: 252,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            t("Reject", void 0, void 0, "Reject")
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                                        lineNumber: 251,
                                                                        columnNumber: 33
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                lineNumber: 246,
                                                                columnNumber: 57
                                                            }, this) : null
                                                        ]
                                                    }, c.id, true, {
                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                        lineNumber: 228,
                                                        columnNumber: 21
                                                    }, this);
                                                })
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                            lineNumber: 214,
                                            columnNumber: 41
                                        }, this) : null
                                    ]
                                }, m.id, true, {
                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                    lineNumber: 188,
                                    columnNumber: 28
                                }, this)),
                            !stuck ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: jumpToBottom,
                                className: "sticky bottom-2 ml-auto flex w-8 items-center justify-end gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-[12px] font-medium text-[#475569] shadow-[0_2px_8px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06] backdrop-blur transition hover:bg-white dark:bg-[#2C2C2E]/95 dark:text-slate-200",
                                title: t("Jump to latest", void 0, void 0, "Jump to latest"),
                                children: [
                                    t("Latest", void 0, void 0, "Latest"),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                        className: "h-3.5 w-3.5"
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 264,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 262,
                                columnNumber: 24
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 175,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative border-t border-black/[0.06] bg-white/90 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#101010]/90",
                        children: [
                            refsOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ReferenceSheet, {
                                materials: materials,
                                template: template,
                                uploading: uploading,
                                canUpload: !!(onUpload || onUploadTemplate),
                                canRemoveMaterial: !!onRemoveMaterial,
                                onPick: (kind)=>(kind === "template" ? templateRef.current : fileRef.current)?.click(),
                                onRemoveMaterial: onRemoveMaterial,
                                onRemoveTemplate: onRemoveTemplate,
                                onClose: ()=>setRefsOpen(false)
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 270,
                                columnNumber: 26
                            }, this) : null,
                            lastSaved ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mb-2 truncate text-[13px] text-[#16A34A]",
                                title: lastSaved,
                                children: t("Saved to my documents", {
                                    name: lastSaved
                                }, void 0, "Saved to My Documents: {name}")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 272,
                                columnNumber: 27
                            }, this) : null,
                            notice ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mb-2 line-clamp-2 text-[13px] text-[#64748B]",
                                title: notice,
                                children: notice
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 277,
                                columnNumber: 24
                            }, this) : null,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-end gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                value: draft,
                                                onChange: (e)=>setDraft(e.target.value),
                                                onKeyDown: (e)=>{
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        submit();
                                                    }
                                                },
                                                rows: 2,
                                                placeholder: t("Ask for changes, or describe the next step…", void 0, void 0, "Ask for changes, or describe the next step…"),
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].input, "resize-none")
                                            }, void 0, false, {
                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                lineNumber: 283,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-2 flex items-center gap-2",
                                                children: [
                                                    onUpload || onUploadTemplate ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                ref: fileRef,
                                                                type: "file",
                                                                className: "hidden",
                                                                onChange: (e)=>void pickFile(e.target.files?.[0], "material")
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                lineNumber: 293,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                ref: templateRef,
                                                                type: "file",
                                                                className: "hidden",
                                                                accept: ".docx,.doc,.md,.markdown,.txt",
                                                                onChange: (e)=>void pickFile(e.target.files?.[0], "template")
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                lineNumber: 294,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                onClick: ()=>setRefsOpen((v)=>!v),
                                                                disabled: !!uploading,
                                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[14px] font-medium transition active:scale-[0.98]", refsOpen ? "border-[#007AFF]/30 bg-[#007AFF]/10 text-[#007AFF]" : "border-black/[0.07] bg-white text-[#475569] hover:border-[#CFE3FF] hover:text-[#007AFF]"),
                                                                children: [
                                                                    uploading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                                        className: "h-4 w-4 animate-spin"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                                        lineNumber: 296,
                                                                        columnNumber: 39
                                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$paperclip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Paperclip$3e$__["Paperclip"], {
                                                                        className: "h-4 w-4"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                                        lineNumber: 296,
                                                                        columnNumber: 87
                                                                    }, this),
                                                                    uploading ? t("Uploading…", void 0, void 0, "Uploading…") : t("References", void 0, void 0, "References"),
                                                                    template || materials.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "rounded-full bg-[#007AFF]/12 px-1.5 text-[12px] font-semibold text-[#007AFF]",
                                                                        children: (template ? 1 : 0) + materials.length
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                                        lineNumber: 299,
                                                                        columnNumber: 58
                                                                    }, this) : null
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                lineNumber: 295,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                        lineNumber: 292,
                                                        columnNumber: 52
                                                    }, this) : null,
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: onSave,
                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnText, "gap-1"),
                                                        children: t("Save to my documents", void 0, void 0, "Save to My Documents")
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                        lineNumber: 304,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].meta, "ml-auto truncate text-[12.5px]"),
                                                        children: modelLabel || ""
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                        lineNumber: 307,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                lineNumber: 289,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 282,
                                        columnNumber: 15
                                    }, this),
                                    streaming ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: onStop,
                                        className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E7EAF0] text-[#475569] transition hover:bg-[#F5F7FB] dark:border-white/10 dark:hover:bg-white/10",
                                        title: t("Stop", void 0, void 0, "Stop"),
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Square$3e$__["Square"], {
                                            className: "h-3.5 w-3.5 fill-current"
                                        }, void 0, false, {
                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                            lineNumber: 314,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 313,
                                        columnNumber: 29
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: submit,
                                        disabled: !draft.trim() || !sessionReady,
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition", draft.trim() && sessionReady ? "bg-[#007AFF] hover:bg-[#0062CC] active:scale-[0.97]" : "bg-[#CBD5E1]"),
                                        title: t("Send", void 0, void 0, "Send"),
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$corner$2d$down$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CornerDownLeft$3e$__["CornerDownLeft"], {
                                            className: "h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/components/studio/agent-panel.tsx",
                                            lineNumber: 316,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 315,
                                        columnNumber: 31
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 281,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 269,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AnalysisTab, {
                messages: messages,
                materials: materials,
                template: template,
                onRemoveMaterial: onRemoveMaterial,
                onRemoveTemplate: onRemoveTemplate
            }, void 0, false, {
                fileName: "[project]/components/studio/agent-panel.tsx",
                lineNumber: 320,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/studio/agent-panel.tsx",
        lineNumber: 148,
        columnNumber: 13
    }, this);
}
/**
 * 参考资料弹层（iOS 底部 sheet）。
 *
 * 左「专利模板」= 按什么结构写；右「参考材料」= 写什么、依据是什么。
 * 两块**都不是必须的**：空着也能直接让 agent 开写，所以这里只提示、不拦人。
 * 已传的文件直接在栏内列出并可单个撤掉——材料传上去要能收回，所以移除接到了
 * 后端 `DELETE /sessions/{sid}/materials/{name}`。
 */ function ReferenceSheet({ materials, template, uploading, canUpload, canRemoveMaterial, onPick, onRemoveMaterial, onRemoveTemplate, onClose }) {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslations"])();
    /** 一栏（模板 / 材料共用的骨架）：图标 + 标题 + 说明 + 内容 */ const column = (key, icon, title, hint, children)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "flex min-w-0 flex-col rounded-2xl border border-black/[0.05] bg-[#F7F7FA] p-3.5 dark:border-white/10 dark:bg-white/[0.04]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-3 flex items-center gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#007AFF] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-white/10",
                            children: icon
                        }, void 0, false, {
                            fileName: "[project]/components/studio/agent-panel.tsx",
                            lineNumber: 344,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "min-w-0",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-[15px] font-semibold text-[#0F172A] dark:text-white",
                                    children: title
                                }, void 0, false, {
                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                    lineNumber: 348,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[12.5px] leading-tight text-[#94A3B8]",
                                    children: hint
                                }, void 0, false, {
                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                    lineNumber: 349,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/studio/agent-panel.tsx",
                            lineNumber: 347,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/studio/agent-panel.tsx",
                    lineNumber: 343,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1",
                    children: children
                }, void 0, false, {
                    fileName: "[project]/components/studio/agent-panel.tsx",
                    lineNumber: 352,
                    columnNumber: 7
                }, this)
            ]
        }, key, true, {
            fileName: "[project]/components/studio/agent-panel.tsx",
            lineNumber: 342,
            columnNumber: 174
        }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                "aria-hidden": "true",
                tabIndex: -1,
                className: "fixed inset-0 z-20 cursor-default",
                onClick: onClose
            }, void 0, false, {
                fileName: "[project]/components/studio/agent-panel.tsx",
                lineNumber: 356,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute bottom-2 left-2 right-2 z-30 animate-[sheet-up_180ms_ease-out] rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.28)] dark:border-white/10 dark:bg-[#1C1C1E]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                        children: `@keyframes sheet-up{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}`
                    }, void 0, false, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 358,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-3 flex items-center justify-between gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-[17px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-white",
                                children: t("References", void 0, void 0, "References")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 361,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: onClose,
                                className: "flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.05] text-[#64748B] transition hover:bg-black/[0.08] dark:bg-white/10 dark:text-slate-300",
                                title: t("Close", void 0, void 0, "Close"),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    className: "h-4 w-4"
                                }, void 0, false, {
                                    fileName: "[project]/components/studio/agent-panel.tsx",
                                    lineNumber: 365,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 364,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 360,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 gap-3",
                        children: [
                            column("template", /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                className: "h-4.5 w-4.5",
                                strokeWidth: 1.9
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 370,
                                columnNumber: 31
                            }, this), t("Patent template", void 0, void 0, "Patent template"), t("Template column hint", void 0, void 0, "The agent writes by its clauses."), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    template ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mb-2 rounded-xl border border-[#BBF7D0] bg-[#F6FEF9] px-2.5 py-2 dark:border-[#16A34A]/30 dark:bg-[#16A34A]/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "truncate text-[13.5px] font-medium text-[#15803D] dark:text-[#4ADE80]",
                                                children: template.name
                                            }, void 0, false, {
                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                lineNumber: 372,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-0.5 flex items-center justify-between gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "truncate text-[12.5px] text-[#94A3B8]",
                                                        children: template.parseError ? template.parseError : `${template.chars} ${t("chars", void 0, void 0, "chars")}${template.truncated ? " · 已截断" : ""}`
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                        lineNumber: 376,
                                                        columnNumber: 21
                                                    }, this),
                                                    onRemoveTemplate ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>onRemoveTemplate(),
                                                        className: "shrink-0 text-[12.5px] font-medium text-[#007AFF]",
                                                        children: t("Remove", void 0, void 0, "Remove")
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                        lineNumber: 379,
                                                        columnNumber: 42
                                                    }, this) : null
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                lineNumber: 375,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 371,
                                        columnNumber: 28
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>onPick("template"),
                                        disabled: !canUpload || !!uploading,
                                        className: "inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/[0.07] bg-white px-3 py-2.5 text-[14px] font-medium text-[#007AFF] transition hover:bg-[#007AFF]/5 active:scale-[0.98] disabled:opacity-50 dark:border-white/10 dark:bg-white/5",
                                        children: [
                                            uploading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                className: "h-4 w-4 animate-spin"
                                            }, void 0, false, {
                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                lineNumber: 385,
                                                columnNumber: 30
                                            }, this) : null,
                                            t("Upload template", void 0, void 0, "Upload template")
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 384,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true)),
                            column("material", /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$paperclip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Paperclip$3e$__["Paperclip"], {
                                className: "h-4.5 w-4.5",
                                strokeWidth: 1.9
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 390,
                                columnNumber: 31
                            }, this), t("Materials", void 0, void 0, "Materials"), t("Material column hint", void 0, void 0, "Anything the agent should read."), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    materials.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                        className: "mb-2 space-y-1.5",
                                        children: materials.map((m)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                className: "flex items-center gap-2 rounded-xl border border-black/[0.05] bg-white px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "min-w-0 flex-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "truncate text-[13.5px] text-[#334155] dark:text-slate-200",
                                                                children: m.name
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                lineNumber: 394,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "truncate text-[12px] text-[#94A3B8]",
                                                                children: m.parseError ? m.parseError : `${m.chars} ${t("chars", void 0, void 0, "chars")}${m.truncated ? " · 已截断" : ""}`
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                                lineNumber: 397,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                        lineNumber: 393,
                                                        columnNumber: 23
                                                    }, this),
                                                    canRemoveMaterial && onRemoveMaterial ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>onRemoveMaterial(m.name),
                                                        className: "shrink-0 text-[12.5px] font-medium text-[#007AFF]",
                                                        children: t("Remove", void 0, void 0, "Remove")
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                                        lineNumber: 401,
                                                        columnNumber: 65
                                                    }, this) : null
                                                ]
                                            }, m.name, true, {
                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                lineNumber: 392,
                                                columnNumber: 40
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 391,
                                        columnNumber: 36
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>onPick("material"),
                                        disabled: !canUpload || !!uploading,
                                        className: "inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/[0.07] bg-white px-3 py-2.5 text-[14px] font-medium text-[#007AFF] transition hover:bg-[#007AFF]/5 active:scale-[0.98] disabled:opacity-50 dark:border-white/10 dark:bg-white/5",
                                        children: [
                                            uploading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                className: "h-4 w-4 animate-spin"
                                            }, void 0, false, {
                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                lineNumber: 407,
                                                columnNumber: 30
                                            }, this) : null,
                                            t("Upload material", void 0, void 0, "Upload material")
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 406,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 369,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-3 text-center text-[12.5px] text-[#94A3B8]",
                        children: t("References optional hint", void 0, void 0, "Both are optional — the agent can start without them.")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 414,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/studio/agent-panel.tsx",
                lineNumber: 357,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
/** 分析页：材料（已解析）+ 工具调用，方便判断「它到底依据什么在写」 */ function AnalysisTab({ messages, materials, template, onRemoveMaterial, onRemoveTemplate }) {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslations"])();
    const notes = messages.flatMap((m)=>m.notes ?? []);
    const toolCalls = notes.filter((n)=>n.includes("调用工具"));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex-1 space-y-3 overflow-y-auto px-4 py-4 custom-scrollbar",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].body,
                children: t("Analysis intro", void 0, void 0, "Analysis tracks stage progress, tool calls and materials used by the skill.")
            }, void 0, false, {
                fileName: "[project]/components/studio/agent-panel.tsx",
                lineNumber: 431,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].subCard, "p-3"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].label,
                        children: t("Materials", void 0, void 0, "Materials")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 436,
                        columnNumber: 9
                    }, this),
                    template ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-1.5 flex items-start gap-2 rounded-lg border border-[#BBF7D0] bg-[#F6FEF9] px-2.5 py-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]"
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 438,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-w-0 flex-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "truncate text-[13.5px] font-medium text-[#15803D]",
                                        children: template.name
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 440,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[12.5px] text-[#94A3B8]",
                                        children: template.parseError ? template.parseError : `${t("Draft template", void 0, void 0, "Draft template")} · ${template.chars} ${t("chars", void 0, void 0, "chars")}${template.truncated ? " · 已截断" : ""}`
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 441,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 439,
                                columnNumber: 13
                            }, this),
                            onRemoveTemplate ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>onRemoveTemplate(),
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnText,
                                children: t("Remove", void 0, void 0, "Remove")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 445,
                                columnNumber: 34
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 437,
                        columnNumber: 22
                    }, this) : null,
                    materials.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "mt-1.5 space-y-1.5",
                        children: materials.map((m)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex items-start gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "min-w-0 flex-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "truncate text-[13.5px] text-[#475569] dark:text-slate-300",
                                                children: m.name
                                            }, void 0, false, {
                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                lineNumber: 452,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[12.5px] text-[#94A3B8]",
                                                children: m.parseError ? m.parseError : `${m.chars} ${t("chars", void 0, void 0, "chars")}${m.truncated ? " · 已截断" : ""}`
                                            }, void 0, false, {
                                                fileName: "[project]/components/studio/agent-panel.tsx",
                                                lineNumber: 453,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 451,
                                        columnNumber: 17
                                    }, this),
                                    onRemoveMaterial ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>onRemoveMaterial(m.name),
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnText,
                                        children: t("Remove", void 0, void 0, "Remove")
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/agent-panel.tsx",
                                        lineNumber: 457,
                                        columnNumber: 38
                                    }, this) : null
                                ]
                            }, m.name, true, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 450,
                                columnNumber: 34
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 449,
                        columnNumber: 30
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].meta, "mt-1.5"),
                        children: t("No materials yet", void 0, void 0, "No materials yet")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 461,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/studio/agent-panel.tsx",
                lineNumber: 435,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].subCard, "p-3"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].label,
                        children: t("Tools", void 0, void 0, "Tools")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 467,
                        columnNumber: 9
                    }, this),
                    toolCalls.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "mt-1.5 space-y-1",
                        children: toolCalls.map((n, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "text-[13.5px] text-[#475569] dark:text-slate-300",
                                children: [
                                    "· ",
                                    n
                                ]
                            }, i, true, {
                                fileName: "[project]/components/studio/agent-panel.tsx",
                                lineNumber: 469,
                                columnNumber: 37
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 468,
                        columnNumber: 30
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].meta, "mt-1.5"),
                        children: t("No tool calls yet", void 0, void 0, "No tool calls yet — the agent reads skills and writes text only.")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/agent-panel.tsx",
                        lineNumber: 472,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/studio/agent-panel.tsx",
                lineNumber: 466,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/studio/agent-panel.tsx",
        lineNumber: 430,
        columnNumber: 13
    }, this);
}
}),
"[project]/components/studio/doc-canvas.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DocCanvas",
    ()=>DocCanvas
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next-intl@4.7.0_next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19._ad6175bb892ccee3b398db7087b15c16/node_modules/next-intl/dist/esm/development/react-client/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$text$2d$align$2d$start$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlignLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/text-align-start.js [app-ssr] (ecmascript) <export default as AlignLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bold$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bold$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/bold.js [app-ssr] (ecmascript) <export default as Bold>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$highlighter$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Highlighter$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/highlighter.js [app-ssr] (ecmascript) <export default as Highlighter>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$italic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Italic$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/italic.js [app-ssr] (ecmascript) <export default as Italic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/link-2.js [app-ssr] (ecmascript) <export default as Link2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__List$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/list.js [app-ssr] (ecmascript) <export default as List>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$ordered$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ListOrdered$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/list-ordered.js [app-ssr] (ecmascript) <export default as ListOrdered>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2d$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquarePlus$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/message-square-plus.js [app-ssr] (ecmascript) <export default as MessageSquarePlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/table.js [app-ssr] (ecmascript) <export default as Table>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$underline$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Underline$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/underline.js [app-ssr] (ecmascript) <export default as Underline>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/studio/visual-spec.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
function DocCanvas({ draft, selectedAnchor, onSelectBlock, pendingAnchors, toolbar = true, className }) {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslations"])();
    const blocks = draft?.blocks ?? [];
    const pending = new Set(pendingAnchors ?? []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex min-w-0 flex-1 flex-col", className),
        children: [
            toolbar ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-1 overflow-x-auto border-b border-[#E7EAF0] px-4 py-2 dark:border-white/10",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "mr-1 shrink-0 rounded-md bg-[#F5F7FB] px-2 py-1 text-[12px] text-[#475569] dark:bg-white/5 dark:text-slate-300",
                        children: t("Heading 2", void 0, void 0, "Heading 2")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/doc-canvas.tsx",
                        lineNumber: 27,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "mr-2 shrink-0 rounded-md bg-[#F5F7FB] px-2 py-1 text-[12px] text-[#475569] dark:bg-white/5 dark:text-slate-300",
                        children: t("Font", void 0, void 0, "Font")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/doc-canvas.tsx",
                        lineNumber: 30,
                        columnNumber: 11
                    }, this),
                    [
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bold$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bold$3e$__["Bold"],
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$italic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Italic$3e$__["Italic"],
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$underline$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Underline$3e$__["Underline"],
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__["Link2"]
                    ].map((Icon, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].iconBtn,
                            title: t("Draft", void 0, void 0, "Draft"),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                className: "h-3.5 w-3.5"
                            }, void 0, false, {
                                fileName: "[project]/components/studio/doc-canvas.tsx",
                                lineNumber: 39,
                                columnNumber: 15
                            }, this)
                        }, i, false, {
                            fileName: "[project]/components/studio/doc-canvas.tsx",
                            lineNumber: 38,
                            columnNumber: 23
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "mx-1 h-4 w-px bg-[#E7EAF0] dark:bg-white/10"
                    }, void 0, false, {
                        fileName: "[project]/components/studio/doc-canvas.tsx",
                        lineNumber: 41,
                        columnNumber: 11
                    }, this),
                    [
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$text$2d$align$2d$start$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlignLeft$3e$__["AlignLeft"],
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__List$3e$__["List"],
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$ordered$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ListOrdered$3e$__["ListOrdered"],
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__["Table"],
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$highlighter$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Highlighter$3e$__["Highlighter"],
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2d$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquarePlus$3e$__["MessageSquarePlus"]
                    ].map((Icon, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].iconBtn,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                className: "h-3.5 w-3.5"
                            }, void 0, false, {
                                fileName: "[project]/components/studio/doc-canvas.tsx",
                                lineNumber: 50,
                                columnNumber: 15
                            }, this)
                        }, i, false, {
                            fileName: "[project]/components/studio/doc-canvas.tsx",
                            lineNumber: 49,
                            columnNumber: 23
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].meta, "ml-auto hidden shrink-0 text-[11.5px] md:block"),
                        children: selectedAnchor ? `${t("Selected clause", void 0, void 0, "Selected clause")} ${selectedAnchor}` : t("Click a clause to target it", void 0, void 0, "Click a clause to target it, or just describe the change")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/doc-canvas.tsx",
                        lineNumber: 52,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/studio/doc-canvas.tsx",
                lineNumber: 26,
                columnNumber: 19
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 overflow-y-auto px-6 py-8 custom-scrollbar md:px-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mx-auto w-full max-w-[46rem]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-6 flex items-start justify-between gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-[22px] font-semibold leading-snug tracking-[-0.01em] text-[#0F172A] dark:text-white",
                                    children: draft?.title || t("Untitled draft", void 0, void 0, "Untitled draft")
                                }, void 0, false, {
                                    fileName: "[project]/components/studio/doc-canvas.tsx",
                                    lineNumber: 60,
                                    columnNumber: 13
                                }, this),
                                blocks.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].chip, "shrink-0"),
                                    children: t("N blocks", {
                                        count: String(blocks.length)
                                    }, void 0, "{count} clauses")
                                }, void 0, false, {
                                    fileName: "[project]/components/studio/doc-canvas.tsx",
                                    lineNumber: 63,
                                    columnNumber: 31
                                }, this) : null
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/studio/doc-canvas.tsx",
                            lineNumber: 59,
                            columnNumber: 11
                        }, this),
                        blocks.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-2xl border border-dashed border-[#E7EAF0] p-6 text-[13px] leading-relaxed text-[#94A3B8] dark:border-white/10",
                            children: t("Canvas empty hint", void 0, void 0, "The draft appears here as the agent writes. Upload materials or describe the invention in the panel on the right — the first version lands automatically.")
                        }, void 0, false, {
                            fileName: "[project]/components/studio/doc-canvas.tsx",
                            lineNumber: 70,
                            columnNumber: 35
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-6",
                            children: blocks.map((block)=>{
                                const isSelected = selectedAnchor === block.anchor;
                                const isPending = pending.has(block.anchor) || pending.has("全文");
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                                    onClick: ()=>onSelectBlock(isSelected ? undefined : block.anchor),
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("group relative cursor-pointer rounded-xl border-l-[3px] px-3 py-2 transition-colors", isSelected ? "border-l-[#2563EB] bg-[#F7F9FF]" : isPending ? "border-l-[#F59E0B] hover:bg-[#FFFBF3]" : "border-l-transparent hover:bg-[#F9FAFC] dark:hover:bg-white/5"),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("absolute -left-9 top-2 hidden w-6 text-right text-[11px] tabular-nums md:block", isSelected ? "text-[#2563EB]" : "text-[#CBD5E1] group-hover:text-[#94A3B8]"),
                                            children: block.anchor
                                        }, void 0, false, {
                                            fileName: "[project]/components/studio/doc-canvas.tsx",
                                            lineNumber: 77,
                                            columnNumber: 21
                                        }, this),
                                        block.heading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].docHeading, "mb-1.5"),
                                            children: block.heading
                                        }, void 0, false, {
                                            fileName: "[project]/components/studio/doc-canvas.tsx",
                                            lineNumber: 80,
                                            columnNumber: 39
                                        }, this) : null,
                                        block.text ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].docText,
                                            children: block.text
                                        }, void 0, false, {
                                            fileName: "[project]/components/studio/doc-canvas.tsx",
                                            lineNumber: 81,
                                            columnNumber: 36
                                        }, this) : null,
                                        isPending ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "mt-2 inline-flex items-center gap-1 rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10.5px] font-medium text-[#B45309]",
                                            children: t("Pending change", void 0, void 0, "Pending change")
                                        }, void 0, false, {
                                            fileName: "[project]/components/studio/doc-canvas.tsx",
                                            lineNumber: 82,
                                            columnNumber: 35
                                        }, this) : null
                                    ]
                                }, block.anchor, true, {
                                    fileName: "[project]/components/studio/doc-canvas.tsx",
                                    lineNumber: 76,
                                    columnNumber: 17
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/components/studio/doc-canvas.tsx",
                            lineNumber: 72,
                            columnNumber: 24
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].meta, "mt-8 text-center"),
                            children: t("Draft footer note", void 0, void 0, "Draft produced by the patent skill — verify facts before filing. Saved to My Documents as Markdown.")
                        }, void 0, false, {
                            fileName: "[project]/components/studio/doc-canvas.tsx",
                            lineNumber: 89,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/studio/doc-canvas.tsx",
                    lineNumber: 58,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/studio/doc-canvas.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/studio/doc-canvas.tsx",
        lineNumber: 25,
        columnNumber: 13
    }, this);
}
}),
"[project]/components/studio/ai-studio.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AiStudio",
    ()=>AiStudio
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * AI 工作台（专利撰写室 / AI 写作共用）。
 *
 * **打开就是 Collabora 编辑器**，不需要任何切换：进页面即
 * 「草稿导出 docx → 等内核就绪 → 挂会话」，中栏直接是 Word 编辑器。
 * 右侧 AI 面板照常对话；AI 改完稿会**直接写进这个已打开的文档**（全选+粘贴
 * 整篇替换 + WOPI 保存），你眼看着文档变成新版，全程不重载 iframe。
 *
 * 为什么是这种形态：
 * - agent 就是个「坐在同一份文档里的协作者」：它写完落盘你看到，你 Ctrl+S
 *   落盘它下轮读盘（发指令前会先 flush 再回读），两边串行、不需要锁
 * - Collabora 按文档键（WOPISrc）缓存会话，服务端改文件它看不见，所以 AI 的
 *   稿子走 postMessage 桥粘进活会话，而不是换文件重载——协议要点见
 *   utils/editor/collabora.ts 顶部注释
 *
 * 栏目差异（技能包、模板、顶栏导航）全部由 props 注入，这里不放任何栏目特有
 * 的东西——「模板即入口，会话即案卷」对专利和公文写作是同一套道理。
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next-intl@4.7.0_next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19._ad6175bb892ccee3b398db7087b15c16/node_modules/next-intl/dist/esm/development/react-client/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-ssr] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/message-square.js [app-ssr] (ecmascript) <export default as MessageSquare>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/rotate-ccw.js [app-ssr] (ecmascript) <export default as RotateCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/save.js [app-ssr] (ecmascript) <export default as Save>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$page$2d$title$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/use-page-title.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$ai$2d$chat$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/use-ai-chat.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/store/index.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/editor/collabora.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$locale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/editor/locale.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$agent$2d$panel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/studio/agent-panel.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$doc$2d$canvas$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/studio/doc-canvas.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/studio/visual-spec.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
;
/** Collabora 冷启动的最长等待（与编辑器页口径一致：首启约 1 分钟） */ const ENGINE_WAIT_MS = 150_000;
const ENGINE_POLL_MS = 3_000;
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
/** 宽屏阈值：≥1280px 时 AI 面板常驻右栏，之下改用浮层抽屉 */ const WIDE_QUERY = "(min-width: 1280px)";
/**
 * 是否宽屏。
 *
 * 初始按 true 渲染（与服务端一致，避免 hydration 不匹配），挂载后再按实际宽度纠正。
 * 监听断点变化：从宽拖到窄时自动切到抽屉形态，反之亦然。
 */ function useIsWide() {
    const [isWide, setIsWide] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const mq = undefined;
        const sync = undefined;
    }, []);
    return isWide;
}
/**
 * 栏目页交接文稿用的 sessionStorage key（如写作栏「在 Word 里微调」）。
 *
 * 一次性：灌进本会话草稿后立刻抹掉——刷新不会重复灌，也不会冲掉别处存的东西。
 */ const HANDOFF_KEY = "ai-studio:handoff";
function AiStudio({ skill, title, persistKey, template, variants, activeVariant, onVariantChange, pageTitle, defaultTitle, subtitle, backHref, nav, icon: Icon, panelWidth }) {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslations"])();
    // 标签标题带上构建标记（runtime-config.js 由容器启动时注入）：
    // 浏览器标签页一眼就能看出当前跑的是哪次构建，省得每次都怀疑缓存
    const buildTag = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : "";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$page$2d$title$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePageTitle"])(("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : pageTitle);
    const language = (0, __TURBOPACK__imported__module__$5b$project$5d2f$store$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useResolvedLanguage"])();
    /** 宽屏常驻右栏 / 窄屏浮层抽屉，两者互斥，避免同时占屏 */ const isWide = useIsWide();
    const [dockOpen, setDockOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [sheetOpen, setSheetOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selectedAnchor, setSelectedAnchor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(undefined);
    /** 中栏显示哪个：默认就是编辑器；草稿只是「看变更卡/点段落定位」的辅助视图 */ const [view, setView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("editor");
    const [editorUrl, setEditorUrl] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    /** 编辑器里打开的那份 docx（回读/重载都按它） */ const [editorDoc, setEditorDoc] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [opening, setOpening] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    /** COOL 文档是否已就绪（握手 + Document_Loaded）；就绪前注入会被 COOL 丢弃 */ const [docReady, setDocReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    /** 内核压根没连上时的可操作提示（代理/IPv6 导致连不到 9980） */ const [engineHint, setEngineHint] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    /** 内核冷启动已等待秒数；null = 没在等 */ const [waitSeconds, setWaitSeconds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [engineError, setEngineError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const cancelRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    /** 会话版本：每次重载 +1，逼 Collabora 丢开内存里的旧文档、重新读盘 */ const versionRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const openingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const frameRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const chat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$ai$2d$chat$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAiChat"])({
        skill,
        // 会话标题取英文（文件名），中文只用于界面显示
        title: template?.sessionTitle ?? title,
        // 每个模板一条独立会话线，别让不同文种/类型的稿子互相串
        persistKey
    });
    const modelLabel = chat.health ? `pi ${chat.health.pi.version ?? ""}`.trim() : undefined;
    const blockCount = chat.draft?.blocks.length ?? 0;
    const pendingAnchors = chat.messages.flatMap((m)=>m.changes ?? []).filter((c)=>c.status === "proposed").map((c)=>String(c.anchor));
    /**
   * 打开/重载编辑器。
   *
   * 顺序不能颠倒：先把草稿导出成 docx（保证读到最新那一版），再等内核就绪，
   * 最后换一个会话版本取 WOPI 地址挂 iframe。任一步失败都给出原因（不白屏）。
   */ const openEditor = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (reexport = true)=>{
        if (openingRef.current) return;
        openingRef.current = true;
        setOpening(true);
        setEngineError(null);
        cancelRef.current = false;
        const zh = language.toLowerCase().startsWith("zh");
        try {
            // reexport=false：docx 已由后端写好（可能带 AI 修订），只换会话重新读盘，
            // 千万不能重新导出——那会把未审完的修订覆盖成干净稿。
            let name = editorDoc ?? "";
            if (reexport || !name) {
                name = await chat.exportDocx();
            }
            let state = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchCollaboraStatus"])().catch(()=>"unknown");
            if (state === "warming_up") {
                setWaitSeconds(0);
                const startedAt = Date.now();
                while(Date.now() - startedAt < ENGINE_WAIT_MS){
                    await sleep(ENGINE_POLL_MS);
                    if (cancelRef.current) throw new Error(zh ? "已取消" : "Cancelled");
                    state = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchCollaboraStatus"])().catch(()=>"unknown");
                    setWaitSeconds(Math.floor((Date.now() - startedAt) / 1000));
                    if (state !== "warming_up") break;
                }
            }
            if (state === "unavailable") {
                throw new Error(zh ? "Collabora 内核当前不可用" : "The Collabora engine is unavailable");
            }
            versionRef.current += 1;
            let session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchCollaboraSession"])(name, true, null, (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$locale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toCollaboraLang"])(language), true, versionRef.current);
            if (!session && !reexport) {
                // 本地还没有这份 docx（比如刚换过标题）：补一次导出再开
                name = await chat.exportDocx();
                versionRef.current += 1;
                session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchCollaboraSession"])(name, true, null, (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$locale$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toCollaboraLang"])(language), true, versionRef.current);
            }
            if (!session) {
                throw new Error(zh ? "取 Collabora 会话失败" : "Could not open a Collabora session");
            }
            setEditorDoc(name);
            setEditorUrl((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["alignCollaboraHost"])(session.editorUrl));
            setView("editor");
        } catch (err) {
            setEngineError(String(err instanceof Error ? err.message : err));
        } finally{
            setWaitSeconds(null);
            openingRef.current = false;
            setOpening(false);
        }
    }, [
        chat,
        editorDoc,
        language
    ]);
    /** 进页面就开编辑器：不做任何「先看草稿再切」的中间态 */ const bootRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (bootRef.current || !chat.draft || chat.blocked) return;
        bootRef.current = true;
        // 有稿：直接打开现有 docx（可能带未审完的 AI 修订，重导出会毁掉它们）
        // 空稿：先导出（生成只有标题的文档），让用户一进来就是编辑器
        void openEditor((chat.draft.blocks?.length ?? 0) === 0);
    }, [
        chat.blocked,
        chat.draft,
        openEditor
    ]);
    /**
   * 接管栏目页交接过来的文稿（写作栏「在 Word 里微调」带过来的成稿）。
   *
   * 会话建立后灌一次、立刻抹掉 key：刷新不重复灌，隐私模式下存不下也不报错
   * （工作台按自己的会话起步，用户手动贴内容即可）。
   */ const handoffRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (handoffRef.current || !chat.sessionId) return;
        handoffRef.current = true;
        try {
            const raw = sessionStorage.getItem(HANDOFF_KEY);
            if (!raw) return;
            sessionStorage.removeItem(HANDOFF_KEY);
            const payload = JSON.parse(raw);
            if (payload.markdown?.trim()) {
                void chat.importDraft(payload.markdown, payload.title || "");
            }
        } catch  {
        /* 交接数据损坏：忽略，按本会话原状走 */ }
    }, [
        chat
    ]);
    /**
   * iframe 加载完后再握手、并等文档真正就绪。
   *
   * 两步缺一个，后面的注入都会被 COOL 静默丢弃（门卫分别回
   * `PostMessage ignored: not ready` 和 `not loaded yet`）。协议细节见
   * utils/editor/collabora.ts 顶部的注释。
   *
   * 握手必须等 `load`：挂载瞬间发出去的消息会丢在 iframe 导航前的
   * about:blank 窗口上，COOL 的监听器根本没加载——现象就是「文档明明开着，
   * 注入却毫无反应」（实测踩过）。
   */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const frame = frameRef.current;
        if (!frame || !editorUrl) return;
        setDocReady(false);
        setEngineHint(null);
        let alive = true;
        const onLoad = ()=>{
            if (!alive) return;
            // COOL 版本升级时会弹「体验新版本」欢迎层，正压在文档上。它在 iframe 内的
            // COOL 源里，跨源时我们改不到 DOM，postMessage/UNO 也关不掉（都试过），只能
            // 用户点一次 X——COOL 会记进本地偏好，同一版本不再弹。所以这里保留尝试：
            // 万一哪天把编辑器改成同源代理，它就自动生效了。
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hideCollaboraWelcomeScreen"])(frame);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["announceHostReady"])(frame);
            // 菜单栏/标尺/状态栏：iframe ref 里已抢在前面发过几次，这里再兜一次
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hideCollaboraChrome"])(frame);
            // 12 秒等不到 Document_Loaded 就认定「内核没连上」：本地开发时浏览器
            // 走代理/IPv6 会连不到 localhost:9980（COOL 只听 IPv4），这时别让用户
            // 对着一帧「拒绝连接」发呆，直接告诉他换哪个地址打开。
            void (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["waitForCollaboraDocumentLoaded"])(12_000).then((ok)=>{
                if (!alive) return;
                setDocReady(ok);
                // 侧边栏（样式/图库面板）是就绪后才建的，所以它要在这里单独藏
                if (ok) (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hideCollaboraSidebar"])(frame);
                if (!ok) {
                    const here = window.location;
                    const alt = here.hostname === "localhost" ? "127.0.0.1" : "localhost";
                    const zh = language.toLowerCase().startsWith("zh");
                    setEngineHint(zh ? `编辑器内核没连上（${here.hostname}:9980）。浏览器若走了代理或 IPv6，改用 http://${alt}${here.port ? `:${here.port}` : ""}${here.pathname}${here.search} 打开本页。` : `The editor engine (${here.hostname}:9980) is unreachable. If your browser uses a proxy or IPv6, reopen this page at http://${alt}${here.port ? `:${here.port}` : ""}${here.pathname}${here.search}.`);
                }
            });
        };
        frame.addEventListener("load", onLoad);
        return ()=>{
            alive = false;
            frame.removeEventListener("load", onLoad);
        };
    }, [
        editorUrl,
        language
    ]);
    /**
   * AI 改完稿 → 直接写进**已经打开着的** Collabora 文档（零刷新）。
   *
   * 「把 agent 当成一个协作者」就是这个意思：它不整篇重载你的编辑器，而是把
   * 稿子粘进你眼前的活文档——全选后粘 = 整篇替换，你眼看着文档变成新版；
   * 随后一次 WOPI 保存写回存储，agent 下一轮先读盘再改。两边永远不并排写
   * 同一段，也就不存在「你一保存把它盖回去」。
   *
   * 粘的 HTML 由服务端用「md→docx→mammoth」单一管线渲染（`fetchDraftHtml`）：
   * 前端不自己渲染 Markdown，粘进去的长相与 apply 写盘的那份 docx 完全一致。
   *
   * 就绪前不注入（会被丢弃）；等 docReady 翻真再补注入——打开时加载的内容
   * 本来就是最新导出的稿子，所以慢一步也不会看到旧内容。
   *
   * 两个必须记住的坑：
   * 1) 草稿连着变时去抖 600ms，一轮只注入一次（每个 patch 一次更新，全注一遍会打架）
   * 2) **版本标记要先置后干活，忙的时候必须回滚**——否则这一版被标记成
   *    「已注入」却没真注入，AI 这轮改动就永远丢了（症状：正文停在上一版的一半）
   */ /**
   * AI 落文 → 写进**已经打开着的** Collabora 文档（整篇替换，零刷新）。
   *
   * 粘贴协议（**已真机验证**，playwright + 本地 Collabora 26.04 实测）：
   *   `.uno:SelectAll` → 等 700ms → `Action_Paste(text/html)` → `Action_Save`
   *   7.4KB / 6,229 字符的 HTML 整篇进去，一字不少、编号层级与样式全保留；
   *   去掉 SelectAll 就会变成"追加"（实测多出上一次的残留字符）。
   *   视口跟随只在 AI 出字阶段做——那一刻没有粘贴，不会互相打断。
   * 2. 注入期间禁用发送：否则发指令前的 docx 回读会读到半截文档，草稿被残缺
   *    内容覆盖，断点会越滚越靠前。
   * 3. 草稿连着更新时去抖 600ms，一轮只注入一次。
   */ const injectedDraftAtRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const injectSeqRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    /** 注入进行中：SelectAll→粘贴→保存这段窗口里不接受新的注入 */ const injectBusyRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    /** 注入中禁用发送（理由见上） */ const [injecting, setInjecting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // 切到草稿视图再切回来：清掉标记，让编辑器重新同步成最新稿
        if (view !== "editor") {
            injectedDraftAtRef.current = null;
            return;
        }
        if (!docReady || chat.streaming || !chat.draft || !frameRef.current) return;
        const at = chat.draft.updated_at ?? 0;
        if (!at || injectedDraftAtRef.current === at) return;
        injectedDraftAtRef.current = at;
        const seq = ++injectSeqRef.current;
        const timer = window.setTimeout(()=>{
            const start = async ()=>{
                if (injectBusyRef.current) {
                    // 关键：标记是「先置后干活」的，忙着的时候必须**回滚标记**，
                    // 否则这一版被标记成已处理却没注入，AI 的这轮改动就永远丢了
                    // （实测症状：正文停在上一版的一半）。
                    injectedDraftAtRef.current = null;
                    return;
                }
                injectBusyRef.current = true;
                setInjecting(true);
                try {
                    const html = await chat.fetchDraftHtml();
                    if (!html || injectSeqRef.current !== seq) return;
                    const frame = frameRef.current;
                    if (!frame?.isConnected) return;
                    // ① 选全文
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sendUnoCommand"])(frame, ".uno:SelectAll");
                    // ② 等 UNO 往返落地
                    await sleep(700);
                    if (!frame.isConnected || injectSeqRef.current !== seq) return;
                    // ③ 整篇替换（text/html 带上标题层级与列表格式）
                    // ④ 粘贴。真机（playwright + 本地 Collabora）实测：这一步是**同步完成**的，
                    //    7.4KB 的 HTML 整篇进去、6,229 字符一字不少、编号层级与样式全保留，
                    //    所以不需要再空等——早先那 2.5s 是我臆想的保险，反而把注入窗口
                    //    拉长到 3.2s，期间发送被禁用，看起来就像"卡住了"。
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pasteIntoCollabora"])(frame, html);
                    // ⑤ 紧接着保存（存的是完整文档）
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveCollabora"])(frame);
                } catch  {
                    // 同样回滚标记：失败不能被当成「已注入」
                    injectedDraftAtRef.current = null;
                } finally{
                    injectBusyRef.current = false;
                    setInjecting(false);
                }
            };
            void start();
        }, 600);
        return ()=>window.clearTimeout(timer);
    }, [
        chat,
        docReady,
        view
    ]);
    /**
   * 发指令前先把编辑器里的内容回读进草稿。
   *
   * 两步顺序不能反：
   * 1) **先落盘**（flush）：用户在 Word 里手改的内容 agent 看不见（草稿是 AI
   *    的工作面），不先 Ctrl+S 式地冲一次，下一轮 AI 拿旧稿改，用户刚敲的
   *    内容就被覆盖了——协作者的规矩：你保存，我才动手
   * 2) **再回读**（import）：把盘上的 docx 转成草稿，agent 才知道当前稿子
   *    长什么样
   */ const sendInstruction = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (text, options)=>{
        if (editorDoc && docReady && frameRef.current) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["flushCollabora"])(frameRef.current);
        }
        if (editorDoc) {
            try {
                await chat.importDocx(editorDoc);
            } catch  {
            // 回读失败不阻塞对话：可能是还没保存过（WOPI 只在保存时写回）
            }
        }
        await chat.send(text, {
            ...options,
            anchor: options?.anchor ?? selectedAnchor
        });
        setSelectedAnchor(undefined);
    }, [
        chat,
        docReady,
        editorDoc,
        selectedAnchor
    ]);
    /**
   * 视口跟随 AI：出字时编辑器跟着往下走。
   *
   * `.uno:GoToEndOfDoc` 会移动光标，所以只在**AI 正在生成**时做（用户此时在读）；
   * 用户手改阶段不抢光标。一次回合能触发几十次 delta，因此节流到 ~0.9s 一次。
   */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (view !== "editor" || !docReady || !chat.streaming) return;
        const last = chat.messages[chat.messages.length - 1];
        if (!last?.text) return;
        const timer = window.setTimeout(()=>{
            const frame = frameRef.current;
            if (frame?.isConnected) (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["followCollaboraEnd"])(frame);
        }, 900);
        return ()=>window.clearTimeout(timer);
    }, [
        chat.messages,
        chat.streaming,
        docReady,
        view
    ]);
    const editing = view === "editor";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].shell, "flex flex-col"),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "flex h-16 shrink-0 items-center gap-3 border-b border-[#E7EAF0] bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0b0b]/70",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: backHref,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnGhost, "shrink-0 gap-1.5 px-2.5"),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                className: "h-3.5 w-3.5"
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 430,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[14px]",
                                children: t("Back", void 0, void 0, "Back")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 431,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 429,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex min-w-0 items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#007AFF] shadow-[0_1px_2px_rgba(16,24,40,0.08),0_8px_20px_-10px_rgba(37,99,235,0.9)]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                    className: "h-4.5 w-4.5 text-white",
                                    strokeWidth: 1.8
                                }, void 0, false, {
                                    fileName: "[project]/components/studio/ai-studio.tsx",
                                    lineNumber: 436,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 435,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].h1, "truncate leading-tight"),
                                        children: template?.name ?? defaultTitle
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 439,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].meta, "truncate mt-0.5"),
                                        children: subtitle
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 442,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 438,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 434,
                        columnNumber: 9
                    }, this),
                    nav?.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segGroup, "ml-2 hidden md:inline-flex"),
                        children: nav.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: item.href,
                                className: item.active ? __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOn : __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOff,
                                children: item.label
                            }, item.href, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 447,
                                columnNumber: 31
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 446,
                        columnNumber: 25
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "ml-auto flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].chip, "hidden md:inline-flex"),
                                children: t("N blocks and materials", {
                                    blocks: String(blockCount),
                                    materials: String(chat.materials.length)
                                }, void 0, "{blocks} clauses · {materials} materials")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 453,
                                columnNumber: 11
                            }, this),
                            chat.lastSaved ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].chip, "hidden border-[#BBF7D0] bg-[#F6FEF9] text-[#16A34A] lg:inline-flex"),
                                title: chat.lastSaved,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                        className: "h-3 w-3"
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 460,
                                        columnNumber: 15
                                    }, this),
                                    t("Saved", void 0, void 0, "Saved")
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 459,
                                columnNumber: 30
                            }, this) : null,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segGroup,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>setView("editor"),
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOff, view === "editor" && __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOn),
                                        children: t("Editor view", void 0, void 0, "Editor")
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 467,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>setView("draft"),
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOff, view === "draft" && __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOn),
                                        children: t("Draft view", void 0, void 0, "Draft")
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 470,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 466,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: chat.reset,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnGhost, "hidden sm:inline-flex"),
                                title: t("Reset session", void 0, void 0, "Reset session"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__["RotateCcw"], {
                                        className: "h-3.5 w-3.5"
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 476,
                                        columnNumber: 13
                                    }, this),
                                    t("Reset session", void 0, void 0, "Reset session")
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 475,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>void chat.saveNow(),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnGhost, "hidden sm:inline-flex"),
                                title: t("Save to docs", void 0, void 0, "Save to My Documents"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                        className: "h-3.5 w-3.5"
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 480,
                                        columnNumber: 13
                                    }, this),
                                    t("Save", void 0, void 0, "Save")
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 479,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>isWide ? setDockOpen((v)=>!v) : setSheetOpen((v)=>!v),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnGhost, "px-2.5", (isWide ? dockOpen : sheetOpen) && "border-[#CFE3FF] bg-[#007AFF]/8 text-[#007AFF]"),
                                title: t("Toggle AI panel", void 0, void 0, "Toggle the AI panel"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__["MessageSquare"], {
                                        className: "h-4 w-4"
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 486,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "hidden md:inline",
                                        children: t("AI panel", void 0, void 0, "AI panel")
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 487,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 485,
                                columnNumber: 11
                            }, this),
                            chat.streaming ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].chip, "border-[#EAF4FF] bg-[#EAF4FF] text-[#007AFF]"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "h-3 w-3 animate-spin"
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 493,
                                        columnNumber: 15
                                    }, this),
                                    t("Generating", void 0, void 0, "Generating")
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 492,
                                columnNumber: 30
                            }, this) : chat.pendingChanges > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].chip, "border-[#FFF7ED] bg-[#FFF7ED] text-[#B45309]"),
                                children: t("N pending", {
                                    count: String(chat.pendingChanges)
                                }, void 0, "{count} pending")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 495,
                                columnNumber: 51
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 452,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/studio/ai-studio.tsx",
                lineNumber: 428,
                columnNumber: 7
            }, this),
            variants?.length && onVariantChange ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex shrink-0 flex-wrap items-center gap-3 border-b border-black/[0.06] bg-white/80 px-4 py-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0b0b]/70",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[13.5px] font-medium text-[#6E6E73] dark:text-slate-400",
                        children: t("Patent type", void 0, void 0, "Patent type")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 506,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segGroup, "flex-wrap"),
                        children: variants.map((v)=>{
                            const on = v.id === activeVariant;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>onVariantChange(v.id),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(on ? __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOn : __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].segOff, "px-4 py-1.5 text-[14px]"),
                                title: v.note,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: on ? "text-[#007AFF]" : undefined,
                                    children: v.label
                                }, void 0, false, {
                                    fileName: "[project]/components/studio/ai-studio.tsx",
                                    lineNumber: 513,
                                    columnNumber: 19
                                }, this)
                            }, v.id, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 512,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 509,
                        columnNumber: 11
                    }, this),
                    variants.find((v)=>v.id === activeVariant)?.note ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[13.5px] text-[#94A3B8]",
                        children: variants.find((v)=>v.id === activeVariant)?.note
                    }, void 0, false, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 517,
                        columnNumber: 64
                    }, this) : null,
                    template?.outputs?.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "ml-auto truncate font-mono text-[12.5px] text-[#94A3B8]",
                        children: template.outputs.join(" · ")
                    }, void 0, false, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 520,
                        columnNumber: 41
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/studio/ai-studio.tsx",
                lineNumber: 505,
                columnNumber: 47
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-h-0 flex-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "relative flex min-w-0 flex-1 bg-white dark:bg-[#0e0e0e]",
                        children: [
                            editorUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("iframe", {
                                ref: (el)=>{
                                    frameRef.current = el;
                                    // 握手 + 瘦身必须**趁早、且握手在前**：COOL 有两道门卫——没收到
                                    // Host_PostmessageReady 之前所有指令都丢弃（not ready），而 Hide_*
                                    // 只在 UI 组件建好之前设置标志位才生效（晚发只置标志不动已建好的
                                    // 菜单栏）。两个条件都只在加载初期成立，所以一挂上就连发几轮。
                                    if (el) {
                                        for (const d of [
                                            0,
                                            300,
                                            1000,
                                            2000
                                        ]){
                                            window.setTimeout(()=>{
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["announceHostReady"])(el);
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$collabora$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hideCollaboraChrome"])(el);
                                            }, d);
                                        }
                                    }
                                },
                                title: "document",
                                src: editorUrl,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("absolute inset-0 h-full w-full border-0", !editing && "pointer-events-none opacity-0"),
                                allow: "clipboard-read; clipboard-write; fullscreen"
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 528,
                                columnNumber: 25
                            }, this) : null,
                            !editing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$doc$2d$canvas$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DocCanvas"], {
                                draft: chat.draft,
                                selectedAnchor: selectedAnchor,
                                onSelectBlock: setSelectedAnchor,
                                pendingAnchors: pendingAnchors
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 549,
                                columnNumber: 24
                            }, this) : null,
                            (opening || waitSeconds !== null) && editing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "h-7 w-7 animate-spin text-[#007AFF]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 553,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-medium",
                                        children: waitSeconds === null ? t("Preparing editor", void 0, void 0, "Preparing the editor…") : t("Starting Collabora", void 0, void 0, "Starting the Collabora engine…")
                                    }, void 0, false, {
                                        fileName: "[project]/components/studio/ai-studio.tsx",
                                        lineNumber: 554,
                                        columnNumber: 15
                                    }, this),
                                    waitSeconds !== null ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "max-w-sm text-center text-xs leading-relaxed text-muted-foreground",
                                                children: t("Collabora wait hint", void 0, void 0, "First boot takes about a minute. It will open automatically once ready.")
                                            }, void 0, false, {
                                                fileName: "[project]/components/studio/ai-studio.tsx",
                                                lineNumber: 558,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>{
                                                    cancelRef.current = true;
                                                },
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$visual$2d$spec$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["vp"].btnGhost,
                                                children: t("Cancel wait", void 0, void 0, "Cancel")
                                            }, void 0, false, {
                                                fileName: "[project]/components/studio/ai-studio.tsx",
                                                lineNumber: 561,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 552,
                                columnNumber: 60
                            }, this) : null,
                            engineHint && editing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 px-6",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mx-auto max-w-md rounded-xl border border-[#FED7AA] bg-[#FFFBEB] px-4 py-3 text-center text-xs leading-relaxed text-[#B45309] shadow-lg",
                                    children: engineHint
                                }, void 0, false, {
                                    fileName: "[project]/components/studio/ai-studio.tsx",
                                    lineNumber: 570,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 569,
                                columnNumber: 37
                            }, this) : null,
                            engineError && editing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-x-0 bottom-0 z-20 border-t border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-xs text-[#B91C1C]",
                                children: t("Engine error", {
                                    reason: engineError
                                }, void 0, "The editor engine could not be opened: {reason}")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 575,
                                columnNumber: 38
                            }, this) : null,
                            editing && editorUrl && !opening ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[12.5px] text-white/90",
                                children: t("Editor save hint", void 0, void 0, "The AI writes straight into this document — no reloads. Press Ctrl+S so the AI can pick up your edits.")
                            }, void 0, false, {
                                fileName: "[project]/components/studio/ai-studio.tsx",
                                lineNumber: 581,
                                columnNumber: 48
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 526,
                        columnNumber: 9
                    }, this),
                    isWide ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$agent$2d$panel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AgentPanel"], {
                        messages: chat.messages,
                        materials: chat.materials,
                        template: chat.template,
                        streaming: chat.streaming,
                        blocked: chat.blocked,
                        sessionReady: !!chat.sessionId && !injecting,
                        modelLabel: modelLabel,
                        lastSaved: chat.lastSaved,
                        initialPrompt: seedPromptFor(template),
                        onSend: (text, options)=>void sendInstruction(text, options),
                        onStop: chat.stop,
                        onUpload: chat.upload,
                        onUploadTemplate: (file)=>chat.uploadTemplate(file),
                        onRemoveTemplate: ()=>void chat.removeTemplate(),
                        onRemoveMaterial: (name)=>void chat.removeMaterial(name),
                        onAcceptChange: (key)=>void chat.acceptChange(key),
                        onRejectChange: chat.rejectChange,
                        onAcceptAll: ()=>void chat.acceptAll(),
                        onSave: ()=>void chat.saveNow(),
                        panelWidth: panelWidth,
                        className: dockOpen ? "flex" : "hidden"
                    }, void 0, false, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 587,
                        columnNumber: 18
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/studio/ai-studio.tsx",
                lineNumber: 525,
                columnNumber: 7
            }, this),
            !isWide && sheetOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-40 flex justify-end",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        "aria-hidden": "true",
                        tabIndex: -1,
                        className: "absolute inset-0 cursor-default bg-black/25 backdrop-blur-[2px]",
                        onClick: ()=>setSheetOpen(false)
                    }, void 0, false, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 592,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$agent$2d$panel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AgentPanel"], {
                        messages: chat.messages,
                        materials: chat.materials,
                        template: chat.template,
                        streaming: chat.streaming,
                        blocked: chat.blocked,
                        sessionReady: !!chat.sessionId && !injecting,
                        modelLabel: modelLabel,
                        lastSaved: chat.lastSaved,
                        initialPrompt: seedPromptFor(template),
                        onSend: (text, options)=>void sendInstruction(text, options),
                        onStop: chat.stop,
                        onUpload: chat.upload,
                        onUploadTemplate: (file)=>chat.uploadTemplate(file),
                        onRemoveTemplate: ()=>void chat.removeTemplate(),
                        onRemoveMaterial: (name)=>void chat.removeMaterial(name),
                        onAcceptChange: (key)=>void chat.acceptChange(key),
                        onRejectChange: chat.rejectChange,
                        onAcceptAll: ()=>void chat.acceptAll(),
                        onSave: ()=>void chat.saveNow(),
                        className: "relative z-10 flex h-full w-[min(26rem,88vw)] shadow-[-24px_0_60px_-24px_rgba(0,0,0,0.35)]"
                    }, void 0, false, {
                        fileName: "[project]/components/studio/ai-studio.tsx",
                        lineNumber: 593,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/studio/ai-studio.tsx",
                lineNumber: 591,
                columnNumber: 32
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/studio/ai-studio.tsx",
        lineNumber: 427,
        columnNumber: 13
    }, this);
}
/**
 * 模板的起手话术：把「写什么、按什么结构、最后交哪几个文件」先说清楚，省一轮来回。
 * 交底书三种类型的字段清单不同，这句话跟着变体走（切换类型即换会话线）。
 */ function seedPromptFor(template) {
    if (!template) return "";
    const parts = [
        `按「${template.name}」起草。成文结构：${template.outline}。`
    ];
    if (template.outputs?.length) parts.push(`最终产出：${template.outputs.join("、")}。`);
    if (template.note) parts.push(`${template.note}。`);
    parts.push("先告诉我需要哪些材料。");
    return parts.join("");
}
}),
"[project]/public/patent/templates.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v([{"id":"disclosure","name":"专利交底书","description":"从材料挖专利点 → 轻量查新 → 按国知局口径成文，产出 Markdown + Word。","kind":"disclosure","skillEntry":"skills/patent-disclosure","outputs":["交底书.md","交底书.docx","查新与区别定位.md"],"fields":[{"key":"title","label":"发明名称","hint":"主题 + 类型，避免商标与夸大用词","required":true},{"key":"field","label":"技术领域","hint":"本发明所属的技术领域","required":true},{"key":"background","label":"背景技术","hint":"现有技术方案及其出处","required":true},{"key":"defect","label":"现有技术缺陷","hint":"逐条列问题，不要空喊创新性强","required":true},{"key":"purpose","label":"发明目的","hint":"要解决的技术问题","required":true},{"key":"solution","label":"技术方案","hint":"必要技术特征 + 从属特征","required":true,"inferred":true},{"key":"effects","label":"有益效果","hint":"与缺陷一一对应","required":true},{"key":"embodiments","label":"实施例","hint":"至少一个可实施的具体方案","required":true},{"key":"figures","label":"附图说明","hint":"框图 / 结构图 / 流程图编号与说明","inferred":true},{"key":"alternatives","label":"替代方案","hint":"扩展保护范围用","inferred":true},{"key":"uncertain","label":"待确认清单","hint":"未披露部件只写这里，不进权要","inferred":true}],"variants":[{"id":"invention","name":"发明","note":"方法 / 系统 / 工艺类方案，默认主路径","skillEntry":"skills/patent-disclosure/prompts/invention","outputs":["交底书.md","交底书.docx","查新与区别定位.md"],"fields":[{"key":"title","label":"发明名称","hint":"主题 + 类型，避免商标与夸大用词","required":true},{"key":"field","label":"技术领域","hint":"本发明所属的技术领域","required":true},{"key":"background","label":"背景技术","hint":"现有技术方案及其出处","required":true},{"key":"defect","label":"现有技术缺陷","hint":"逐条列问题，不要空喊创新性强","required":true},{"key":"purpose","label":"发明目的","hint":"要解决的技术问题","required":true},{"key":"solution","label":"技术方案","hint":"必要技术特征 + 从属特征","required":true,"inferred":true},{"key":"effects","label":"有益效果","hint":"与缺陷一一对应","required":true},{"key":"embodiments","label":"实施例","hint":"至少一个可实施的具体方案","required":true},{"key":"figures","label":"附图说明","hint":"框图 / 结构图 / 流程图编号与说明","inferred":true},{"key":"alternatives","label":"替代方案","hint":"扩展保护范围用","inferred":true},{"key":"uncertain","label":"待确认清单","hint":"未披露部件只写这里，不进权要","inferred":true}],"nameEn":"Invention","noteEn":"Method / system / process — the default path."},{"id":"utility","name":"实用新型","note":"结构类方案，产出件号表与结构图","skillEntry":"skills/patent-disclosure/prompts/utility_model","outputs":["交底书.md","交底书.docx","structure_schema.json","figure_plan.yaml"],"fields":[{"key":"title","label":"实用新型名称","required":true},{"key":"field","label":"技术领域","required":true},{"key":"parts","label":"部件清单","hint":"件号由脚本统一分配，禁止自创","required":true},{"key":"structure","label":"连接关系","hint":"部件之间的位置与连接","required":true},{"key":"effect","label":"有益效果","required":true},{"key":"figures","label":"结构图清单","hint":"每个部件至少出现在一张图中","required":true}],"nameEn":"Utility Model","noteEn":"Structural solution: parts list and structure figures."},{"id":"design","name":"外观设计","note":"视觉类方案，产出视图清单与线稿","skillEntry":"skills/patent-disclosure/prompts/design","outputs":["交底书.md","交底书.docx","appearance_schema.json","视图线稿"],"fields":[{"key":"title","label":"外观设计名称","required":true},{"key":"product","label":"产品用途","required":true},{"key":"designPoints","label":"设计要点","hint":"形状 / 图案 / 色彩及其结合","required":true},{"key":"views","label":"视图清单","hint":"主视图 / 后视图 / 立体图等","required":true},{"key":"omitted","label":"省略视图说明","inferred":true}],"nameEn":"Design","noteEn":"Visual solution: view list and line drawings."}],"nameEn":"Patent Disclosure","descriptionEn":"Mine the invention from your materials, run a light prior-art check, and draft to CNIPA practice — Markdown + Word."},{"id":"application-four","name":"申请文件四件套","description":"已有交底 → 权利要求书 / 说明书 / 摘要 / 附图。须指定交底目录。","kind":"application","skillEntry":"skills/patent-application","outputs":["权利要求书.md","说明书.md","摘要.md","附图.docx"],"fields":[{"key":"disclosureDir","label":"交底目录","hint":"须为已定稿交底（含 schema）","required":true},{"key":"claimStrategy","label":"权要布局","hint":"独权必要特征 + 从属阶梯","required":true},{"key":"supportCheck","label":"支持性自查","hint":"权要特征需在说明书有支撑"}],"nameEn":"Application Four-Piece Set","descriptionEn":"From a settled disclosure: description, claims, abstract and figures."},{"id":"office-action","name":"审查意见答复","description":"对照审查意见逐条答复，草稿确认后出陈述正文 Word。","kind":"office-action","skillEntry":"skills/patent-oa","outputs":["答复草稿.md","意见陈述.docx"],"fields":[{"key":"notice","label":"审查意见通知","required":true},{"key":"claims","label":"当前权要","required":true},{"key":"amendments","label":"修改方案","hint":"修改后的权要与修改依据","required":true},{"key":"arguments","label":"创造性说理","hint":"区别特征 + 技术效果"}],"nameEn":"Office Action Reply","descriptionEn":"Reply to each examiner objection, then export the statement as a Word file."}]);}),
"[project]/utils/patent/templates.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/components/patent/patent-studio.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PatentStudio",
    ()=>PatentStudio
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * AI 专利撰写室（核心）——薄壳。
 *
 * 全部机制在 `components/studio/ai-studio.tsx`（专利与公文写作共用的工作台：
 * 打开即 Collabora、AI 零刷新写进活文档、发指令前先落盘回读）。这里只负责
 * 专利栏目自己的三件事：模板解析（含交底书的类型切换）、栏目顶栏、页面文案。
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next-intl@4.7.0_next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19._ad6175bb892ccee3b398db7087b15c16/node_modules/next-intl/dist/esm/development/react-client/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$use$2d$intl$40$4$2e$7$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$use$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/use-intl@4.7.0_react@19.2.3/node_modules/use-intl/dist/esm/development/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.562.0_react@19.2.3/node_modules/lucide-react/dist/esm/icons/scale.js [app-ssr] (ecmascript) <export default as Scale>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$ai$2d$studio$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/studio/ai-studio.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/patent/templates.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
/**
 * 把模板解析成工作台要的形状。
 *
 * 必须**在首次渲染**就拿到：它决定会话用哪个技能包（patent-disclosure /
 * patent-application …）与哪条会话线，晚一步就会用错技能建出会话来。所以走
 * `useSearchParams`（路由页包了 Suspense 边界）。
 *
 * 交底书一个入口带三种类型（`?variant=utility`），字段清单与产出契约按类型取，
 * 技能名仍取 skillEntry 的第二段（三种类型同技能，本来就是一条链路）。
 */ function toStudioTemplate(tpl, variant, isZh) {
    const fields = variant?.fields ?? tpl.fields;
    const loc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["localizeTemplate"])(tpl, isZh);
    const vloc = variant ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["localizeVariant"])(variant, isZh) : null;
    return {
        id: tpl.id,
        // 界面显示用本地化名；sessionTitle 走英文——它会成为落盘 docx 的文件名，
        // 切到英文界面时不该在 Collabora 里开出一份中文文件名的文档
        name: vloc ? `${loc.name}·${vloc.name}` : loc.name,
        sessionTitle: vloc ? `${loc.name} - ${vloc.name}` : loc.name,
        skill: (variant?.skillEntry || tpl.skillEntry || "").split("/")[1] || "patent-disclosure",
        outline: fields.map((f)=>f.label).join("、"),
        /** 产出契约写进上下文：agent 按它决定最后落哪几个文件 */ outputs: variant?.outputs ?? tpl.outputs,
        /** 类型备注（"结构类方案，产出件号表与结构图"）——让 agent 知道这类长什么样 */ note: variant?.note
    };
}
function PatentStudio() {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$2d$intl$40$4$2e$7$2e$0_next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$_ad6175bb892ccee3b398db7087b15c16$2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2d$client$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslations"])();
    const locale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$use$2d$intl$40$4$2e$7$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$use$2d$intl$2f$dist$2f$esm$2f$development$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useLocale"])();
    const isZh = locale.toLowerCase().startsWith("zh");
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    /** 从栏目页点进来的模板（决定技能包与会话线与起手话术） */ const templateId = searchParams.get("template") || "";
    /** 交底书的专利类型（invention / utility / design），默认发明 */ const variantId = searchParams.get("variant") || "";
    const tpl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPatentTemplate"])(templateId), [
        templateId
    ]);
    const variants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getTemplateVariants"])(tpl), [
        tpl
    ]);
    const variant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resolveVariant"])(tpl, variantId), [
        tpl,
        variantId
    ]);
    const template = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>tpl ? toStudioTemplate(tpl, variant, isZh) : null, [
        isZh,
        tpl,
        variant
    ]);
    /** 换类型 = 换一条会话线（成文结构不同，别让实用新型的稿子串到外观设计里） */ const switchVariant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((id)=>{
        const params = new URLSearchParams(searchParams.toString());
        params.set("variant", id);
        router.replace(`?${params.toString()}`);
    }, [
        router,
        searchParams
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$studio$2f$ai$2d$studio$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AiStudio"], {
        skill: template?.skill ?? "patent-disclosure",
        title: template?.name ?? t("Patent disclosure", void 0, void 0, "Patent disclosure"),
        persistKey: `patent:studio:${template?.id ?? "default"}${variant ? `:${variant.id}` : ""}`,
        template: template,
        variants: variants.map((v)=>({
                id: v.id,
                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["localizeVariant"])(v, isZh).name,
                note: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$patent$2f$templates$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["localizeVariant"])(v, isZh).note
            })),
        activeVariant: variant?.id,
        onVariantChange: switchVariant,
        pageTitle: t("AI Patent Studio", void 0, void 0, "AI Patent Studio"),
        defaultTitle: t("Patent disclosure", void 0, void 0, "Patent disclosure"),
        subtitle: t("Studio subtitle", void 0, void 0, "Mine, search and draft — the patent skill drives every stage."),
        backHref: "/patent",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$2$2e$3$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__["Scale"],
        panelWidth: "w-[32rem]",
        nav: [
            {
                href: "/patent/studio",
                label: t("Patent Studio", void 0, void 0, "Patent Studio"),
                active: true
            },
            {
                href: "/patent/application",
                label: t("Application Four-Piece", void 0, void 0, "Application Four-Piece Set"),
                active: false
            }
        ]
    }, void 0, false, {
        fileName: "[project]/components/patent/patent-studio.tsx",
        lineNumber: 71,
        columnNumber: 13
    }, this);
}
}),
];

//# sourceMappingURL=_deff46f6._.js.map