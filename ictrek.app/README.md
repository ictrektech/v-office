# ZIZIYI Office VOS 应用说明

本目录是 ictrek 维护 ZIZIYI Office VOS 交付的唯一入口，把上游 Next.js 静态导出应用打包为 VOS app `com.ictrek.ziziyi-office`。

当前只发布 pull 模式安装包：本地 `update_version.sh` 只创建触发 tag，GitHub Actions 负责读取飞书发布表、打包并发布正式 release。

## 应用形态

- 纯前端静态应用：Next.js 静态导出 + OnlyOffice 前端资源（fonts / sdkjs / web-apps / sdkjs-plugins），由 Caddy 在容器内 80 端口提供静态服务。
- 无后端、无数据库、无持久化卷；文档保存在用户浏览器 IndexedDB 中，`configs.yml` 为空。
- 单镜像单服务，`amd` / `arm` 两个 profile，安装时由 VOS 选择其一。
- 文档格式支持 `.docx`、`.xlsx`、`.pptx`。

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `README.md` | 本文件，VOS app 打包与发布主入口。 |
| `VERSION` | 当前 VOS 包版本，由 `update_version.sh` 递增。 |
| `src/manifest.yml` | 应用元数据（id、分类 `office`、profiles、frontend basePath）。 |
| `src/docker-compose.yml` | 单服务静态容器定义，含 Traefik 路由与 `vos_default` 外部网络。 |
| `src/routers.yml` | 侧边栏导航：`com-ictrek-ziziyi-office` 组 + `ziziyi-office` 页面。 |
| `src/configs.yml` | 空配置列表（无服务端状态）。 |
| `src/README.zh-CN.md` / `src/README.en.md` | 打进安装包的应用商店简版说明。 |
| `src/icon.png` | 应用图标（256x256 PNG，由上游 `public/logo.svg` 渲染）。 |
| `scripts/package.sh` | pull 模式打包脚本（读飞书版本 → 渲染 → 打 tar → 自校验）。 |
| `scripts/update_version.sh` | 递增版本并推送 `vos-ziziyi-office-v{version}` 触发 tag。 |

## 与上游的差异

上游同步原则见仓库根目录 `UPSTREAM` 文件。当前 fork 相对上游 `baotlake/office-website` 的差异：

- `next.config.ts`：新增 `basePath: process.env.NEXT_PUBLIC_BASE_PATH || ""`，用于 VOS 子路径部署（见下节）；不设置该环境变量时行为与上游一致。
- `Dockerfile`：builder stage 新增 `ARG NEXT_PUBLIC_BASE_PATH` 透传，并把 `NEXT_PUBLIC_APP_ROOT` 改为 `${NEXT_PUBLIC_BASE_PATH}/v${DS_VERSION}-${HASH}`；不传该参数时与上游产物一致。
- `ictrek.app/`、`UPSTREAM`、`.dockerignore`（排除 ictrek.app 与 UPSTREAM）：ictrek 新增，上游合并时保留。

## VOS 子路径适配

VOS 网关把 `/app/com.ictrek.ziziyi-office/` 前缀剥离后转发到容器，但浏览器端资源 URL 是按 HTML 所在路径解析的。因此 VOS 专用镜像必须在构建时注入两个变量（普通镜像保持默认，即根路径部署）：

- `NEXT_PUBLIC_BASE_PATH=/app/com.ictrek.ziziyi-office`：Next.js `basePath`，让 `/_next/*` 等资源引用带上子路径。
- `NEXT_PUBLIC_APP_ROOT=/app/com.ictrek.ziziyi-office/v${DS_VERSION}-${HASH}`：OnlyOffice 资源根（上游已支持的环境变量），让 fonts / sdkjs / web-apps 请求也带上子路径。

容器侧无需任何改动：Traefik `stripprefix` 剥掉前缀后，Caddy 仍按根路径服务，Caddyfile 的 x2t / 版本化资源缓存规则照常生效。

已知残余问题：`components/install-extension-dialog.tsx` 中 `window.location.href = "/"` 在子路径部署时会跳到门户根路径；如需修复，在 fork 内把该跳转改为 basePath 感知。

## 镜像构建与发布流程

镜像构建需要在有 Docker 的构建机上执行（参考上游 `build.sh`），按 `AMD_with_cuda` / `ARM_with_cuda` 两个发布表分别构建并推送：

```bash
# amd64 示例（arm64 在 ARM 构建机执行，或使用支持目标平台的 builder）
docker buildx build --platform linux/amd64 --load --provenance=false --sbom=false \
  --build-arg DS_VERSION=9.3.1 --build-arg HASH=1 \
  --build-arg NEXT_PUBLIC_BASE_PATH=/app/com.ictrek.ziziyi-office \
  --tag swr.cn-southwest-2.myhuaweicloud.com/ictrek/ziziyi-office:amd_<date> .
```

注意：上游 `Dockerfile` 未透传 `NEXT_PUBLIC_BASE_PATH`，需在 fork 内给它加一条 `ARG`/`ENV`（与 `DS_VERSION` 同样的声明方式），并按上文把 `NEXT_PUBLIC_APP_ROOT` 改为带前缀的值（修改 builder stage 的 `ENV NEXT_PUBLIC_APP_ROOT` 行）。

发布步骤：

1. 镜像推送 SWR 后，在飞书发布表 `AMD_with_cuda`、`ARM_with_cuda` 各新建 `ziziyi-office` 列并写入新 tag（Row 1 = 服务名 `ziziyi-office`，Row 2 = SWR 仓库 URI，日期行 = tag）。
2. 提交应用代码改动，保持工作树干净。
3. `./ictrek.app/scripts/update_version.sh [patch|minor|major]` —— 递增 `VERSION`、创建并推送 `vos-ziziyi-office-v{version}` 触发 tag。
4. GitHub Actions（`.github/workflows/vos-release.yml`）读取飞书版本、打包 `ziziyi-office_{version}_pull.tar`、创建公开 tag `v{version}` 与 release，并发布到 VOS App Store。
5. 发布后用 `gh run list` / `gh run view --log-failed` 确认 CI 成功，不要默认成功。
