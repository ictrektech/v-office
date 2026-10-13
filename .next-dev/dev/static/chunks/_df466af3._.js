(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/utils/editor/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AscSaveTypes",
    ()=>AscSaveTypes,
    "AvsFileType",
    ()=>AvsFileType,
    "DocumentType",
    ()=>DocumentType
]);
var AscSaveTypes = /*#__PURE__*/ function(AscSaveTypes) {
    AscSaveTypes[AscSaveTypes["PartStart"] = 0] = "PartStart";
    AscSaveTypes[AscSaveTypes["Part"] = 1] = "Part";
    AscSaveTypes[AscSaveTypes["Complete"] = 2] = "Complete";
    AscSaveTypes[AscSaveTypes["CompleteAll"] = 3] = "CompleteAll";
    return AscSaveTypes;
}({});
var DocumentType = /*#__PURE__*/ function(DocumentType) {
    DocumentType["Word"] = "word";
    DocumentType["Cell"] = "cell";
    DocumentType["Slide"] = "slide";
    DocumentType["Draw"] = "draw";
    DocumentType["Pdf"] = "pdf";
    return DocumentType;
}({});
var AvsFileType = /*#__PURE__*/ function(AvsFileType) {
    AvsFileType[AvsFileType["AVS_FILE_UNKNOWN"] = 0] = "AVS_FILE_UNKNOWN";
    // Document
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT"] = 64] = "AVS_FILE_DOCUMENT";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_DOCX"] = 65] = "AVS_FILE_DOCUMENT_DOCX";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_DOC"] = 66] = "AVS_FILE_DOCUMENT_DOC";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_ODT"] = 67] = "AVS_FILE_DOCUMENT_ODT";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_RTF"] = 68] = "AVS_FILE_DOCUMENT_RTF";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_TXT"] = 69] = "AVS_FILE_DOCUMENT_TXT";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_HTML"] = 70] = "AVS_FILE_DOCUMENT_HTML";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_MHT"] = 71] = "AVS_FILE_DOCUMENT_MHT";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_EPUB"] = 72] = "AVS_FILE_DOCUMENT_EPUB";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_FB2"] = 73] = "AVS_FILE_DOCUMENT_FB2";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_MOBI"] = 74] = "AVS_FILE_DOCUMENT_MOBI";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_DOCM"] = 75] = "AVS_FILE_DOCUMENT_DOCM";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_DOTX"] = 76] = "AVS_FILE_DOCUMENT_DOTX";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_DOTM"] = 77] = "AVS_FILE_DOCUMENT_DOTM";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_ODT_FLAT"] = 78] = "AVS_FILE_DOCUMENT_ODT_FLAT";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_OTT"] = 79] = "AVS_FILE_DOCUMENT_OTT";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_DOC_FLAT"] = 80] = "AVS_FILE_DOCUMENT_DOC_FLAT";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_DOCX_FLAT"] = 81] = "AVS_FILE_DOCUMENT_DOCX_FLAT";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_HTML_IN_CONTAINER"] = 82] = "AVS_FILE_DOCUMENT_HTML_IN_CONTAINER";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_DOCX_PACKAGE"] = 84] = "AVS_FILE_DOCUMENT_DOCX_PACKAGE";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_OFORM"] = 85] = "AVS_FILE_DOCUMENT_OFORM";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_DOCXF"] = 86] = "AVS_FILE_DOCUMENT_DOCXF";
    AvsFileType[AvsFileType["AVS_FILE_DOCUMENT_OFORM_PDF"] = 87] = "AVS_FILE_DOCUMENT_OFORM_PDF";
    // Presentation
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION"] = 128] = "AVS_FILE_PRESENTATION";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_PPTX"] = 129] = "AVS_FILE_PRESENTATION_PPTX";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_PPT"] = 130] = "AVS_FILE_PRESENTATION_PPT";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_ODP"] = 131] = "AVS_FILE_PRESENTATION_ODP";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_PPSX"] = 132] = "AVS_FILE_PRESENTATION_PPSX";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_PPTM"] = 133] = "AVS_FILE_PRESENTATION_PPTM";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_PPSM"] = 134] = "AVS_FILE_PRESENTATION_PPSM";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_POTX"] = 135] = "AVS_FILE_PRESENTATION_POTX";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_POTM"] = 136] = "AVS_FILE_PRESENTATION_POTM";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_ODP_FLAT"] = 137] = "AVS_FILE_PRESENTATION_ODP_FLAT";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_OTP"] = 138] = "AVS_FILE_PRESENTATION_OTP";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_PPTX_PACKAGE"] = 139] = "AVS_FILE_PRESENTATION_PPTX_PACKAGE";
    AvsFileType[AvsFileType["AVS_FILE_PRESENTATION_ODG"] = 140] = "AVS_FILE_PRESENTATION_ODG";
    // Spreadsheet
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET"] = 256] = "AVS_FILE_SPREADSHEET";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_XLSX"] = 257] = "AVS_FILE_SPREADSHEET_XLSX";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_XLS"] = 258] = "AVS_FILE_SPREADSHEET_XLS";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_ODS"] = 259] = "AVS_FILE_SPREADSHEET_ODS";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_CSV"] = 260] = "AVS_FILE_SPREADSHEET_CSV";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_XLSM"] = 261] = "AVS_FILE_SPREADSHEET_XLSM";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_XLTX"] = 262] = "AVS_FILE_SPREADSHEET_XLTX";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_XLTM"] = 263] = "AVS_FILE_SPREADSHEET_XLTM";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_XLSB"] = 264] = "AVS_FILE_SPREADSHEET_XLSB";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_ODS_FLAT"] = 265] = "AVS_FILE_SPREADSHEET_ODS_FLAT";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_OTS"] = 266] = "AVS_FILE_SPREADSHEET_OTS";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_XLSX_FLAT"] = 267] = "AVS_FILE_SPREADSHEET_XLSX_FLAT";
    AvsFileType[AvsFileType["AVS_FILE_SPREADSHEET_XLSX_PACKAGE"] = 268] = "AVS_FILE_SPREADSHEET_XLSX_PACKAGE";
    // Crossplatform
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM"] = 512] = "AVS_FILE_CROSSPLATFORM";
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM_PDF"] = 513] = "AVS_FILE_CROSSPLATFORM_PDF";
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM_SWF"] = 514] = "AVS_FILE_CROSSPLATFORM_SWF";
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM_DJVU"] = 515] = "AVS_FILE_CROSSPLATFORM_DJVU";
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM_XPS"] = 516] = "AVS_FILE_CROSSPLATFORM_XPS";
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM_SVG"] = 517] = "AVS_FILE_CROSSPLATFORM_SVG";
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM_HTMLR"] = 518] = "AVS_FILE_CROSSPLATFORM_HTMLR";
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM_HTMLR_MENU"] = 519] = "AVS_FILE_CROSSPLATFORM_HTMLR_MENU";
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM_HTMLR_CANVAS"] = 520] = "AVS_FILE_CROSSPLATFORM_HTMLR_CANVAS";
    AvsFileType[AvsFileType["AVS_FILE_CROSSPLATFORM_PDFA"] = 521] = "AVS_FILE_CROSSPLATFORM_PDFA";
    // Image
    AvsFileType[AvsFileType["AVS_FILE_IMAGE"] = 1024] = "AVS_FILE_IMAGE";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_JPG"] = 1025] = "AVS_FILE_IMAGE_JPG";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_TIFF"] = 1026] = "AVS_FILE_IMAGE_TIFF";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_TGA"] = 1027] = "AVS_FILE_IMAGE_TGA";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_GIF"] = 1028] = "AVS_FILE_IMAGE_GIF";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_PNG"] = 1029] = "AVS_FILE_IMAGE_PNG";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_EMF"] = 1030] = "AVS_FILE_IMAGE_EMF";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_WMF"] = 1031] = "AVS_FILE_IMAGE_WMF";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_BMP"] = 1032] = "AVS_FILE_IMAGE_BMP";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_CR2"] = 1033] = "AVS_FILE_IMAGE_CR2";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_PCX"] = 1034] = "AVS_FILE_IMAGE_PCX";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_RAS"] = 1035] = "AVS_FILE_IMAGE_RAS";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_PSD"] = 1036] = "AVS_FILE_IMAGE_PSD";
    AvsFileType[AvsFileType["AVS_FILE_IMAGE_ICO"] = 1037] = "AVS_FILE_IMAGE_ICO";
    // Other
    AvsFileType[AvsFileType["AVS_FILE_OTHER"] = 2048] = "AVS_FILE_OTHER";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_EXTRACT_IMAGE"] = 2049] = "AVS_FILE_OTHER_EXTRACT_IMAGE";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_MS_OFFCRYPTO"] = 2050] = "AVS_FILE_OTHER_MS_OFFCRYPTO";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_HTMLZIP"] = 2051] = "AVS_FILE_OTHER_HTMLZIP";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_OLD_DOCUMENT"] = 2052] = "AVS_FILE_OTHER_OLD_DOCUMENT";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_OLD_PRESENTATION"] = 2053] = "AVS_FILE_OTHER_OLD_PRESENTATION";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_OLD_DRAWING"] = 2054] = "AVS_FILE_OTHER_OLD_DRAWING";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_OOXML"] = 2055] = "AVS_FILE_OTHER_OOXML";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_JSON"] = 2056] = "AVS_FILE_OTHER_JSON";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_ODF"] = 2058] = "AVS_FILE_OTHER_ODF";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_MS_MITCRYPTO"] = 2059] = "AVS_FILE_OTHER_MS_MITCRYPTO";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_MS_VBAPROJECT"] = 2060] = "AVS_FILE_OTHER_MS_VBAPROJECT";
    AvsFileType[AvsFileType["AVS_FILE_OTHER_PACKAGE_IN_OLE"] = 2061] = "AVS_FILE_OTHER_PACKAGE_IN_OLE";
    // Teamlab
    AvsFileType[AvsFileType["AVS_FILE_TEAMLAB"] = 4096] = "AVS_FILE_TEAMLAB";
    AvsFileType[AvsFileType["AVS_FILE_TEAMLAB_DOCY"] = 4097] = "AVS_FILE_TEAMLAB_DOCY";
    AvsFileType[AvsFileType["AVS_FILE_TEAMLAB_XLSY"] = 4098] = "AVS_FILE_TEAMLAB_XLSY";
    AvsFileType[AvsFileType["AVS_FILE_TEAMLAB_PPTY"] = 4099] = "AVS_FILE_TEAMLAB_PPTY";
    // Canvas
    AvsFileType[AvsFileType["AVS_FILE_CANVAS"] = 8192] = "AVS_FILE_CANVAS";
    AvsFileType[AvsFileType["AVS_FILE_CANVAS_WORD"] = 8193] = "AVS_FILE_CANVAS_WORD";
    AvsFileType[AvsFileType["AVS_FILE_CANVAS_SPREADSHEET"] = 8194] = "AVS_FILE_CANVAS_SPREADSHEET";
    AvsFileType[AvsFileType["AVS_FILE_CANVAS_PRESENTATION"] = 8195] = "AVS_FILE_CANVAS_PRESENTATION";
    AvsFileType[AvsFileType["AVS_FILE_CANVAS_PDF"] = 8196] = "AVS_FILE_CANVAS_PDF";
    // Draw
    AvsFileType[AvsFileType["AVS_FILE_DRAW"] = 16384] = "AVS_FILE_DRAW";
    AvsFileType[AvsFileType["AVS_FILE_DRAW_VSDX"] = 16385] = "AVS_FILE_DRAW_VSDX";
    AvsFileType[AvsFileType["AVS_FILE_DRAW_VSSX"] = 16386] = "AVS_FILE_DRAW_VSSX";
    AvsFileType[AvsFileType["AVS_FILE_DRAW_VSTX"] = 16387] = "AVS_FILE_DRAW_VSTX";
    AvsFileType[AvsFileType["AVS_FILE_DRAW_VSDM"] = 16388] = "AVS_FILE_DRAW_VSDM";
    AvsFileType[AvsFileType["AVS_FILE_DRAW_VSSM"] = 16389] = "AVS_FILE_DRAW_VSSM";
    AvsFileType[AvsFileType["AVS_FILE_DRAW_VSTM"] = 16390] = "AVS_FILE_DRAW_VSTM";
    return AvsFileType;
}({});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/editor/x2t.worker.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/// <reference lib="webworker" />
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/editor/types.ts [app-client] (ecmascript)");
;
/**
 * X2T Converter Web Worker
 *
 * This worker handles CPU-intensive document conversion operations
 * off the main thread to prevent UI blocking.
 */ /* eslint-disable no-restricted-globals */ // Blob URL workers cannot derive the application's deployment prefix from
