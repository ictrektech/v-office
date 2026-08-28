#!/usr/bin/env bash
set -euo pipefail

# Build and push the ictrek ZIZIYI Office service images.
#
# The Feishu release table uses one service column per image. The same release
# tag is written to each service that is built:
#   swr.cn-southwest-2.myhuaweicloud.com/ictrek/ziziyi-office:<tag>
#   swr.cn-southwest-2.myhuaweicloud.com/ictrek/ziziyi-office-storage:<tag>
#
# Pure CPU images (static frontend + small Python storage service) — no CUDA
# involved; amd builds on x86_64 hosts, arm builds on aarch64 hosts.

# App images always live under the ictrek org with the architecture in the
# tag (amd_YYYYMMDD / arm_YYYYMMDD) — the single-repo convention package.sh
# uses when composing image references from the Feishu table. Shared base
# images are cached per architecture: ictrek (amd) / ictrek-arm (arm).
APP_REGISTRY_PREFIX="swr.cn-southwest-2.myhuaweicloud.com/ictrek"
BASE_REGISTRY_PREFIX=""
WEB_IMAGE=""
STORAGE_IMAGE=""

FEISHU_CONFIG_FILE="${FEISHU_CONFIG_FILE:-${HOME}/.feishu.json}"
FEISHU_SPREADSHEET_TOKEN="Htotsn3oahO1zxt73YMcaB1zn8e"
TARGET="${ZIZIYI_BUILD_TARGET:-}"
TARGET_SHEET_SPEC="${FEISHU_SHEET_TITLE:-}"
PROFILE_TAG=""
TARGET_SHEET_TITLES=()

# OnlyOffice DocumentServer assets version baked into the web image; keep in
# sync with the upstream Dockerfile default.
DS_VERSION="${ZIZIYI_DS_VERSION:-9.3.1}"
# Cache-bust revision for the versioned OnlyOffice asset directory.
HASH="${ZIZIYI_ASSET_HASH:-1}"
# VOS serves the app under /app/com.ictrek.ziziyi-office after stripping the
# prefix; root-path deployments build with NEXT_PUBLIC_BASE_PATH="".
NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/app/com.ictrek.ziziyi-office}"

BUILD_WEB=1
BUILD_STORAGE=1
PUSH_IMAGES=1
UPDATE_FEISHU=1
DRY_RUN=0
SKIP_BUILD=0

log() {
  echo "[INFO] $*"
}

err() {
  echo "[ERROR] $*" >&2
}

usage() {
  cat <<'EOF'
Usage: ./build_image.sh [options]

Builds the ZIZIYI Office images and records each service tag in Feishu.

Options:
  --web-only             Build only swr.../ziziyi-office
  --storage-only         Build only swr.../ziziyi-office-storage
  --no-push              Build locally without docker push
  --no-feishu            Do not update Feishu after push
  --feishu-only          Do not build or push; only write selected service tags to Feishu
  --dry-run              Print the plan without building or writing Feishu
  --target TARGET        Build target tag prefix: amd or arm (default: detect current machine)
  --sheet SHEET          Override Feishu sheet title list; comma-separated values are accepted
  --tag TAG              Override the generated tag
  -h, --help             Show this help

Environment:
  FEISHU_CONFIG_FILE          Defaults to ~/.feishu.json on the build host
  ZIZIYI_BUILD_TARGET         Optional default for --target
  FEISHU_SHEET_TITLE          Optional default for --sheet, comma-separated values accepted
  ZIZIYI_DS_VERSION           OnlyOffice DocumentServer version (default 9.3.1)
  ZIZIYI_ASSET_HASH           Versioned asset directory revision (default 1)
  NEXT_PUBLIC_BASE_PATH       Sub-path prefix baked into the web image
  NPM_REGISTRY                Optional npm registry for the web build
  PIP_INDEX_URL               Optional PyPI index for the storage image
EOF
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "missing command: $1"
    exit 1
  }
}

configure_build_engine() {
  if docker buildx version >/dev/null 2>&1; then
    BUILD_ENGINE="buildx"
  else
    BUILD_ENGINE="docker"
  fi
}

docker_build_image() {
  if [[ "$BUILD_ENGINE" == "buildx" ]]; then
    docker buildx build --load --provenance=false --sbom=false "$@"
  else
    docker build "$@"
  fi
}

