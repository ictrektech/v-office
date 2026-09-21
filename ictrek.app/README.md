# V-Office VOS 应用说明

> VOS 应用标识为 `com.ictrek.v-office`。如果设备上安装过使用其他应用标识的旧版本，两者会作为独立应用存在，旧应用私有存储中的文档不会自动迁移。

本目录是 ictrek 维护 V-Office VOS 交付的唯一入口，把上游 Next.js 静态导出应用打包为 VOS app `com.ictrek.v-office`。

当前只发布 pull 模式安装包：本地 `update_version.sh` 只创建触发 tag，GitHub Actions 负责读取飞书发布表、打包并发布正式 release。

## 应用形态

- `v-office-web`：纯前端静态服务。Next.js 静态导出 + OnlyOffice 前端资源（fonts / sdkjs / web-apps / sdkjs-plugins），Caddy 在容器内 80 端口提供静态服务，无状态。Excel / PPT 以及新建文档仍由它内置的 OnlyOffice 内核渲染。
- `v-office-storage`：应用私有文档存储服务（FastAPI，见 fork 内 `server/`）。校验 VOS OIDC Fastpath 令牌后，只读写 `${VOS_APP_STORAGE_PATH}/documents/<用户名>/` 中的文档；同时充当 Collabora 的 WOPI host（`/wopi/files/...`），并按平台的「数据访问授权」浏览/编辑已挂载的共享目录 `/exposed`（公共目录 / 用户数据目录，保存直接写回原文件）。
- `v-office-collabora`：Word 文档（doc/docx）的编辑器内核（Collabora Online / LibreOffice 内核，见 fork 内 `collabora/`）。WPS 导出的复杂表单类文档在 OnlyOffice 内核下会出现表格错位、页眉浮动对象被当成正文环绕障碍，改用它渲染；它通过 WOPI 直接读写 storage，不接触用户凭证。
- `amd` / `arm` 两个 profile，安装时由 VOS 为每个 profile 各选择三个镜像（web + storage + collabora）。

## VOS 认证与应用私有存储

- `manifest.yml` 声明 `oauth2.client`（public client + PKCE S256）。VOS 1.1+ 向同域 iframe 注入 `window.vos_platform.api.v1000.oauth2`，前端（`utils/vos/fastpath.ts`）静默完成 authorize/token 换取 access token 并缓存，过期用 refresh_token 静默续期——全程无 OAuth 跳转，不会反复弹授权。
- 前端和外部 Agent 带 Bearer 令牌访问同域 API `/api/com.ictrek.v-office/api/v1`（Traefik 剥网关前缀后转发到存储服务）；存储服务每次请求调 VOS `/v1000/oauth2/userinfo` 校验令牌（带短 TTL 用户名缓存），取不到有效用户即 401。
- VOS 自动分配 `VOS_APP_STORAGE_PATH`，安装页不再要求用户指定文档目录；每个 VOS 用户只访问其中 `documents/<用户名>/` 目录。该目录不会出现在 VOS 公共文件中，文件名仍经过 Office 后缀白名单与路径穿越校验。
- 新文档第一次保存（Ctrl+S）时直接要求输入文件名，随后保存覆盖同一文件；上传失败时保持保存错误，不会改成浏览器下载。编辑器右上角提供关闭当前文档按钮。
- 独立部署（非 VOS iframe）检测不到 `window.vos_platform`，「我的文档」入口自动隐藏，应用回到本地优先行为（IndexedDB / 本地文件句柄）。

## 安装配置

