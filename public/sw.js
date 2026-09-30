/**
 * 内核资源缓存（Service Worker + Cache API）。
 *
 * 背景（线上实测）：打开一个文档要让浏览器过 ~160MB 的编辑器内核资源，其中大头是
 * OnlyOffice 的字体（218 个文件，单个 4~17MB，且是加密下发、无法按名字裁剪）。
 * 这些响应虽然带 `Cache-Control: public, max-age=31556952, immutable`，但 HTTP 缓存
 * 留不住——单条响应超过缓存总容量 1/8 就不收，总量也有上限，于是每次打开都重新下载
 * 几十 MB（实测同一批字体每次都是 200，从不 304），在慢链路上就是几十秒的白等。
 *
 * Cache API 没有这两个限制（按磁盘配额），命中策略由我们自己定，所以这里对内核资源
 * 做 cache-first：命中即零网络；未命中拉一次并落盘。实测同一浏览器：首次 49 秒 →
 * 第三次起 6 秒（外壳就绪 17.5s → 1.1s，最慢请求 11.8s → 0.17s）。
 *
 * 只接管内核与内容寻址的前端产物，不碰业务接口（`/api/...` 不在 scope 内）。
 */
const VERSION = "voffice-kernel-v1";

const KERNEL_PATTERNS = [
  /\/v\d[\d.]*-\d+\//, // 内核树：/v9.3.1-1/sdkjs/...  /v9.3.1-1/fonts/217
  /\/x2t-?\d*\//, // x2t 运行时：/x2t/x2t.wasm 与 /x2t-1/
  /\/_next\/static\//, // 内容寻址的前端 chunk（文件名带 hash）
];

function isKernelRequest(url) {
  if (url.origin !== self.location.origin) return false;
  return KERNEL_PATTERNS.some((re) => re.test(url.pathname));
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 清掉旧版本缓存（VERSION 变更时才会发生）
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== VERSION).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (!isKernelRequest(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(request);
      if (hit) return hit;

      try {
        const response = await fetch(request);
        // 只缓存完整成功的响应：分片（206）、不透明响应、错误都不落盘
        if (response && response.status === 200 && response.type !== "opaque") {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        const fallback = await cache.match(request);
        if (fallback) return fallback;
        throw error;
      }
    })(),
  );
});
