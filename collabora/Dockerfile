# ============================================================
# Collabora Online —— Word 文档（doc/docx）的编辑器内核
# ============================================================
#
# 为什么需要这个服务：
#   OnlyOffice 内核对 WPS 导出的复杂表单类 Word 文档渲染保真度不足：
#   表格列宽错乱、页眉浮动对象被当成正文环绕障碍、Wingdings 复选框退化成
#   乱码字符。实测 Collabora（LibreOffice 内核）能正确还原这类文档，
#   因此 Word 文档改由它渲染；Excel/PPT 等仍走原有 OnlyOffice 链路。
#
# 为什么必须独立部署（不能像 sdkjs 那样内嵌前端）：
#   Collabora 服务端是 coolwsd + LibreOffice（体量巨大的 C++ 原生代码），
#   无法编译成 wasm 在浏览器运行；每个打开的文档会 fork 一个 LibreOffice
#   进程。因此它天然是「服务端渲染 + 前端当客户端」的架构。
#
# 与 v-office-storage 的关系（WOPI）：
#   Collabora 不接触用户凭证。前端先向 storage 换一次性 access_token，
#   Collabora 再拿它回调 storage 的 /wopi/files/... 读写文档。
#
# 运行时必须由部署平台注入（随环境而异，不能写死）：
#   aliasgroup1=<storage 的 WOPI 地址>
#       Collabora 只允许回调白名单内的 WOPI host。取值为 storage 服务
#       对 Collabora 可达的地址，例如 http://v-office-storage:5000
#   与之配套，storage 侧需设置：
#   V_OFFICE_WOPI_PUBLIC_BASE=<同一地址>
#       storage 用它拼给 Collabora 的 WOPISrc，两边必须一致。
#   V_OFFICE_COLLABORA_URL=<浏览器可达的 Collabora 地址>
#       storage 用它向浏览器下发编辑器地址。
#
# 必须保留的默认参数：
#   --o:net.proto=IPv4    Collabora 默认同时监听 IPv6；容器内 IPv6 不可用时
#                         会以 EBADF 直接退出（Exited 70），必须钉成 IPv4。
#   --o:ssl.enable=false  由 VOS 网关终止 TLS，容器内走明文 HTTP，
#                         避免自签证书导致浏览器侧连接失败。
#   --o:ssl.termination=true
#                         告诉 coolwsd「对外这一跳是 HTTPS」。只设 ssl.enable=false
#                         时 coolwsd 认为对外是 http，产出的 CSP 与前端连接都用
#                         ws://；而页面是经网关以 HTTPS 加载的，浏览器会直接抛
#                         SecurityError: An insecure WebSocket connection may not
#                         be initiated from a page loaded over HTTPS，编辑器卡在
#                         连接中。实测对照（同一镜像、Host 相同）：
#                           不加 -> connect-src ws://<host> http://<host>
#                           加上 -> connect-src wss://<host> https://<host>
#
# ------------------------------------------------------------
# 前端补丁：让 WebSocket 协议跟着「页面实际协议」走
# ------------------------------------------------------------
#
# 背景：ssl.termination 是**全局静态**开关，coolwsd 一旦开启就无条件认为
# 客户端在 HTTPS 上，它把 host 以 `data-host="wss://<host>"` 注入编辑器页面，
# 客户端（/browser/<hash>/global.js）据此用 wss:// 连 WebSocket。VOS 同时提供
# 明文入口（web-internal，宿主 1182）与 TLS 入口（web，宿主 1180）：从明文入口
# 打开时，浏览器拿 wss:// 去连一个不说 TLS 的端口，握手必然失败，编辑器报
# 「无法建立网络连接或网络连接被意外关闭。反向代理可能配置错误」。
#
# 上游把这段判断写死在编译进 coolwsd 的配置读取里（COOLWSD::isSSLTermination()
# -> ConfigUtil::isSSLTermination()，无请求参数），改它必须重编引擎；而真正决定
# 浏览器行为的这段逻辑在**前端 JS 资源**里，可以在这里就地修正：
#
#   patch 1  global.js：window.host 的协议按页面协议归一
#            （HTML 注入的 data-host 可能是 wss://，要改回页面实际的 ws://）
#   patch 2  global.js：_codaRemoteInfo 分支里的协议同样改为按页面协议判断
#
# 效果：https 入口行为完全不变（页面是 https -> 仍用 wss://）；
#       http 入口改为 ws://，与明文入口自洽，编辑器可正常打开与协同。
#
# 两个前提说清楚：
#   1. 这是贴着上游前端资源做的补丁：上游改了这段 JS，下面的断言会让**构建
#      直接失败**（而不是悄悄产出坏镜像）。届时重新对齐 sed 目标即可。
#   2. 基础镜像 collabora/code 内没有 shell，所以改文件只能在别的阶段做，
#      再把改好的文件 COPY 进最终镜像。
#
# ------------------------------------------------------------
# 构建方式（build_image.sh 不再构建本镜像，需按架构分别构建）
# ------------------------------------------------------------
#
#   amd64（在 x86_64 机器上执行；tag 日期按发布日改）：
#     docker build \
#       --build-arg COLLABORA_BASE=swr.cn-southwest-2.myhuaweicloud.com/ictrek/collabora-code:latest \
#       --build-arg NODE_IMAGE=swr.cn-southwest-2.myhuaweicloud.com/ictrek/node:22-alpine \
#       -t swr.cn-southwest-2.myhuaweicloud.com/ictrek/v-office-collabora:amd_<YYYYMMDD> .
#     docker push swr.cn-southwest-2.myhuaweicloud.com/ictrek/v-office-collabora:amd_<YYYYMMDD>
#
#   arm64（可在 x86_64 机器上跨架构构建，不需要 arm 机器；qemu 由 buildx 处理）：
#     docker buildx build --platform linux/arm64 \
#       --build-arg COLLABORA_BASE=swr.cn-southwest-2.myhuaweicloud.com/ictrek-arm/collabora-code:latest \
#       --build-arg NODE_IMAGE=swr.cn-southwest-2.myhuaweicloud.com/ictrek/node:22-alpine \
#       -t swr.cn-southwest-2.myhuaweicloud.com/ictrek/v-office-collabora:arm_<YYYYMMDD> --push .
#
#   注意：两个架构的基座要取同一版本（ictrek/ 与 ictrek-arm/ 下的
#   collabora-code 版本需一致），否则同一份文档在两个架构上的渲染内核会不同。
#   构建完可这样核对两边产物是否一致：
#     docker create <镜像> && docker cp <容器>:/usr/share/coolwsd/browser/dist/global.js -
#     cmp <amd 的 global.js> <arm 的 global.js>

