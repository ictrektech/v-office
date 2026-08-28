# ZIZIYI Office VOS 应用说明

本目录是 ictrek 维护 ZIZIYI Office VOS 交付的唯一入口，把上游 Next.js 静态导出应用打包为 VOS app `com.ictrek.ziziyi-office`。

当前只发布 pull 模式安装包：本地 `update_version.sh` 只创建触发 tag，GitHub Actions 负责读取飞书发布表、打包并发布正式 release。

## 应用形态

- `ziziyi-office-web`：纯前端静态服务。Next.js 静态导出 + OnlyOffice 前端资源（fonts / sdkjs / web-apps / sdkjs-plugins），Caddy 在容器内 80 端口提供静态服务，无状态。
- `ziziyi-office-storage`：逐用户文档存储服务（FastAPI，见 fork 内 `server/`）。校验 VOS OIDC Fastpath 令牌后，按 VOS 用户名在 `ZIZIYI_OFFICE_DATA_PATH` 映射目录下建立独立子目录读写文档，用户之间相互分离。
- `amd` / `arm` 两个 profile，安装时由 VOS 为每个 profile 各选择一对镜像（web + storage）。

## VOS 认证与用户隔离

- `manifest.yml` 声明 `oauth2.client`（public client + PKCE S256）。VOS 1.1+ 向同域 iframe 注入 `window.vos_platform.api.v1000.oauth2`，前端（`utils/vos/fastpath.ts`）静默完成 authorize/token 换取 access token 并缓存，过期用 refresh_token 静默续期——全程无 OAuth 跳转，不会反复弹授权。
- 前端所有云端请求带 Bearer 令牌访问同域相对路径 `/api/com.ictrek.ziziyi-office`（Traefik 剥前缀转发到存储服务）；存储服务每次请求调 VOS `/v1000/oauth2/userinfo` 校验令牌（带短 TTL 用户名缓存），取不到有效用户即 401。
- 用户名映射为 `DATA_ROOT/<username>/` 独立目录，文件名白名单校验（office 后缀 + 防路径穿越）。
- 编辑器保存（Ctrl+S / downloadas）在 VOS 模式下自动 `PUT` 到当前用户私有空间，不再弹浏览器下载；上传失败回退浏览器下载，输出不丢。
- 独立部署（非 VOS iframe）检测不到 `window.vos_platform`，云端入口自动隐藏，应用回到本地优先行为（IndexedDB / 本地文件句柄）。

## 安装配置

- `ZIZIYI_OFFICE_DATA_PATH`（type: path，默认 `/data/vos_workspace/ziziyi-office`）：宿主机文档存储映射路径，用户可选；所有用户文件落在其下按用户名命名的子目录。
- `VOS_OIDC_USERINFO_URL`（默认 `http://172.17.0.1:8105/v1000/oauth2/userinfo`）：存储服务校验令牌的 VOS 地址，默认适配 VOS backend host 网络 `SITE_PORT=8105` 部署，一般不改。

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `README.md` | 本文件，VOS app 打包与发布主入口。 |
| `VERSION` | 当前 VOS 包版本，由 `update_version.sh` 递增。 |
| `src/manifest.yml` | 应用元数据（id、分类 `office`、profiles、frontend basePath、oauth2 client）。 |
| `src/docker-compose.yml` | web + storage 双服务定义，Traefik 路由与 `vos_default` 外部网络。 |
| `src/routers.yml` | 侧边栏导航：`com-ictrek-ziziyi-office` 组 + `ziziyi-office` 页面。 |
| `src/configs.yml` | 安装配置：文档存储映射路径、VOS OIDC userinfo 地址。 |
| `src/README.zh-CN.md` / `src/README.en.md` | 打进安装包的应用商店简版说明。 |
| `src/icon.png` | 应用图标（256x256 PNG，由上游 `public/logo.svg` 渲染）。 |
| `scripts/package.sh` | pull 模式打包脚本（读飞书版本 → 渲染 → 打 tar → 自校验）。 |
| `scripts/update_version.sh` | 递增版本并推送 `vos-ziziyi-office-v{version}` 触发 tag。 |
| `../server/`（fork 内） | 逐用户存储服务源码（FastAPI + Dockerfile）。 |

## 与上游的差异

上游同步原则见仓库根目录 `UPSTREAM` 文件。当前 fork 相对上游 `baotlake/office-website` 的差异：

