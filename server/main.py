"""V-Office private app-storage document service.

Serves a minimal REST API for the VOS deployment of V-Office:

    GET    /healthz                       liveness probe (no auth)
    GET    /api/v1/me                     current VOS username
    GET    /api/v1/files                  list the current user's documents
    GET    /api/v1/files/{name}           download one document
    PUT    /api/v1/files/{name}           create or overwrite one document
    PATCH  /api/v1/files/{name}           rename one document
    DELETE /api/v1/files/{name}           delete one document

Every request (except /healthz and /client-log) must carry a VOS OIDC Fastpath
access token as `Authorization: Bearer <token>`. The token is verified against
the VOS `/v1000/oauth2/userinfo` endpoint. Authenticated users read and write
files only under DATA_ROOT/<username>, so documents are isolated even when
users call the REST API directly.
"""

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import shutil
import subprocess
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

LOG = logging.getLogger("v-office-storage")

DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data"))
VOS_OIDC_USERINFO_URL = os.environ.get(
    "VOS_OIDC_USERINFO_URL", "http://172.17.0.1:8105/v1000/oauth2/userinfo"
)
# Standalone/dev escape hatch only; keep disabled on VOS.
AUTH_DISABLED = os.environ.get("V_OFFICE_AUTH_DISABLED", "").lower() in (
    "1",
    "true",
    "yes",
)
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "100")) * 1024 * 1024
USERINFO_TIMEOUT = httpx.Timeout(10.0)
USERNAME_CACHE_TTL = 300.0

# File names handed over by the editor; keep them boring and traversal-free.
# `doc` 是 Collabora 路线需要的：它原生读写老版 .doc，不必再转成 docx。
FILENAME_RE = re.compile(
    r"^[\w][\w .()\[\]\-]{0,180}\.(doc|docx|xlsx|pptx|pdf|odt|ods|odp|csv|txt|md)$",
    re.IGNORECASE,
)
# VOS usernames are mapped onto directory names; everything unusual becomes "_".
USERNAME_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    """启动 Collabora 冷启动探活后台任务，停机时回收。"""
    task = asyncio.create_task(_collabora_warmup_loop())
    yield
    task.cancel()


app = FastAPI(
    title="v-office-storage",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "PUT", "PATCH", "DELETE", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

_http_client: Optional[httpx.AsyncClient] = None
_username_lock = asyncio.Lock()
# token -> (username, expiry); avoids a userinfo round-trip on every call
# within a short window. Tokens themselves stay valid per VOS TTL.
_username_cache: dict[str, tuple[str, float]] = {}


class RenameFileRequest(BaseModel):
    name: str


def http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=USERINFO_TIMEOUT)
    return _http_client


async def current_username(request: Request) -> str:
    if AUTH_DISABLED:
        return "local"
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = auth[len("Bearer ") :].strip()
    if not token:
        raise HTTPException(status_code=401, detail="missing bearer token")

    now = time.monotonic()
    cached = _username_cache.get(token)
    if cached and cached[1] > now:
        return cached[0]

    async with _username_lock:
        cached = _username_cache.get(token)
        if cached and cached[1] > time.monotonic():
            return cached[0]
        try:
            resp = await http_client().get(
                VOS_OIDC_USERINFO_URL,
                headers={"Authorization": f"Bearer {token}"},
            )
        except httpx.HTTPError as exc:
            LOG.warning("userinfo request failed: %s", exc)
            raise HTTPException(status_code=502, detail="userinfo unreachable")
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="invalid VOS token")
        data = resp.json() if resp.content else {}
        raw = data.get("preferred_username") or data.get("sub") or ""
        username = USERNAME_SAFE_RE.sub("_", str(raw))[:64].strip("._") or ""
        if not username:
            raise HTTPException(status_code=401, detail="username not resolvable")
        _username_cache[token] = (username, time.monotonic() + USERNAME_CACHE_TTL)
        if len(_username_cache) > 1024:
            earliest = min(_username_cache.items(), key=lambda kv: kv[1][1])[0]
            _username_cache.pop(earliest, None)
        return username


