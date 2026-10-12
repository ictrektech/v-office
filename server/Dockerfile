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

COPY requirements.txt ./

# PyPI index override for mirror-rich environments (defaults to upstream).
ARG PIP_INDEX_URL=https://pypi.org/simple
RUN pip install --no-cache-dir -i "${PIP_INDEX_URL}" -r requirements.txt

# LibreOffice headless：只服务 OnlyOffice 路线的老 .doc 往返（x2t 读不好也写不了
# 老二进制）。老 ppt / xls 不走这条路——它们默认交给 Collabora（服务端 LibreOffice，
# 自带全部过滤器），所以这里不需要 impress / calc。
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer \
    && rm -rf /var/lib/apt/lists/*

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

COPY main.py ./
COPY ai.py ./
# 材料解析（agent 不接触用户文件，docx/pdf/pptx/xlsx 都在这里变成文本）
COPY extract_text.py ./

ENV DATA_ROOT=/data
ENV VOS_OIDC_USERINFO_URL=http://172.17.0.1:8105/v1000/oauth2/userinfo
# AI：工作目录放应用私有存储的隐藏目录（不会出现在「我的文档」里），
# 技能从镜像内读，并发默认 3（可用环境变量覆盖，用户也能在设置里限自己的并发）。
ENV V_OFFICE_AI_HOME=/data/.ai \
    V_OFFICE_AI_SKILLS=/opt/patent-skills \
    V_OFFICE_AI_PI_BIN=/usr/local/bin/pi \
    V_OFFICE_AI_CONCURRENCY=3 \
    V_OFFICE_AI_UID_BASE=20000

EXPOSE 5000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
