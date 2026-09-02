import type { XHRMiddleware } from "./xhr";

export type FetchProxy = typeof fetch & {
  use(middleware: XHRMiddleware): void;
  clearMiddlewares(): void;
};

/**
 * Creates a fetch proxy function that supports middleware
 * @param target The window or fetch function to proxy
 * @param baseURI 相对 URL 的解析基准。编辑器运行在 iframe 中，其 fetch 的
 * 相对路径必须基于 iframe 文档解析；但 proxy 内的 Request 构造在父页面
 * 上下文执行，会错误地以父页面为基准（VOS 带 basePath 时全部解析错 →
 * 资源 404）。必须显式传入 iframe 的 document.baseURI。
 */
export function createFetchProxy(
  target: (Window & { fetch: typeof fetch }) | typeof fetch = globalThis.fetch,
  baseURI?: string,
): FetchProxy {
  const middlewares: XHRMiddleware[] = [];
  const BaseFetch =
    typeof target === "function" ? target : target.fetch.bind(target);

  const proxy = (async (input: RequestInfo | URL, init?: RequestInit) => {
    // 在父页面上下文构造 Request 前，先用 iframe 的 baseURI 把相对
    // 路径解析成绝对 URL（new URL 对 "/" 开头、"./"、"../" 及协议相对
    // 路径的处理与浏览器原生语义一致），避免 VOS basePath 下解析错位。
    if (baseURI && typeof input === "string") {
      input = /^[a-z][a-z0-9+.-]*:/i.test(input)
        ? input
        : new URL(input, baseURI).href;
    }
    let request: Request;
    try {
      request = new Request(input, init);
    } catch (e) {
      // If request cannot be created, fallback to native fetch
      return BaseFetch(input, init);
    }

    try {
      for (const mw of middlewares) {
        const response = await mw(request.clone());
        if (response) {
          return response;
        }
      }
    } catch (err) {
      console.error("ProxyFetch middleware error:", err);
      return BaseFetch(request);
    }

    return BaseFetch(request);
  }) as FetchProxy;

  proxy.use = (middleware: XHRMiddleware) => {
    middlewares.push(middleware);
  };

  proxy.clearMiddlewares = () => {
    middlewares.length = 0;
  };

  return proxy;
}
