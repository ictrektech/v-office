"use client";

/**
 * 老版 .doc 格式的服务端转换客户端。
 *
 * 编辑器内核（x2t）读不好也写不了老版 .doc 二进制格式：
 * - 打开：把 .doc 原件转成 docx 副本渲染（原文件不动）；
 * - 保存：把编辑器导出的 docx 转回 .doc 写回原路径（格式不变）。
 *
 * 端点：storage 服务的 /api/v1/convert（LibreOffice headless）。
 * VOS 与本地 standalone 均可用（本地用 V_OFFICE_AUTH_DISABLED=1 启动）。
 */

import { getVOSAccessToken, clearVOSAuthCache } from "@/utils/vos/fastpath";

const STORAGE_API =
  process.env.NEXT_PUBLIC_STORAGE_API || "/api/com.ictrek.v-office/api/v1";

export type ConvertTarget = "docx" | "doc" | "pdf";

/**
 * 兜底 PDF（"预览不可用"提示页）：转换服务失败时返回它代替原文档，
 * 保证编辑器拿到的一定是合法 PDF（pdf 渲染管线不受 doc 错位问题影响）。
 */
export const FALLBACK_PREVIEW_PDF = Uint8Array.from(
  atob(
    "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCAxMjAgPj4Kc3RyZWFtCkJUIC9GMSAxNiBUZiA2MCA3NjAgVGQgKERvY3VtZW50IHByZXZpZXcgdW5hdmFpbGFibGUuKSBUaiAwIC0zMCBUZCAoU3RvcmFnZSBjb252ZXJ0IHNlcnZpY2UgZXJyb3IgLSBwbGVhc2UgcmV0cnkuKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNDEgMDAwMDAgbiAKMDAwMDAwMDQxMiAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQ4MgolJUVPRg==",
  ),
  (c) => c.charCodeAt(0),
);

/**
 * 转换文档字节。失败抛错，由调用方决定提示方式
 * （打开失败 → 编辑器加载错误；保存失败 → 保存错误弹窗）。
 */
export async function convertDocBuffer(
  data: ArrayBuffer | Uint8Array,
  from: "doc" | "docx",
  to: ConvertTarget,
  retry = true,
): Promise<ArrayBuffer> {
  const token = await getVOSAccessToken();
  const resp = await fetch(`${STORAGE_API}/convert?from=${from}&to=${to}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: new Uint8Array(data as ArrayBuffer),
    // 转换走 LibreOffice，大文档可能要几秒，别让编辑器 UI 无限等
    signal: AbortSignal.timeout(120_000),
  });
  if (resp.status === 401 && retry) {
    // token 过期：清缓存重试一次（与 saveStoredFile 同策略）
    clearVOSAuthCache();
    return convertDocBuffer(data, from, to, false);
  }
  if (!resp.ok) {
    throw new Error(`convert failed (${resp.status})`);
  }
  // 必须返回真正的 ArrayBuffer：调用方（如 docx-fix / x2t transferable）
  // 依赖该类型，返回 Uint8Array 会让 DataView 构造与 postMessage 转移列表失败。
  return await resp.arrayBuffer();
}
