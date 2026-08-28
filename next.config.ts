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
