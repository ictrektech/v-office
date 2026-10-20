# Base image reference. Defaults to the upstream image; release builds
# override it with the SWR mirror (ictrek / ictrek-arm orgs).
ARG BASE_IMAGE=python:3.12-slim
ARG PI_NODE_IMAGE=node:22-slim

# =============================================================================
# AI 运行时（Pi agent）——只借它的独立 bundle
# =============================================================================
# 只用 dist/bundle/cli.js（esbuild 打包，自带依赖，实测无 node_modules 也能跑），
# 所以这里复制「node 二进制 + 26MB 包」，而不是整棵 node_modules（166MB）。
# 版本钉死：上游是社区项目，行为随版本漂移，升级要显式改这个 ARG。
FROM ${PI_NODE_IMAGE} AS pi
ARG NPM_REGISTRY=https://registry.npmjs.org
ARG PI_VERSION=1.1.0
RUN npm install -g --ignore-scripts --no-fund --no-audit \
      --registry="${NPM_REGISTRY}" \
      "@earendil-works/pi-coding-agent@${PI_VERSION}" \
 && node --version \
 && test -f /usr/local/lib/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js

FROM ${BASE_IMAGE}

WORKDIR /app

# apt 源。国内构建必配：官方 deb.debian.org 实测 1500s 还在爬 Packages 索引
# （libreoffice-writer 是这一步的大头，几百 MB），换清华源同样的 update 只要 3s。
# 置空 APT_MIRROR="" 即回退官方源（境外构建机或镜像已就位时用）。
#
# 必须早于**任何** apt-get：下面 playwright 的 --with-deps、arm64 装 chromium
# 都会跑 apt，写晚了它们仍然去打 deb.debian.org。
# 基础镜像是 deb822 格式（/etc/apt/sources.list.d/debian.sources，没有
# sources.list），所以换源改的是 URIs 行；先替 debian-security 再替 debian，
# 前者含后者前缀。
ARG APT_MIRROR=https://mirrors.tuna.tsinghua.edu.cn
RUN set -eux; \
    if [ -n "${APT_MIRROR}" ]; then \
        sed -i \
            -e "s|http://deb.debian.org/debian-security|${APT_MIRROR}/debian-security|g" \
            -e "s|http://deb.debian.org/debian|${APT_MIRROR}/debian|g" \
            /etc/apt/sources.list.d/debian.sources; \
    fi

COPY requirements.txt ./

# PyPI index override for mirror-rich environments (defaults to upstream).
ARG PIP_INDEX_URL=https://pypi.org/simple
RUN pip install --no-cache-dir -i "${PIP_INDEX_URL}" -r requirements.txt

