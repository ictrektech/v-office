#!/usr/bin/env node
/**
 * 把 out/ 里的 x2t 运行时展开成「明文 + .br + .gz」三件套。
 *
 * 为什么需要这一步：public/x2t 与 public/x2t-1 下的 wasm / js 在仓库里是
 * **brotli 预压缩**的（磁盘上只有压缩版）。Caddyfile 曾经对它们写死
 * `Content-Encoding: br`，但
 * Chrome 只在安全来源（https / localhost）才在 Accept-Encoding 里声明 br ——
 * 从 http 入口进来的浏览器收到一个声称是 brotli 的响应却无法解码，浏览器直接
 * 判定请求失败，`utils/editor/x2t.worker.ts` 里的 x2t.js / x2t.wasm 起不来，
 * 于是**任何需要转换的文档**（doc / docx / xlsx / pptx）都报
 * 「打开文件时发生错误」（2026-09-29 线上事故）。
 *
 * 这里在构建期补出：
 *   <name>      明文——precompressed 的兜底，也是 identity 客户端拿到的
 *   <name>.br   保留原有的 brotli 版本，给安全来源的浏览器
 *   <name>.gz   顺带生成 gzip，给不支持 br 的客户端（http / 老浏览器）
 * 再由 Caddyfile 的 `file_server { precompressed br gzip }` 按 Accept-Encoding 协商。
 *
 * 幂等：对已经展开过的产物重复执行不会改写坏文件。
 */
import { brotliDecompressSync, gzipSync } from "node:zlib";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

/** 需要展开的资源（相对仓库根，Next.js 静态导出把 public/ 原样拷进 out/）。 */
const TARGETS = [
  "out/x2t/x2t.wasm",
  "out/x2t/x2t.js",
  "out/x2t-1/x2t.js",
  "out/x2t-1/x2t.wasm",
];

/** 防呆：解压结果必须像目标类型，否则宁可失败也不要静默写出坏产物。 */
function looksSane(file, buf) {
  if (file.endsWith(".wasm")) {
    return (
      buf.length > 4 &&
      buf[0] === 0x00 &&
      buf[1] === 0x61 &&
      buf[2] === 0x73 &&
      buf[3] === 0x6d // "\0asm"
    );
  }
  return /^[\s/]/.test(buf.subarray(0, 1).toString("latin1"));
}

let failed = false;

for (const file of TARGETS) {
  if (!existsSync(file)) {
    console.error(`[x2t] missing ${file}`);
    failed = true;
    continue;
  }

  const raw = readFileSync(file);
  let plain = null;
  try {
    plain = brotliDecompressSync(raw);
  } catch {
    plain = null; // 本来就是明文
  }

  let br;
  if (plain) {
    if (!looksSane(file, plain)) {
      console.error(`[x2t] ${file}: brotli 解压结果不像预期类型，拒绝改写`);
      failed = true;
      continue;
    }
    br = raw;
    writeFileSync(file, plain);
  } else {
    plain = raw;
    br = existsSync(`${file}.br`) ? readFileSync(`${file}.br`) : raw;
  }

  writeFileSync(`${file}.br`, br);
  writeFileSync(`${file}.gz`, gzipSync(plain, { level: 9 }));
  console.log(
    `[x2t] ${file}: plain=${plain.length} br=${br.length} gz=${statSync(`${file}.gz`).size}`,
  );
}

if (failed) process.exit(1);