// their own URL. Next.js substitutes NEXT_PUBLIC_BASE_PATH at build time so
// VOS sub-path builds load x2t.js/wasm from the application rather than the
// portal root; standalone builds keep the upstream root path.
const BASE_URL = self.location.origin + (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_BASE_PATH ?? "") + "/x2t-1/";
// const BASE_URL = self.location.origin + "/wasm/x2t/";
let x2t = null;
let initPromise = null;
/**
 * Initialize x2t module in Worker context
 */ async function initX2t() {
    if (x2t) return;
    // self.wasmBinaryFile = BASE_URL + "x2t.wasm";
    const scriptUrl = BASE_URL + "x2t.js";
    // fix .wasm loading
    Object.assign(self, {
        __filename: BASE_URL
    });
    // Load x2t script in Worker context
    importScripts(scriptUrl);
    x2t = self.Module;
    // Wait for WASM runtime initialization
    await new Promise((resolve)=>{
        x2t.onRuntimeInitialized = ()=>resolve();
    });
    // Create working directories
    try {
        x2t.FS.mkdir("/working");
        x2t.FS.mkdir("/working/media");
        x2t.FS.mkdir("/working/fonts");
        x2t.FS.mkdir("/working/themes");
    } catch (err) {
        // Directories may already exist
        console.error("[x2t.worker] mkdir error:", err);
    }
}
/**
 * Ensure x2t is initialized before conversion
 */ async function ensureInit() {
    if (!initPromise) {
        initPromise = initX2t();
    }
    return initPromise;
}
// 刻意**不**在 worker 创建时自动初始化。
//
// x2t 的 wasm 解压后 62.6MB（首次传输 9.66MB），一创建 worker 就拉，会把
// "打开 PDF""用 Collabora 打开"这些根本不需要转换的场景也一起拖下水——它们
// 既用不到 x2t，却要付下载 + 编译的钱。改为第一次真正收到 convert 消息时再
// 初始化（见下面 case "convert" 里的 ensureInit()）。
//
// 需要"提前预热"的路径可以显式调 converter.init()，但必须在**主页面上下文**里做：
// 编辑器页是客户端路由过去的同一个 JS 上下文，模块单例被复用，那次初始化才不白做。
/**
 * Clean up temporary files after conversion
 */ function cleanupFiles(files) {
    for (const file of files){
        try {
            x2t.FS.unlink(file);
        } catch (err) {
            console.error(err);
        }
    }
    cleanMedia();
}
function cleanMedia() {
    try {
        const mediaFiles = x2t.FS.readdir("/working/media/");
        for (const file of mediaFiles){
            if (file !== "." && file !== "..") {
                x2t.FS.unlink("/working/media/" + file);
            }
        }
    } catch (err) {
        console.error(err);
    }
}
/**
 * Read media files from the working directory
 */ function readMedia() {
    const media = {};
    try {
        const files = x2t.FS.readdir("/working/media/");
        for (const file of files){
            if (file !== "." && file !== "..") {
                const fileData = x2t.FS.readFile("/working/media/" + file, {
                    encoding: "binary"
                });
                media[file] = fileData;
            }
        }
    } catch (e) {
        console.error(e);
    }
    return media;
}
const xmlPath = "/working/params.xml";
function writeInputs({ fileFrom, fileTo, formatFrom, formatTo, data, media }) {
    const params = {
        m_sFileFrom: fileFrom,
        m_sThemeDir: "/working/themes",
        m_sFileTo: fileTo,
        m_nFormatFrom: formatFrom,
        m_nFormatTo: formatTo,
        m_bIsPDFA: formatTo === __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvsFileType"].AVS_FILE_CROSSPLATFORM_PDFA,
        m_bIsNoBase64: false,
        m_sFontDir: "/working/fonts/"
    };
    const content = Object.entries(params).filter(([, v])=>v).reduce((a, [k, v])=>a + `<${k}>${v}</${k}>\n`, "");
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<TaskQueueDataConvert
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
>
${content}
</TaskQueueDataConvert>`;
    x2t.FS.writeFile(xmlPath, xml);
    if (data) {
        x2t.FS.writeFile(fileFrom, new Uint8Array(data));
    }
    if (media) {
        cleanMedia();
        for (const [key, value] of Object.entries(media)){
            try {
                x2t.FS.writeFile("/working/" + key, value);
            } catch (err) {
                console.error(key, err);
            }
        }
    }
}
/**
 * Convert document from one format to another
 */ async function convert({ data, fileFrom, fileTo, formatFrom, formatTo, media }) {
    const fromPath = "/working/" + fileFrom;
    const toPath = "/working/" + fileTo;
    const files = [
        fromPath,
        toPath,
        xmlPath
    ];
    writeInputs({
        fileFrom: fromPath,
        fileTo: toPath,
        formatFrom,
        formatTo,
        data,
        media
    });
    if (fileFrom.endsWith(".doc") || formatFrom == __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$editor$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvsFileType"].AVS_FILE_DOCUMENT_DOC) {
        const viaPath = fromPath + ".docx";
        writeInputs({
            fileFrom: fromPath,
            fileTo: viaPath,
            data: null
        });
        x2t.ccall("main1", [
            "number"
        ], [
            "string"
        ], [
            xmlPath
        ]);
        writeInputs({
            fileFrom: viaPath,
            fileTo: toPath,
            data: null
        });
        files.push(viaPath);
    }
    try {
        const pathInfo = x2t.FS.analyzePath(toPath);
        if (pathInfo.exists) {
            x2t.FS.unlink(toPath);
        }
    } catch (err) {}
    try {
        x2t.ccall("main1", [
            "number"
        ], [
            "string"
        ], [
            xmlPath
        ]);
    } catch (e) {
        console.error("ccall", e);
    }
    // Read output file
    let output = null;
    try {
        output = x2t.FS.readFile(toPath);
    } catch (e) {
        console.error(e);
    }
    // Read media files
    const outputMedia = readMedia();
    // Cleanup temporary files
    setTimeout(()=>{
        cleanupFiles(files);
    });
    return {
        output,
        media: outputMedia
    };
}
/**
 * Handle incoming messages from main thread
 */ self.onmessage = async (event)=>{
    const { id, type, payload } = event.data;
    try {
        switch(type){
            case "convert":
                {
                    // Ensure x2t is initialized before conversion
                    await ensureInit();
                    const result = await convert(payload);
                    // Use Transferable objects for zero-copy transfer
                    const transferables = [];
                    if (result.output) {
                        transferables.push(result.output.buffer);
                    }
                    Object.values(result.media).forEach((m)=>transferables.push(m.buffer));
                    self.postMessage({
                        id,
                        type: "convert:done",
                        payload: result
                    }, {
                        transfer: transferables
                    });
                    break;
                }
            default:
                self.postMessage({
                    id,
                    type: "error",
                    error: `Unknown message type: ${type}`
                });
        }
    } catch (error) {
        self.postMessage({
            id,
            type: "error",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
// Signal that worker is ready
self.postMessage({
    type: "ready"
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/compiled/process/browser.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

(function() {
    var e = {
        229: function(e) {
            var t = e.exports = {};
            var r;
            var n;
            function defaultSetTimout() {
                throw new Error("setTimeout has not been defined");
            }
            function defaultClearTimeout() {
                throw new Error("clearTimeout has not been defined");
            }
            (function() {
                try {
                    if (typeof setTimeout === "function") {
                        r = setTimeout;
                    } else {
                        r = defaultSetTimout;
                    }
                } catch (e) {
                    r = defaultSetTimout;
                }
                try {
                    if (typeof clearTimeout === "function") {
                        n = clearTimeout;
                    } else {
                        n = defaultClearTimeout;
                    }
                } catch (e) {
                    n = defaultClearTimeout;
                }
            })();
            function runTimeout(e) {
                if (r === setTimeout) {
                    return setTimeout(e, 0);
                }
                if ((r === defaultSetTimout || !r) && setTimeout) {
                    r = setTimeout;
                    return setTimeout(e, 0);
                }
                try {
                    return r(e, 0);
                } catch (t) {
                    try {
                        return r.call(null, e, 0);
                    } catch (t) {
                        return r.call(this, e, 0);
                    }
                }
            }
            function runClearTimeout(e) {
                if (n === clearTimeout) {
                    return clearTimeout(e);
                }
                if ((n === defaultClearTimeout || !n) && clearTimeout) {
                    n = clearTimeout;
                    return clearTimeout(e);
                }
                try {
                    return n(e);
                } catch (t) {
                    try {
                        return n.call(null, e);
                    } catch (t) {
                        return n.call(this, e);
                    }
                }
            }
            var i = [];
            var o = false;
            var u;
            var a = -1;
            function cleanUpNextTick() {
                if (!o || !u) {
                    return;
                }
                o = false;
                if (u.length) {
                    i = u.concat(i);
                } else {
                    a = -1;
                }
                if (i.length) {
                    drainQueue();
                }
            }
            function drainQueue() {
                if (o) {
                    return;
                }
                var e = runTimeout(cleanUpNextTick);
                o = true;
                var t = i.length;
                while(t){
                    u = i;
                    i = [];
                    while(++a < t){
                        if (u) {
                            u[a].run();
                        }
                    }
                    a = -1;
                    t = i.length;
                }
                u = null;
                o = false;
                runClearTimeout(e);
            }
            t.nextTick = function(e) {
                var t = new Array(arguments.length - 1);
                if (arguments.length > 1) {
                    for(var r = 1; r < arguments.length; r++){
                        t[r - 1] = arguments[r];
                    }
                }
                i.push(new Item(e, t));
                if (i.length === 1 && !o) {
                    runTimeout(drainQueue);
                }
            };
            function Item(e, t) {
                this.fun = e;
                this.array = t;
            }
            Item.prototype.run = function() {
                this.fun.apply(null, this.array);
            };
            t.title = "browser";
            t.browser = true;
            t.env = {};
            t.argv = [];
            t.version = "";
            t.versions = {};
            function noop() {}
            t.on = noop;
            t.addListener = noop;
            t.once = noop;
            t.off = noop;
            t.removeListener = noop;
            t.removeAllListeners = noop;
            t.emit = noop;
            t.prependListener = noop;
            t.prependOnceListener = noop;
            t.listeners = function(e) {
                return [];
            };
            t.binding = function(e) {
                throw new Error("process.binding is not supported");
            };
            t.cwd = function() {
                return "/";
            };
            t.chdir = function(e) {
                throw new Error("process.chdir is not supported");
            };
            t.umask = function() {
                return 0;
            };
        }
    };
    var t = {};
    function __nccwpck_require__(r) {
        var n = t[r];
        if (n !== undefined) {
            return n.exports;
        }
        var i = t[r] = {
            exports: {}
        };
        var o = true;
        try {
            e[r](i, i.exports, __nccwpck_require__);
            o = false;
        } finally{
            if (o) delete t[r];
        }
        return i.exports;
    }
    if (typeof __nccwpck_require__ !== "undefined") __nccwpck_require__.ab = ("TURBOPACK compile-time value", "/ROOT/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/compiled/process") + "/";
    var r = __nccwpck_require__(229);
    module.exports = r;
})();
}),
"[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var _global_process, _global_process1;
module.exports = ((_global_process = /*TURBOPACK member replacement*/ __turbopack_context__.g.process) == null ? void 0 : _global_process.env) && typeof ((_global_process1 = /*TURBOPACK member replacement*/ __turbopack_context__.g.process) == null ? void 0 : _global_process1.env) === 'object' ? /*TURBOPACK member replacement*/ __turbopack_context__.g.process : __turbopack_context__.r("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/compiled/process/browser.js [app-client] (ecmascript)"); //# sourceMappingURL=process.js.map
}),
]);

//# sourceMappingURL=_df466af3._.js.map