# 技能包脚本自己要用、但不属于服务端运行时的依赖。构建时一次装好，
# agent 的 bash 才能直接跑 tools/*.py：
#   - pymupdf：解析 PDF（材料原件、审查意见通知书）
#   - chromium：mermaid_render.py / browser.py 要驱动真浏览器（画框图、查国知局）。
#     playwright 这个包本身在 requirements.txt 里，这里补的是它要驱动的那台"浏览器"。
#
# 两种架构都要有浏览器，只是来源不同，功能一致：
#   amd64 —— Playwright 自带的那份（官方支持 Debian，--with-deps 一并装系统依赖）
#   arm64 —— Playwright 不发布 Debian arm64 构建（官方只覆盖 Ubuntu 22.04/24.04），
#            改用发行版的 chromium 包；tools/browser.py 会用 executable_path
#            把它接上，走同一个启动路径、同一套能力。
RUN pip install --no-cache-dir -i "${PIP_INDEX_URL}" pymupdf \
 && if [ "$(dpkg --print-architecture)" = "amd64" ]; then \
        python -m playwright install --with-deps chromium; \
    else \
        apt-get update \
        && apt-get install -y --no-install-recommends chromium \
        && rm -rf /var/lib/apt/lists/*; \
    fi

# LibreOffice headless：只服务 OnlyOffice 路线的老 .doc 往返（x2t 读不好也写不了
# 老二进制）。老 ppt / xls 不走这条路——它们默认交给 Collabora（服务端 LibreOffice，
# 自带全部过滤器），所以这里不需要 impress / calc。
RUN set -eux; \
    apt-get update && apt-get install -y --no-install-recommends \
        libreoffice-writer \
        poppler-utils \
        fonts-noto-cjk \
        iptables \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# OfficeCLI：软著 skill 的 DOCX 后端（固定 1.0.151）。直接用官方 release 的
# 预编译二进制 + SHA256 校验，**不用 install.sh**——那个脚本写 ~/.local 并依赖
# 运行时联网，而 agent 是断网降权的独立 uid，装也装不上。
# 软著的页数不走它的 --page-count（非 Windows 是估算），用下面的 LibreOffice。
ARG OFFICECLI_VERSION=1.0.151
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
        amd64) asset="officecli-linux-x64" ;; \
        arm64) asset="officecli-linux-arm64" ;; \
        *) echo "unsupported arch for officecli: $arch" >&2; exit 1 ;; \
    esac; \
    base="https://github.com/iOfficeAI/OfficeCLI/releases/download/v${OFFICECLI_VERSION}"; \
    curl -fsSL --retry 3 -o /usr/local/bin/officecli "${base}/${asset}"; \
    curl -fsSL --retry 3 -o /tmp/SHA256SUMS "${base}/SHA256SUMS"; \
    expected="$(awk -v a="$asset" '$2 == a || $2 == "*"a {print $1}' /tmp/SHA256SUMS)"; \
    echo "${expected}  /usr/local/bin/officecli" | sha256sum -c -; \
    chmod +x /usr/local/bin/officecli; \
    rm -f /tmp/SHA256SUMS; \
    OFFICECLI_SKIP_UPDATE=1 officecli --version

# AI 运行时：node + pi bundle（见上面的 pi 阶段说明）
COPY --from=pi /usr/local/bin/node /opt/pi-node/node
COPY --from=pi /usr/local/lib/node_modules/@earendil-works/pi-coding-agent /opt/pi
RUN printf '#!/bin/sh\nexec /opt/pi-node/node /opt/pi/dist/bundle/cli.js "$@"\n' \
      > /usr/local/bin/pi \
 && chmod +x /usr/local/bin/pi /opt/pi-node/node \
 && ln -sf /opt/pi-node/node /usr/local/bin/node \
 && /usr/local/bin/pi --version

# 专利技能（AgentSkills 包）：打包脚本会把 patent-disclosure-skill 的 skills/
# 拷到 server/skills/ 再构建；仓库里该目录只有一份说明文件，缺技能时 AI 仍可用、
# 只是没有专用技能。
COPY skills/ /opt/patent-skills/

# 一次性拷全部模块。**不要退回逐个列文件**：显式列表已经漏过一次——`safe_fs.py`
# 和 `docx_revise.py` 都是 ai.py 顶部的硬 import，漏了容器一起来就 ModuleNotFoundError，
# 而本地跑源码完全看不出来。哪些 .py 不该进镜像交给 .dockerignore 排除，
# 而不是指望"以后加文件的人记得在这里补一行"。
COPY *.py ./

ENV DATA_ROOT=/data
ENV VOS_OIDC_USERINFO_URL=http://172.17.0.1:8105/v1000/oauth2/userinfo
# AI：工作目录放应用私有存储的隐藏目录（不会出现在「我的文档」里），
# 技能从镜像内读，并发默认 3（可用环境变量覆盖，用户也能在设置里限自己的并发）。
ENV V_OFFICE_AI_HOME=/data/.ai \
    V_OFFICE_AI_SKILLS=/opt/patent-skills \
    V_OFFICE_AI_PI_BIN=/usr/local/bin/pi \
    V_OFFICE_AI_CONCURRENCY=3 \
    V_OFFICE_AI_UID_BASE=20000 \
    V_OFFICE_AI_MAX_ARCHIVE=209715200 \
    V_OFFICE_AI_MAX_PROJECT_BYTES=1073741824 \
    V_OFFICE_AI_MAX_PROJECT_FILES=20000

# OfficeCLI 不许自更新、不许常驻：同一份材料必须每次生成出同样的结果
ENV OFFICECLI_SKIP_UPDATE=1 \
    OFFICECLI_NO_AUTO_RESIDENT=1

EXPOSE 5000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
