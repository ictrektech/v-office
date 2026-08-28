# ============================================================
# Global build arguments (declared before any FROM so they can
# be used in FROM lines; must be re-declared inside each stage
# to be visible there).
# ============================================================

# OnlyOffice DocumentServer version — controls both the source image
# tag AND the versioned asset directory prefix (/v<DS_VERSION>-<HASH>).
ARG DS_VERSION=9.3.1

# Revision counter. Bump this (--build-arg HASH=2) whenever you want
# to bust the browser cache for the OnlyOffice assets without changing
# the DocumentServer version itself.
ARG HASH=1

# Base image references. Defaults point at the upstream registries; release
# builds override them with SWR mirrors (ictrek / ictrek-arm orgs) so repeat
# builds never re-pull multi-GB images from Docker Hub. Slashes in upstream
# multi-path names are flattened for SWR (onlyoffice/documentserver ->
# onlyoffice-documentserver).
ARG DS_IMAGE=onlyoffice/documentserver:${DS_VERSION}
ARG NODE_IMAGE=node:22-alpine
ARG CADDY_IMAGE=caddy:2-alpine

# ============================================================
# Stage 1: OnlyOffice DocumentServer assets source
# ============================================================
FROM ${DS_IMAGE} AS documentserver

# AllFonts.js and themes.js are NOT present in the image — they are
# generated at container startup by documentserver-generate-allfonts.sh.
# We run that script here (passing `false` so it skips the data-container
# wait branch) so the files exist before the COPY in the final stage.
RUN documentserver-generate-allfonts.sh false

# ============================================================
# Stage 2: Next.js website builder
# ============================================================
FROM ${NODE_IMAGE} AS builder

# Re-declare args inside this stage to make them visible here.
ARG DS_VERSION
ARG HASH

# Optional sub-path prefix (e.g. /app/com.ictrek.ziziyi-office) for gateway
# deployments that strip the prefix before proxying; empty for root deploys.
ARG NEXT_PUBLIC_BASE_PATH

# npm registry override for mirror-rich environments (defaults to upstream).
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV COREPACK_NPM_REGISTRY=${NPM_REGISTRY}
ENV npm_config_registry=${NPM_REGISTRY}

# Expose the versioned asset path to Next.js at build time. When a sub-path
# prefix is set, both the site basePath and the OnlyOffice asset root move
# under it so absolute browser-side URLs keep resolving after the gateway
# strips the prefix.
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ENV NEXT_PUBLIC_APP_ROOT=${NEXT_PUBLIC_BASE_PATH}/v${DS_VERSION}-${HASH}

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests first for better layer caching.
COPY package.json pnpm-lock.yaml ./

# Install dependencies (frozen lockfile for reproducibility). Build scripts
# of native optional deps (sharp/@swc/parcel-watcher) are not needed for the
# static export and pnpm >= 10 aborts on unapproved ones in CI.
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the source code.
COPY . .

# Run the Next.js static export build, then verify that Worker-loaded assets
# retain the configured deployment prefix in the emitted browser bundle.
RUN pnpm build && node scripts/check-exported-worker-paths.mjs

# ============================================================
# Stage 3: Caddy production server
# ============================================================
FROM ${CADDY_IMAGE} AS final

# Re-declare args inside this stage.
ARG DS_VERSION
ARG HASH

WORKDIR /srv

# Copy the Next.js static export output.
COPY --from=builder /app/out ./

# Copy OnlyOffice DocumentServer assets directly from the source stage
# into the versioned directory — assets never pass through the builder,
# so there is no redundant copy of the large asset tree.
COPY --from=documentserver /var/www/onlyoffice/documentserver/fonts         ./v${DS_VERSION}-${HASH}/fonts
COPY --from=documentserver /var/www/onlyoffice/documentserver/sdkjs         ./v${DS_VERSION}-${HASH}/sdkjs
COPY --from=documentserver /var/www/onlyoffice/documentserver/web-apps      ./v${DS_VERSION}-${HASH}/web-apps
COPY --from=documentserver /var/www/onlyoffice/documentserver/sdkjs-plugins ./v${DS_VERSION}-${HASH}/sdkjs-plugins

# api.js is generated from a template at runtime in a full DocumentServer
# deployment, but here we serve it statically — copy the template as-is.
RUN cp "./v${DS_VERSION}-${HASH}/web-apps/apps/api/documents/api.js.tpl" \
       "./v${DS_VERSION}-${HASH}/web-apps/apps/api/documents/api.js"

# In the VOS build, save (download-as) uploads to the mapped document directory, so
# relabel OnlyOffice's "Downloading document" progress toast accordingly.
RUN find "./v${DS_VERSION}-${HASH}/web-apps" -type f \( -name "*.json" -o -name "*.js" \) -exec sed -i \
      -e 's/Downloading document/Saving document/g' \
      -e 's/正在下载文件/正在保存文档/g' \
      {} +

# Copy Caddyfile.
COPY Caddyfile /etc/caddy/Caddyfile

# Inject runtime configuration (VOS app version) before Caddy starts.
COPY caddy-entrypoint.sh /usr/local/bin/caddy-entrypoint.sh
RUN chmod +x /usr/local/bin/caddy-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/caddy-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

EXPOSE 80 443
