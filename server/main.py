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
    # 这种情况下既不写坏、也不报错——保持原文件不动并回成功，Ctrl+S 仍然可用，
    # 文件仍是有效 PDF。（导出 PDF 本身内核是支持的，卡在我们这侧的导出调用。）
    if target.suffix.lower() == ".pdf" and target.is_file():
        LOG.warning(
            "pdf save skipped for %s: content (%s) is not a PDF, kept the existing file",
            target.name,
            body[:8].hex(),
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
    if not _accepts_body(target, body):
        # 内容不是 PDF（内核写不出）：原文件保持不动，但仍回成功，让 Ctrl+S 可用
        size = target.stat().st_size if target.is_file() else 0
        return JSONResponse({"status": "ok", "name": name, "size": size, "unchanged": True})
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


@app.get("/api/v1/sources")
async def list_sources(request: Request) -> JSONResponse:
    """列出可浏览的文档源（共享目录 / NAS）及其解析后的授权目录。"""
    username = await current_username(request)
    return JSONResponse({"sources": _document_sources(username)})


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

    # 挂载盘上的目录读取是阻塞 syscall：丢到线程里跑，别挡住事件循环上的
    # 其他请求（列文档 / 保存 / WOPI / 健康检查）。
    entries, truncated = await asyncio.to_thread(
        _read_entries_sync, root, directory
    )

    rel = _source_relpath(root, directory)
    parent = rel.rsplit("/", 1)[0] if "/" in rel else ""
    return JSONResponse(
        {
            "source": source,
            "path": rel,
            "parent": parent,
            "entries": entries,
            "truncated": truncated,
        }
    )


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
    return FileResponse(
        target, filename=target.name, media_type="application/octet-stream"
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

    # 这段递归遍历在挂载盘上很贵（每个条目都是网络 syscall），同步跑会把整个
    # 服务卡住：遍历期间「我的文档」、保存、WOPI 全部排队（实测 781ms 里事件
    # 循环只调度了 1 次）。丢到线程里跑，结果与耗时都不变，只是不再阻塞别人。
    documents, truncated = await asyncio.to_thread(
        _walk_documents_sync, root, directory
    )
    return JSONResponse(
        {
            "source": source,
            "path": _source_relpath(root, directory),
            "documents": documents,
            "truncated": truncated,
        }
    )


def _require_writable(source: str) -> None:
    """写入前的准入检查：应用侧开关 + 源必须存在。"""
    if not SHARED_WRITABLE:
        raise HTTPException(status_code=403, detail="shared source is read-only")
    source_root(source)


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


@app.put("/api/v1/sources/{source}/file")
async def put_source_file(source: str, request: Request, path: str) -> JSONResponse:
    """把编辑后的文档写回共享源——即"编辑 NAS 上的原文档"。

    覆盖已有文件；文件不存在时作为新文档创建（父目录必须已存在）。写回始终
    落在原路径上，因此共享盘上的文件名/位置保持不变。
    """
    await current_username(request)
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
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    if not _accepts_body(target, body):
        size = target.stat().st_size if target.is_file() else 0
        return JSONResponse({"status": "ok", "path": path, "size": size, "unchanged": True})
    _atomic_write(target, body)
    LOG.info("shared saved %s (%d bytes)", target, len(body))
    return JSONResponse({"status": "ok", "path": path, "size": len(body)})


@app.post("/api/v1/sources/{source}/copy-from-file")
async def copy_file_to_source(
    source: str, request: Request, name: str, path: str = "", overwrite: bool = False
) -> JSONResponse:
    """把「我的文档」里的一个文件复制到共享源目录（例如 NAS 的公共目录）。

    服务端直接读私有目录、写共享盘，不需要把文件下载到浏览器再上传一遍。
    默认**不覆盖**同名文件（overwrite=true 才会覆盖）——共享盘是多应用
    共用的权威数据，误覆盖不可逆。
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
    if target.exists() and not overwrite:
        raise HTTPException(status_code=409, detail="target already exists")

    _atomic_write(target, blob.read_bytes())
    LOG.info("copied %s -> %s (%d bytes)", blob, target, size)
    return JSONResponse(
        {"status": "ok", "path": _source_relpath(root, target), "size": size}
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

    _atomic_write(target, origin.read_bytes())
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
    return data


def _wopi_target(data: dict, name: str) -> Path:
    """按令牌解析文档落点：共享源走源内相对路径，否则走用户私有目录。"""
    source = str(data.get("s") or "")
    if source:
        return source_target(source, name)
    return safe_target(str(data["u"]), name)


def _wopi_can_write(data: dict) -> bool:
    if not data.get("w", True):
        return False
    # 共享源还要看应用侧开关：只读模式下即便令牌允许写入也拒绝
    if data.get("s") and not SHARED_WRITABLE:
        return False
    return True


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
async def wopi_session(
    request: Request, name: str = "", source: str = "", path: str = ""
) -> JSONResponse:
    """前端调用：为一个文档换取 Collabora 编辑器地址与 access_token。

    不带 source：应用私有存储里的文档，name 为文件名。
    带 source/path：共享源（平台授权目录 / NAS）里的文档，path 为源内相对路径，
    此时 Collabora 通过 WOPI 直接读写**原文件**，保存即写回共享盘。
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
        token = issue_wopi_token(username, doc_name, can_write, source)
    else:
        if not name:
            raise HTTPException(status_code=400, detail="missing name")
        target = safe_target(username, name)
        if not target.is_file():
            raise HTTPException(status_code=404, detail="file not found")
        doc_name = name
        can_write = want_write
        token = issue_wopi_token(username, doc_name, can_write)

    # 共享源的相对路径保留正斜杠（{name:path} 路由可接住多级路径），
    # 私有文件名照旧整体转义。
    safe_for_url = "/" if source else ""
    wopi_src = (
        f"{WOPI_PUBLIC_BASE.rstrip('/')}/wopi/files/"
        f"{quote(doc_name, safe=safe_for_url)}"
    )
    editor_url = await _collabora_editor_url(wopi_src, token)
    LOG.info("wopi session for %s (%s, source=%s)", doc_name, username, source or "-")
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
    key = f"{data.get('s') or 'private'}/{username}/{name}"
    lock = request.headers.get("X-WOPI-Lock", "")
    current = _wopi_locks.get(key, "")
    # 已被别人持锁且锁不一致 → 按 WOPI 规范回 409 并带上当前锁
    if current and lock != current:
        return JSONResponse(
            {"error": "lock mismatch"},
            status_code=409,
            headers={"X-WOPI-Lock": current},
        )

    target = _wopi_target(data, name)
    length = request.headers.get("Content-Length")
    if length and length.isdigit() and int(length) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    if not _accepts_body(target, body):
        return Response(status_code=200)
    if data.get("s"):
        _atomic_write(target, body)
    else:
        tmp = target.with_name(target.name + ".tmp")
        tmp.write_bytes(body)
        os.replace(tmp, target)
    LOG.info("wopi saved %s for %s (%d bytes)", name, username, len(body))
    return Response(status_code=200)


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
            "Version": str(int(stat.st_mtime)),
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
    key = f"{data.get('s') or 'private'}/{username}/{name}"
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
