"""V-Office private app-storage document service.

Serves a minimal REST API for the VOS deployment of V-Office:

    GET    /healthz                       liveness probe (no auth)
    GET    /api/v1/me                     current VOS username
    GET    /api/v1/files                  list the current user's documents
    GET    /api/v1/files/{name}           download one document
    PUT    /api/v1/files/{name}           create or overwrite one document
    PATCH  /api/v1/files/{name}           rename one document
    DELETE /api/v1/files/{name}           delete one document
    GET    /api/v1/sources                list browsable sources (shared / NAS)
    GET    /api/v1/sources/{s}/entries    list one directory of a shared source
    GET    /api/v1/sources/{s}/file       download one document from a shared source
    PUT    /api/v1/sources/{s}/file       write an edited document back (edit in place)

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
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

LOG = logging.getLogger("v-office-storage")

# 让本服务自己的 INFO 日志真的落到容器输出。默认情况下根 logger 没有 handler，
# 只有 WARNING 以上会被 Python 的 lastResort handler 兜到 stderr，于是"谁把哪个
# 文件覆盖进了公共盘""谁给哪个文档开了协作会话"这类关键记录**在容器日志里根本
# 看不到**——出了事只能靠猜。级别可用 V_OFFICE_LOG_LEVEL 调。
if not LOG.handlers:
    _log_handler = logging.StreamHandler()
    _log_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    LOG.addHandler(_log_handler)
LOG.setLevel(os.environ.get("V_OFFICE_LOG_LEVEL", "INFO").upper())
# 自己带 handler 就不再上传根 logger：避免将来有人给根 logger 配 handler 时打两遍
LOG.propagate = False

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

# 文档名交给编辑器回传时的安全校验。
#
# 只挡真正的路径隐患（分隔符 / 控制字符 / 隐藏名 / 首尾空白 / 超长），不再用"常见
# 标点白名单"：保存下来的名字常来自网页标题，里面是全角引号、顿号这类标点，白名单
# 会让 Ctrl+S 直接 400（如「… _ “推动未来产业…”__中国政府网.pdf」）。跨目录由
# safe_target 的 resolve + 父目录校验兜底，这里不承担防穿越职责。
# `doc` 是 Collabora 路线需要的：它原生读写老版 .doc，不必再转成 docx。
DOC_SUFFIX_RE = re.compile(
    r"\.(doc|docx|ppt|pptx|xls|xlsx|pdf|odt|ods|odp|csv|txt|md)$",
    re.IGNORECASE,
)
FILENAME_UNSAFE_RE = re.compile(r'[\\/:*?"<>|]')
# 文件名按 UTF-8 字节数限长：中文一个字 3 字节，按字符数限长会撞 ENAMETOOLONG
MAX_FILENAME_BYTES = 200


def is_safe_filename(name: str) -> bool:
    if not name or name != name.strip() or name.startswith("."):
        return False
    if FILENAME_UNSAFE_RE.search(name) or any(ord(ch) < 32 for ch in name):
        return False
    if len(name.encode("utf-8")) > MAX_FILENAME_BYTES:
        return False
    return bool(DOC_SUFFIX_RE.search(name))


# 扩展名 ↔ 真实内容的一致性护栏。
#
# 编辑器保存链路里一旦把内核内部容器（docx 结构）当成 PDF 写出来，文件当场"保存
# 成功"、日志也是 save-ok，但下次打开就报「内容与扩展名不一致」，而原内容已被
# 覆盖、不可恢复。所以在落盘前挡一道：宁可保存失败，也不写出坏文件。
# 只校验"客户端传来的字节"（私有保存 / 共享写回 / WOPI 写回）；平台内部复制
# （共享盘 → 我的文档）沿用原字节，不做判断，避免把共享盘里名字不规范的老文件
# 挡在门外。
CONTENT_MAGIC: dict[str, bytes] = {
    # 只保护 PDF——这是本次事故（内核内部容器被写成 .pdf：文件当场"保存成功"，
    # 下次打开打不开，原内容不可恢复）的唯一来源。
    ".pdf": b"%PDF-",
}
# 为什么不校验 .doc/.xls/.ppt：客户端交付给它们的字节本来就是 OOXML（zip）。
# 老 .doc 现由客户端两步导出（x2t 出 docx，再经 LibreOffice 转回 .doc），但线上
# 跑着的前端未必带这一步，会直接交付 docx 字节——Word/Excel 照常打开，属既有行为。
# 按魔数硬校验会把这种正常保存拦成 400（线上已发生：EMC及安规测试委托认证申请表
# (1).doc 保存失败）。
# docx/xlsx/pptx 同样不校验：加密（密码保护）的 OOXML 实际是 OLE2 容器，
# 硬校验也会把正常文件拒掉。


def _accepts_body(target: Path, body: bytes) -> bool:
    """内容与扩展名是否相符，以及本次写入要不要落盘。

    True  —— 正常落盘
    False —— 跳过写入、保持原文件不动（调用方回 200；用于 PDF 这一已知场景）
    异常  —— 内容与扩展名明显不符，400 拒绝
    """
    expected = CONTENT_MAGIC.get(target.suffix.lower())
    if not expected:
        return True
    # 容忍前导 BOM / 空白，避免把正常文件误判成坏文件
    head = body.lstrip(b"\xef\xbb\xbf \t\r\n")
    if head.startswith(expected):
        return True
    # PDF：编辑器交付的保存结果不是 PDF（实测是内核内部容器，docx 结构的 zip），
    # 直接把这种字节写成 .pdf 就是文件损坏（此前线上损坏的 PDF 即由此而来）。
    # 所以 PDF 内容不符时**任何情况都不写盘、也不报错**（Ctrl+S 保持可用）：
    #   · 原文件存在   → 保持原文件不动，不写坏；
    #   · 原文件不存在 → 不新建（例如那份文档已在"我的文档"里被删除，却仍在
    #     编辑器里打开着、每 10 秒自动保存一次；此前这里回 400，用户看到的是
    #     反复弹「保存文件时发生错误」）。
    # （导出 PDF 本身内核是支持的，卡在我们这侧的导出调用。）
    if target.suffix.lower() == ".pdf":
        LOG.warning(
            "pdf save skipped for %s: content (%s) is not a PDF (%s)",
            target.name,
            body[:8].hex(),
            "kept the existing file"
            if target.is_file()
            else "no existing file, nothing written",
        )
        return False
    LOG.warning(
        "rejected %s: content (%s) does not match extension",
        target.name,
        body[:8].hex(),
    )
    raise HTTPException(
        status_code=400,
        detail=f"content does not match extension {target.suffix.lower()}",
    )
# VOS usernames are mapped onto directory names; everything unusual becomes "_".
USERNAME_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    """启动 Collabora 冷启动探活后台任务，停机时回收。"""
    _warn_if_single_process()
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
        try:
            payload = resp.json() if resp.content else {}
        except ValueError:
            raise HTTPException(status_code=401, detail="invalid VOS token")
        if not isinstance(payload, dict):
            raise HTTPException(status_code=401, detail="invalid VOS token")
        # VOS 的 /v1000/oauth2/userinfo 在令牌无效时**同样返回 HTTP 200**，只是把
        # body 换成 ResultBody 错误信封（{"code":10001,"category":...,"msg":...}）。
        # 只判状态码会把"令牌无效"说成"用户名解析失败"，401 的成因在日志里根本
        # 分不开（2026-09-29 排查时被误导过一轮）。成功时是 OIDC 标准 claims，
        # 扁平返回、没有 ResultBody 包裹。
        code = payload.get("code")
        if isinstance(code, int) and code != 0:
            LOG.warning(
                "userinfo rejected token: code=%s msg=%s", code, payload.get("msg")
            )
            raise HTTPException(status_code=401, detail="invalid VOS token")
        claims = payload.get("data") if isinstance(payload.get("data"), dict) else payload
        raw = claims.get("preferred_username") or claims.get("sub") or ""
        username = USERNAME_SAFE_RE.sub("_", str(raw))[:64].strip("._") or ""
        if not username:
            LOG.warning("userinfo returned no usable identity; claims=%s", list(claims)[:8])
            raise HTTPException(status_code=401, detail="username not resolvable")
        # 记一次解析结果（只在缓存未命中时打，量很小）。用户名可能被 VOS 的两个账号
        # 解析成同一个值，那样两个"不同的人"会共用一份私有存储；把 sub 一起打出来，
        # 是同一个账号还是两个账号被解析成了一个，看日志就能断案。
        LOG.info("resolved identity user=%s sub=%s", username, claims.get("sub"))
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
    if not is_safe_filename(name):
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


def _list_files_sync(directory: Path) -> list[dict]:
    """同步列私有目录（在工作线程里执行，见文件末尾"阻塞 I/O"一节）。"""
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
    return items


@app.get("/api/v1/files")
@app.get("/files", include_in_schema=False)
async def list_files(request: Request) -> JSONResponse:
    username = await current_username(request)
    directory = storage_dir(username)
    items = await asyncio.to_thread(_list_files_sync, directory)
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
    if not _accepts_body(target, body):
        # 内容不是 PDF（内核写不出）：原文件保持不动，但仍回成功，让 Ctrl+S 可用
        size = target.stat().st_size if target.is_file() else 0
        return JSONResponse({"status": "ok", "name": name, "size": size, "unchanged": True})
    # 写盘是阻塞调用，必须出事件循环（见文件末尾"阻塞 I/O"一节）
    await asyncio.to_thread(_atomic_write_private, target, body)
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
    """LibreOffice headless format conversion (老格式 <-> 现代格式), auth required.

    The editor engine cannot write legacy binaries at all（.doc / .ppt）and reads
    them poorly, so the web app opens a LibreOffice-converted docx/pptx copy and
    converts the edited copy back to the original legacy format on save.
    `frm` is the source extension, `to` the target extension.
    """
    await current_username(request)  # auth gate (username unused: stateless conversion)

    to = to.lower()
    frm = frm.lower()
    # 只保留 OnlyOffice 路线真正用到的转换：老 .doc 打开前升级、保存后转回，
    # 以及 pdf → doc/docx。老 ppt / xls 由 Collabora 直接读写，不经过这里。
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
        data = await asyncio.to_thread(out.read_bytes)
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
    await asyncio.to_thread(os.replace, source, target)
    LOG.info("renamed %s to %s for %s", name, target.name, username)
    return JSONResponse({"status": "ok", "name": target.name})


# ============================================================================
# 共享文档源（只读浏览）
#
# 「哪些目录能被应用访问」由平台侧的「数据访问授权」决定（公共目录 / 用户数据
# 目录），VOS 把授权结果注入 VOS_APP_EXPOSED_PATH 并挂到容器内 /exposed：
#     /exposed/volumes/<工作区>/public                  公共目录的父目录（脚手架）
#     /exposed/volumes/<工作区>/public/<目录>            用户选定的公共目录（单独挂载）
#     /exposed/volumes/<工作区>/users/<用户名>/data      用户数据目录
# 注意授权目录本身是**单独挂进来的挂载点**，必须以它为准，不能用它的脚手架父
# 目录 public：按脚手架路径读写，用户在平台的公共文件夹里看不到这些文件。
# 应用这一侧不提供任何授权配置，只负责"把已挂载的目录列出来、把选中的文件给
# 编辑器"——平台不会替应用列目录，也不会知道怎么把 pptx 交给编辑器渲染。
#
# 这些源一律只读。共享盘通常是多应用共用的权威数据，误写不可逆；用户在编辑器
# 里「保存」时写入的仍是自己的私有目录（DATA_ROOT/<user>），与既有保存链路
# 完全一致，因此本模块只提供列目录与取文件两个动作。
# ============================================================================

# 平台授权目录的挂载点（VOS 注入 VOS_APP_EXPOSED_PATH 后由 compose 挂到此路径）
SHARED_ROOT = Path(os.environ.get("V_OFFICE_SHARED_ROOT", "/exposed"))
# 独立部署（非 VOS）自挂目录的逃生口，默认 /nas 不存在时不产生任何源；
# VOS 部署无需设置，NAS 目录也走平台的「数据访问授权」。
NAS_ROOT = Path(os.environ.get("V_OFFICE_NAS_ROOT", "/nas"))

# 是否允许把编辑后的文档写回共享源（默认允许）。共享源是否真的可写还取决于
# 平台授权时的「访问权限」（读写）与 compose 的挂载参数；设为 0/false 可在应用
# 侧强制退回只读：写接口一律 403，源列表也标记为只读。
SHARED_WRITABLE = os.environ.get("V_OFFICE_SHARED_WRITABLE", "1").lower() not in (
    "0",
    "false",
    "no",
)

# 能在浏览列表里出现并可直接打开的扩展名（与编辑器内核能力对齐）
BROWSABLE_SUFFIXES = frozenset(
    {
        ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".odt", ".ods", ".odp", ".rtf", ".csv", ".txt", ".md", ".pdf",
    }
)

# 单次列目录的条目上限：NAS 上动辄数万文件的目录会把响应和前端一起拖死
MAX_SOURCE_ENTRIES = 3000

# 递归遍历（NAS 数据里的「公共」/「用户」分类）：最大深度与单次返回文档数
MAX_WALK_DEPTH = 8
MAX_WALK_DOCUMENTS = 3000

# 授权目录解析：扫描挂载锚点（public / users/<用户>/data）的最大深度
# （覆盖 volumes/<空间>/users/<用户>/data 这类层级）
MAX_ROOT_SCAN_DEPTH = 6

# 浏览时统一跳过的系统目录（NAS / 共享盘常见）
SOURCE_SKIP_NAMES = frozenset(
    {
        "lost+found", "System Volume Information", "$RECYCLE.Bin",
        "@eaDir", "#recycle", "node_modules",
    }
)


def _mount_points() -> frozenset[str]:
    """当前进程可见的挂载点集合（读不到 /proc 时为空）。

    用 /proc/self/mountinfo 而不是 os.path.ismount：授权目录是**同一文件系统
    上的 bind mount**，它和父目录 st_dev 相同，ismount 会判成 False。
    """
    try:
        raw = Path("/proc/self/mountinfo").read_text()
    except OSError:
        return frozenset()
    points: set[str] = set()
    for line in raw.splitlines():
        fields = line.split()
        if len(fields) > 4:
            # 第 5 个字段是挂载点；空格等字符被转义成 \040 这类八进制
            points.add(re.sub(r"\\([0-7]{3})", lambda m: chr(int(m.group(1), 8)), fields[4]))
    return frozenset(points)


def _is_mount_point(path: Path) -> bool:
    try:
        if os.path.ismount(path):
            return True
        return str(path.resolve()) in _mount_points()
    except OSError:
        return False


def _authorized_children(directory: Path) -> list[Path]:
    """授权目录在容器里是独立挂载点，返回它下面这类挂进来的子目录。

    平台的「数据访问授权」把用户选定的目录单独挂进来，形如
    /exposed/<空间>/public/office（父目录 public 只是脚手架，不是授权目录）。
    若照脚手架路径读写，用户在自己的公共文件夹里看不到这些文件。
    """
    try:
        children = sorted(
            (
                child
                for child in directory.iterdir()
                if child.is_dir()
                and not child.name.startswith(".")
                and child.name not in SOURCE_SKIP_NAMES
            ),
            key=lambda p: p.name.lower(),
        )
    except OSError:
        return []
    return [child for child in children if _is_mount_point(child)]


def _find_anchors(root: Path, max_depth: int) -> tuple[list[Path], list[Path]]:
    """在限定的脚手架层数内找出挂载锚点：public 目录与 users/<用户>/data 目录。

    命中锚点后不再深入该子树——授权目录里可能有成千上万个目录，逐层扫整棵树
    在 NAS/共享盘上会很慢，而脚手架层只有固定几层。
    """
    public_dirs: list[Path] = []
    user_dirs: list[Path] = []
    seen: set[str] = set()
    stack: list[tuple[Path, int]] = [(root, 0)]
    while stack:
        current, depth = stack.pop()
        if depth >= max_depth:
            continue
        try:
            children = sorted(current.iterdir(), key=lambda p: p.name.lower())
        except OSError:
            continue
        for child in children:
            if child.name.startswith(".") or child.name in SOURCE_SKIP_NAMES:
                continue
            try:
                if not child.is_dir():
                    continue
            except OSError:
                continue
            if child.name == "public" or (
                child.name == "data" and child.parent.parent.name == "users"
            ):
                # 同一目录可能经直挂路径与 volumes/<别名> 软链各命中一次，
                # 按真实路径去重，避免"单用户"判断被同一个目录凑成两个
                try:
                    identity = str(child.resolve())
                except OSError:
                    identity = str(child)
                if identity in seen:
                    continue
                seen.add(identity)
                if child.name == "public":
                    public_dirs.append(child)
                else:
                    user_dirs.append(child)
                continue
            stack.append((child, depth + 1))
    return public_dirs, user_dirs


def _shared_roots(username: str) -> list[dict]:
    """解析「数据访问授权」挂进来的目录，作为可直接浏览的入口。

    平台按 /share/<存储空间>/{public, users/<用户>/data} 的结构挂载授权目录：
      public            —— 公共目录（空间内所有用户可见）
      users/<用户>/data —— 用户数据（当前用户私有）
    这两类目录直接作为入口（与平台侧授权语义一致），不把 volumes/<随机ID>
    这类脚手架路径暴露给用户。
    """
    roots: list[dict] = []
    seen: set[str] = set()

    def add(path: Path, label: str, kind: str = "mount") -> None:
        rel = _source_relpath(SHARED_ROOT, path)
        # 按真实路径去重：平台同时挂了 /exposed/<空间> 与 /exposed/volumes/<别名>
        # （软链指向同一目录），否则同一目录会出现两个入口
        try:
            identity = str(path.resolve())
        except OSError:
            identity = rel
        if identity in seen:
            return
        seen.add(identity)
        roots.append({"name": label, "path": rel, "kind": kind})

    if not SHARED_ROOT.is_dir():
        return roots

    public_dirs, user_dirs = _find_anchors(SHARED_ROOT, MAX_ROOT_SCAN_DEPTH)

    def effective(anchor: Path) -> list[Path]:
        """锚点下若有单独挂进来的授权目录，用它们本身；否则用锚点自己。"""
        return _authorized_children(anchor) or [anchor]

    for anchor in public_dirs:
        for path in effective(anchor):
            add(path, "公共", "public")

    user_roots = [
        (path, anchor.parent.name) for anchor in user_dirs for path in effective(anchor)
    ]
    own = [path for path, owner in user_roots if owner == username]
    if own:
        for path in own:
            add(path, f"用户（{username}）", "user")
    elif len(user_roots) == 1:
        # 单用户设备上 OIDC 用户名与目录名可能不一致：只有一个用户数据目录时
        # 直接采用它，多用户时宁可不显示也不越权。
        path, owner = user_roots[0]
        add(path, f"用户（{owner}）", "user")

    if not roots:
        # 非平台标准布局：/exposed 下的一级目录即为已授权目录
        try:
            first = [
                child
                for child in sorted(SHARED_ROOT.iterdir())
                if child.is_dir() and not child.name.startswith(".")
            ]
        except OSError:
            first = []
        if len(first) == 1 and first[0].name == "volumes":
            try:
                first = [
                    child
                    for child in sorted(first[0].iterdir())
                    if child.is_dir() and not child.name.startswith(".")
                ]
            except OSError:
                first = []
        for path in first:
            add(path, path.name)
    return roots


def _document_sources(username: str) -> list[dict]:
    """当前可用的文档源。目录不存在即视为未部署，前端据此隐藏相关内容。"""
    sources: list[dict] = []
    if SHARED_ROOT.is_dir():
        sources.append(
            {
                "id": "shared",
                "name": "共享目录",
                "kind": "shared",
                "readOnly": not SHARED_WRITABLE,
                "roots": _shared_roots(username),
            }
        )
    if NAS_ROOT.is_dir():
        sources.append(
            {
                "id": "nas",
                "name": "NAS",
                "kind": "nas",
                "readOnly": not SHARED_WRITABLE,
                "roots": [{"name": "NAS", "path": ""}],
            }
        )
    return sources


def source_root(source: str) -> Path:
    """把源标识解析为已存在、已解析软链的根目录。"""
    if source == "shared":
        root = SHARED_ROOT
    elif source == "nas":
        root = NAS_ROOT
    else:
        raise HTTPException(status_code=404, detail="unknown source")
    try:
        resolved = root.resolve(strict=True)
    except OSError:
        raise HTTPException(status_code=404, detail="source unavailable")
    if not resolved.is_dir():
        raise HTTPException(status_code=404, detail="source unavailable")
    return resolved


def source_target(source: str, rel: str) -> Path:
    """把源内相对路径解析为绝对路径，并确保解析（含软链）后仍在源根内。"""
    root = source_root(source)
    cleaned = (rel or "").strip().replace("\\", "/").lstrip("/")
    if cleaned in ("", "."):
        return root
    # 隐藏项一律不可达：列表遍历本来就把 "." 开头的条目过滤掉了，这里必须一起
    # 挡住 —— 否则 .v-office-history（覆盖留底目录）能被猜到路径的人直接列出来、
    # 把备份取走。
    if any(part.startswith(".") for part in cleaned.split("/")):
        raise HTTPException(status_code=400, detail="hidden path is not accessible")
    target = (root / cleaned).resolve()
    if target != root and root not in target.parents:
        raise HTTPException(status_code=400, detail="path escapes source root")
    return target


def _source_relpath(root: Path, path: Path) -> str:
    if path == root:
        return ""
    return path.relative_to(root).as_posix()


def _source_entry(root: Path, child: Path) -> Optional[dict]:
    """构造一个条目；目录照收，文件仅收可打开的文档类型，其余返回 None。"""
    try:
        stat = child.stat()  # 跟随软链：坏链/无权限在此返回 None
    except OSError:
        return None
    if child.is_dir():
        return {
            "name": child.name,
            "path": _source_relpath(root, child),
            "isDir": True,
            "size": 0,
            "modified": int(stat.st_mtime),
        }
    if child.suffix.lower() not in BROWSABLE_SUFFIXES:
        return None
    return {
        "name": child.name,
        "path": _source_relpath(root, child),
        "isDir": False,
        "size": stat.st_size,
        "modified": int(stat.st_mtime),
    }


# ============================================================================
# 目录列举缓存
#
# 共享盘上的遍历很贵（每个条目都是网络 syscall），而"进 NAS 标签就全盘重扫"
# 是纯浪费：用户来回复看的间隔通常只有几秒。这里做一层极短 TTL 的缓存 +
# 并发去重（同一目录被多人/多标签页同时请求时只真正扫一次），任何写入立即
# 失效，保证"刚存回共享盘的文件马上出现在列表里"。
# ============================================================================
_SOURCE_CACHE_TTL = float(os.environ.get("V_OFFICE_SOURCE_CACHE_TTL", "10"))

# key -> (monotonic 时间戳, 响应体)
_source_cache: dict[str, tuple[float, dict]] = {}
# key -> 正在扫描的任务（并发去重；同一 key 只会真正扫一次）
_source_scanning: dict[str, "asyncio.Task[dict]"] = {}


def _invalidate_source_cache() -> None:
    """丢弃**所有**列举缓存。只在实在定位不到影响面时用（见 _invalidate_source_path）。"""
    if _source_cache:
        _source_cache.clear()


def _invalidate_source_path(source: str, root: Path, target: Path) -> None:
    """只失效"这次写入真正影响到"的缓存键，不再整表清空。

    原来一写就 clear()：用户发布完切到「NAS 数据」，那一个分类要重扫整棵树
    （最多 MAX_WALK_DOCUMENTS 个文件、深度 MAX_WALK_DEPTH），共享盘上就是几秒；
    而且**别的分类和目录的缓存也被一起扔掉**，来回切标签每次都得重扫。

    受影响的键只有两类，且都落在目标文件的**祖先目录**上：
      · entries   —— 该目录的直接子项列表：新文件出现在它父目录这一项里；
                     父目录自身的时间戳变了，又会体现在它上一级的列表里。
      · documents —— 从某个分类根递归平铺的结果：目标文档在其中。
    键的拼法与两个端点保持完全一致：entries 用"源内相对路径"，documents 用
    "解析后的绝对目录"（见 list_source_entries / list_source_documents）。

    祖先目录用 Path.parent 一路向上取：这样拿到的目录对象与端点里
    source_target() 解析出来的**是同一个**，不会因为目录树里存在软链而对不上键。
    """
    try:
        rel = _source_relpath(root, target)
    except ValueError:
        _invalidate_source_cache()
        return
    if not rel:
        _invalidate_source_cache()
        return

    directory = target.parent
    while True:
        _source_cache.pop(f"documents\x00{source}\x00{directory}", None)
        try:
            _source_cache.pop(
                f"entries\x00{source}\x00{_source_relpath(root, directory)}", None
            )
        except ValueError:
            pass
        if directory == root:
            break
        parent = directory.parent
        if parent == directory:  # 已经到文件系统根：上面不会再有权重键
            break
        directory = parent


async def _cached_scan(
    key: str, scanner, force: bool = False
) -> tuple[dict, bool]:
    """返回 (响应体, 是否命中缓存)。scanner 是同步函数，在工作线程里跑。"""
    now = time.monotonic()
    hit = _source_cache.get(key)
    if hit and not force and now - hit[0] < _SOURCE_CACHE_TTL:
        return hit[1], True

    task = _source_scanning.get(key)
    if task is None:
        task = asyncio.ensure_future(asyncio.to_thread(scanner))
        _source_scanning[key] = task
    try:
        payload = await task
    finally:
        _source_scanning.pop(key, None)

    _source_cache[key] = (time.monotonic(), payload)
    if len(_source_cache) > 256:
        # 目录数量天然有限；真超了就把最旧的一条清掉，避免长跑无限增长
        oldest = min(_source_cache.items(), key=lambda kv: kv[1][0])[0]
        _source_cache.pop(oldest, None)
    return payload, False


@app.get("/api/v1/sources")
async def list_sources(request: Request) -> JSONResponse:
    """列出可浏览的文档源（共享目录 / NAS）及其解析后的授权目录。"""
    username = await current_username(request)
    force = request.query_params.get("refresh", "") in ("1", "true")

    def scan() -> dict:
        return {"sources": _document_sources(username)}

    # 键要带上"解析结果与授权状态"：换挂载点（重装/换授权）或读写开关变化时
    # 必须重新解析，不能沿用上一份 payload
    cache_key = (
        f"sources\x00{SHARED_ROOT}\x00{NAS_ROOT}\x00{SHARED_WRITABLE}\x00{username}"
    )
    payload, cached = await _cached_scan(cache_key, scan, force)
    return JSONResponse({**payload, "cached": cached})


def _read_entries_sync(root: Path, directory: Path) -> tuple[list[dict], bool]:
    """同步读取一层目录（在工作线程里执行，别放事件循环上）。"""
    try:
        children = sorted(directory.iterdir(), key=lambda p: p.name.lower())
    except OSError as exc:
        raise HTTPException(status_code=403, detail=f"cannot read directory: {exc}")

    entries: list[dict] = []
    truncated = False
    for child in children:
        if len(entries) >= MAX_SOURCE_ENTRIES:
            truncated = True
            break
        name = child.name
        if name.startswith(".") or name in SOURCE_SKIP_NAMES:
            continue
        # 软链解析后再判归属：防止 <共享目录>/link -> /etc 之类的越权导航
        try:
            resolved_child = child.resolve()
        except OSError:
            continue
        if resolved_child != root and root not in resolved_child.parents:
            continue
        entry = _source_entry(root, child)
        if entry is None:
            continue
        entries.append(entry)

    # 目录在前、其余按名称排序，和常见文件浏览器一致
    entries.sort(key=lambda item: (not item["isDir"], item["name"].lower()))
    return entries, truncated


@app.get("/api/v1/sources/{source}/entries")
async def list_source_entries(
    source: str, request: Request, path: str = ""
) -> JSONResponse:
    """列出某个文档源下的一级内容（子目录 + 可打开的文档）。"""
    await current_username(request)
    root = source_root(source)
    directory = source_target(source, path)
    if not directory.is_dir():
        raise HTTPException(status_code=404, detail="directory not found")

    rel = _source_relpath(root, directory)
    force = request.query_params.get("refresh", "") in ("1", "true")

    def scan() -> dict:
        # 挂载盘上的目录读取是阻塞 syscall：交给 _cached_scan 在工作线程里跑，
        # 既不挡事件循环（列文档 / 保存 / WOPI / 健康检查），也不会因为用户
        # 来回点而重复扫盘。
        entries, truncated = _read_entries_sync(root, directory)
        parent = rel.rsplit("/", 1)[0] if "/" in rel else ""
        return {
            "source": source,
            "path": rel,
            "parent": parent,
            "entries": entries,
            "truncated": truncated,
        }

    payload, cached = await _cached_scan(f"entries\x00{source}\x00{rel}", scan, force)
    return JSONResponse({**payload, "cached": cached})


@app.get("/api/v1/sources/{source}/file")
async def get_source_file(source: str, request: Request, path: str) -> FileResponse:
    """下载（打开）源里的一个文档，供浏览器端编辑器加载。"""
    await current_username(request)
    if not path:
        raise HTTPException(status_code=400, detail="missing path")
    target = source_target(source, path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    if target.suffix.lower() not in BROWSABLE_SUFFIXES:
        raise HTTPException(status_code=400, detail="unsupported file type")
    # 版本标记随内容一起给客户端：编辑器保存时回传它（if-match-token），服务端
    # 据此确认"你写的还是你收到的那一版"。用响应头而不是塞进响应体，是因为这里
    # 返回的是原始字节流，没有位置放元数据。
    return FileResponse(
        target,
        filename=target.name,
        media_type="application/octet-stream",
        headers={"X-VOffice-Token": _file_token(target)},
    )


def _walk_documents_sync(root: Path, directory: Path) -> tuple[list[dict], bool]:
    """同步递归遍历（在工作线程里执行；纯目录扫描，不含任何 await）。"""
    documents: list[dict] = []
    truncated = False
    stack: list[tuple[Path, int]] = [(directory, 0)]
    # 同一目录/文件常能经两条路径到达（真实路径与 /exposed/volumes/<别名> 软链，
    # 或多条授权目录重叠），按真实路径去重，否则列表里每个文档会出现两遍
    visited: set[str] = set()
    while stack and not truncated:
        current, depth = stack.pop()
        if depth > MAX_WALK_DEPTH:
            continue
        try:
            children = sorted(current.iterdir(), key=lambda p: p.name.lower())
        except OSError:
            continue
        for child in children:
            name = child.name
            if name.startswith(".") or name in SOURCE_SKIP_NAMES:
                continue
            try:
                resolved = child.resolve()
            except OSError:
                continue
            # 软链解析后必须仍在授权根目录内，避免顺着链接遍历到盘外
            if resolved != root and root not in resolved.parents:
                continue
            identity = str(resolved)
            if identity in visited:
                continue
            visited.add(identity)
            try:
                is_dir = child.is_dir()
            except OSError:
                continue
            if is_dir:
                stack.append((child, depth + 1))
                continue
            if child.suffix.lower() not in BROWSABLE_SUFFIXES:
                continue
            if len(documents) >= MAX_WALK_DOCUMENTS:
                truncated = True
                break
            try:
                stat = child.stat()
            except OSError:
                continue
            documents.append(
                {
                    "name": name,
                    "path": _source_relpath(root, child),
                    "folder": (
                        ""
                        if child.parent == directory
                        else _source_relpath(directory, child.parent)
                    ),
                    "size": stat.st_size,
                    "modified": int(stat.st_mtime),
                }
            )

    documents.sort(key=lambda item: (item["name"].lower(), item["path"]))
    return documents, truncated


@app.get("/api/v1/sources/{source}/documents")
async def list_source_documents(
    source: str, request: Request, path: str = ""
) -> JSONResponse:
    """递归遍历一个授权目录，平铺返回其中所有可打开的文档。

    挂载进来的盘里，文档常埋在多级子目录里（如 A/B/C/…），让用户一层层点进去
    很费劲。这里一次遍历到底，返回每个文档的源内路径与所在子目录，前端直接
    平铺展示；点开编辑、保存写回原路径。

    安全与成本：深度上限 MAX_WALK_DEPTH，文档数上限 MAX_WALK_DOCUMENTS（超出
    截断并置 truncated=true）；跳过隐藏目录与系统目录；软链解析后越出授权根
    目录的一律不遍历。
    """
    await current_username(request)
    root = source_root(source)
    directory = source_target(source, path)
    if not directory.is_dir():
        raise HTTPException(status_code=404, detail="directory not found")

    rel = _source_relpath(root, directory)
    force = request.query_params.get("refresh", "") in ("1", "true")

    def scan() -> dict:
        # 这段递归遍历在挂载盘上很贵：同步跑会把整个服务卡住（实测 781ms 里事件
        # 循环只调度了 1 次），而"每次进 NAS 标签都全盘重扫"纯属浪费。交给
        # _cached_scan：在工作线程里跑 + 极短 TTL 缓存 + 并发去重。
        documents, truncated = _walk_documents_sync(root, directory)
        return {
            "source": source,
            "path": rel,
            "documents": documents,
            "truncated": truncated,
        }

    # 键用"解析后的真实目录"，而不是 source+相对路径：挂载点换了就是另一个键
    payload, cached = await _cached_scan(
        f"documents\x00{source}\x00{directory}", scan, force
    )
    return JSONResponse({**payload, "cached": cached})


def _require_writable(source: str) -> None:
    """写入前的准入检查：应用侧开关 + 源必须存在。"""
    if not SHARED_WRITABLE:
        raise HTTPException(status_code=403, detail="shared source is read-only")
    source_root(source)


# ============================================================================
# 阻塞 I/O 一律出事件循环
#
# uvicorn 在这里是单进程单事件循环（server/Dockerfile 的 CMD 没有 --workers），
# 而共享盘（SMB/NFS）上的每一次 write / read / stat 都是网络调用：一个用户在
# 共享盘上保存占用几百毫秒，这期间其他人的保存、列目录、WOPI 回调、健康检查
# 全部排队。表现出来就是"偶尔卡一下、对方光标突然跳一下"，单人自测复现不了。
#
# 列目录与 soffice 早已丢进线程（_read_entries_sync / _walk_documents_sync /
# convert_file），这里把读写路径补齐。
# ============================================================================


def _atomic_write_private(target: Path, body: bytes) -> None:
    """私有目录落盘：同目录临时文件 + os.replace，避免写到一半截断原文档。"""
    tmp = target.with_name(target.name + ".tmp")
    tmp.write_bytes(body)
    os.replace(tmp, target)


def _write_source_or_skip(target: Path, body: bytes) -> bool:
    """共享源落盘；内容与扩展名不符时跳过（返回 False，保持原文件不动）。"""
    if not _accepts_body(target, body):
        return False
    _atomic_write(target, body)
    return True


def _copy_file_atomic(src: Path, dst: Path) -> int:
    """读一份、原子写一份（共享盘 <-> 私有目录之间复制），返回字节数。"""
    data = src.read_bytes()
    _atomic_write(dst, data)
    return len(data)


def _atomic_write(target: Path, body: bytes) -> None:
    """同目录临时文件 + os.replace 落盘，避免写到一半把原文档截断。

    共享盘（SMB/NFS）可能是只读挂载或权限不足，这类错误统一折算成 403，
    让前端能明确提示"该目录不可写"而不是笼统的 500。
    """
    tmp = target.with_name(target.name + ".v-office-tmp")
    try:
        tmp.write_bytes(body)
        os.replace(tmp, target)
    except OSError as exc:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
        LOG.warning("shared write failed at %s: %s", target, exc)
        raise HTTPException(status_code=403, detail="shared source is not writable")


# ============================================================================
# 写入共享盘（「覆盖添加」）的并发控制
#
# 共享盘是多应用共用的权威数据，这里的每一次写入都不可逆，因此：
#
#   1. 「判定 + 写」必须在同一临界区内。旧实现先判 exists() 再写，两步之间
#      没有任何互斥：两个人同时存同名文件会双双通过检查，后写者静默覆盖
#      先写者，而先写者收到的是"成功"。
#   2. 覆盖必须带版本凭据（CAS）。用户确认的是"他看到的那个版本"，不是
#      "当前随便哪个版本"。凭据用内容指纹而不是 mtime：共享盘（SMB）的
#      mtime 常是秒级精度，同一秒内两次写入时间戳相同，正好漏判。
#   3. 覆盖前留底，留底失败即覆盖失败（不降级）。宁可报错，也不做不可逆的
#      写入 —— 降级成"留底失败就直接覆盖"等于把唯一的回滚手段丢掉。
#   4. 锁只在**单进程**内有效：server/Dockerfile 的 CMD 没有 --workers，
#      单进程单事件循环。将来要给本服务加 worker/多副本，必须先把这里的
#      进程内锁换成共享盘上的租约锁，否则并发保护会**静默失效**。
# ============================================================================

# 单目标排队的等待上限。共享盘抖动时排队必须有界，否则请求会堆到前端 30s
# 超时之后（前端 request() 用的就是 AbortSignal.timeout(30_000)）。
COPY_LOCK_TIMEOUT = float(os.environ.get("V_OFFICE_COPY_LOCK_TIMEOUT", "20"))

# 覆盖前把旧文件留底到目标目录下的隐藏目录，每个文件保留最近 N 份；
# 0 表示关掉（等于放弃"误覆盖可回滚"，共享盘上不建议关）。
# 默认 5：文件列表里「版本」那一栏就展示最近 5 个可回退的版本（见 source_history）。
SHARED_HISTORY_KEEP = int(os.environ.get("V_OFFICE_SHARED_HISTORY_KEEP", "5"))
if os.environ.get("V_OFFICE_SHARED_HISTORY", "1").lower() in ("0", "false", "no"):
    SHARED_HISTORY_KEEP = 0
HISTORY_DIR_NAME = ".v-office-history"

# 目标最终绝对路径 → 排队锁（只在本进程内有效，见上面的 4.）
_copy_locks: dict[str, asyncio.Lock] = {}


class SharedWriteConflict(Exception):
    """可预期的写入冲突：调用方据此回 409/423，并带上当前文件信息供用户决策。"""

    def __init__(self, reason: str, status: int = 409, **extra) -> None:
        super().__init__(reason)
        self.reason = reason
        self.status = status
        self.extra = extra


def _warn_if_single_process() -> None:
    """多 worker / 多副本时把"并发保护已经失效"这件事喊出来。

    _copy_locks 是**进程内**的内存对象，进程之间互不可见。一旦本服务被起了多个
    worker（或同一份存储被多个副本挂载），同一份文件的两次覆盖会各自持一把"互不
    相干的锁"，于是双双通过 CAS、双双写盘 —— os.replace 是"最后写赢"，而**两边
    都会收到成功**。这种失效不报错、日志全绿，只有内容少了一份。

    检测手段（WEB_CONCURRENCY / UVICORN_WORKERS / GUNICORN_WORKERS）只是环境
    变量的约定，uvicorn --workers 并不一定设置它们，所以这是**尽力而为的提醒**，
    不是保证。真正的解法是把锁放到共享盘上做租约。
    """
    declared = (
        os.environ.get("WEB_CONCURRENCY")
        or os.environ.get("UVICORN_WORKERS")
        or os.environ.get("GUNICORN_WORKERS")
        or ""
    ).strip()
    if declared and declared not in ("1", "0"):
        LOG.warning(
            "detected %s workers: the in-process publish lock is NOT shared across "
            "processes, concurrent overwrites of the same file can silently "
            "overwrite each other. Keep a single worker, or move the lock to an "
            "on-disk lease.",
            declared,
        )


def _lock_key(target: Path) -> str:
    """排队锁的键：优先用 inode，拿不到（文件还不存在）才退回路径字符串。

    为什么不能直接拿路径字符串当键：在大小写不敏感（SMB/CIFS 默认如此）或存在
    硬链接别名的挂载上，同一份文件可以有多个"看起来不同"的路径写法，而
    Path.resolve() 在 Linux 上**不做大小写折叠** —— 于是 Report.docx 与
    report.docx 会各拿一把锁，两个人同时覆盖同一份文件、双双通过检查。
    inode 相同则说明是同一个文件，用它做键天然归一。
    """
    try:
        stat = target.stat()
    except OSError:
        # 新建：这个名字此刻还没被任何 inode 占用，路径字符串就够——
        # 同一时刻抢同一个新名字的请求会拿到同一个键。
        return f"path:{target}"
    return f"ino:{stat.st_dev}:{stat.st_ino}"


@asynccontextmanager
async def _copy_lock(target: Path):
    """按目标排队（键的取法见 _lock_key）。

    这把锁在**进程内**生效，前提是单进程单 worker（server/Dockerfile 的 CMD
    没有 --workers）。多 worker 时各进程持有的锁互不相干，覆盖会退化成"最后
    写赢"且双方都收到成功——启动时会对此告警，见 _warn_if_single_process()。
    """
    key = _lock_key(target)
    lock = _copy_locks.setdefault(key, asyncio.Lock())
    try:
        await asyncio.wait_for(lock.acquire(), timeout=COPY_LOCK_TIMEOUT)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=423, detail={"reason": "busy"})
    try:
        yield
    finally:
        lock.release()
        # 回收：不回收的话 key 会随"每个被写过的文件"一直累积
        if not lock.locked() and not lock._waiters:
            _copy_locks.pop(key, None)


# 内容指纹缓存：目标路径 → ((mtime_ns, size), 指纹)。
#
# 一次覆盖原本要把同一份文件读三遍（算当前版本、给备份命名、写后算新版本），
# 大文件走共享盘就是好几秒。这里按键缓存指纹，把重复读压掉：只有"文件真的变了"
# 才重新读。
#
# 已知边界：命中判断依赖 (mtime_ns, size)。外部程序在**同一时间粒度内**改成
# **同样大小**的内容会漏判（SMB 的 mtime 常是秒级）——这与 WOPI 的 Version
# 是同一类取舍，且覆盖前有留底可回滚。
_VERSION_CACHE: dict[str, tuple[tuple[int, int, int], str]] = {}
_VERSION_CACHE_MAX = 512


def _version_key(path: Path) -> tuple[int, int, int] | None:
    """内容版本缓存的键：**mtime + 大小 + inode**。

    只用 mtime+大小是不够的：这份代码在共享盘上真的遇到过"同一时刻、同样大小的两次写入"
    （测试里 old/new 都是 3 字节），键撞上就会把**旧指纹**当成当前版本返回 —— 而它既是对外
    展示的"当前版本"，也是「覆盖」的 CAS 凭据，错了会让覆盖判定失准。inode 每次都不同
    （写入走 tmp + os.replace，换的是新文件），把它并进键里就分得开了。
    """
    try:
        stat = path.stat()
    except OSError:
        return None
    return (stat.st_mtime_ns, stat.st_size, stat.st_ino)


def _remember_version(path: Path, digest: str) -> None:
    """把某个文件"刚被我们写成什么内容"记进缓存，省掉紧接着的那次回读。"""
    key = _version_key(path)
    if key is None:
        _VERSION_CACHE.pop(str(path), None)
        return
    if len(_VERSION_CACHE) >= _VERSION_CACHE_MAX:
        _VERSION_CACHE.pop(next(iter(_VERSION_CACHE)), None)
    _VERSION_CACHE[str(path)] = (key, digest)


def _version_of_bytes(data: bytes) -> str:
    """直接对内存里的字节算指纹。

    写完盘要回一个"新版本号"，而那份字节就在手里（我们刚写下去的），
    没有任何理由再把它从共享盘读回来算一遍。
    """
    return hashlib.blake2b(data, digest_size=16).hexdigest()


def _content_version(path: Path) -> str:
    """共享盘文件的内容指纹，作为「覆盖」的 CAS 凭据。

    只用于"单个文件"的判定（覆盖、WOPI 版本、对话框展示），不要挪到列目录里：
    一次递归遍历最多 MAX_WALK_DOCUMENTS 个文件，逐个读内容会把共享盘拖垮。
    """
    stamp = _version_key(path)
    if stamp is None:
        return ""
    key = str(path)
    hit = _VERSION_CACHE.get(key)
    if hit and hit[0] == stamp:
        return hit[1]
    try:
        digest = hashlib.blake2b(path.read_bytes(), digest_size=16).hexdigest()
    except OSError:
        return ""
    if len(_VERSION_CACHE) >= _VERSION_CACHE_MAX:
        _VERSION_CACHE.pop(next(iter(_VERSION_CACHE)), None)
    _VERSION_CACHE[key] = (stamp, digest)
    return digest


def _file_token(path: Path) -> str:
    """廉价的"文件变过没有"标记，专供 WOPI 的 Version / X-WOPI-ItemVersion。

    CheckFileInfo 会被 Collabora 频繁调用，每次都做内容哈希太贵，WOPI 这条路
    因此用 mtime+size。它比内容指纹弱（共享盘 mtime 可能是秒级），但本服务
    自己的写入都经过 os.replace 换成新文件，时间戳一定会前进；真遇到"同一秒
    内等长改写"这种极端情况，还有写盘前的 X-WOPI-Lock 兜着。
    """
    try:
        stat = path.stat()
    except OSError:
        return ""
    return f"{stat.st_mtime_ns:x}-{stat.st_size:x}"


def _normalize_relpath(rel: str) -> str:
    """源内相对路径的规范化形式（用来拼协同锁的键）。"""
    return (rel or "").strip().replace("\\", "/").lstrip("/")


def _history_safe_user(name: str) -> str:
    """备份文件名里的操作人标签：**不含 "."**、不含路径分隔符。

    备份名是 `<原名>.<时间戳>[.<操作人>].<版本>`，而原名本身含 "."（如 .docx），所以
    操作人这一段一旦带 "." 就没法从文件名反解出边界了。
    """
    safe = USERNAME_SAFE_RE.sub("_", str(name or "")).replace(".", "_")
    return safe[:32].strip("_")


def _history_author_file(target: Path) -> Path:
    """记录"这一版是谁提交的"的辅助文件（与备份同目录，`<原名>.author`）。

    只记一行内容版本、一行用户名。界面「版本」里要显示"谁提交的"，而备份是在**下一版
    写进来的时候**才创建的——创建那一刻才知道被打包走的是谁的版本，所以得在写入时就
    把提交人记下来。
    """
    return target.parent / HISTORY_DIR_NAME / f"{target.name}.author"


def _remember_author(target: Path, by: str, version: str) -> None:
    """记下"当前这一版是谁提交的"（写入成功后调用）。

    记的是 **内容版本 + 提交人**：读取时只有版本对得上才作数。共享盘上的文件可能被别的
    应用（SMB、另一个系统）直接改写，那种改写不经过我们，记录随之过期；带上版本号就能
    识别出"这记录说的不是我眼前这一版"，宁可不显示提交人，也不显示错的人。

    写不进去不该让写入失败：这只是界面上的一栏。
    """
    if not by or not version:
        return
    try:
        sidecar = _history_author_file(target)
        sidecar.parent.mkdir(parents=True, exist_ok=True)
        sidecar.write_text(f"{version}\n{_history_safe_user(by)}\n", encoding="utf-8")
    except OSError as exc:
        LOG.warning("cannot remember the author of %s: %s", target, exc)


def _archived_author(target: Path, version: str) -> str:
    """被归档的那一版是谁提交的；没有记录、或记录已过期时返回空串。"""
    try:
        lines = _history_author_file(target).read_text("utf-8").splitlines()
    except OSError:
        return ""
    if len(lines) < 2 or not version or lines[0].strip() != version:
        return ""
    return lines[1].strip()


def _prune_history(history: Path, name: str, keep: int) -> None:
    """每个文件只留最近 keep 份备份，淘汰最老的。

    按**留底时刻**排（硬链接拿到的正是被覆盖那一版的 mtime，逐次递增），时刻相同再按
    名字兜底：如果只按名字排，同一秒内连续覆盖几次会排成随机顺序，可能把最新那份淘汰掉。

    只认备份名那种形状：同一个目录里还有 `<原名>.author` 这种辅助记录，别把它当备份删了。
    """
    try:
        siblings = [
            p
            for p in history.iterdir()
            if p.name.startswith(name + ".")
            and _HISTORY_STAMP_RE.fullmatch(p.name[len(name) + 1 :].split(".")[0])
        ]
        siblings.sort(key=lambda p: (p.stat().st_mtime_ns, p.name), reverse=True)
    except OSError:
        return
    for stale in siblings[keep:]:
        try:
            stale.unlink()
        except OSError:
            pass


def _snapshot_before_overwrite(
    target: Path, keep: int, known_version: str = ""
) -> str:
    """覆盖前把旧字节留底到 <目录>/.v-office-history/，返回源内相对备份路径。

    留底失败必须让整个覆盖失败：它是覆盖的**前置条件**，不是顺手做一下的附加
    动作。目录本身以 "." 开头，浏览接口不会把它列出来。

    实现上优先用**同卷硬链接**：备份只是多一个目录项，旧 inode 由它保活，
    紧接着的 os.replace 换掉名字也不会丢内容 —— 零拷贝。原来用 shutil.copy2
    要把整个文件从共享盘读一遍再写一遍，大文件上就是好几秒（而且是在持锁期间）。
    跨卷或文件系统不支持时才退回复制。

    known_version：当前这一版的内容指纹，用来给备份起一个能区分"同一秒内多次覆盖"的
    名字。界面「版本」里显示的那一段（谁提交的）来自写入时留下的作者记录，不在这里传。
    """
    if keep <= 0:
        return ""
    history = target.parent / HISTORY_DIR_NAME
    stamp = time.strftime("%Y%m%d-%H%M%S")
    # 版本号复用调用方已经算过的那一个：为了给备份起名而再读一遍整个文件，
    # 是这份代码里最没必要的一笔开销。调用方没算过时用廉价的文件标记兜底——
    # 这个名字只需要"可区分"，不值得为它读一遍文件（而调用方没算过，往往正是
    # 因为它手上只有这个廉价标记）。
    version8 = (known_version or _file_token(target).replace("-", ""))[:8] or "unknown"
    # 名字里的这一段记的是"这一版是谁提交的"（不是"谁覆盖了它"）。只有作者记录真的存在时
    # 才去算一次完整内容版本用于核对——那要读一遍文件，没有记录就没必要为它付这个代价。
    operator = ""
    if _history_author_file(target).is_file():
        operator = _history_safe_user(
            _archived_author(target, known_version or _content_version(target))
        )
    label = f"{stamp}.{operator}" if operator else stamp
    backup_name = f"{target.name}.{label}.{version8}"
    destination = history / backup_name
    try:
        history.mkdir(parents=True, exist_ok=True)
        try:
            os.link(target, destination)
        except FileExistsError:
            # 撞名只说明"名字一样"，不代表"内容一样"：同一秒内连续覆盖两次、而文件标记
            # （mtime + 大小）恰好也相同，就会走到这里。这种时候**必须换个名字也要把这一版
            # 留下**——静默跳过等于凭空丢掉一版历史，而留底正是"强制覆盖"能被接受的前提。
            # 判断依据用 inode：真要是同一份内容，硬链接过去的备份和目标就是同一个 inode。
            same = False
            try:
                same = destination.stat().st_ino == target.stat().st_ino
            except OSError:
                same = False
            if not same:
                destination = _history_extra_path(history, backup_name)
                backup_name = destination.name
                os.link(target, destination)
        except OSError:
            shutil.copy2(target, destination)
        _prune_history(history, target.name, keep)
    except OSError as exc:
        LOG.error("shared history snapshot failed for %s: %s", target, exc)
        raise HTTPException(
            status_code=500, detail="cannot snapshot the file before overwriting"
        )
    return f"{HISTORY_DIR_NAME}/{backup_name}"


def _history_extra_path(history: Path, backup_name: str, tries: int = 20) -> Path:
    """撞名又不是同一份内容时，给备份找一个没被占用的名字（原名字后加 -2、-3…）。

    后缀加在最后一段后面，名字形状（`<原名>.<时间戳>[.<操作人>].<版本>`）仍然保持可解析。
    """
    for index in range(2, tries + 2):
        candidate = history / f"{backup_name}-{index}"
        if not candidate.exists():
            return candidate
    raise OSError(f"cannot find a free history name for {backup_name}")


# 备份名里时间戳的形状，用来把"这个文件"和"这个文件的备份"分开
_HISTORY_STAMP_RE = re.compile(r"\d{8}-\d{6}")


def _history_entries(target: Path, keep: int) -> list[dict]:
    """某个文件的留底版本，最新的在前。给界面「版本」用。

    只认 _snapshot_before_overwrite 写出来的名字形状：`<原名>.<时间戳>[.<操作人>].<版本>`
    （早期版本没有操作人那一段，这里按"第二段是不是时间戳"来兼容）。排序按**留底时刻**
    （硬链接拿到的就是被覆盖那版的 mtime），同一秒内连续覆盖也能排出正确的新旧顺序。
    """
    if keep <= 0:
        return []
    history = target.parent / HISTORY_DIR_NAME
    try:
        candidates = [p for p in history.iterdir() if p.name.startswith(target.name + ".")]
    except OSError:
        return []

    entries: list[dict] = []
    for path in candidates:
        parts = path.name[len(target.name) + 1 :].split(".")
        if len(parts) < 2 or not _HISTORY_STAMP_RE.fullmatch(parts[0]):
            continue
        try:
            if not path.is_file():
                continue
            stat = path.stat()
        except OSError:
            continue
        entries.append(
            {
                # id 就是备份文件名，回退时原样回传；服务端会校验它确实属于这个文件
                "id": path.name,
                "name": target.name,
                # 这一版"另存/打开"时该用的名字（带那一版的时刻）。由服务端给，界面不必
                # 自己拼一遍，也就不会和「保存到我的文档」落盘时的名字对不上。
                "exportName": _versioned_export_name(target, path.name),
                "size": stat.st_size,
                "modified": int(stat.st_mtime),
                "by": parts[1] if len(parts) >= 3 else "",
                "version": parts[-1],
                "_mtime_ns": stat.st_mtime_ns,
            }
        )
    entries.sort(key=lambda item: (item["_mtime_ns"], item["id"]), reverse=True)
    for item in entries:
        item.pop("_mtime_ns", None)
    return entries[:keep]


def _history_backup_path(target: Path, backup_id: str) -> Path:
    """把回退请求里的 id 解析成一个**确实属于这个文件**的备份路径。

    这是写入路径上的入参，必须挡住 `../` 之类的越权：只接受纯文件名、必须以
    "<原名>." 开头、必须落在同一个隐藏目录里、时间戳段必须合法。
    """
    if not backup_id or Path(backup_id).name != backup_id:
        raise HTTPException(status_code=400, detail="invalid history id")
    if not backup_id.startswith(target.name + "."):
        raise HTTPException(status_code=400, detail="history id does not match the file")
    parts = backup_id[len(target.name) + 1 :].split(".")
    if len(parts) < 2 or not _HISTORY_STAMP_RE.fullmatch(parts[0]):
        raise HTTPException(status_code=400, detail="invalid history id")
    path = target.parent / HISTORY_DIR_NAME / backup_id
    if not path.is_file():
        raise HTTPException(status_code=404, detail="history version not found")
    return path


def _versioned_export_name(target: Path, backup_id: str) -> str:
    """给「保存到我的文档」起个能看出是哪一版的名字：原名 + 那一版的时刻。

    时刻用连字符而不是冒号：这个名字会出现在下载文件名里，冒号在 Windows 上非法。
    """
    stamp = backup_id[len(target.name) + 1 :].split(".")[0]
    pretty = f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]} {stamp[9:11]}-{stamp[11:13]}"
    stem, suffix = os.path.splitext(target.name)
    return f"{stem} ({pretty}){suffix}"


def _restore_from_history_sync(target: Path, backup: Path, keep: int, by: str) -> dict:
    """把某个留底版本写回原文件（在锁内、工作线程里执行）。

    回退**本身也先留底当前版本**：否则"回退错了"就变成新的不可逆操作。
    """
    previous_version = _content_version(target)
    backup_path = _snapshot_before_overwrite(
        target, keep, known_version=previous_version
    )
    data = backup.read_bytes()
    _atomic_write(target, data)
    # 版本号直接用刚写下去的那份字节算并回填缓存：回读一次既慢又可能被"同尺寸、同一
    # 时刻"的新旧两份撞上图省事（见 _version_key 的说明），拿到的是上一个版本的指纹。
    written_version = _version_of_bytes(data)
    _remember_version(target, written_version)
    # 记下"现在这一版是谁提交的"：它下次被覆盖时，「版本」列表里要显示提交人
    _remember_author(target, by, written_version)
    return {
        "status": "restored",
        "path": "",
        "size": len(data),
        "version": written_version,
        "previousVersion": previous_version,
        "restoredFrom": backup.name,
        "backup": backup_path,
    }


def _write_new_exclusive(target: Path, body: bytes) -> None:
    """创建路径专用：**排他创建 + 带内容落位**，一步完成。

    先把内容写进同目录临时文件，再用 os.link 落位：目标已存在时 link 失败
    （这就是排他创建），而且失败时盘上什么都没被改动。

    此前分两步（O_CREAT|O_EXCL 建一个 0 字节占位 → os.replace 盖上内容）：两步
    之间进程被杀，公共目录里就留下一个 0 字节文件，在别人眼里就是"文档损坏"。
    与 os.replace 不同，os.link 在多进程/多副本下同样排他——这是"最后写赢"之外
    唯一能真正互斥的原语。硬链接不可用的文件系统（跨卷、部分 NFS）退回
    "存在性判断 + os.replace"，那类部署只能靠"单实例"这条约束兜底。
    """
    tmp = target.with_name(target.name + ".v-office-tmp")
    try:
        tmp.write_bytes(body)
        try:
            os.link(tmp, target)
        except FileExistsError:
            raise SharedWriteConflict("target-exists")
        except OSError:
            if target.exists():
                raise SharedWriteConflict("target-exists")
            os.replace(tmp, target)
    except SharedWriteConflict:
        raise
    except OSError as exc:
        LOG.warning("shared write failed at %s: %s", target, exc)
        raise HTTPException(status_code=403, detail="shared source is not writable")
    finally:
        # link 成功后临时文件仍在（只是多了一个目录项），replace 成功后它已被
        # 消费掉 —— 两种情况下这里都是"删一个不存在的文件"，静默忽略。
        try:
            tmp.unlink()
        except OSError:
            pass


def _write_new_unique(directory: Path, name: str, body: bytes, tries: int = 20) -> Path:
    """挑一个不冲突的新名字并排他创建，返回真正落位的路径（xxx (1).docx …）。

    挑名字和占位必须在同一处、同一把锁内完成：让前端挑好名字再发请求，中间
    必然有人能插进去。
    """
    stem, suffix = os.path.splitext(name)
    for index in range(1, tries + 1):
        candidate = directory / f"{stem} ({index}){suffix}"
        try:
            _write_new_exclusive(candidate, body)
        except SharedWriteConflict:
            continue
        return candidate
    raise SharedWriteConflict("name-exhausted")


def _publish_to_source_sync(
    blob: Path,
    directory: Path,
    root: Path,
    history_keep: int,
    by: str = "",
) -> dict:
    """把「我的文档」里的一份文件写进共享目录（由调用方丢进工作线程）。

    语义就是**同名直接覆盖**：用户点「存入公共目录」时已经确认过，不需要再来一次
    "你看到的是哪一版"的比对（那套凭据只在"多人同时改同一份"时才有意义，而这个入口
    本来就是"把我的这份放上去"）。共享盘上被覆盖掉的那一版会被留底，用户随时能从
    「版本」里取回来或退回去 —— 强制覆盖之所以能接受，靠的就是这一步。

    写入路径的互斥由调用方的按目标排队锁 + 原子写负责：这里只管"留底、写、记账"。
    """
    target = directory / blob.name
    existed = target.is_file()

    # 覆盖前留底，并把"被覆盖掉的那一版是谁提交的"写进备份名（见 _snapshot_before_overwrite）。
    # 留底失败会抛 500，让整个覆盖失败：它是覆盖的前置条件，不是顺手做一下的附加动作。
    backup = ""
    if existed:
        # 交给留底的是当前这一版的**内容指纹**：备份名要能区分"同一秒内的多次覆盖"，
        # 而廉价的文件标记（mtime + 大小）在共享盘上同一秒内可能完全相同、名字会撞。
        backup = _snapshot_before_overwrite(
            target, history_keep, _content_version(target)
        )

    data = blob.read_bytes()
    _atomic_write(target, data)

    # 新版本号直接对**刚写下去的那份字节**算：它就在手里，没有任何理由再从共享盘
    # 把整份读回来算一遍
    written_version = _version_of_bytes(data)
    _remember_version(target, written_version)
    # 记下"现在这一版是谁提交的"：它下次被覆盖时，「版本」列表里要显示提交人
    _remember_author(target, by, written_version)
    return {
        "status": "overwritten" if existed else "created",
        "path": _source_relpath(root, target),
        "size": len(data),
        "version": written_version,
        "backup": backup,
    }


@app.put("/api/v1/sources/{source}/file")
async def put_source_file(
    source: str,
    request: Request,
    path: str,
    if_match_token: str = Query("", alias="if-match-token"),
) -> JSONResponse:
    """把编辑后的文档写回共享源——即"编辑 NAS 上的原文档"。

    覆盖已有文件；文件不存在时作为新文档创建（父目录必须已存在）。写回始终
    落在原路径上，因此共享盘上的文件名/位置保持不变。

    if-match-token：编辑器打开这份文档时服务端随内容一起给它的版本标记
    （见 GET .../file 的 X-VOffice-Token 响应头）。带上就做一次 CAS —— 盘上
    已经不是他看到的那一版就拒写。

    为什么必须补这一刀：共享盘里刻意排除协同的那几类（pdf / txt / md / csv /
    rtf）走的就是单机内核保存 → 这条路径。它此前**既没有排队锁、也没有版本
    校验、也没有留底**，是共享盘写入里唯一还敞着的口子：A 刚发布上去的内容，
    会被 B 手里那份"打开时的旧副本"整份写回抹掉，而且不可恢复。
    """
    username = await current_username(request)
    if not path:
        raise HTTPException(status_code=400, detail="missing path")
    _require_writable(source)

    target = source_target(source, path)
    if target.suffix.lower() not in BROWSABLE_SUFFIXES:
        raise HTTPException(status_code=400, detail="unsupported file type")
    if target.exists() and not target.is_file():
        raise HTTPException(status_code=400, detail="target is not a file")
    if not target.parent.is_dir():
        raise HTTPException(status_code=404, detail="directory not found")

    length = request.headers.get("Content-Length")
    if length and length.isdigit() and int(length) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    # 请求体先读出来：读 body 不需要进临界区
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    backup = ""
    async with _copy_lock(target):
        # 判定必须在锁内：锁外判等于没判
        exists = target.is_file()
        current_token = _file_token(target) if exists else ""
        if exists and if_match_token and if_match_token != current_token:
            LOG.warning(
                "shared save rejected (version changed) user=%s path=%s "
                "expected=%s on disk=%s",
                username,
                path,
                if_match_token,
                current_token,
            )
            raise HTTPException(
                status_code=409,
                detail={"reason": "version-changed", "token": current_token},
            )

        # 没带凭据（旧版前端 / 直连 API）就无从判断这次写入基于哪一版，因此留一份底，
        # 让覆盖至少可回滚；带了且匹配的，说明用户就是对着"他看到的那一版"保存的，
        # 属于正常保存 —— 不留底，否则编辑器每 10 秒一次自动保存会把留底目录刷满，
        # 真正有价值的历史点反而被挤掉。
        if exists and not if_match_token:
            backup = await asyncio.to_thread(
                _snapshot_before_overwrite, target, SHARED_HISTORY_KEEP, ""
            )

        written = await asyncio.to_thread(_write_source_or_skip, target, body)
        if written:
            # 记下这一版是谁提交的：下一次它被覆盖时，界面「版本」里要显示出来
            saved_version = await asyncio.to_thread(_content_version, target)
            await asyncio.to_thread(_remember_author, target, username, saved_version)

    new_token = _file_token(target)
    if not written:
        # 内容与扩展名不符（PDF 这一类）：原文件不动，照旧回成功让 Ctrl+S 可用
        size = target.stat().st_size if target.is_file() else 0
        return JSONResponse(
            {
                "status": "ok",
                "path": path,
                "size": size,
                "token": new_token,
                "unchanged": True,
            }
        )

    # 共享盘内容变了：精确失效受影响的列举缓存（不再整表清空，免得别的目录跟着重扫），
    # 用户回到列表立刻看到新的时间/大小
    _invalidate_source_path(source, source_root(source), target)
    LOG.info(
        "shared saved user=%s path=%s size=%d from=%s to=%s backup=%s",
        username,
        path,
        len(body),
        if_match_token or "-",
        new_token,
        backup or "-",
    )
    return JSONResponse(
        {
            "status": "ok",
            "path": path,
            "size": len(body),
            "token": new_token,
            "backup": backup,
        }
    )


@app.post("/api/v1/sources/{source}/copy-from-file")
async def copy_file_to_source(
    source: str, request: Request, name: str, path: str = ""
) -> JSONResponse:
    """把「我的文档」里的一个文件写入共享源目录（例如 NAS 的公共目录）。

    服务端直接读私有目录、写共享盘，不需要把文件下载到浏览器再上传一遍。
    同名**直接覆盖**：用户点这个入口本来就是"把我这份放上去"，不需要再来一次
    "你看到的是哪一版"的比对。覆盖掉的那一版会留底，随时能从文件列表的「版本」
    里取回来或退回去 —— 强制覆盖之所以能接受，靠的就是这一步。
    """
    username = await current_username(request)
    if not name:
        raise HTTPException(status_code=400, detail="missing name")
    _require_writable(source)

    blob = safe_target(username, name)
    if not blob.is_file():
        raise HTTPException(status_code=404, detail="source file not found")
    if blob.suffix.lower() not in BROWSABLE_SUFFIXES:
        raise HTTPException(status_code=400, detail="unsupported file type")
    size = blob.stat().st_size
    if size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    root = source_root(source)
    directory = source_target(source, path)
    if not directory.is_dir():
        raise HTTPException(status_code=404, detail="directory not found")

    target = directory / blob.name
    # 目标必须仍在授权根目录内：拼接后再校验一次，防越权写
    if target != root and root not in target.parents:
        raise HTTPException(status_code=400, detail="path escapes source root")

    # 正在被别人用协同内核编辑的文件不能从外面覆盖：Collabora 手里握着整份内存副本，
    # 它下一次保存会把我们刚写进去的内容整份抹掉，而且双方都不会收到提示。
    # （这是"软"防护：锁可能在检查之后才出现。真正让覆盖可挽回的是留底 + 「版本」。）
    holder = _shared_lock_holder(source, _source_relpath(root, target))
    if holder and holder != username:
        raise HTTPException(
            status_code=423, detail={"reason": "in-use", "holder": holder}
        )

    async with _copy_lock(target):
        result = await asyncio.to_thread(
            _publish_to_source_sync,
            blob,
            directory,
            root,
            SHARED_HISTORY_KEEP,
            username,
        )

    # 共享盘内容变了：精确失效受影响的列举缓存，否则除操作者外的人最多 10s
    # 看不到新文件
    _invalidate_source_path(source, root, target)
    LOG.info(
        "shared-publish user=%s source=%s path=%s status=%s to=%s size=%d backup=%s",
        username,
        source,
        result["path"],
        result["status"],
        result["version"],
        result["size"],
        result.get("backup") or "-",
    )
    return JSONResponse(result, status_code=201 if result["status"] == "created" else 200)


@app.get("/api/v1/sources/{source}/history")
async def source_file_history(
    source: str, request: Request, path: str
) -> JSONResponse:
    """某个共享文件的留底版本（最近的在前），供界面「版本」用。

    文件被覆盖时服务端会先把旧内容留底到同目录的隐藏目录；这里把它读出来，让用户可以
    回退到之前某一版（"反悔"）。留底与读取都在服务端做，前端不需要知道目录结构。
    """
    await current_username(request)
    if not path:
        raise HTTPException(status_code=400, detail="missing path")
    target = source_target(source, path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    if not SHARED_WRITABLE:
        # 只读挂载下回退是不可能的，列表也就不必给（免得界面给出一个按不动的按钮）
        return JSONResponse({"versions": [], "keep": 0, "writable": False})
    return JSONResponse(
        {
            "versions": await asyncio.to_thread(
                _history_entries, target, SHARED_HISTORY_KEEP
            ),
            "keep": SHARED_HISTORY_KEEP,
            "writable": True,
        }
    )


@app.post("/api/v1/sources/{source}/history/restore")
async def source_file_history_restore(
    source: str, request: Request, path: str, id: str
) -> JSONResponse:
    """把某个留底版本写回原文件（用户点「回退」）。

    回退本身也先给"当前版本"留底，所以回退错了还能再回退回来 —— 不留底的回退等于
    用一个不可逆操作去修另一个不可逆操作。

    与「覆盖添加」共用同一把按目标的排队锁和同一套审计日志：两者都是对同一个文件的
    整份写入，必须串行。
    """
    username = await current_username(request)
    if not path or not id:
        raise HTTPException(status_code=400, detail="missing path or id")
    _require_writable(source)

    root = source_root(source)
    target = source_target(source, path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    # id 只允许是"这个文件自己的"备份文件名（挡住 ../ 之类的越权与串文件回退）
    backup = _history_backup_path(target, id)

    async with _copy_lock(target):
        result = await asyncio.to_thread(
            _restore_from_history_sync, target, backup, SHARED_HISTORY_KEEP, username
        )
    result["path"] = _source_relpath(root, target)

    _invalidate_source_path(source, root, target)
    LOG.info(
        "shared-history-restore user=%s source=%s path=%s id=%s from=%s to=%s size=%d backup=%s",
        username,
        source,
        result["path"],
        id,
        result.get("previousVersion") or "-",
        result["version"],
        result["size"],
        result.get("backup") or "-",
    )
    return JSONResponse(result)


@app.post("/api/v1/sources/{source}/history/export")
async def source_file_history_export(
    source: str, request: Request, path: str, id: str
) -> JSONResponse:
    """把某个留底版本「保存到我的文档」，**不动公共盘上的原文件**。

    这是"想反悔但先不急着回退"的出路：把旧版本取回自己名下看一眼、接着改，确认了再
    决定要不要回退。落到私有目录一律不覆盖同名文件（撞名自动加 (1)(2)…），文件名带上
    那一版的时刻，方便一眼看出拿的是哪一版。
    """
    username = await current_username(request)
    if not path or not id:
        raise HTTPException(status_code=400, detail="missing path or id")

    target = source_target(source, path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    backup = _history_backup_path(target, id)

    data = await asyncio.to_thread(backup.read_bytes)
    try:
        written = await asyncio.to_thread(
            _write_new_unique,
            storage_dir(username),
            _versioned_export_name(target, id),
            data,
        )
    except SharedWriteConflict:
        raise HTTPException(status_code=409, detail="too many files with that name")

    LOG.info(
        "shared-history-export user=%s source=%s path=%s id=%s -> %s (%d bytes)",
        username,
        source,
        path,
        id,
        written.name,
        len(data),
    )
    return JSONResponse(
        {"status": "saved", "name": written.name, "size": len(data)}
    )


@app.get("/api/v1/sources/{source}/history/file")
async def source_file_history_file(
    source: str, request: Request, path: str, id: str
) -> FileResponse:
    """取某个留底版本的字节，用于界面上「打开」看内容。

    只读、不改任何东西：界面里"打开一个历史版本"就是把这份字节当成**本地文件**交给
    编辑器（保存只可能另存或下载），公共盘上的原文件与留底都不受影响。
    """
    await current_username(request)
    if not path or not id:
        raise HTTPException(status_code=400, detail="missing path or id")
    target = source_target(source, path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    backup = _history_backup_path(target, id)
    return FileResponse(
        backup,
        media_type="application/octet-stream",
        filename=_versioned_export_name(target, id),
    )


@app.post("/api/v1/sources/{source}/copy-to-file")
async def copy_source_file_to_storage(
    source: str, request: Request, path: str, overwrite: bool = False
) -> JSONResponse:
    """把共享源里的文档复制到「我的文档」（用户私有目录）。

    与 copy-from-file 相反的方向：服务端直接读共享盘、写私有目录，不经
    浏览器。默认不覆盖同名文件（overwrite=true 才会覆盖）。
    """
    username = await current_username(request)
    if not path:
        raise HTTPException(status_code=400, detail="missing path")

    origin = source_target(source, path)
    if not origin.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    if origin.suffix.lower() not in BROWSABLE_SUFFIXES:
        raise HTTPException(status_code=400, detail="unsupported file type")
    size = origin.stat().st_size
    if size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    target = safe_target(username, origin.name)
    if target.exists() and not overwrite:
        raise HTTPException(status_code=409, detail="target already exists")

    await asyncio.to_thread(_copy_file_atomic, origin, target)
    LOG.info("copied %s -> %s (%d bytes)", origin, target, size)
    return JSONResponse({"status": "ok", "name": origin.name, "size": size})


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
_collabora_failures = 0                  # 连续探测失败次数（用来容忍偶发抖动）
COLLABORA_WARMUP_TIMEOUT = int(
    os.environ.get("V_OFFICE_COLLABORA_WARMUP_TIMEOUT", "180")
)


async def _collabora_discover() -> str:
    """单次探测 discovery，成功返回 urlsrc 模板，失败返回空串。"""
    internal = COLLABORA_INTERNAL_URL.rstrip("/")
    started = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{internal}/hosting/discovery")
            resp.raise_for_status()
            found = re.search(r'urlsrc="([^"]+)"', resp.text)
            return found.group(1) if found else ""
    except Exception as exc:  # noqa: BLE001 - 探活失败是常态，记录耗时便于定位
        LOG.warning(
            "collabora discovery probe failed after %dms: %s",
            int((time.monotonic() - started) * 1000),
            exc,
        )
        return ""


async def _collabora_warmup_loop() -> None:
    global _collabora_state, _collabora_state_since, _collabora_failures
    while True:
        try:
            ok = bool(await _collabora_discover())
            if ok:
                _collabora_failures = 0
                if _collabora_state != "ok":
                    LOG.info("collabora discovery ready")
                _collabora_state = "ok"
                await asyncio.sleep(30)  # 就绪后降频保活，感知容器重启
                continue

            _collabora_failures += 1
            # 单次探测失败多半只是 coolwsd 正忙着加载文档（它会短暂不响应 discovery）。
            # 以前一次失败就把全局状态打成 warming_up，前端会因此弹"正在启动内核"并
            # 干等 20~30 秒——哪怕此刻打开文档其实是通的。这里要求连续两次失败才降级。
            if _collabora_failures >= 2 and _collabora_state != "warming_up":
                LOG.warning(
                    "collabora discovery lost (%d consecutive failures), probing again",
                    _collabora_failures,
                )
                _collabora_state = "warming_up"
                _collabora_state_since = time.time()
            await asyncio.sleep(5)  # 未就绪期间高频探测
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            # 保活循环绝不能因为单次异常就退出：一旦退出，状态永远停在 warming_up，
            # 180 秒后对外就变成"Collabora 不可用"——哪怕 coolwsd 其实好好的。
            # （线上就是这么踩的：探测失败分支里引用了一个未定义变量，抛 NameError
            # 直接掀掉了整个循环。）
            LOG.warning("collabora warmup loop error: %s", exc)
            await asyncio.sleep(5)


def _collabora_effective_state() -> str:
    """对外的就绪状态；warming_up 超过阈值视为不可用（大概率未部署）。"""
    if _collabora_state == "ok":
        return "ok"
    if time.time() - _collabora_state_since > COLLABORA_WARMUP_TIMEOUT:
        return "unavailable"
    return "warming_up"

# 协同锁：key -> {"lock": lock id, "user": 用户名, "at": monotonic 时刻}
#
# 只存在单实例内存里，够用即可（本服务单进程单 worker）。
# 值里记用户名是为了让「覆盖添加」能告诉用户"是谁正在编辑"，光有 lock id
# 是看不出持有者的。
_wopi_locks: dict[str, dict] = {}

# 协同锁的**空闲**存活上限（不是会话时长）。这个时间是从"该锁最近一次被用到"算起
# 的，任何一个带该令牌的 WOPI 请求都会把时刻往后推（见 _wopi_identity），所以真正
# 在编辑的会话不会被判过期；过期只会发生在会话已经彻底不再发请求之后。
#
# 为什么不能设成"永久"：Collabora 不一定有机会发 UNLOCK —— 浏览器直接关掉、容器被
# 杀、令牌先到期（UNLOCK 拿 401）都会留下**僵尸锁**，把文件锁到天荒地老。这个坑真的
# 踩过：一把 24 小时的僵尸锁把用户后来自己打开的同一个文件挡在门外，保存直接报
# savefailed。
WOPI_LOCK_TTL = float(os.environ.get("V_OFFICE_WOPI_LOCK_TTL", "7200"))


def _wopi_lock_key(data: dict, name: str) -> str:
    """锁记录的键。**只用来记"谁正在编辑"，不用来做互斥**（见 wopi_file_operations）。

    共享源文档按文件算（源 + 源内相对路径，不带用户名）：那是盘上同一份文件，
    多个用户的会话共享同一个 WOPISrc、本来就在同一个 Collabora 会话里，键就该归到一起
    （「覆盖添加」要据此告诉用户"谁正在编辑"）。

    私有文档按"用户 + 文件名"算：不同用户永远不同，同一个人的同一个文件归到一起。
    """
    source = str(data.get("s") or "")
    if source:
        return f"{source}/{_normalize_relpath(name)}"
    owner = str(data.get("u") or "")
    rel = _normalize_relpath(name)
    prefix = f"{owner}/"
    if rel.startswith(prefix):
        rel = rel[len(prefix) :]
    return f"private/{owner}/{rel}"


def _wopi_lock_of(key: str) -> dict:
    """读当前锁；超过 TTL 的按不存在处理并清掉。"""
    entry = _wopi_locks.get(key)
    if not entry:
        return {}
    if time.monotonic() - float(entry.get("at", 0)) > WOPI_LOCK_TTL:
        LOG.warning("dropping stale wopi lock for %s", key)
        _wopi_locks.pop(key, None)
        return {}
    return entry


def _shared_lock_holder(source: str, relpath: str) -> str:
    """共享源文件当前被谁持锁（没人持锁返回空串）。"""
    entry = _wopi_lock_of(f"{source}/{_normalize_relpath(relpath)}")
    return str(entry.get("user") or "")


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _wopi_sig(payload: bytes) -> str:
    return _b64e(
        hmac.new(WOPI_SECRET.encode("utf-8"), payload, hashlib.sha256).digest()
    )


def issue_wopi_token(
    username: str, name: str, can_write: bool = True, source: str = ""
) -> str:
    payload = {
        "u": username,
        "n": name,
        "w": can_write,
        "e": int(time.time()) + WOPI_TOKEN_TTL,
    }
    # s 非空表示这是共享源里的文档，name 即源内相对路径；缺省是应用私有存储
    if source:
        payload["s"] = source
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
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
    # 这个会话还活着（每一个 WOPI 请求都会走到这里），把它的锁的"最近活动时刻"往后
    # 推。这样"空闲多久算过期"衡量的才是**会话是否还在发请求**，而不是"锁创建了多久"：
    # 真在编辑的会话不会被判过期，而彻底死掉、再也发不出 UNLOCK 的会话留下的僵尸锁
    # 会在 TTL 后自动消失，不会把文件锁死。
    entry = _wopi_locks.get(_wopi_lock_key(data, name))
    if entry:
        entry["at"] = time.monotonic()
    return data


def _wopi_target(data: dict, name: str) -> Path:
    """按令牌解析文档落点：共享源走源内相对路径，否则走用户私有目录。

    私有文档的 name 形如 "<用户>/<文件名>"（见 wopi_session）。前缀必须与令牌里的
    用户一致，否则就成了"拿着 A 的令牌去读写 B 的文件"。
    """
    source = str(data.get("s") or "")
    if source:
        return source_target(source, name)
    owner = str(data["u"])
    prefix = f"{owner}/"
    if not name.startswith(prefix):
        raise HTTPException(status_code=403, detail="token does not match file")
    return safe_target(owner, name[len(prefix) :])


def _wopi_can_write(data: dict) -> bool:
    if not data.get("w", True):
        return False
    # 共享源还要看应用侧开关：只读模式下即便令牌允许写入也拒绝
    if data.get("s") and not SHARED_WRITABLE:
        return False
    return True


async def _collabora_editor_url(wopi_src: str, token: str, lang: str = "") -> str:
    """向 Collabora 取 urlsrc 模板（带构建哈希），填入 WOPISrc、token 与界面语言。

    urlsrc 在镜像升级时会变（含哈希路径），因此不能写死，必须动态取。
    lang 为空时不追加 lang 参数，Collabora 维持「跟随浏览器语言」的默认行为。
    """
    template = ""
    # 请求内重试：撞上冷启动窗口时原地等一小会儿，而不是立即失败。
    #
    # 但**不能**在这里排长队：前端取会话的 AbortSignal 超时是 10s，而原来是
    # 3 次 ×（5s 超时 + 2s 间隔）＝ 最坏 19s，比前端超时还长——结果就是"点了
    # 文档干等十几秒，最后前端超时失败"，这正是线上"打开要 20 多秒"的成因之一。
    # 冷启动的正解是前端按 /wopi/status 显示等待提示（那条路不受这里影响），
    # 所以这里只留一次短重试。
    started = time.monotonic()
    for attempt in range(2):
        template = await _collabora_discover()
        if template:
            break
        LOG.warning("collabora discovery attempt %d/2 failed", attempt + 1)
        if attempt == 0:
            await asyncio.sleep(0.5)

    if not template:
        # 取不到 discovery（Collabora 容器没起来 / 网络不通）时不要编一个地址：
        # 旧版的 browser/dist/cool.html 在当前 Collabora 上必然 404，会把
        # 「内核不可用」变成「编辑器打开是白页」。直接失败，并带上原因让
        # 前端区分「正在启动（等待重试）」和「确实不可用（立即回退）」。
        reason = _collabora_effective_state()
        LOG.warning(
            "collabora discovery unavailable after %dms (state=%s), refusing to fabricate an URL",
            int((time.monotonic() - started) * 1000),
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
    # 界面语言：Collabora 默认只跟随浏览器语言，应用内切了语言编辑器不会跟着变，
    # 因此由前端按应用语言下发（BCP-47，见 utils/editor/locale.ts）。只放行
    # BCP-47 形状的值，避免任意串被拼进 URL。
    lang_query = ""
    if lang and re.fullmatch(r"[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*", lang):
        lang_query = f"&lang={quote(lang, safe='')}"
    return (
        f"{template}{sep}WOPISrc={quote(wopi_src, safe='')}"
        f"&access_token={quote(token, safe='')}{lang_query}"
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
async def wopi_session(
    request: Request,
    name: str = "",
    source: str = "",
    path: str = "",
    lang: str = "",
) -> JSONResponse:
    """前端调用：为一个文档换取 Collabora 编辑器地址与 access_token。

    不带 source：应用私有存储里的文档，name 为文件名。
    带 source/path：共享源（平台授权目录 / NAS）里的文档，path 为源内相对路径，
    此时 Collabora 通过 WOPI 直接读写**原文件**，保存即写回共享盘。
    lang：编辑器界面语言（BCP-47）；缺省时 Collabora 跟随浏览器语言。
    """
    username = await current_username(request)
    want_write = request.query_params.get("edit", "1") not in ("0", "false")

    if source:
        if not path:
            raise HTTPException(status_code=400, detail="missing path")
        target = source_target(source, path)
        if not target.is_file():
            raise HTTPException(status_code=404, detail="file not found")
        if target.suffix.lower() not in BROWSABLE_SUFFIXES:
            raise HTTPException(status_code=400, detail="unsupported file type")
        doc_name = path
        can_write = want_write and SHARED_WRITABLE
        # 同一份公共文件只允许一个可写会话：第二个人进来时降级为只读。否则两个
        # 会话各自持有整份内存副本、各自整份保存，后保存的会把先保存的静默抹掉
        # （"互见光标"只在同一会话内成立，跨会话保护不了）。
        holder = _shared_lock_holder(source, doc_name)
        if holder and holder != username:
            can_write = False
            LOG.info(
                "wopi session read-only for %s: %s is editing %s",
                username,
                holder,
                doc_name,
            )
        token = issue_wopi_token(username, doc_name, can_write, source)
    else:
        if not name:
            raise HTTPException(status_code=400, detail="missing name")
        target = safe_target(username, name)
        if not target.is_file():
            raise HTTPException(status_code=404, detail="file not found")
        # 私有文档的文档标识必须带用户维度。Collabora 判定"是不是同一份文档"靠的是
        # WOPISrc（容器日志里就是 docKey）：只带文件名的话，两个用户的同名私有文档会
        # 算成同一个文档 —— 第二个人会并进第一个人的会话，读得到对方内容、保存还写进
        # 对方的文件（跨用户串号）。
        #
        # 反过来，**同一个人的两次打开刻意共用同一个标识**：同一账号在两处登录进入同一个
        # 会话、改动互相可见，这是正常且需要的（本来就是他自己的同一份文件）。所以这里
        # 只带用户名，不带"每次打开都不同"的会话标识。
        doc_name = f"{username}/{name}"
        can_write = want_write
        token = issue_wopi_token(username, doc_name, can_write)
        LOG.info("private session user=%s doc=%s", username, doc_name)

    # 两类文档的路径都保留正斜杠：{name:path} 路由本来就能接住多级路径，而私有
    # 文档现在也带 "<用户>/" 前缀（见上面的原因）。整体转义会把那个分隔符变成
    # %2F，令牌里的 n 与路由收到的 name 就对不上了。
    safe_for_url = "/"
    wopi_src = (
        f"{WOPI_PUBLIC_BASE.rstrip('/')}/wopi/files/"
        f"{quote(doc_name, safe=safe_for_url)}"
    )
    editor_url = await _collabora_editor_url(wopi_src, token, lang)
    # wopiSrc 就是 Collabora 用来判定"是不是同一份文档"的键：两个会话会不会被合并
    # 成一个，看这一行就能断案，不用去翻 Collabora 的 docKey。
    LOG.info(
        "wopi session user=%s canWrite=%s wopiSrc=%s",
        username,
        can_write,
        wopi_src,
    )
    return JSONResponse(
        {
            "editorUrl": editor_url,
            "wopiSrc": wopi_src,
            "accessToken": token,
            "name": doc_name,
            "canWrite": can_write,
        }
    )


# 注意路由顺序：`{name:path}` 会吞掉多级路径，因此带 /contents 的两条必须
# 声明在"仅 {name:path}"的 CheckFileInfo / 锁操作之前。
@app.get("/wopi/files/{name:path}/contents")
async def wopi_get_contents(name: str, request: Request) -> FileResponse:
    data = _wopi_identity(request, name)
    target = _wopi_target(data, name)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(target, media_type="application/octet-stream")


@app.post("/wopi/files/{name:path}/contents")
async def wopi_put_contents(name: str, request: Request) -> Response:
    data = _wopi_identity(request, name)
    if not _wopi_can_write(data):
        raise HTTPException(status_code=403, detail="read-only token")

    username = str(data["u"])
    # 锁**不作为写入门槛**（原因见 wopi_file_operations 里那段说明）：这里只留一条痕迹，
    # 方便事后排查"保存时是否握着与记录不一致的锁"，但绝不用 409 把保存打死。
    holder = _wopi_lock_of(_wopi_lock_key(data, name))
    client_lock = request.headers.get("X-WOPI-Lock", "")
    if holder and client_lock and holder.get("lock") != client_lock:
        LOG.warning(
            "wopi save carries a lock id that differs from the recorded one: %s (holder=%s)",
            name,
            holder.get("user"),
        )

    target = _wopi_target(data, name)
    # 这里刻意**没有**做"盘上版本变过就拒写"的校验。曾经按 WOPI 规范写过一版：比对
    # 请求里的 X-WOPI-ItemVersion 与盘上版本。但查过 Collabora 26.04 的二进制后确认，
    # 它**根本不发这个头**（一次都不会命中）——是一段永远不执行的代码，还容易让人误以为
    # 这条链上已经有版本保护。留着它只会误导，因此删掉。
    #
    # 共享盘写入的真正保护在另外两处：
    #   · 「覆盖添加」入口的 423：有人正握着这份文件的写锁时不允许从外面覆盖；
    #   · API 路径的 if-match-token（见 put_source_file）：编辑器保存时回传它打开的
    #     那一版，盘上已经不是那一版就拒写 —— 这条路是我们自己的接口，凭据靠得住。
    length = request.headers.get("Content-Length")
    if length and length.isdigit() and int(length) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    if not _accepts_body(target, body):
        # 没写盘（内容与扩展名不符，跳过），盘上版本没变：照实回当前版本
        return Response(
            status_code=200, headers={"X-WOPI-ItemVersion": _file_token(target)}
        )
    if data.get("s"):
        # 共享源：写盘是网络调用（SMB/NFS），必须出事件循环，否则一次保存就会
        # 卡住所有其他用户；内容与扩展名不符时跳过（保持原文件不动）。
        if await asyncio.to_thread(_write_source_or_skip, target, body):
            source_id = str(data["s"])
            _invalidate_source_path(source_id, source_root(source_id), target)
            # 记下这一版是谁提交的：它下次被覆盖时，文件列表里「版本」要显示提交人
            saved_version = await asyncio.to_thread(_content_version, target)
            await asyncio.to_thread(_remember_author, target, username, saved_version)
    else:
        await asyncio.to_thread(_atomic_write_private, target, body)
    LOG.info("wopi saved %s for %s (%d bytes)", name, username, len(body))
    # 把写盘后的**新版本**回给编辑器：它保存成功后会把自己手上那版更新成这个值，
    # 下一次保存才会用新版本号来做校验。不回这个头，它只能一直拿打开时的老版本号，
    # 于是同一个会话里的**第二次保存必然被版本校验判 409**（表现就是 savefailed）。
    # 这是 WOPI 对 PutFile 的标准要求，不是可选项。
    return Response(
        status_code=200, headers={"X-WOPI-ItemVersion": _file_token(target)}
    )


@app.get("/wopi/files/{name:path}")
async def wopi_check_file_info(name: str, request: Request) -> JSONResponse:
    data = _wopi_identity(request, name)
    username = str(data["u"])
    target = _wopi_target(data, name)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    stat = target.stat()
    return JSONResponse(
        {
            "BaseFileName": name.rsplit("/", 1)[-1],
            "Size": stat.st_size,
            # 文件版本标记。用 mtime+size 而不是秒级 mtime：共享盘上同一秒内的两次
            # 写入会撞成同一个版本号，这个值一旦被用来判断"文件变没变"就会失效。
            # （注意：Collabora 26.04 并不会在保存时回传 X-WOPI-ItemVersion，所以它
            # 现在只出现在这里和保存的响应里，不构成任何写入门槛；见 wopi_put_contents
            # 里那段说明。保留是因为这是 WOPI 对 PutFile 的标准字段。）
            "Version": _file_token(target),
            "OwnerId": username,
            "UserId": username,
            "UserFriendlyName": username,
            "UserCanWrite": _wopi_can_write(data),
            "UserCanRename": False,
            "SupportsUpdate": True,
            "SupportsLocks": True,
            "SupportsExtendedLockLength": True,
            "SupportsGetLock": True,
            "PostMessageOrigin": "*",
        }
    )


@app.post("/wopi/files/{name:path}")
async def wopi_file_operations(name: str, request: Request) -> Response:
    """WOPI 锁操作：通过 X-WOPI-Override 区分 LOCK/UNLOCK/REFRESH_LOCK/GET_LOCK。"""
    data = _wopi_identity(request, name)
    username = str(data["u"])
    key = _wopi_lock_key(data, name)
    override = request.headers.get("X-WOPI-Override", "").upper()
    client_lock = request.headers.get("X-WOPI-Lock", "")
    current = _wopi_lock_of(key).get("lock", "")

    if override == "GET_LOCK":
        headers = {"X-WOPI-Lock": current} if current else {}
        return Response(status_code=200, content=b"", headers=headers)

    if override in ("LOCK", "REFRESH_LOCK", "UNLOCK_AND_RELOCK"):
        # **这里一律成功，绝不上报冲突。**
        #
        # 锁在本服务里只承担一个职责：记下"谁正在编辑"，供「覆盖添加」提示持有者、
        # 供会话签发时决定要不要降级只读。它不做互斥 —— 一旦拿它互斥，任何一个"退出得
        # 不干净"的会话（浏览器直接关掉、容器被杀、令牌先到期导致 UNLOCK 拿到 401）都会
        # 留下僵尸锁，把用户**自己**后来打开的同一个文件挡成只读，一保存就报
        # savefailed（真实事故，2026-10-08）。
        #
        # 同一份文档的多个视图本来就落在同一个 Collabora 会话（同一个 docKey）里，写
        # 操作由 coolwsd 自己串行化，不需要这里再加一道会误伤的闸。跨用户写同一份公共
        # 文档的风险由「覆盖添加」入口的 423 检查挡住（它读的正是这里的记录）。
        if client_lock:
            _wopi_locks[key] = {
                "lock": client_lock,
                "user": username,
                "at": time.monotonic(),
            }
        return Response(status_code=200, content=b"")

    if override == "UNLOCK":
        _wopi_locks.pop(key, None)
        return Response(status_code=200, content=b"")

    # 未知 override：一律接受，避免 Collabora 卡在握手阶段
    return Response(status_code=200, content=b"")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)