ARG COLLABORA_BASE=collabora/code:latest
ARG NODE_IMAGE=node:22-alpine

# ------------------------------------------------------------
# 阶段 1：从基础镜像里取出要改的前端资源
# ------------------------------------------------------------
FROM ${COLLABORA_BASE} AS src

# ------------------------------------------------------------
# 阶段 2：打补丁 + 校验（这里必须有 shell 与 node，所以用 node 镜像）
#
# node --check 是必须的：这段 JS 是压缩过的单行代码，sed 少匹配一段
# （例如漏掉 `t.` 前缀）就会产出语法错误，整份 global.js 解析失败、
# 页面直接白屏。构建期拦住它，比上线后排查便宜得多。
#
# 固定跑在 BUILDPLATFORM（构建机架构）上，不跟目标架构走：
#   ① 这一阶段只做 sed + node --check，输入输出都是纯文本，产物与该阶段
#      的架构无关；
#   ② 打补丁用的 node 基础镜像只有 amd64 一种，若跟着 TARGETPLATFORM 走，
#      构建 arm64 时会因为拉不到 arm64 的 node 而直接失败。
# 目标架构由 src / 最终阶段（FROM ${COLLABORA_BASE}）决定。
# ------------------------------------------------------------
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS patcher

COPY --from=src /usr/share/coolwsd/browser/dist/global.js /work/global.js

RUN set -eux; \
    sed -i 's#t\.coolServer\.startsWith("https:")?"wss:":"ws:"#(window.location.protocol==="https:")?"wss:":"ws:"#' /work/global.js; \
    sed -i 's#window\.host=s\.dataset\.host#window.host=(s.dataset.host||"").replace(/^(ws|wss):/i,location.protocol==="https:"?"wss:":"ws:").replace(/^(http|https):/i,location.protocol==="https:"?"https:":"http:")#' /work/global.js; \
    node --check /work/global.js; \
    grep -q '(window.location.protocol==="https:")?"wss:":"ws:"' /work/global.js; \
    ! grep -q 't\.coolServer\.startsWith' /work/global.js; \
    grep -q 'window\.host=(s\.dataset\.host||"")' /work/global.js; \
    ! grep -q 'window\.host=s\.dataset\.host' /work/global.js