- 文档目录无需配置：VOS 自动注入 `VOS_APP_STORAGE_PATH`，应用固定使用其 `documents/` 子目录。
- `VOS_OIDC_USERINFO_URL`（默认 `http://172.17.0.1:8105/v1000/oauth2/userinfo`）：存储服务校验令牌的 VOS 地址，默认适配 VOS backend host 网络 `SITE_PORT=8105` 部署，一般不改。
- `V_OFFICE_WOPI_SECRET`：存储服务为 Collabora 签发 WOPI access_token 的 HMAC 密钥，只在本服务内校验（Collabora 只回传令牌、不解析）。留空用镜像内的开发默认值，生产部署建议填一段随机字符串。
- Collabora 相关地址无需配置，由 compose 固定：storage 的 `V_OFFICE_WOPI_PUBLIC_BASE` 与 Collabora 的 `aliasgroup1` 都取服务别名 `http://v-office-storage:5000`（两者必须一致），下发给浏览器的 `V_OFFICE_COLLABORA_URL` 取相对路径 `/app/com.ictrek.v-office/cool`。
- 共享目录无需配置：授权在平台侧完成（应用管理页的「数据访问授权」，可选「公共目录」或「用户数据」，访问权限选「读写」），VOS 把授权结果注入 `VOS_APP_EXPOSED_PATH`，compose 以读写方式挂到 storage 容器的 `/exposed:rslave`；应用只负责列出、打开并写回其中的文档，不参与授权决策。要让共享盘只读，把挂载改成 `:rslave,ro` 或设 `V_OFFICE_SHARED_WRITABLE=0`，此时保存会报错且不改动原文件。目录未授权、未挂载时首页不显示该入口。

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `README.md` | 本文件，VOS app 打包与发布主入口。 |
| `VERSION` | 当前 VOS 包版本，由 `update_version.sh` 递增。 |
| `src/manifest.yml` | 应用元数据（id、分类 `office`、profiles、frontend basePath、oauth2 client）。 |
| `src/docker-compose.yml` | web + storage + collabora 三服务定义，Traefik 路由与 `vos_default` 外部网络。 |
| `src/routers.yml` | 侧边栏导航：`com-ictrek-v-office` 组 + `v-office` 页面。 |
| `src/configs.yml` | 安装配置：VOS OIDC userinfo 地址与 WOPI 签名密钥；文档目录由平台自动分配。 |
| `src/README.zh-CN.md` / `src/README.en.md` | 打进安装包的应用商店简版说明。 |
| `src/icon.png` | 应用图标（256x256 PNG，由上游 `public/logo.svg` 渲染）。 |
| `scripts/package.sh` | pull 模式打包脚本（读飞书版本 → 渲染 → 打 tar → 自校验）。 |
| `scripts/update_version.sh` | 递增版本并推送 `vos-v-office-v{version}` 触发 tag。 |
| `../server/`（fork 内） | 逐用户存储服务源码（FastAPI + Dockerfile），同时是 Collabora 的 WOPI host。 |
| `../collabora/`（fork 内） | Collabora 镜像定义（基础镜像 + `extra_params` 固化，见文件内注释）。 |

## 与上游的差异

上游同步原则见仓库根目录 `UPSTREAM` 文件。当前 fork 相对上游 `baotlake/office-website` 的差异：