def storage_dir(username: str) -> Path:
    root = DATA_ROOT.resolve()
    root.mkdir(parents=True, exist_ok=True)
    directory = root / username
    directory.mkdir(parents=True, exist_ok=True)
    resolved = directory.resolve()
    if resolved.parent != root:
        raise HTTPException(status_code=403, detail="invalid user storage directory")
    return resolved


def safe_target(username: str, name: str) -> Path:
    if not FILENAME_RE.fullmatch(name):
        raise HTTPException(status_code=400, detail="unsupported file name")
    directory = storage_dir(username)
    target = (directory / name).resolve()
    if target.parent != directory:
        raise HTTPException(status_code=400, detail="unsupported file name")
    return target


@app.get("/api/v1/health")
@app.get("/healthz")
async def healthz() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@app.post("/client-log")
async def client_log(request: Request) -> JSONResponse:
    """Unauthenticated diagnostic sink: the frontend reports save-flow steps
    and failures here so they are visible in the container logs."""
    body = (await request.body())[:2048]
    LOG.warning("client: %s", body.decode("utf-8", "replace"))
    return JSONResponse({"status": "ok"})


@app.get("/api/v1/me")
@app.get("/me", include_in_schema=False)
async def me(request: Request) -> JSONResponse:
    username = await current_username(request)
    return JSONResponse({"username": username})


@app.get("/api/v1/files")
@app.get("/files", include_in_schema=False)
async def list_files(request: Request) -> JSONResponse:
    username = await current_username(request)
    directory = storage_dir(username)
    items = []
    for path in sorted(directory.iterdir()):
        if not path.is_file() or path.name.endswith(".tmp"):
            continue
        stat = path.stat()
        items.append(
            {
                "name": path.name,
                "size": stat.st_size,
                "modified": int(stat.st_mtime),
            }
        )
    return JSONResponse({"files": items})


@app.get("/api/v1/files/{name}")
@app.get("/files/{name}", include_in_schema=False)
async def get_file(name: str, request: Request) -> FileResponse:
    username = await current_username(request)
    target = safe_target(username, name)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(target, filename=name)


@app.put("/api/v1/files/{name}")
@app.put("/files/{name}", include_in_schema=False)
async def put_file(name: str, request: Request) -> JSONResponse:
    username = await current_username(request)
    target = safe_target(username, name)
    length = request.headers.get("Content-Length")
    if length and length.isdigit() and int(length) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    body = await request.body()
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    tmp = target.with_name(target.name + ".tmp")
    tmp.write_bytes(body)
    os.replace(tmp, target)
    LOG.info("saved %s for %s (%d bytes)", name, username, len(body))
    return JSONResponse({"status": "ok", "name": name, "size": len(body)})


@app.delete("/api/v1/files/{name}")
@app.delete("/files/{name}", include_in_schema=False)
async def delete_file(name: str, request: Request) -> JSONResponse:
    username = await current_username(request)
    target = safe_target(username, name)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    target.unlink()
    LOG.info("deleted %s for %s", name, username)
    return JSONResponse({"status": "ok"})