normalize_official_image_path() {
  local image="$1"
  local image_without_tag="${image%%:*}"

  if [[ "$image_without_tag" != */* ]]; then
    printf 'library/%s\n' "$image"
  else
    printf '%s\n' "$image"
  fi
}

pull_base_image() {
  local image="$1"
  local normalized_image mirror mirrored_image

  if docker pull "$image"; then
    return 0
  fi

  normalized_image="$(normalize_official_image_path "$image")"
  for mirror in docker.m.daocloud.io docker.1ms.run dockerproxy.com; do
    mirrored_image="${mirror}/${normalized_image}"
    log "Direct pull failed for ${image}; trying Docker registry mirror: ${mirrored_image}"
    if docker pull "$mirrored_image"; then
      docker tag "$mirrored_image" "$image"
      return 0
    fi
  done

  return 1
}

# Resolve one base image for this target: local cache first, then the SWR
# mirror org, then a locally cached upstream-tagged image, and as a last
# resort the upstream registry (with mirror fallback). Upstream pulls are
# tagged and pushed to SWR so later builds — and the other architecture's
# hosts — never pull them from Docker Hub again.
cache_base_image() {
  local upstream="$1"
  local swr_ref="${BASE_REGISTRY_PREFIX}/${2}"

  if docker image inspect "${swr_ref}" >/dev/null 2>&1; then
    log "Base image cached locally: ${swr_ref}"
    return 0
  fi

  if docker pull "${swr_ref}" >/dev/null 2>&1; then
    log "Base image pulled from SWR: ${swr_ref}"
    return 0
  fi
  log "SWR pull failed for ${swr_ref} (see docker error above); falling back to upstream"

  if docker image inspect "${upstream}" >/dev/null 2>&1; then
    log "Base image found locally under upstream tag; mirroring to SWR: ${swr_ref}"
  else
    log "Base image not on SWR yet; pulling upstream: ${upstream}"
    if ! pull_base_image "${upstream}"; then
      err "Failed to pull base image: ${upstream}"
      return 1
    fi
  fi

  docker tag "${upstream}" "${swr_ref}"
  if docker push "${swr_ref}"; then
    log "Base image mirrored to SWR: ${swr_ref}"
  else
    err "Warning: could not push base image to SWR (${swr_ref}); continuing with the local image"
  fi
}

ensure_base_images() {
  local base_spec upstream swr_name missing=0
  for base_spec in "$@"; do
    IFS='|' read -r upstream swr_name <<< "$base_spec"
    cache_base_image "$upstream" "$swr_name" || missing=1
  done
  [[ "$missing" == "0" ]]
}

column_letter() {
  python3 - "$1" <<'PY'
import sys
n = int(sys.argv[1])
s = ""
while n > 0:
    n, r = divmod(n - 1, 26)
    s = chr(ord("A") + r) + s
print(s)
PY
}

read_feishu_field() {
  local field="$1"
  python3 - "$FEISHU_CONFIG_FILE" "$field" <<'PY'
import json, sys
path, field = sys.argv[1], sys.argv[2]
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)
val = data.get(field, "")
if not isinstance(val, str):
    val = str(val)
print(val)
PY
}

get_feishu_token() {
  local app_id="$1"
  local app_secret="$2"
  local resp

  resp=$(
    curl --fail -sS -X POST 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal' \
      -H 'Content-Type: application/json' \
      -d "{\"app_id\":\"${app_id}\",\"app_secret\":\"${app_secret}\"}"
  ) || {
    err "get_feishu_token: curl failed"
    return 1
  }

  python3 - "$resp" <<'PY'
import json, sys
resp = sys.argv[1]
data = json.loads(resp)
if data.get("code") != 0:
    raise SystemExit(f"get_feishu_token failed: {data}")
print(data["tenant_access_token"])
PY
}

feishu_api_json() {
  local method="$1"
  local url="$2"
  local token="$3"
  local body="${4:-}"

  if [[ -n "$body" ]]; then
    curl --fail -sS -X "$method" "$url" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      --data "$body"
  else
    curl --fail -sS -X "$method" "$url" \
      -H "Authorization: Bearer ${token}"
  fi
}

get_sheet_id_by_title() {
  local token="$1"
  local target_title="$2"
  local resp

  resp=$(
    feishu_api_json "GET" \
      "https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${FEISHU_SPREADSHEET_TOKEN}/sheets/query" \
      "$token"
  )

  python3 - "$target_title" "$resp" <<'PY'
import json, sys
target = sys.argv[1]
data = json.loads(sys.argv[2])
if data.get("code") != 0:
    raise SystemExit(f"query sheets failed: {data}")
for sheet in data.get("data", {}).get("sheets", []):
    if sheet.get("title") == target:
        print(sheet["sheet_id"])
        raise SystemExit(0)
raise SystemExit(f"sheet title not found: {target}")
PY
}

get_range_values() {
  local token="$1"
  local range="$2"

  feishu_api_json "GET" \
    "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${FEISHU_SPREADSHEET_TOKEN}/values/${range}" \
    "$token"
}

write_cell() {
  local token="$1"
  local sheet_id="$2"
  local cell="$3"
  local value="$4"
  local resp

  resp=$(
    feishu_api_json "PUT" \
      "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${FEISHU_SPREADSHEET_TOKEN}/values" \
      "$token" \
      "{\"valueRange\":{\"range\":\"${sheet_id}!${cell}:${cell}\",\"values\":[[\"${value}\"]]}}"
  )

  python3 - "$resp" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
if data.get("code") != 0:
    raise SystemExit(f"write_cell failed: {data}")
PY
}

find_or_create_component_column() {
  local token="$1"
  local sheet_id="$2"
  local component_name="$3"
  local repo_uri="$4"
  local resp_file

  resp_file="$(mktemp)"
  get_range_values "$token" "${sheet_id}!A1:ZZ2" > "$resp_file"

  python3 - "$component_name" "$resp_file" <<'PY'
import json, sys
target = sys.argv[1]
with open(sys.argv[2], "r", encoding="utf-8") as f:
    data = json.load(f)
if data.get("code") != 0:
    raise SystemExit(f"read header failed: {data}")
values = data.get("data", {}).get("valueRange", {}).get("values", [])
row = values[0] if values else []
repo_row = values[1] if len(values) > 1 else []

def cell_text(v):
    if v is None:
        return ""
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, dict):
        return str(v.get("text") or v.get("link") or "").strip()
    if isinstance(v, list):
        return "".join(cell_text(x) for x in v).strip()
    return str(v).strip()

max_len = max(len(row), len(repo_row))

# First search the whole inspected header range. This preserves existing
# service columns even if a previous manual/script mistake left them far to the
# right of the compact component block.
for i in range(2, max_len + 1):
    header = cell_text(row[i - 1]) if i <= len(row) else ""
    repo = cell_text(repo_row[i - 1]) if i <= len(repo_row) else ""
    if header == target:
        print(i)
        raise SystemExit(0)

# If the service does not exist yet, append it after the compact component block
# that starts at column B. Do not use distant stray columns when choosing the
# insertion position; otherwise one accidental far-right column would make every
# future component create a large blank gap again.
for i in range(2, max_len + 2):
    header = cell_text(row[i - 1]) if i <= len(row) else ""
    repo = cell_text(repo_row[i - 1]) if i <= len(repo_row) else ""
    if not header and not repo:
        print(i)
        raise SystemExit(0)
print(max_len + 1)
PY
  rm -f "$resp_file"
}

find_date_row() {
  local token="$1"
  local sheet_id="$2"
  local target_date="$3"
  local resp

  resp=$(get_range_values "$token" "${sheet_id}!A4:A2000")

  python3 - "$target_date" "$resp" <<'PY'
import json, sys
target = sys.argv[1]
data = json.loads(sys.argv[2])
if data.get("code") != 0:
    raise SystemExit(f"read date column failed: {data}")
values = data.get("data", {}).get("valueRange", {}).get("values", [])
for idx, row in enumerate(values, start=4):
    if row and str(row[0]).strip() == target:
        print(idx)
        raise SystemExit(0)
print("")
PY
}

prepend_date_row() {
  local token="$1"
  local sheet_id="$2"
  local today="$3"
  local resp

  resp=$(
    feishu_api_json "POST" \
      "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${FEISHU_SPREADSHEET_TOKEN}/values_prepend" \
      "$token" \
      "{\"valueRange\":{\"range\":\"${sheet_id}!A4:A4\",\"values\":[[\"${today}\"]]}}"
  )

  python3 - "$resp" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
if data.get("code") != 0:
    raise SystemExit(f"prepend_date_row failed: {data}")
PY
}

update_feishu_cell() {
  local token="$1"
  local sheet_id="$2"
  local sheet_title="$3"
  local component_name="$4"
  local repo_uri="$5"
  local row="$6"
  local tag="$7"
  local component_col_idx component_col

  component_col_idx="$(find_or_create_component_column "$token" "$sheet_id" "$component_name" "$repo_uri")"
  component_col="$(column_letter "$component_col_idx")"

  write_cell "$token" "$sheet_id" "${component_col}1" "$component_name"
  write_cell "$token" "$sheet_id" "${component_col}2" "$repo_uri"
  write_cell "$token" "$sheet_id" "${component_col}${row}" "$tag"

  log "Feishu updated: ${sheet_title}!${component_col}${row} = ${tag} (${component_name})"
}

update_feishu() {
  local tag="$1"
  local app_id app_secret token sheet_id date_row sheet_title

  if [[ ! -f "$FEISHU_CONFIG_FILE" ]]; then
    err "Feishu config not found: $FEISHU_CONFIG_FILE"
    exit 1
  fi

  app_id="$(read_feishu_field "feishu_app_id")"
  app_secret="$(read_feishu_field "feishu_app_secret")"
  if [[ -z "$app_id" || -z "$app_secret" ]]; then
    err "feishu_app_id or feishu_app_secret missing in $FEISHU_CONFIG_FILE"
    exit 1
  fi

  for sheet_title in "${TARGET_SHEET_TITLES[@]}"; do
    token="$(get_feishu_token "$app_id" "$app_secret")"
    sheet_id="$(get_sheet_id_by_title "$token" "$sheet_title")"
    log "Resolved sheet: ${sheet_title} -> ${sheet_id}"

    token="$(get_feishu_token "$app_id" "$app_secret")"
    date_row="$(find_date_row "$token" "$sheet_id" "$DATE")"
    if [[ -z "$date_row" ]]; then
      log "Date ${DATE} not found in ${sheet_title}, creating a new row at top of data area"
      token="$(get_feishu_token "$app_id" "$app_secret")"
      prepend_date_row "$token" "$sheet_id" "$DATE"
      date_row=4
    else
      log "Date ${DATE} already exists in ${sheet_title} at row ${date_row}"
    fi

    token="$(get_feishu_token "$app_id" "$app_secret")"
    [[ "$BUILD_WEB" == "1" ]] && update_feishu_cell "$token" "$sheet_id" "$sheet_title" "ziziyi-office" "$WEB_IMAGE" "$date_row" "$tag"
    token="$(get_feishu_token "$app_id" "$app_secret")"
    [[ "$BUILD_STORAGE" == "1" ]] && update_feishu_cell "$token" "$sheet_id" "$sheet_title" "ziziyi-office-storage" "$STORAGE_IMAGE" "$date_row" "$tag"
  done

  return 0
}

TAG_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-only)
      BUILD_WEB=1
      BUILD_STORAGE=0
      shift
      ;;
    --storage-only)
      BUILD_WEB=0
      BUILD_STORAGE=1
      shift
      ;;
    --no-push)
      PUSH_IMAGES=0
      shift
      ;;
    --no-feishu)
      UPDATE_FEISHU=0
      shift
      ;;
    --feishu-only)
      SKIP_BUILD=1
      PUSH_IMAGES=0
      UPDATE_FEISHU=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      PUSH_IMAGES=0
      UPDATE_FEISHU=0
      shift
      ;;
    --tag)
      TAG_OVERRIDE="$2"
      shift 2
      ;;
    --target)
      TARGET="$2"
      shift 2
      ;;
    --sheet)
      TARGET_SHEET_SPEC="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      err "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd python3

ARCH="$(uname -m)"
if [[ -z "$TARGET" ]]; then
  case "$ARCH" in
    x86_64)
      TARGET="amd"
      ;;
    aarch64|arm64)
      TARGET="arm"
      ;;
    *)
      err "Unable to infer build target from architecture: ${ARCH}; pass --target amd or --target arm"
      exit 1
      ;;
  esac
fi

case "$TARGET" in
  amd)
    PROFILE_TAG="amd"
    BASE_REGISTRY_PREFIX="swr.cn-southwest-2.myhuaweicloud.com/ictrek"
    TARGET_SHEET_SPEC="${TARGET_SHEET_SPEC:-AMD_with_cuda,AMD_with_mxn100}"
    ;;
  arm)
    PROFILE_TAG="arm"
    BASE_REGISTRY_PREFIX="swr.cn-southwest-2.myhuaweicloud.com/ictrek-arm"
    TARGET_SHEET_SPEC="${TARGET_SHEET_SPEC:-ARM_without_cuda,l4t,ARM_with_cuda,thor_spark,SOPHON_bm1688}"
    ;;
  *)
    err "Unsupported target: ${TARGET}; expected amd or arm"
    exit 1
    ;;
esac

WEB_IMAGE="${APP_REGISTRY_PREFIX}/ziziyi-office"
STORAGE_IMAGE="${APP_REGISTRY_PREFIX}/ziziyi-office-storage"

IFS=',' read -r -a TARGET_SHEET_TITLES <<< "$TARGET_SHEET_SPEC"
if [[ "${#TARGET_SHEET_TITLES[@]}" -eq 0 ]]; then
  err "No Feishu sheet titles configured"
  exit 1
fi

if [[ "$DRY_RUN" != "1" && "$SKIP_BUILD" != "1" ]]; then
  case "${TARGET}:${ARCH}" in
    amd:x86_64|arm:aarch64|arm:arm64)
      ;;
    *)
      err "Target ${TARGET} does not match native architecture ${ARCH}. Use a matching build host or extend this script with buildx."
      exit 1
      ;;
  esac
fi

DATE="$(date +%Y%m%d)"
TAG="${TAG_OVERRIDE:-${PROFILE_TAG}_${DATE}}"

log "TARGET=${TARGET}"
log "PROFILE_TAG=${PROFILE_TAG}"
log "TARGET_SHEETS=${TARGET_SHEET_TITLES[*]}"
log "TAG=${TAG}"
log "WEB_IMAGE=${WEB_IMAGE}:${TAG}"
log "STORAGE_IMAGE=${STORAGE_IMAGE}:${TAG}"
log "DS_VERSION=${DS_VERSION} HASH=${HASH}"
log "NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}"

if [[ "$DRY_RUN" == "1" ]]; then
  exit 0
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  require_cmd docker
  configure_build_engine
  log "BUILD_ENGINE=${BUILD_ENGINE}"
fi
if [[ "$UPDATE_FEISHU" == "1" ]]; then
  require_cmd curl
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  WEB_BASE_IMAGES=(
    "onlyoffice/documentserver:${DS_VERSION}|onlyoffice-documentserver:${DS_VERSION}"
    "node:22-alpine|node:22-alpine"
    "caddy:2-alpine|caddy:2-alpine"
  )
  STORAGE_BASE_IMAGES=(
    "python:3.12-slim|python:3.12-slim"
  )
  if [[ "$BUILD_WEB" == "1" ]]; then
    ensure_base_images "${WEB_BASE_IMAGES[@]}"
  fi
  if [[ "$BUILD_STORAGE" == "1" ]]; then
    ensure_base_images "${STORAGE_BASE_IMAGES[@]}"
  fi
fi

if [[ "$SKIP_BUILD" != "1" && "$BUILD_WEB" == "1" ]]; then
  docker_build_image \
    --build-arg "DS_VERSION=${DS_VERSION}" \
    --build-arg "HASH=${HASH}" \
    --build-arg "DS_IMAGE=${BASE_REGISTRY_PREFIX}/onlyoffice-documentserver:${DS_VERSION}" \
    --build-arg "NODE_IMAGE=${BASE_REGISTRY_PREFIX}/node:22-alpine" \
    --build-arg "CADDY_IMAGE=${BASE_REGISTRY_PREFIX}/caddy:2-alpine" \
    --build-arg "NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}" \
    --build-arg "NPM_REGISTRY=${NPM_REGISTRY:-https://registry.npmmirror.com}" \
    -t "${WEB_IMAGE}:${TAG}" \
    .
fi

if [[ "$SKIP_BUILD" != "1" && "$BUILD_STORAGE" == "1" ]]; then
  docker_build_image \
    --build-arg "BASE_IMAGE=${BASE_REGISTRY_PREFIX}/python:3.12-slim" \
    --build-arg "PIP_INDEX_URL=${PIP_INDEX_URL:-https://pypi.tuna.tsinghua.edu.cn/simple}" \
    -f server/Dockerfile \
    -t "${STORAGE_IMAGE}:${TAG}" \
    ./server
fi

if [[ "$PUSH_IMAGES" == "1" ]]; then
  [[ "$BUILD_WEB" == "1" ]] && docker push "${WEB_IMAGE}:${TAG}"
  [[ "$BUILD_STORAGE" == "1" ]] && docker push "${STORAGE_IMAGE}:${TAG}"
fi

if [[ "$UPDATE_FEISHU" == "1" ]]; then
  update_feishu "$TAG"
fi

log "Done."
