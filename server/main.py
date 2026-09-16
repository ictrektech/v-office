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
import shutil
import subprocess
import tempfile
import time
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

app = FastAPI(title="v-office-storage", docs_url=None, redoc_url=None)
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

from urllib.parse import quote  # noqa: E402  (紧随相关实现，便于阅读)

WOPI_SECRET = os.environ.get("V_OFFICE_WOPI_SECRET", "v-office-dev-wopi-secret")
WOPI_TOKEN_TTL = int(os.environ.get("V_OFFICE_WOPI_TOKEN_TTL", "3600"))
# Collabora 容器访问本服务的地址（据此拼 WOPISrc）
WOPI_PUBLIC_BASE = os.environ.get("V_OFFICE_WOPI_PUBLIC_BASE", "http://172.17.0.1:5000")
# 浏览器访问 Collabora 的地址
COLLABORA_PUBLIC_URL = os.environ.get("V_OFFICE_COLLABORA_URL", "http://localhost:9980")
# 本服务访问 Collabora 的地址（用于拉 discovery）
COLLABORA_INTERNAL_URL = os.environ.get(
    "V_OFFICE_COLLABORA_INTERNAL_URL", COLLABORA_PUBLIC_URL
)

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
    internal = COLLABORA_INTERNAL_URL.rstrip("/")
    template = ""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{internal}/hosting/discovery")
            resp.raise_for_status()
            found = re.search(r'urlsrc="([^"]+)"', resp.text)
            template = found.group(1) if found else ""
    except Exception as exc:  # noqa: BLE001 - 取不到就走兜底模板
        LOG.warning("collabora discovery failed: %s", exc)

    public = COLLABORA_PUBLIC_URL.rstrip("/")
    if not template:
        template = f"{public}/browser/dist/cool.html?"
    elif template.startswith(internal):
        # discovery 返回的是 Collabora 自身视角地址，换成浏览器可达的
        template = public + template[len(internal) :]

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