@app.post("/api/v1/convert")
async def convert_file(request: Request, to: str = "docx", frm: str = "doc") -> Response:
    """LibreOffice headless format conversion (doc <-> docx), auth required.

    The editor engine cannot read legacy .doc reliably nor write it at all,
    so the web app opens a LibreOffice-converted docx copy and converts the
    edited docx back to .doc on save. `frm` is the source extension, `to`
    the target extension ("docx" or "doc").
    """
    await current_username(request)  # auth gate (username unused: stateless conversion)

    to = to.lower()
    frm = frm.lower()
    allowed = (("docx", "doc"), ("doc", "docx"), ("pdf", "doc"), ("pdf", "docx"))
    if (to, frm) not in allowed:
        raise HTTPException(status_code=400, detail="unsupported conversion")

    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    workdir = tempfile.mkdtemp(prefix="convert-")
    try:
        src = Path(workdir) / f"input.{frm}"
        src.write_bytes(body)
        # 独立 UserInstallation profile：避免并发请求争抢 LibreOffice 配置锁
        profile = f"file://{workdir}/lo-profile"
        try:
            proc = await asyncio.to_thread(
                subprocess.run,
                [
                    "soffice", "--headless", "--norestore",
                    f"-env:UserInstallation={profile}",
                    "--convert-to", to, "--outdir", workdir, str(src),
                ],
                capture_output=True,
                timeout=120,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="conversion timed out")
        out = Path(workdir) / f"input.{to}"
        if proc.returncode != 0 or not out.is_file():
            LOG.warning("convert %s->%s failed rc=%s stderr=%s",
                        frm, to, proc.returncode, proc.stderr.decode("utf-8", "replace")[:300])
            raise HTTPException(status_code=500, detail="conversion failed")
        data = out.read_bytes()
        if not data:
            raise HTTPException(status_code=500, detail="conversion produced empty output")
        LOG.info("converted %s->%s (%d -> %d bytes)", frm, to, len(body), len(data))
        return Response(
            content=data,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="converted.{to}"'},
        )
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


@app.patch("/api/v1/files/{name}")
@app.patch("/files/{name}", include_in_schema=False)
async def rename_file(
    name: str, payload: RenameFileRequest, request: Request
) -> JSONResponse:
    username = await current_username(request)
    source = safe_target(username, name)
    target = safe_target(username, payload.name)
    if not source.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    if source == target:
        return JSONResponse({"status": "ok", "name": target.name})
    if target.exists():
        raise HTTPException(status_code=409, detail="file already exists")
    os.replace(source, target)
    LOG.info("renamed %s to %s for %s", name, target.name, username)
    return JSONResponse({"status": "ok", "name": target.name})


# ============================================================================
# WOPI host —— Collabora Online 集成
#
# Collabora 不接触用户凭证：前端先向本服务换取一个短时效 access_token，
# Collabora 再拿它回调 /wopi/files/... 读写文档。token 由 HMAC 签名并自带
# 用户名与文件名，因此即使 Collabora 侧被诱导，也无法越权访问他人目录。
#
# 为不打断既有 OnlyOffice 链路，这里只新增端点，不改动原有 REST API。
# ============================================================================

from urllib.parse import quote, urlsplit  # noqa: E402  (紧随相关实现，便于阅读)

# WOPI access_token 的签名密钥。必须每套部署各不相同：写死成公共值等于所有
# 服务器共用同一密钥，任意一套被拿下就能伪造另一套的令牌。未配置时随机生成
# （进程级），只影响本实例；重启会使在途会话的令牌失效，因此生产建议在安装
# 配置里显式填一段随机串。
WOPI_SECRET = os.environ.get("V_OFFICE_WOPI_SECRET") or secrets.token_urlsafe(32)
if not os.environ.get("V_OFFICE_WOPI_SECRET"):
    LOG.warning(
        "V_OFFICE_WOPI_SECRET unset: generated an ephemeral secret for this "
        "process; set it explicitly for production"
    )
WOPI_TOKEN_TTL = int(os.environ.get("V_OFFICE_WOPI_TOKEN_TTL", "3600"))
# Collabora 容器访问本服务的地址（据此拼 WOPISrc）
WOPI_PUBLIC_BASE = os.environ.get("V_OFFICE_WOPI_PUBLIC_BASE", "http://172.17.0.1:5000")
# 浏览器访问 Collabora 的地址
COLLABORA_PUBLIC_URL = os.environ.get("V_OFFICE_COLLABORA_URL", "http://localhost:9980")
# 本服务访问 Collabora 的地址（用于拉 discovery）
COLLABORA_INTERNAL_URL = os.environ.get(
    "V_OFFICE_COLLABORA_INTERNAL_URL", COLLABORA_PUBLIC_URL
)

