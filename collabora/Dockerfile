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

ARG COLLABORA_BASE=collabora/code:latest
FROM ${COLLABORA_BASE}

# 参数以环境变量形式固化；部署时可在平台侧覆盖（例如追加字体或调整 AS）。
ENV extra_params="--o:ssl.enable=false --o:net.proto=IPv4"

EXPOSE 9980