- `next.config.ts`：新增 `basePath: process.env.NEXT_PUBLIC_BASE_PATH || ""`，用于 VOS 子路径部署；不设置该环境变量时行为与上游一致。
- `Dockerfile`：builder stage 新增 `ARG NEXT_PUBLIC_BASE_PATH` 透传，并把 `NEXT_PUBLIC_APP_ROOT` 改为 `${NEXT_PUBLIC_BASE_PATH}/v${DS_VERSION}-${HASH}`；不传该参数时与上游产物一致。
- `server/`：新增应用私有存储中的逐用户文档服务（仅 VOS 部署使用）。
- `utils/vos/`：新增 VOS OIDC Fastpath 静默认证与文档存储客户端。
- `utils/editor/collabora.ts`：新增 Collabora（WOPI）客户端——Word 文档改用 Collabora 内核打开，本地文件先原样推入应用私有存储再换会话，取不到会话自动回退 OnlyOffice。
- `collabora/`：新增 Collabora 镜像定义（上游 `collabora/code` + 固化的 `extra_params`）。
- `server/main.py`：新增 WOPI host（`/api/v1/wopi/session` 签发一次性令牌、`/wopi/files/...` 读写文档）。
- `server/main.py`：新增共享源接口——`GET /api/v1/sources` 列源（含解析后的授权目录 `roots`）、`GET /api/v1/sources/{s}/entries` 列目录、`GET|PUT /api/v1/sources/{s}/file` 读/写文档（PUT 即"编辑原文档"，写回共享盘原路径）；带路径穿越与软链逃逸校验，只收 Office/PDF 后缀，可用 `V_OFFICE_SHARED_ROOT` 改挂载点、`V_OFFICE_SHARED_WRITABLE=0` 强制只读。
- `server/main.py`：授权目录解析——按平台语义把挂载点解析成「公共目录」（`public`）与「用户数据（<用户名>）」（`users/<用户名>/data`）两个入口，并按真实路径去重（平台同时挂 `<空间>` 与 `volumes/<别名>` 软链）；界面不出现 `volumes/<随机ID>` 等平台内部路径。
- `server/main.py`：WOPI 令牌支持共享源（令牌里带 `s` 源标识，`name` 即源内相对路径），Word 文档由 Collabora 通过 WOPI 直接读写共享盘上的原文件；`/wopi/files/{name:path}` 承接多级路径。
- `utils/vos/storage.ts`：新增共享源客户端（`listSharedSources` / `browseSharedSource` / `openSharedDocument` / `saveSharedDocument`）。
- `hooks/use-shared-documents.ts`：新增共享目录页签数据源——每个授权目录（目录名即页签名，如 media_video；NAS 同理）一个页签，管理其内容的逐层进入与返回；完全空的授权目录不占页签。
- `components/main/open-view.tsx`：新增"我的文档"列表以及逐文件打开、下载、删除操作（VOS 模式才显示）；同一区块内以页签区分「我的文档」（私有目录）与每个已授权的共享目录，共享目录里的文档打开即可编辑、保存写回原文件。
- `components/main/api-guide-view.tsx`：新增 API 接入指南，包含版本化接口、认证说明和可复制的 Agent 调用示例。
- `utils/editor/server.ts`：保存时 VOS 模式改为自动入云，新文档首次保存先命名；打开共享源文档时记录保存落点，保存写回原文件；打开文档时保留转换前的原始字节，供 Collabora 内核前推入存储。
- `app/editor/page.tsx`：新增首次保存命名对话框和关闭当前文档按钮。
- `package.json`：新增 `js-sha256` 依赖（PKCE S256，兼容非 HTTPS 门户）。
- `messages/*.json`：新增 `myDocs*` 文案键（"我的文档"入口）（en/zh-CN/zh-TW 译文，其余 locale 暂用英文兜底）。
- `ictrek.app/`、`UPSTREAM`、`.dockerignore`（排除 ictrek.app、UPSTREAM 与 server/）：ictrek 新增，上游合并时保留。

## VOS 子路径适配

VOS 网关把 `/app/com.ictrek.v-office/` 前缀剥离后转发到容器，但浏览器端资源 URL 是按 HTML 所在路径解析的。因此 VOS 专用镜像必须在构建时注入两个变量（普通镜像保持默认，即根路径部署）：

- `NEXT_PUBLIC_BASE_PATH=/app/com.ictrek.v-office`：Next.js `basePath`，让 `/_next/*` 等资源引用带上子路径。
- `NEXT_PUBLIC_APP_ROOT=/app/com.ictrek.v-office/v${DS_VERSION}-${HASH}`：OnlyOffice 资源根（构建参数自动拼接），让 fonts / sdkjs / web-apps 请求也带上子路径。

容器侧无需任何改动：Traefik `stripprefix` 剥掉前缀后，Caddy 仍按根路径服务，Caddyfile 的 x2t / 版本化资源缓存规则照常生效。

已知残余问题：`components/install-extension-dialog.tsx` 中 `window.location.href = "/"` 在子路径部署时会跳到门户根路径；如需修复，在 fork 内把该跳转改为 basePath 感知。

## Collabora 的网关路由（为什么除了应用前缀还要占根路径）

Word 文档的编辑器 iframe 加载的是 `/app/com.ictrek.v-office/cool/browser/<hash>/cool.html`（前缀入口，Traefik `stripprefix` 后转给 Collabora）。但 Collabora 返回的页面有三个硬约束：

- 资源引用是**根绝对路径**（`/browser/<hash>/bundle.js`、`.../bundle.css`、`.../l10n/*`）；
- WebSocket 走根路径 `/cool/ws`；
- 响应头带 `Referrer-Policy: no-referrer`。

前两条意味着这些请求不会带应用前缀；第三条意味着**没法像 `v-chatcut` 那样用 `Referer` 正则把根路径限定给本应用**（已实测：请求里没有 Referer）。因此 compose 里除了前缀入口 `-collab`（priority 1100），还有一条根路径路由 `-collab-root`（priority 1090）：