# ----------------------------------------------------------------------------
# Collabora 冷启动探活
#
# coolwsd 从容器启动到 /hosting/discovery 可用通常需要几秒到几十秒（fork 子
# 进程、加载 WOPI 白名单）。此前首个用户请求会撞上这个窗口：discovery 超时
# → 503 → 前端被迫回退 OnlyOffice，用户只能靠"刷新页面"二次尝试。
#
# 现在由后台任务持续探活：就绪前每 5s 探一次，就绪后降频到 30s 保活（感知
# 容器重启）。就绪状态通过 GET /api/v1/wopi/status 暴露给前端，驱动
# 「启动中」按钮态与等待提示。
# ----------------------------------------------------------------------------
_collabora_state = "warming_up"          # ok | warming_up
_collabora_state_since = time.time()     # 进入当前状态的时刻
COLLABORA_WARMUP_TIMEOUT = int(
    os.environ.get("V_OFFICE_COLLABORA_WARMUP_TIMEOUT", "180")
)


async def _collabora_discover() -> str:
    """单次探测 discovery，成功返回 urlsrc 模板，失败返回空串。"""
    internal = COLLABORA_INTERNAL_URL.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{internal}/hosting/discovery")
            resp.raise_for_status()
            found = re.search(r'urlsrc="([^"]+)"', resp.text)
            return found.group(1) if found else ""
    except Exception as exc:  # noqa: BLE001 - 探活失败是常态，debug 记录即可
        LOG.debug("collabora discovery probe failed: %s", exc)
        return ""


async def _collabora_warmup_loop() -> None:
    global _collabora_state, _collabora_state_since
    while True:
        ok = bool(await _collabora_discover())
        if ok:
            if _collabora_state != "ok":
                LOG.info("collabora discovery ready")
            _collabora_state = "ok"
            await asyncio.sleep(30)  # 就绪后降频保活，感知容器重启
        else:
            if _collabora_state != "warming_up":
                LOG.warning("collabora discovery lost, probing again")
                _collabora_state = "warming_up"
                _collabora_state_since = time.time()
            await asyncio.sleep(5)  # 未就绪期间高频探测


def _collabora_effective_state() -> str:
    """对外的就绪状态；warming_up 超过阈值视为不可用（大概率未部署）。"""
    if _collabora_state == "ok":
        return "ok"
    if time.time() - _collabora_state_since > COLLABORA_WARMUP_TIMEOUT:
        return "unavailable"
    return "warming_up"

# (username, filename) -> lock id；只在单实例内存里，够用即可
_wopi_locks: dict[str, str] = {}


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _wopi_sig(payload: bytes) -> str:
    return _b64e(
        hmac.new(WOPI_SECRET.encode("utf-8"), payload, hashlib.sha256).digest()
    )


def issue_wopi_token(username: str, name: str, can_write: bool = True) -> str:
    body = json.dumps(
        {
            "u": username,
            "n": name,
            "w": can_write,
            "e": int(time.time()) + WOPI_TOKEN_TTL,
        },
        separators=(",", ":"),
    ).encode("utf-8")
    return f"{_b64e(body)}.{_wopi_sig(body)}"


def parse_wopi_token(token: str) -> dict:
    try:
        encoded, sig = token.split(".", 1)
        body = _b64d(encoded)
        if not hmac.compare_digest(sig, _wopi_sig(body)):
            raise ValueError("signature mismatch")
        data = json.loads(body)
        if int(data.get("e", 0)) < time.time():
            raise ValueError("token expired")
        return data
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - 统一按未授权处理
        LOG.warning("invalid WOPI token: %s", exc)
        raise HTTPException(status_code=401, detail="invalid WOPI token")


