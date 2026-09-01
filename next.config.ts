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
  // 本地 dev：AI 助手插件（编辑器内 iframe）与 v-office 同源请求 agentic-search，
  // 经此转发到本地 agentic-search dev server，避免跨源 CORS。
  // VOS 部署不走这里（output: export 且由平台网关路由 /api/<app-id>）。
  async rewrites() {
    if (process.env.NEXT_PUBLIC_BASE_PATH) return [];
    return [
      {
        source: "/api/com.ictrek.agentic-search/:path*",
        destination: "http://localhost:5173/api/com.ictrek.agentic-search/:path*",
      },
      {
        // AI 助手插件统一走 VOS 形态路径（见 utils/editor/server.ts），
        // 本地 dev 映射到 public/ai-assistant 镜像副本。
        source: "/app/com.ictrek.agentic-search/plugins/agentic-search/:path*",
        destination: "/ai-assistant/:path*",
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
