"""ZIZIYI Office mapped-directory document storage service.

Serves a minimal REST API for the VOS deployment of ZIZIYI Office:

    GET    /healthz            liveness probe (no auth)
    GET    /me                 current VOS username
    GET    /files              list the current user's documents
    GET    /files/{name}       download one document
    PUT    /files/{name}       create or overwrite one document
    DELETE /files/{name}       delete one document

Every request (except /healthz and /client-log) must carry a VOS OIDC Fastpath
access token as `Authorization: Bearer <token>`. The token is verified against
the VOS `/v1000/oauth2/userinfo` endpoint. Authenticated users read and write
the files directly under DATA_ROOT, which is the document directory selected
when the VOS app is installed.
"""

import asyncio
import logging
import os
import re
import time
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

LOG = logging.getLogger("ziziyi-office-storage")

DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data"))
VOS_OIDC_USERINFO_URL = os.environ.get(
    "VOS_OIDC_USERINFO_URL", "http://172.17.0.1:8105/v1000/oauth2/userinfo"
)
# Standalone/dev escape hatch only; keep disabled on VOS.
AUTH_DISABLED = os.environ.get("ZIZIYI_OFFICE_AUTH_DISABLED", "").lower() in (
    "1",
    "true",
    "yes",
)
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "100")) * 1024 * 1024
USERINFO_TIMEOUT = httpx.Timeout(10.0)
USERNAME_CACHE_TTL = 300.0

# File names handed over by the editor; keep them boring and traversal-free.
FILENAME_RE = re.compile(
    r"^[\w][\w .()\[\]\-]{0,180}\.(docx|xlsx|pptx|pdf|odt|ods|odp|csv|txt|md)$",
    re.IGNORECASE,
)
# VOS usernames are mapped onto directory names; everything unusual becomes "_".
USERNAME_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]")

app = FastAPI(title="ziziyi-office-storage", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

_http_client: Optional[httpx.AsyncClient] = None
_username_lock = asyncio.Lock()
# token -> (username, expiry); avoids a userinfo round-trip on every call
# within a short window. Tokens themselves stay valid per VOS TTL.
_username_cache: dict[str, tuple[str, float]] = {}


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


def storage_dir() -> Path:
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    return DATA_ROOT


def safe_target(name: str) -> Path:
    if not FILENAME_RE.fullmatch(name):
        raise HTTPException(status_code=400, detail="unsupported file name")
    directory = storage_dir().resolve()
    target = (directory / name).resolve()
    if target.parent != directory:
        raise HTTPException(status_code=400, detail="unsupported file name")
    return target


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


@app.get("/me")
async def me(request: Request) -> JSONResponse:
    username = await current_username(request)
    return JSONResponse({"username": username})


@app.get("/files")
async def list_files(request: Request) -> JSONResponse:
    await current_username(request)
    directory = storage_dir()
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


@app.get("/files/{name}")
async def get_file(name: str, request: Request) -> FileResponse:
    await current_username(request)
    target = safe_target(name)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(target, filename=name)


@app.put("/files/{name}")
async def put_file(name: str, request: Request) -> JSONResponse:
    username = await current_username(request)
    target = safe_target(name)
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


@app.delete("/files/{name}")
async def delete_file(name: str, request: Request) -> JSONResponse:
    username = await current_username(request)
    target = safe_target(name)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    target.unlink()
    LOG.info("deleted %s for %s", name, username)
    return JSONResponse({"status": "ok"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)