def _wopi_identity(request: Request, name: str) -> dict:
    token = request.query_params.get("access_token") or ""
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    data = parse_wopi_token(token)
    if data.get("n") != name:
        raise HTTPException(status_code=403, detail="token does not match file")
    return data


async def _collabora_editor_url(wopi_src: str, token: str) -> str:
    """向 Collabora 取 urlsrc 模板（带构建哈希），填入 WOPISrc 与 token。

    urlsrc 在镜像升级时会变（含哈希路径），因此不能写死，必须动态取。
    """
    template = ""
    # 请求内重试：撞上冷启动窗口时原地等容器就绪（约 20s），而不是立即失败
    for attempt in range(3):
        template = await _collabora_discover()
        if template:
            break
        LOG.warning("collabora discovery attempt %d/3 failed", attempt + 1)
        if attempt < 2:
            await asyncio.sleep(2)

    if not template:
        # 取不到 discovery（Collabora 容器没起来 / 网络不通）时不要编一个地址：
        # 旧版的 browser/dist/cool.html 在当前 Collabora 上必然 404，会把
        # 「内核不可用」变成「编辑器打开是白页」。直接失败，并带上原因让
        # 前端区分「正在启动（等待重试）」和「确实不可用（立即回退）」。
        reason = _collabora_effective_state()
        LOG.warning(
            "collabora discovery unavailable (state=%s), refusing to fabricate an URL",
            reason,
        )
        raise HTTPException(
            status_code=503,
            detail=json.dumps({"reason": reason}),
        )

    # urlsrc 是 Collabora 自己视角的绝对地址（含构建哈希），只取它的路径与查询
    # 部分，换到浏览器可达的 public 前缀上。
    #
    # 不能按 internal 做字符串前缀匹配：网关终止 TLS 时镜像开了 ssl.termination，
    # Collabora 吐出的 scheme 是 https，与 internal 的 http 对不上，替换会被跳过，
    # 浏览器就会拿到 https://v-office-collabora:9980 这类内网地址，表现为
    # 「找不到 v-office-collabora 的服务器 IP 地址」。
    public = COLLABORA_PUBLIC_URL.rstrip("/")
    split = urlsplit(template)
    if not split.path:
        LOG.warning("collabora urlsrc unusable: %s", template)
        raise HTTPException(status_code=503, detail="collabora urlsrc unusable")
    template = f"{public}{split.path}" + (f"?{split.query}" if split.query else "?")

    if template.endswith(("?", "&")):
        sep = ""
    elif "?" in template:
        sep = "&"
    else:
        sep = "?"
    return (
        f"{template}{sep}WOPISrc={quote(wopi_src, safe='')}"
        f"&access_token={quote(token, safe='')}"
    )


@app.get("/api/v1/wopi/status")
async def wopi_status() -> JSONResponse:
    """前端轮询：Collabora 是否就绪（驱动「启动中」按钮态与等待提示）。

    state 取值：
      ok          —— discovery 可用，可以正常打开文档
      warming_up  —— 容器冷启动中（启动后 5s 一次探活），前端应等待重试
      unavailable —— 超过 WARMUP_TIMEOUT 仍未就绪，大概率未部署，前端应立即回退
    unknown 不会出现在这里：状态接口本身 404/超时时由前端按"无 storage 服务"处理。
    """
    state = _collabora_effective_state()
    return JSONResponse(
        {"state": state, "ready": state == "ok"}
    )


@app.post("/api/v1/wopi/session")
async def wopi_session(request: Request, name: str) -> JSONResponse:
    """前端调用：为一个文档换取 Collabora 编辑器地址与 access_token。"""
    username = await current_username(request)
    target = safe_target(username, name)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")

    can_write = request.query_params.get("edit", "1") not in ("0", "false")
    token = issue_wopi_token(username, name, can_write)
    wopi_src = f"{WOPI_PUBLIC_BASE.rstrip('/')}/wopi/files/{quote(name, safe='')}"
    editor_url = await _collabora_editor_url(wopi_src, token)
    LOG.info("wopi session for %s (%s)", name, username)
    return JSONResponse(
        {
            "editorUrl": editor_url,
            "wopiSrc": wopi_src,
            "accessToken": token,
            "name": name,
            "canWrite": can_write,
        }
    )