# ------------------------------------------------------------
# 阶段 3：最终镜像（仍是 collabora 基础镜像，只换掉那一个前端资源）
# ------------------------------------------------------------
FROM ${COLLABORA_BASE}

COPY --from=patcher /work/global.js /usr/share/coolwsd/browser/dist/global.js

# ------------------------------------------------------------
# PI 扩展（官方 Extension，不是补丁）
#
# 26.04 起 coolwsd 自带扩展机制，且本镜像默认就开着：
#   - coolwsd.xml 的 <experimental_features> 默认 true，
#     渲染 cool.html 时替换 %EXPERIMENTAL_FEATURES%，前端拿到
#     window.enableExperimentalFeatures === true（curl 出来的页面里
#     data-enable-experimental-features = "true" 可核对）；
#   - 镜像 dist 里已经带官方扩展 SDK：browser/dist/extensions/cool.js；
#   - 前端在**文档加载完成后**（ServerConnectionService.onDocumentLoaded
#     → L.loadExtensions）依次 fetch：
#         extensions/index.json                  → 扩展 id 列表
#         extensions/<id>/manifest.json          → 清单（manifestVersion 必须 "0.1"）
#         extensions/<id>/<manifest.entry>       → 扩展自己的面板页（iframe）
#     加载后出现在菜单栏的 Extensions 菜单与 notebookbar 的 Extensions 标签页，
#     点开在侧边栏插入一个可折叠面板，里面就是那个 iframe。
#
# 为什么必须是构建期 COPY（而不是部署后拷进容器）：
#   coolwsd 启动时把整个 dist 目录预读进内存（启动日志：
#   `Caching files in [.../dist/extensions]` / `Pre-read N file(s) from directory`），
#   运行期才出现的文件不会被收录。实测：docker cp 拷进去，即使重启容器，
#   /browser/<hash>/extensions/index.json 仍然 404（对照实验：把同样的文件
#   在容器**启动前**挂载进去，四个文件全部 200）。
#
# 目录约定见 collabora/extensions/：
#   extensions/index.json          ["pi"]
#   extensions/pi/manifest.json    {manifestVersion,name,entry,icon,supports}
#   extensions/pi/index.html       面板本体（自带样式，无外部依赖）
#   extensions/pi/dialog.html      面板通过 Extension_ShowDialog 打开的对话框
#   extensions/pi/icon.svg         notebookbar/菜单里的图标
#
# 面板与编辑器之间只有一条通道：JSON 字符串 postMessage。
# 面板 → 编辑器：Extension_Call / Extension_ProxyReturn / Extension_ShowDialog /
#                 Extension_Resize / Extension_Close / Extension_TeardownDone
# 编辑器 → 面板：Extension_DocumentEvent / Extension_ProxyCall /
#                 Extension_CallResult / Extension_DialogResult / Extension_Teardown
# 官方还提供 helpers（browser/dist/extensions/cool.js，挂 window.cool）
# 封装了 call / proxy / dialog 三种用法，PI 面板后续接真逻辑时用它更省事。
# ------------------------------------------------------------
COPY extensions/ /usr/share/coolwsd/browser/dist/extensions/

# 中文字体：镜像里 fontconfig 只扫 /usr/share/fonts 等**并不存在**的目录，
# 看不到 LO 自带的 Noto Serif SC / Noto Sans SC（在
# /opt/collaboraoffice/share/fonts/truetype 下），于是文档请求「宋体」的正文
# 会落到纯拉丁替身上 —— 中文整段不画（屏幕/PDF 都只剩数字）。
# 这个 conf 把那个目录纳入扫描并把宋体/黑体映射过去；详细原因见文件内注释。
COPY 99-voffice-cjk.conf /etc/fonts/conf.d/99-voffice-cjk.conf

# 参数以环境变量形式固化；部署时可在平台侧覆盖（例如追加字体或调整 AS）。
ENV extra_params="--o:ssl.enable=false --o:net.proto=IPv4 --o:ssl.termination=true"

EXPOSE 9980
