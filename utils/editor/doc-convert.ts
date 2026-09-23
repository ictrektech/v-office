"use client";

/**
 * 老版 .doc 的服务端转换客户端。
 *
 * 编辑器内核（x2t）读不好也写不了老 .doc 二进制：
 * - 打开：把 .doc 原件转成 docx 副本渲染（原文件不动）；
 * - 保存：把编辑器导出的 docx 转回 .doc 写回原路径（格式不变）。
 *
 * 老 ppt / xls 不走这里：它们默认由 Collabora（服务端 LibreOffice）原生读写。
 *
 * 端点：storage 服务的 /api/v1/convert（LibreOffice headless）。
 * VOS 与本地 standalone 均可用（本地用 V_OFFICE_AUTH_DISABLED=1 启动）。
 */

import { getVOSAccessToken, clearVOSAuthCache } from "@/utils/vos/fastpath";

const STORAGE_API =
  process.env.NEXT_PUBLIC_STORAGE_API || "/api/com.ictrek.v-office/api/v1";

/** 老版 .doc 与它对应的现代格式（x2t 能正常读写的那一侧）。 */
export type LegacyFormat = "doc";
export type LegacyModernFormat = "docx";
export type ConvertTarget = LegacyModernFormat | LegacyFormat | "pdf";

/**
 * 转换文档字节。失败抛错，由调用方决定提示方式
 * （打开失败 → 编辑器加载错误；保存失败 → 保存错误弹窗）。
 */
export async function convertLegacyBuffer(
  data: ArrayBuffer | Uint8Array,
  from: LegacyFormat | LegacyModernFormat,
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
    return convertLegacyBuffer(data, from, to, false);
  }
  if (!resp.ok) {
    throw new Error(`convert failed (${resp.status})`);
  }
  // 必须返回真正的 ArrayBuffer：调用方（如 docx-fix / x2t transferable）
  // 依赖该类型，返回 Uint8Array 会让 DataView 构造与 postMessage 转移列表失败。
  return await resp.arrayBuffer();
}