@app.get("/wopi/files/{name}")
async def wopi_check_file_info(name: str, request: Request) -> JSONResponse:
    data = _wopi_identity(request, name)
    username = str(data["u"])
    target = safe_target(username, name)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    stat = target.stat()
    return JSONResponse(
        {
            "BaseFileName": name,
            "Size": stat.st_size,
            "Version": str(int(stat.st_mtime)),
            "OwnerId": username,
            "UserId": username,
            "UserFriendlyName": username,
            "UserCanWrite": bool(data.get("w", True)),
            "UserCanRename": False,
            "SupportsUpdate": True,
            "SupportsLocks": True,
            "SupportsExtendedLockLength": True,
            "SupportsGetLock": True,
            "PostMessageOrigin": "*",
        }
    )


@app.get("/wopi/files/{name}/contents")
async def wopi_get_contents(name: str, request: Request) -> FileResponse:
    data = _wopi_identity(request, name)
    target = safe_target(str(data["u"]), name)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(target, media_type="application/octet-stream")


@app.post("/wopi/files/{name}/contents")
async def wopi_put_contents(name: str, request: Request) -> Response:
    data = _wopi_identity(request, name)
    if not data.get("w", True):
        raise HTTPException(status_code=403, detail="read-only token")

    username = str(data["u"])
    key = f"{username}/{name}"
    lock = request.headers.get("X-WOPI-Lock", "")
    current = _wopi_locks.get(key, "")
    # 已被别人持锁且锁不一致 → 按 WOPI 规范回 409 并带上当前锁
    if current and lock != current:
        return JSONResponse(
            {"error": "lock mismatch"},
            status_code=409,
            headers={"X-WOPI-Lock": current},
        )

    target = safe_target(username, name)
    length = request.headers.get("Content-Length")
    if length and length.isdigit() and int(length) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    tmp = target.with_name(target.name + ".tmp")
    tmp.write_bytes(body)
    os.replace(tmp, target)
    LOG.info("wopi saved %s for %s (%d bytes)", name, username, len(body))
    return Response(status_code=200)


@app.post("/wopi/files/{name}")
async def wopi_file_operations(name: str, request: Request) -> Response:
    """WOPI 锁操作：通过 X-WOPI-Override 区分 LOCK/UNLOCK/REFRESH_LOCK/GET_LOCK。"""
    data = _wopi_identity(request, name)
    username = str(data["u"])
    key = f"{username}/{name}"
    override = request.headers.get("X-WOPI-Override", "").upper()
    client_lock = request.headers.get("X-WOPI-Lock", "")
    current = _wopi_locks.get(key, "")

    if override == "GET_LOCK":
        headers = {"X-WOPI-Lock": current} if current else {}
        return Response(status_code=200, content=b"", headers=headers)

    if override in ("LOCK", "REFRESH_LOCK", "UNLOCK_AND_RELOCK"):
        if current and current != client_lock and override != "UNLOCK_AND_RELOCK":
            return Response(
                status_code=409,
                content=b"",
                headers={"X-WOPI-Lock": current},
            )
        if client_lock:
            _wopi_locks[key] = client_lock
        return Response(status_code=200, content=b"")

    if override == "UNLOCK":
        if current and current != client_lock:
            return Response(
                status_code=409,
                content=b"",
                headers={"X-WOPI-Lock": current},
            )
        _wopi_locks.pop(key, None)
        return Response(status_code=200, content=b"")

    # 未知 override：一律接受，避免 Collabora 卡在握手阶段
    return Response(status_code=200, content=b"")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)
