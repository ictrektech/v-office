/**
 * 注册内核资源缓存用的 Service Worker（见 public/sw.js）。
 *
 * 为什么要它：打开一个文档要让浏览器过 ~160MB 字体/内核，而这些响应虽然带
 * `Cache-Control: immutable`，HTTP 缓存仍留不住（单条体积/总量上限），于是每次
 * 打开都重下几十 MB。Cache API 没这两个限制，命中策略由我们控制。
 *
 * 幂等：多次调用只注册一次；不支持的环境（非安全来源等）静默跳过，不影响功能。
 * 放在这里而不是某个页面里，是为了让"列表页"和"编辑器页"都能在最早的时机注册——
 * 用户可能是从编辑器路由直接进来的（外链/刷新），那条路径也要能享受到缓存。
 */
let registered = false;

export function ensureKernelCacheWorker(): void {
  if (registered) return;
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  registered = true;

  /**
   * **开发环境不注册，而且要把历史注册主动清掉**——这不是保守，是必须。
   *
   * sw.js 对 `/_next/static/` 是 cache-first（见 public/sw.js 的 KERNEL_PATTERNS）。
   * 生产环境那是内容寻址的文件名，缓存永不失效很正确；但 `next dev` 下 turbopack
   * 的 chunk 文件名**不带内容 hash**（同一路由改代码前后都叫 `_a4b5689e._.js`），
   * cache-first 就会把第一次编译的 JS 一直喂给浏览器。
   *
   * 后果极其难查：改完代码刷新还跑旧逻辑，而且 **Ctrl+Shift+R 也绕不过**——
   * 硬刷新只绕过 HTTP 缓存，Service Worker 依旧拦截 fetch。实测就是这样：
   * 前端改动全部生效不了，页面上还留着早就删掉的旧行为。
   *
   * 所以这里不只是"不注册"，还要 unregister + 清 Cache：老注册一旦留在浏览器里，
   * 手动清 DevTools 之前它会一直粘着。配合 public/sw.js 的 VERSION 变更，
   * 用户只要**普通刷新**一次就能拿到新前端。
   */
  if (process.env.NODE_ENV !== "production") {
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => caches.keys())
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .catch(() => {
        // 清理失败不影响功能
      });
    return;
  }

  const url = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sw.js`;
  try {
    // scope 默认就是 sw.js 所在目录（应用 basePath 之下），业务接口不在其中
    void navigator.serviceWorker.register(url).catch(() => {
      // 注册失败不影响任何功能，只是没有这层缓存
    });
  } catch {
    // ignore
  }
}