```
PathPrefix(`/browser`) || PathPrefix(`/cool`) || PathPrefix(`/hosting`) || PathPrefix(`/lool`)
```

- 实测本版本只用到 `/browser`（静态资源）与 `/cool`（WebSocket）；`/hosting`（discovery）与 `/lool`（旧版 WS 路径）同属 Collabora 自身路径，一并挂上以防升级换路径。
- 这四个前缀目前没有其它应用占用。新增应用若也要占用，需要同步调整——Traefik 里同 rule 的路由会互相抢流量。
- 前缀入口的 priority 必须高于 web 的 `-top-open`（1000）：后者对同一前缀按 `Sec-Fetch-Dest=document` 匹配并重定向到门户路由，直接打开 `cool.html` 时会被它截走。
- Collabora 侧不需额外开关：`net.proxy_prefix` 实测不改变上述绝对路径，因此没有启用它；镜像里固化 `--o:ssl.enable=false --o:net.proto=IPv4 --o:ssl.termination=true`（见 `collabora/Dockerfile`）。其中 `ssl.termination=true` 不可省：网关终止 TLS 后 coolwsd 必须知道对外是 HTTPS，否则它产出 `ws://`，而页面是 HTTPS 加载的，浏览器会抛 `SecurityError` 拒绝建立 WebSocket。

## 镜像构建与发布流程

镜像构建需要在有 Docker 的构建机上执行（无 CUDA 参与，amd 用 x86_64 构建机 tc232，arm 用 aarch64 构建机 tc35（远程/居家）或 tc192（办公室内网），l4t 为 tc912）。仓库根目录 `build_image.sh` 按 WeKnora 构建规则完成：基础镜像拉取（带国内镜像源回退）→ 构建三个镜像 → 推送 SWR → 按飞书规则写回发布表（列不存在则追加列，日期行不存在则在 A4 插入新行）。

```bash
# amd 构建机（tc232）
FEISHU_CONFIG_FILE=/home/jhu/.feishu.components.json ./build_image.sh --target amd

# arm 构建机（tc192）
FEISHU_CONFIG_FILE=/home/jhu/.feishu.components.json ./build_image.sh --target arm
```

产物：

- `swr.cn-southwest-2.myhuaweicloud.com/ictrek/v-office:{amd|arm}_${YYYYMMDD}`（web，注入 `NEXT_PUBLIC_BASE_PATH=/app/com.ictrek.v-office`）
- `swr.cn-southwest-2.myhuaweicloud.com/ictrek/v-office-storage:{amd|arm}_${YYYYMMDD}`（storage，兼 WOPI host）
- `swr.cn-southwest-2.myhuaweicloud.com/ictrek/v-office-collabora:{amd|arm}_${YYYYMMDD}`（collabora，Word 内核；基础镜像 `collabora/code` 同时提供 amd64 / arm64）

可选开关：`--web-only` / `--storage-only` / `--collabora-only` / `--no-push` / `--no-feishu` / `--feishu-only` / `--dry-run` / `--tag` / `--sheet`；`V_OFFICE_DS_VERSION`、`V_OFFICE_ASSET_HASH` 控制 OnlyOffice 资源版本目录，`V_OFFICE_COLLABORA_VERSION` 控制 Collabora 基础镜像版本（默认 `latest`，生产建议锁定具体版本）。

发布步骤：

1. 镜像推送 SWR 后，在飞书发布表 `AMD_with_cuda`、`ARM_with_cuda` 各新建 `v-office`、`v-office-storage` 和 `v-office-collabora` 三列并写入 tag（Row 1 = 服务名，Row 2 = SWR 仓库 URI，日期行 = tag）。
2. 提交应用代码改动，保持工作树干净。
3. `./ictrek.app/scripts/update_version.sh [patch|minor|major]` —— 递增 `VERSION`、创建并推送 `vos-v-office-v{version}` 触发 tag。
4. GitHub Actions（`.github/workflows/vos-release.yml`）读取飞书版本、打包 `v-office_{version}_pull.tar`、创建公开 tag `v{version}` 与 release，并发布到 VOS App Store。
5. 发布后用 `gh run list` / `gh run view --log-failed` 确认 CI 成功，不要默认成功。
