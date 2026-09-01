#!/usr/bin/env bash
# =============================================================================
# 同步 AI 助手插件到 public/ai-assistant（本地 dev 用镜像副本）
# =============================================================================
# 插件的唯一源是 agentic-search 仓库的 web/public/plugins/agentic-search。
# 本目录不进 git（.gitignore），每台开发机克隆后跑一次本脚本生成本地副本；
# 生产/VOS 不用它（插件由 agentic-search 应用经网关托管）。
#
# 用法：在 agentic-search 改完插件后执行
#   ./scripts/sync-ai-assistant.sh [agentic-search 仓库路径]
# 路径缺省为与本仓库同级的 ../agentic-search
# =============================================================================
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
SRC="${1:-$(dirname "$REPO_ROOT")/agentic-search/web/public/plugins/agentic-search}"
DST="${REPO_ROOT}/public/ai-assistant"

[[ -d "$SRC" ]] || { echo "源目录不存在: $SRC" >&2; exit 1; }

mkdir -p "$DST"
rm -rf "${DST:?}/"*
cp -RL "$SRC/." "$DST/"
echo "已同步 ${SRC} → ${DST}"