- `next.config.ts`：新增 `basePath: process.env.NEXT_PUBLIC_BASE_PATH || ""`，用于 VOS 子路径部署；不设置该环境变量时行为与上游一致。
- `Dockerfile`：builder stage 新增 `ARG NEXT_PUBLIC_BASE_PATH` 透传，并把 `NEXT_PUBLIC_APP_ROOT` 改为 `${NEXT_PUBLIC_BASE_PATH}/v${DS_VERSION}-${HASH}`；不传该参数时与上游产物一致。
- `server/`：新增逐用户文档存储服务（仅 VOS 部署使用）。
- `utils/vos/`：新增 VOS OIDC Fastpath 静默认证与云端存储客户端。
- `components/main/open-view.tsx`：新增"云端文档"列表（VOS 模式才显示）。
- `utils/editor/server.ts`：保存时 VOS 模式改为自动入云。
- `package.json`：新增 `js-sha256` 依赖（PKCE S256，兼容非 HTTPS 门户）。
- `messages/*.json`：新增 `vosCloud*` 文案键（en/zh-CN/zh-TW 译文，其余 locale 暂用英文兜底）。
- `ictrek.app/`、`UPSTREAM`、`.dockerignore`（排除 ictrek.app、UPSTREAM 与 server/）：ictrek 新增，上游合并时保留。

## VOS 子路径适配

VOS 网关把 `/app/com.ictrek.ziziyi-office/` 前缀剥离后转发到容器，但浏览器端资源 URL 是按 HTML 所在路径解析的。因此 VOS 专用镜像必须在构建时注入两个变量（普通镜像保持默认，即根路径部署）：

- `NEXT_PUBLIC_BASE_PATH=/app/com.ictrek.ziziyi-office`：Next.js `basePath`，让 `/_next/*` 等资源引用带上子路径。
- `NEXT_PUBLIC_APP_ROOT=/app/com.ictrek.ziziyi-office/v${DS_VERSION}-${HASH}`：OnlyOffice 资源根（构建参数自动拼接），让 fonts / sdkjs / web-apps 请求也带上子路径。

容器侧无需任何改动：Traefik `stripprefix` 剥掉前缀后，Caddy 仍按根路径服务，Caddyfile 的 x2t / 版本化资源缓存规则照常生效。

已知残余问题：`components/install-extension-dialog.tsx` 中 `window.location.href = "/"` 在子路径部署时会跳到门户根路径；如需修复，在 fork 内把该跳转改为 basePath 感知。

## 镜像构建与发布流程

镜像构建需要在有 Docker 的构建机上执行（无 CUDA 参与，amd 用 x86_64 构建机如 tc232，arm 用 aarch64 构建机如 tc192）。仓库根目录 `build_image.sh` 按 WeKnora 构建规则完成：基础镜像拉取（带国内镜像源回退）→ 构建两个镜像 → 推送 SWR → 按飞书规则写回发布表（列不存在则追加列，日期行不存在则在 A4 插入新行）。

```bash
# amd 构建机（tc232）
FEISHU_CONFIG_FILE=/home/jhu/.feishu.components.json ./build_image.sh --target amd

# arm 构建机（tc192）
FEISHU_CONFIG_FILE=/home/jhu/.feishu.components.json ./build_image.sh --target arm
```

产物：

- `swr.cn-southwest-2.myhuaweicloud.com/ictrek/ziziyi-office:{amd|arm}_${YYYYMMDD}`（web，注入 `NEXT_PUBLIC_BASE_PATH=/app/com.ictrek.ziziyi-office`）
- `swr.cn-southwest-2.myhuaweicloud.com/ictrek/ziziyi-office-storage:{amd|arm}_${YYYYMMDD}`（storage）

可选开关：`--web-only` / `--storage-only` / `--no-push` / `--no-feishu` / `--feishu-only` / `--dry-run` / `--tag` / `--sheet`；`ZIZIYI_DS_VERSION`、`ZIZIYI_ASSET_HASH` 控制 OnlyOffice 资源版本目录。

发布步骤：

1. 镜像推送 SWR 后，在飞书发布表 `AMD_with_cuda`、`ARM_with_cuda` 各新建 `ziziyi-office` 和 `ziziyi-office-storage` 两列并写入 tag（Row 1 = 服务名，Row 2 = SWR 仓库 URI，日期行 = tag）。
2. 提交应用代码改动，保持工作树干净。
3. `./ictrek.app/scripts/update_version.sh [patch|minor|major]` —— 递增 `VERSION`、创建并推送 `vos-ziziyi-office-v{version}` 触发 tag。
4. GitHub Actions（`.github/workflows/vos-release.yml`）读取飞书版本、打包 `ziziyi-office_{version}_pull.tar`、创建公开 tag `v{version}` 与 release，并发布到 VOS App Store。
5. 发布后用 `gh run list` / `gh run view --log-failed` 确认 CI 成功，不要默认成功。
