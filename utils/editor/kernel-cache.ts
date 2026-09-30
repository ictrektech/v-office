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
