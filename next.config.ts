import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin({
  experimental: {
    srcPath: "./",
    extract: {
      sourceLocale: "en",
    },
    messages: {
      path: "./messages",
      format: "json",
      locales: ["en"],
    },
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  // Sub-path deployments (e.g. the VOS gateway serving the site under
  // /app/<app-id>/ after stripping that prefix) inject this at build time so
  // /_next/* asset URLs resolve; unset it and behavior stays upstream-default.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  // 本地 dev 反向代理：把应用自己的前缀转发到本地服务。
  // VOS 部署不走这里（output: export 且由平台网关按应用路由）。
  async rewrites() {
    if (process.env.NEXT_PUBLIC_BASE_PATH) return [];
    return [
      {
        // HybRAG（知识库）本地 dev 转发到本地 VOS 网关，由网关按应用路由；
        // 知识库安装探测（isHybragInstalled）与业务请求共用此路径。
        source: "/app/com.ictrek.hybrag/:path*",
        destination: "http://localhost:3002/app/com.ictrek.hybrag/:path*",
      },
      {
        // 本地 dev：文档存储 + AI 接口转发到本地 storage 服务（server/main.py，
        // V_OFFICE_AUTH_DISABLED=1 启动）。AI 走 /api/v1/ai/*（见 server/ai.py），
        // 与文档存储同一个服务、同一个前缀，编辑器转换也走这里。
        source: "/api/com.ictrek.v-office/:path*",
        destination: `${
          process.env.V_OFFICE_DEV_STORAGE_URL || "http://localhost:5000"
        }/:path*`,
      },
    ];
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/x2t/x2t.wasm",
        headers: [
          {
            key: "Content-Encoding",
            value: "br",
          },
        ],
      },
      {
        source: "/x2t-:suffix/:path*",
        headers: [
          {
            key: "Content-Encoding",
            value: "br",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31556952, immutable",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
