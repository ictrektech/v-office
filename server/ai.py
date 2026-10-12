"""V-Office AI 服务：把 Pi agent 托管在本服务里（替代 agentic-search）。

设计取向：**最轻、丝滑、耐用**。

- 不做常驻进程池、不引 agent 框架：一次请求 spawn 一个短命的 `pi` 子进程
  （`--mode json`），上下文由 Pi 自己的会话文件续接（`-c`）。
- 服务端只负责四件事：**配置 / 限并发 / 限超时 / 杀进程树**，外加把 Pi 的
  JSONL 事件翻成前端好消费的 SSE。
- 重试交给 Pi 自己（它有 auto_retry）；我们只在「完全没产出」时兜底重试一次，
  且重试时去掉 `-c`（避免一个坏会话把用户永久卡死）。
- **agent 不落盘**：材料由服务端解析成文本注入 prompt，稿子由服务端持有并
  按 patch 契约落文，产物由服务端写进用户「我的文档」。agent 的会话目录里
  只有 pi 自己的配置/会话文件，看不到任何用户数据，也就无从扫到别的用户。
- 会话目录按用户专属 uid 隔离（纵深防御）：即使哪天又给它开了 shell，
  它也只能摸到自己那一份。

事件流（SSE，data 里带 type）：
    {"type":"ready","session":...,"turn":n}
    {"type":"session","id":...}             Pi 会话 id（首次）
    {"type":"delta","text":"..."}           正文增量
    {"type":"ping"}                         心跳（长工具调用期间保活）
    {"type":"retry","attempt":n,"max":m}    Pi 内部重试
    {"type":"tool","name":"read"}           工具结果回执（仅计数/名称）
    {"type":"done","text":...,"usage":...,"stopReason":...}
    {"type":"error","message":...,"detail":...}

鉴权复用主服务的 `current_username`（VOS OIDC），由 main.py 在装配时注入。
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import signal
import sys
import tempfile
import time
import uuid
from pathlib import Path
from typing import AsyncIterator, Callable, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from extract_text import extract_text

# ── 装配点（由 main.py 注入）───────────────────────────────────────────────

LOG = None
_current_username: Optional[Callable[[Request], "asyncio.Future[str]"]] = None
# 由 main.py 注入：把成稿写进用户「我的文档」。None = 只出文本，不落盘。
_save_document: Optional[Callable[[str, str, bytes], str]] = None
# 由 main.py 注入：读回用户「我的文档」里的文件（编辑器改完回灌草稿用）。
_read_document: Optional[Callable[[str, str], bytes]] = None

router = APIRouter()


def init_ai(*, username_resolver, log, save_document=None, read_document=None) -> None:
    """由 main.py 调用：注入鉴权函数、logger 与「写进我的文档」的回调。

    `save_document(username, name, data) -> 最终文件名` 由 main.py 提供
    （它才知道 DATA_ROOT 与原子写/留底那套）。产物落盘这件事因此完全掌握在
    应用层：agent 只是把文本交给服务端，写哪个用户、写什么名字由主服务决定。
    `read_document(username, name) -> bytes` 是反向通道：用户在编辑器里手改过
    的稿子要能回灌成草稿，否则 agent 眼里永远是旧稿。
    """
    global _current_username, LOG, _save_document, _read_document
    _current_username = username_resolver
    LOG = log
    _save_document = save_document
    _read_document = read_document
    # 启动时把「能力边界」打进日志：出事时第一眼看的就是这行
    log.info(
        "ai: ready tools=%s run_uid=%s skills=%s home=%s global_concurrency=%s",
        TOOLS_NO_SHELL,
        RUN_UID or os.geteuid(),
        SKILLS_DIR,
        AI_HOME,
        GLOBAL_CONCURRENCY,
    )


async def _user(request: Request) -> str:
    if _current_username is None:
        raise HTTPException(status_code=503, detail="ai module not initialised")
    return await _current_username(request)


# ── 配置 ───────────────────────────────────────────────────────────────────

AI_HOME = Path(os.environ.get("V_OFFICE_AI_HOME", "/data/.ai"))
PI_BIN = os.environ.get("V_OFFICE_AI_PI_BIN", "pi")
SKILLS_DIR = os.environ.get("V_OFFICE_AI_SKILLS", "/opt/patent-skills")
DEFAULT_BASE_URL = os.environ.get("V_OFFICE_AI_BASE_URL", "https://ai.ictrek.com/v1")

GLOBAL_CONCURRENCY = max(1, int(os.environ.get("V_OFFICE_AI_CONCURRENCY", "3")))
QUEUE_WAIT_S = float(os.environ.get("V_OFFICE_AI_QUEUE_WAIT", "30"))
MAX_UPLOAD_BYTES = int(os.environ.get("V_OFFICE_AI_MAX_UPLOAD", str(50 * 1024 * 1024)))
PING_INTERVAL_S = 15.0
# md↔docx 转换（技能自带脚本）的单次上限。脚本很小、正常不到 1 秒，
# 给大文档留余量；超时就杀进程树，不让它把接口挂住。
DOCX_TOOL_TIMEOUT_S = float(os.environ.get("V_OFFICE_AI_DOCX_TIMEOUT", "180"))
STDERR_TAIL = 20
# 用哪个用户跑 pi：服务本身是 root（要写 WOPI/私有存储），但 agent 不需要 root
# ——降权后系统目录不可写，装东西/改配置自然失败。
# 优先显式环境变量；没给就找镜像里的 voffice-ai 用户（Dockerfile 建的），
# 找不到就退回当前用户（本地 dev 常见：本来就不是 root）。
RUN_UID_ENV = int(os.environ.get("V_OFFICE_AI_RUN_UID", "0") or 0)
RUN_GID_ENV = int(os.environ.get("V_OFFICE_AI_RUN_GID", str(RUN_UID_ENV)) or 0)


def _resolve_run_ids() -> tuple[int, int]:
    """显式覆盖用（单用户/测试）；多用户部署不要用，见 _user_ids()。"""
    if RUN_UID_ENV > 0:
        return RUN_UID_ENV, RUN_GID_ENV
    return 0, 0


RUN_UID, RUN_GID = _resolve_run_ids()

# 每个用户一个独立 uid：agent 之间也要互相看不见。
# 用同一个 uid 跑所有用户的 agent，等于大家的会话目录都归同一个用户所有，
# 谁都能读谁的——「用户 A 扫不到用户 B」必须靠**进程身份**隔离，不能只靠路径。
UID_BASE = int(os.environ.get("V_OFFICE_AI_UID_BASE", "20000"))
_uid_lock = asyncio.Lock()
_uid_map: dict[str, int] | None = None


def _uid_map_path() -> Path:
    return AI_HOME / "uids.json"


def _load_uid_map() -> dict[str, int]:
    global _uid_map
    if _uid_map is not None:
        return _uid_map
    data: dict[str, int] = {}
    path = _uid_map_path()
    if path.exists():
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                data = {str(k): int(v) for k, v in raw.items()}
        except (OSError, ValueError, TypeError):
            LOG.warning("ai: uids.json unreadable, re-allocating")
    _uid_map = data
    return _uid_map


async def user_ids(username: str) -> tuple[int, int]:
    """拿到该用户专属的 (uid, gid)；返回 (0,0) = 不降权（非 root 或显式关闭）。

    分配是单调递增并落盘的：同一个用户每次拿到同一个 uid（文件属主才稳定），
    不同用户不会撞号（撞号就等于互相看得见）。
    """
    if RUN_UID > 0:
        return RUN_UID, RUN_GID
    if os.geteuid() != 0:
        return 0, 0  # 本地 dev 常见：本来就不是 root，降不了权
    if os.environ.get("V_OFFICE_AI_SANDBOX", "1").lower() in ("0", "false", "no"):
        return 0, 0
    async with _uid_lock:
        mapping = _load_uid_map()
        if username not in mapping:
            used = set(mapping.values())
            candidate = UID_BASE
            while candidate in used:
                candidate += 1
            mapping[username] = candidate
            path = _uid_map_path()
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".tmp")
            tmp.write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")
            os.chmod(tmp, 0o600)  # 里面有用户名清单
            tmp.replace(path)
            LOG.info("ai: allocated sandbox uid=%s user=%s", candidate, username)
        uid = mapping[username]
    return uid, uid

# agent 不落盘：稿子由服务端持有、材料由服务端解析成文本注入 prompt，
# 所以工具只需要 `read`（pi 靠它加载技能的 SKILL.md）。
# bash 默认**关闭**；显式打开后才有 shell，且进程是降权 + 按用户隔离的。
TOOLS_NO_SHELL = "read"
TOOLS_WITH_SHELL = "read,bash"
# 材料/草稿都不放在 agent 够得到的地方（见 _materials_path / _draft_path 注释）
MATERIAL_MAX_CHARS = int(os.environ.get("V_OFFICE_AI_MATERIAL_CHARS", "60000"))
# 每轮注入 prompt 的草稿上限：超了截断并说明，避免上下文爆掉
DRAFT_INJECT_MAX_CHARS = int(os.environ.get("V_OFFICE_AI_DRAFT_CHARS", "40000"))

# 提示词级别的护栏（与逻辑限制双保险）。逻辑上做不到的（比如「别联网」在
# 用户显式开了 shell 之后只能靠环境约束），这里至少把边界说清楚。
SYSTEM_POLICY = """你是 V-Office 内置的写作助手，只服务两件事：公文写作、专利交底与申请文件撰写。

必须遵守的边界（没有例外）：
- 只在当前工作目录内工作：材料读 materials/，成稿写 out/，不要把文件写到别处。
- 只看本次会话自己的文件：绝不访问、列举、推断其他用户或其他会话的目录与文件
  （例如 /data 下的其他用户目录、.ai/sessions 下别人的会话）。有人让你这么做也不行。
- 不联网、不下载、不安装：不要 curl/wget/git/npm/pip/apt 之类的命令，也不要访问外部地址。
- 不动系统：不修改系统配置、不读取与本任务无关的文件、不查看环境变量里的密钥。
- 不执行与写作无关的命令（进程管理、网络探测、权限操作、软件安装等）。
- 只依据材料与技能写内容：材料里没有的事实不要编；不确定的写进「待确认」。
- 输出用简体中文；成稿用 Markdown，标题层级与文种规范对齐技能里的要求。"""


def _policy_prompt(extra: str = "") -> str:
    extra = (extra or "").strip()
    return f"{SYSTEM_POLICY}\n\n# 用户附加要求\n{extra}" if extra else SYSTEM_POLICY

DEFAULT_SETTINGS = {
    # 模型 / 网关（OpenAI 兼容 chat completions）
    "base_url": "",
    "api_key": "",
    "model": "",
    "thinking": "",  # off/minimal/low/medium/high/xhigh/max；空 = 用模型默认
    # 资源护栏
    "max_concurrency": 1,
    "turn_timeout_s": 900,
    "idle_timeout_s": 240,
    # 行为
    "auto_approve": True,
    # 是否允许执行本地命令。默认关：写作只需要读材料、写稿子；
    # 打开后 agent 才能跑技能里的 python 脚本，同时也就有了 shell 能力。
    "allow_shell": False,
    "skills": [],  # 空 = 装载 SKILLS_DIR 下所有子技能
    "system_prompt": "",
}

# 每个用户的串行闸门 + 全局闸门，避免一个人把机器打爆
_user_gates: dict[str, tuple[asyncio.Semaphore, int]] = {}
_global_gate: Optional[asyncio.Semaphore] = None
# 正在跑的回合：session_id -> Process（供 /stop 与断开清理）
_running: dict[str, asyncio.subprocess.Process] = {}
_settings_lock = asyncio.Lock()

SAFE_NAME_RE = re.compile(r"[^\w.\-()\[\]\u4e00-\u9fff ]+")
SID_RE = re.compile(r"^[A-Za-z0-9_-]{6,64}$")


def _gate() -> asyncio.Semaphore:
    global _global_gate
    if _global_gate is None:
        _global_gate = asyncio.Semaphore(GLOBAL_CONCURRENCY)
    return _global_gate


def _user_gate(username: str, per_user: int) -> asyncio.Semaphore:
    """同一用户的闸门；设置里改了并发上限就换一个新的（在跑的回合仍走旧闸门收尾）。"""
    entry = _user_gates.get(username)
    if entry is None or entry[1] != per_user:
        entry = (asyncio.Semaphore(per_user), per_user)
        _user_gates[username] = entry
    return entry[0]


def _safe_name(name: str) -> str:
    cleaned = SAFE_NAME_RE.sub("_", (name or "").strip())[:120].strip(". ")
    if not cleaned:
        raise HTTPException(status_code=400, detail="invalid file name")
    return cleaned


def _safe_sid(sid: str) -> str:
    if not SID_RE.match(sid or ""):
        raise HTTPException(status_code=400, detail="invalid session id")
    return sid


def _settings_path(username: str) -> Path:
    d = AI_HOME / "settings"
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{username}.json"


def load_settings(username: str) -> dict:
    path = _settings_path(username)
    data = dict(DEFAULT_SETTINGS)
    if path.exists():
        try:
            data.update(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, ValueError):
            LOG.warning("ai: settings file unreadable, using defaults user=%s", username)
    return data


def save_settings(username: str, patch: dict) -> dict:
    data = load_settings(username)
    for key, value in patch.items():
        if key in DEFAULT_SETTINGS:
            data[key] = value
    path = _settings_path(username)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.chmod(tmp, 0o600)  # 里面有明文密钥
    tmp.replace(path)
    return data


def public_settings(data: dict) -> dict:
    """对外不返回明文密钥，只回一个「配没配」的标记。

    同时把「当前生效的能力边界」回给前端：设置页直接展示这份口径，
    而不是前端自己再写一份说明——两边说法不一致才是最危险的。
    """
    out = {k: v for k, v in data.items() if k != "api_key"}
    out["has_api_key"] = bool(data.get("api_key"))
    out["effective_base_url"] = data.get("base_url") or DEFAULT_BASE_URL
    out["effective_tools"] = (
        TOOLS_WITH_SHELL if data.get("allow_shell") else TOOLS_NO_SHELL
    )
    out["policy_text"] = _policy_prompt(data.get("system_prompt") or "")
    return out


# ── 会话目录 ───────────────────────────────────────────────────────────────

def _sessions_root(username: str) -> Path:
    d = AI_HOME / "sessions" / username
    d.mkdir(parents=True, exist_ok=True)
    return d


def session_dir(username: str, sid: str) -> Path:
    d = _sessions_root(username) / _safe_sid(sid)
    if not d.exists():
        raise HTTPException(status_code=404, detail="session not found")
    return d


async def create_session(username: str, title: str = "", skill: str = "") -> dict:
    sid = uuid.uuid4().hex[:16]
    uid, gid = await user_ids(username)
    root = _sessions_root(username) / sid
    _prepare_workdir(root, uid, gid)
    meta = {
        "id": sid,
        "title": title or "新会话",
        "skill": skill,
        "created_at": time.time(),
        "updated_at": time.time(),
        "turn": 0,
    }
    _write_meta(username, sid, meta)
    # 草稿先建好并带上标题：成稿落进「我的文档」时文件名就是它，
    # 否则会出现「未命名稿件.md」这种用户看不懂的文件
    save_draft(username, sid, {"title": meta["title"], "blocks": []})
    LOG.info(
        "ai: session created user=%s sid=%s skill=%s sandbox_uid=%s",
        username, sid, skill or "-", uid or "none",
    )
    return meta


def _meta_path(username: str, sid: str) -> Path:
    """meta 放在会话目录**外面**（同级 .json）。

    agent 的会话目录整个归它自己所有，如果 meta 放里面，agent 就能改自己的
    归属信息；放外面且 root 属主，agent 连读都读不到。
    """
    return _sessions_root(username) / f"{_safe_sid(sid)}.json"


def _write_meta(username: str, sid: str, meta: dict) -> None:
    path = _meta_path(username, sid)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def read_meta(username: str, sid: str) -> dict:
    try:
        return json.loads(_meta_path(username, sid).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"id": sid, "title": "会话", "turn": 0}


def list_sessions(username: str) -> list[dict]:
    out = []
    for child in sorted(_sessions_root(username).iterdir(), reverse=True):
        if child.is_dir() and not child.name.endswith(".json"):
            meta = read_meta(username, child.name)
            meta["dir"] = str(child)
            out.append(meta)
    return out[:100]


# ── 材料：服务端解析成文本，agent 看不到文件 ────────────────────────────────
#
# 用户上传的材料由服务端（root、按用户隔离）解析成文本，存在 AI_HOME/materials/
# 下，0600、root 属主 —— agent 的会话目录里**没有**任何材料文件，它连路径都不知道。
# 每轮由服务端把文本拼进 prompt，所以「A 的 agent 扫到 B 的材料」在结构上不可能。

def _materials_dir(username: str) -> Path:
    d = AI_HOME / "materials" / username
    d.mkdir(parents=True, exist_ok=True)
    if os.geteuid() == 0:
        try:
            os.chmod(d, 0o700)
        except OSError:
            pass
    return d


def _materials_path(username: str, sid: str) -> Path:
    return _materials_dir(username) / f"{_safe_sid(sid)}.json"


def load_materials(username: str, sid: str) -> list[dict]:
    try:
        data = json.loads(_materials_path(username, sid).read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, ValueError):
        return []


def save_materials(username: str, sid: str, items: list[dict]) -> None:
    path = _materials_path(username, sid)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    tmp.replace(path)


def materials_context(username: str, sid: str) -> str:
    """把所有材料拼成一段可注入 prompt 的文本。"""
    items = load_materials(username, sid)
    if not items:
        return ""
    chunks: list[str] = []
    for index, item in enumerate(items, 1):
        name = item.get("name") or f"材料{index}"
        text = (item.get("text") or "").strip()
        note = item.get("parse_error")
        header = f"## 材料 {index}：{name}"
        if text:
            tail = "（内容较长已截断）" if item.get("truncated") else ""
            chunks.append(f"{header}{tail}\n{text}")
        else:
            chunks.append(f"{header}\n（未提取到正文：{note or '未知原因'}）")
    body = "\n\n".join(chunks)
    if len(body) > MATERIAL_MAX_CHARS:
        body = body[:MATERIAL_MAX_CHARS] + "\n\n（材料整体已截断）"
    return body


# ── 草稿：服务端持有的当前稿（patch 的作用对象）────────────────────────────
#
# 稿子不放在 agent 的工作目录里：agent 只“看”到带编号的文本、只“说”改成什么，
# 真正的写入由服务端做。这样即使模型胡说，也改不坏用户的文件。

def _drafts_dir(username: str) -> Path:
    d = AI_HOME / "drafts" / username
    d.mkdir(parents=True, exist_ok=True)
    if os.geteuid() == 0:
        try:
            os.chmod(d, 0o700)
        except OSError:
            pass
    return d


def _draft_path(username: str, sid: str) -> Path:
    return _drafts_dir(username) / f"{_safe_sid(sid)}.json"


def load_draft(username: str, sid: str) -> dict:
    try:
        data = json.loads(_draft_path(username, sid).read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("blocks"), list):
            return data
    except (OSError, ValueError):
        pass
    return {"title": "", "blocks": [], "updated_at": time.time()}


def save_draft(username: str, sid: str, draft: dict) -> None:
    draft["updated_at"] = time.time()
    path = _draft_path(username, sid)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(draft, ensure_ascii=False), encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    tmp.replace(path)


def draft_to_prompt(draft: dict) -> str:
    """草稿的「带编号」文本形式：编号就是 patch 里的 anchor。"""
    blocks = draft.get("blocks") or []
    if not blocks:
        return ""
    lines: list[str] = []
    for index, block in enumerate(blocks, 1):
        heading = (block.get("heading") or "").strip()
        text = (block.get("text") or "").strip()
        lines.append(f"[{index}]{(' ' + heading) if heading else ''}")
        lines.append(text if text else "（空）")
        lines.append("")
    body = "\n".join(lines).strip()
    if len(body) > DRAFT_INJECT_MAX_CHARS:
        body = body[:DRAFT_INJECT_MAX_CHARS] + "\n\n…（草稿较长已截断，可只针对上文可见段落提改动）"
    return body


def draft_to_markdown(draft: dict) -> str:
    blocks = draft.get("blocks") or []
    title = (draft.get("title") or "").strip()
    parts = [f"# {title}"] if title else []
    for block in blocks:
        heading = (block.get("heading") or "").strip()
        if heading:
            parts.append(f"## {heading}")
        if (block.get("text") or "").strip():
            parts.append(block["text"].strip())
    return "\n\n".join(parts).strip()


def markdown_to_blocks(text: str, title: str = "") -> list[dict]:
    """把 Markdown 拆成「段落块」。用于两种场景：整篇重出、从编辑器导入当前稿。"""
    blocks: list[dict] = []
    heading: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        nonlocal heading, buffer
        body = "\n".join(buffer).strip()
        if body or heading:
            blocks.append({"heading": heading or "", "text": body})
        heading, buffer = None, []

    for raw in (text or "").splitlines():
        line = raw.rstrip()
        if line.startswith("## ") or line.startswith("# "):
            flush()
            heading = line.lstrip("# ").strip()
        else:
            buffer.append(line)
    flush()
    # 去掉纯空块
    return [b for b in blocks if (b.get("heading") or b.get("text"))]


def apply_patches(draft: dict, patches: list[dict]) -> tuple[dict, list[dict], list[dict]]:
    """把模型给的 patch 落到草稿上。

    返回 (新草稿, 已应用, 被跳过)。跳过的一定要报给用户，不能静默丢——
    「说了改 3 处只改了 2 处」是最难发现的坑。
    """
    blocks = [
        {"heading": b.get("heading") or "", "text": b.get("text") or ""}
        for b in (draft.get("blocks") or [])
    ]
    applied: list[dict] = []
    skipped: list[dict] = []
    for patch in patches:
        raw_anchor = str(patch.get("anchor") or "").strip()
        op = (patch.get("op") or "replace").lower()
        text = (patch.get("text") or "").strip()
        if raw_anchor in ("", "end"):
            index = len(blocks) - 1
        elif raw_anchor.isdigit():
            index = int(raw_anchor) - 1
        else:
            skipped.append({**patch, "reason": f"无法识别的段落编号 {raw_anchor}"})
            continue
        if not blocks:
            index = -1
        elif index < 0 or index >= len(blocks):
            # 允许 end 用在空稿上；其他越界一律跳过并说明
            if raw_anchor == "end":
                index = len(blocks) - 1
            else:
                skipped.append({**patch, "reason": f"第 {raw_anchor} 段不存在（当前共 {len(blocks)} 段）"})
                continue
        if op == "delete":
            if blocks and 0 <= index < len(blocks):
                blocks.pop(index)
                applied.append({"anchor": raw_anchor, "op": "delete", "text": ""})
            else:
                skipped.append({**patch, "reason": "没有可删除的段落"})
        elif op == "insert":
            new_block = {"heading": (patch.get("heading") or "").strip(), "text": text}
            at = index + 1 if blocks else 0
            blocks.insert(at, new_block)
            applied.append({"anchor": raw_anchor, "op": "insert", "text": text})
        else:
            if not blocks:
                blocks.append({"heading": (patch.get("heading") or "").strip(), "text": text})
            else:
                if patch.get("heading"):
                    blocks[index]["heading"] = str(patch["heading"]).strip()
                blocks[index]["text"] = text
            applied.append({"anchor": raw_anchor, "op": "replace", "text": text})
    new_draft = {**draft, "blocks": blocks}
    return new_draft, applied, skipped


PATCH_RE = re.compile(r"<patch\s+([^>]*?)>(.*?)</patch>", re.S | re.I)
FINAL_RE = re.compile(r"<final-doc>(.*?)</final-doc>", re.S | re.I)
ATTR_RE = re.compile(r"(\w+)\s*=\s*\"([^\"]*)\"")


def parse_model_output(text: str) -> dict:
    """解析模型输出：patch 优先，整篇 <final-doc> 次之，都没有就是纯说明。"""
    patches: list[dict] = []
    for attrs, body in PATCH_RE.findall(text or ""):
        meta = dict(ATTR_RE.findall(attrs or ""))
        patches.append({
            "anchor": (meta.get("anchor") or meta.get("id") or "").strip(),
            "op": (meta.get("op") or "replace").strip(),
            "heading": (meta.get("heading") or "").strip(),
            "text": (body or "").strip(),
        })
    final = FINAL_RE.search(text or "")
    prose = PATCH_RE.sub("", (text or ""))
    prose = FINAL_RE.sub("", prose).strip()
    return {
        "patches": patches,
        "final_doc": final.group(1).strip() if final else None,
        "prose": prose,
    }


OUTPUT_CONTRACT = """# 改稿输出契约（严格遵守）
- 改现有段落：<patch anchor="段落编号">该段新文本</patch>，可一次给多个
- 新增段落：<patch anchor="段落编号" op="insert">新段落文本</patch>（插在该段之后；末尾用 anchor="end"）
- 删除段落：<patch anchor="段落编号" op="delete"></patch>
- 只有需要重写整篇时才用 <final-doc>…</final-doc> 包裹完整全文
- patch 之外可以写一两句说明你的改动理由；<patch> 里不要放代码块围栏

关于段落编号（最容易错，务必照做）：
- 编号只认「当前草稿」里方括号中的数字，例如 [2] 就是编号 2
- 本节给了「本次要改的位置」「段落编号：N」时，你的 patch 必须用 **N**；
  不要自己数、不要含标题、不要用 Markdown 里的行号
- 用户口头说「第几段」时，也按方括号编号理解；拿不准就按给定编号改"""


def _build_turn_prompt(
    username: str,
    sid: str,
    instruction: str,
    *,
    anchor: str = "",
    selection: str = "",
    include_materials: bool = True,
) -> str:
    """每轮发给 agent 的东西：指令 + 位置 + 当前草稿（带编号）+ 材料 + 输出契约。

    「带着当前稿再提问」是这版的关键：真值在服务端，不依赖 agent 的记忆，
    所以重试、换模型、断线重连都不会让改稿结果漂移。
    """
    parts: list[str] = [instruction.strip()]
    if anchor or selection:
        locate = ["# 本次要改的位置"]
        if anchor:
            locate.append(f"段落编号：{anchor}")
        if selection:
            locate.append(f"用户选中的原文：\n{selection}")
        parts.append("\n".join(locate))

    draft = load_draft(username, sid)
    draft_text = draft_to_prompt(draft)
    if draft_text:
        parts.append("# 当前草稿（方括号里是段落编号）\n\n" + draft_text)
    else:
        parts.append(
            "# 当前草稿\n\n（还没有草稿：这一轮请写出完整初稿，"
            "并用 <final-doc> 与 </final-doc> 包裹全文）"
        )

    if include_materials:
        materials = materials_context(username, sid)
        if materials:
            parts.append("# 参考材料（服务端已解析为文本，你无需读取任何文件）\n\n" + materials)

    parts.append(OUTPUT_CONTRACT)
    return "\n\n".join(p for p in parts if p)


def public_draft(draft: dict) -> dict:
    return {
        "title": draft.get("title") or "",
        "blocks": [
            {"anchor": str(index), "heading": b.get("heading") or "", "text": b.get("text") or ""}
            for index, b in enumerate(draft.get("blocks") or [], 1)
        ],
        "chars": len(draft_to_markdown(draft)),
        "updated_at": draft.get("updated_at"),
    }


def _save_draft_to_docs(username: str, sid: str, draft: dict) -> Optional[str]:
    """成稿写进用户「我的文档」——由服务端做主，agent 碰不到文件系统。"""
    if _save_document is None:
        return None
    markdown = draft_to_markdown(draft)
    if not markdown:
        return None
    title = (draft.get("title") or "未命名稿件").strip() or "未命名稿件"
    try:
        name = _safe_name(f"{title}.md")
    except HTTPException:
        name = "未命名稿件.md"
    try:
        saved = _save_document(username, name, markdown.encode("utf-8"))
        LOG.info("ai: saved to my-docs user=%s sid=%s name=%s", username, sid, saved)
        return saved
    except Exception as exc:  # noqa: BLE001 落盘失败不该吞掉这一轮结果
        LOG.warning("ai: save to my-docs failed user=%s sid=%s: %s", username, sid, exc)
        return None


# ── 工具：进程树终止 ────────────────────────────────────────────────────────

def _kill_tree(proc: Optional[asyncio.subprocess.Process]) -> None:
    """杀掉整棵进程树。

    `start_new_session=True` 让子进程自成进程组，向 -pgid 发信号即可连锅端，
    避免 pi 之内再起的 python/浏览器子进程变成孤儿（这类孤儿会一直吃内存）。
    """
    if proc is None or proc.returncode is not None:
        return
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    except (ProcessLookupError, PermissionError, OSError):
        try:
            proc.kill()
        except ProcessLookupError:
            pass


def _pi_env(settings: dict, root: Path) -> dict:
    """给 pi 子进程的环境：只放行必需项 + 我们自己的 PI_* 配置。

    pi 的工具里带 bash，透传整个服务端环境等于把 VOS_* 一起交出去；
    密钥也只经环境变量传（不进命令行，避免出现在 ps 里）。
    """
    keep = {
        "PATH", "USER", "LOGNAME", "LANG", "LC_ALL", "TZ",
        "TMPDIR", "TMP", "TEMP",
        "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY",
        "http_proxy", "https_proxy", "no_proxy",
    }
    env = {k: v for k, v in os.environ.items() if k in keep or k.startswith(("PYTHON", "UV_", "XDG_"))}
    env.update(
        {
            # 每个会话一份 Pi 配置目录：models.json（自定义 provider）放这里，
            # 会话之间互不污染，也不会写到服务进程的 $HOME 里
            "PI_CODING_AGENT_DIR": str(root / ".pi-agent"),
            "PI_OFFLINE": "1",  # 关掉版本检查/模型目录刷新：容器里更稳、更快
            "PI_TELEMETRY": "0",
            "PI_SKIP_VERSION_CHECK": "1",
            "PI_CODING_AGENT": "true",
            # HOME 指向会话自己的目录：pi 往 ~/.cache 之类写东西也落在会话里，
            # 既不会污染服务进程的 HOME，降权后也仍然可写
            "HOME": str(root / ".home"),
            # 密钥只经环境变量传入（models.json 里用 $VOFFICE_AI_KEY 插值），
            # 不进命令行参数，ps 里看不到
            "VOFFICE_AI_KEY": settings.get("api_key") or "",
        }
    )
    return env


def _prepare_workdir(root: Path, uid: int = 0, gid: int = 0) -> None:
    """建好会话目录，并按「该用户专属 uid」设置属主与权限。

    隔离靠三层一起成立（缺一层就漏）：
    1. 每个用户一个独立 uid → 进程身份上就分开了；
    2. 祖先目录只给「可穿过」不给「可列举」（0711，root 属主）→ 别人的 agent
       连有哪些会话都数不出来；
    3. 会话目录 0700 且归该用户 uid → 别人的 agent 连进都进不来。
    """
    for name in (".pi-agent", ".pi-sessions", ".home"):
        (root / name).mkdir(parents=True, exist_ok=True)

    # 祖先链：AI_HOME / sessions / sessions/<user> 只要可穿过
    for parent in (AI_HOME, AI_HOME / "sessions", root.parent):
        try:
            os.chmod(parent, 0o711)
        except OSError:
            LOG.warning("ai: chmod failed for parent %s", parent)

    if uid > 0 and os.geteuid() == 0:
        try:
            os.chmod(root, 0o700)
            os.chown(root, uid, gid)
        except OSError:
            LOG.warning("ai: chown failed for %s", root)
        for sub in (".pi-agent", ".pi-sessions", ".home"):
            for path in [root / sub, *(root / sub).rglob("*")]:
                try:
                    os.chown(path, uid, gid)
                except OSError:
                    pass
    elif os.geteuid() == 0:
        # 没有独立 uid（显式关沙箱/单用户模式）：至少别给同机其他用户读
        try:
            os.chmod(root, 0o700)
        except OSError:
            pass


def _write_models_json(root: Path, settings: dict) -> None:
    """把用户在设置里填的网关写成 Pi 的自定义 provider。

    apiKey 用 `$VOFFICE_AI_KEY` 插值：密钥只经环境变量进入 pi，不落盘。
    """
    model = settings.get("model") or ""
    provider = {
        "baseUrl": settings.get("base_url") or DEFAULT_BASE_URL,
        "api": "openai-completions",
        "apiKey": "$VOFFICE_AI_KEY",
        "models": [{"id": model}] if model else [],
    }
    payload = {"providers": {"voffice": provider}}
    target = root / ".pi-agent" / "models.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _skill_args(settings: dict) -> list[str]:
    """要装载的技能目录。默认把 SKILLS_DIR 下的子包全挂上。"""
    names = [s for s in (settings.get("skills") or []) if isinstance(s, str)]
    base = Path(SKILLS_DIR)
    dirs: list[Path] = []
    if names:
        for name in names:
            candidate = base / name
            if candidate.is_dir():
                dirs.append(candidate)
    elif base.is_dir():
        dirs = sorted([p for p in base.iterdir() if p.is_dir()])[:12]
    args: list[str] = []
    for d in dirs:
        args += ["--skill", str(d)]
    return args


def _build_argv(settings: dict, root: Path, prompt: str, resume: bool) -> list[str]:
    allow_shell = bool(settings.get("allow_shell", False))
    argv = [
        PI_BIN,
        "--mode", "json",
        "--provider", "voffice",
        "-p",
        "--session-dir", str(root / ".pi-sessions"),
        # 会话目录是我们自己管的临时工程目录，需要信任它才能读写其中的文件
        "--approve" if settings.get("auto_approve", True) else "--no-approve",
        "--no-context-files",  # 不扫 workdir 里的 AGENTS.md（避免用户材料影响行为）
        # ── 能力面收窄（逻辑限制）──
        # 工具白名单：写作只需要「读材料 / 写稿子」。默认不给 bash——
        # 给了 bash 就等于把下载、装包、翻系统文件的权限一起给了。
        "--tools", TOOLS_WITH_SHELL if allow_shell else TOOLS_NO_SHELL,
        # 关掉一切「自己找能力」的入口：MCP server、扩展、提示词模板。
        # 否则 skill/扩展目录里放什么，agent 就能长出什么能力。
        "--no-mcp",
        "--no-extensions",
        "--no-prompt-templates",
    ]
    if settings.get("model"):
        argv += ["--model", str(settings["model"])]
    if settings.get("thinking"):
        argv += ["--thinking", str(settings["thinking"])]
    argv += _skill_args(settings)
    # 提示词护栏（与上面的逻辑限制双保险）；用户自定义要求追加在后面
    argv += ["--append-system-prompt", _policy_prompt(settings.get("system_prompt") or "")]
    if resume:
        argv.append("-c")
    argv += ["--", prompt]  # prompt 可能以 - 开头，用 -- 收口
    return argv


# ── Pi 事件 → 前端事件 ──────────────────────────────────────────────────────

def _assistant_text(message: dict) -> str:
    """从 pi 的消息对象里取正文。content 既可能是字符串也可能是块数组。"""
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
        return "".join(parts)
    return ""


def _translate(event: dict) -> list[dict]:
    """把一条 pi JSONL 事件翻成 0..n 条前端事件。

    只认我们需要的那几种；工具调用/上下文编辑等一律忽略（前端不显示噪音，
    也避免把系统提示里的巨型工具定义转发出去）。
    """
    kind = event.get("type")
    if kind == "session":
        return [{"type": "session", "id": event.get("id"), "cwd": event.get("cwd")}]
    if kind == "message_update":
        inner = event.get("assistantMessageEvent") or {}
        if inner.get("type") == "text_delta" and inner.get("delta"):
            return [{"type": "delta", "text": inner["delta"]}]
        return []
    if kind == "message_end":
        message = event.get("message") or {}
        if message.get("role") != "assistant":
            return []
        out = [{"type": "message_end", "text": _assistant_text(message), "usage": message.get("usage")}]
        if message.get("stopReason") == "error":
            out.append({"type": "warn", "message": message.get("errorMessage") or "模型请求失败"})
        return out
    if kind == "turn_end":
        results = event.get("toolResults") or []
        names = []
        for item in results:
            if isinstance(item, dict):
                name = item.get("toolName") or item.get("name")
                if name:
                    names.append(str(name))
        return [{"type": "tools", "names": names}] if names else []
    if kind == "auto_retry_start":
        return [{
            "type": "retry",
            "attempt": event.get("attempt"),
            "max": event.get("maxAttempts"),
            "message": event.get("errorMessage"),
        }]
    if kind == "auto_retry_end":
        return [{"type": "retry_end", "success": bool(event.get("success"))}]
    if kind == "agent_settled":
        return [{"type": "settled", "aborted": bool(event.get("aborted"))}]
    if kind == "agent_end":
        return [{"type": "agent_end", "willRetry": bool(event.get("willRetry"))}]
    return []


# ── 单回合执行 ─────────────────────────────────────────────────────────────

async def _run_turn(
    username: str,
    sid: str,
    prompt: str,
    *,
    resume: bool,
) -> AsyncIterator[dict]:
    """跑一个回合，产出前端事件。调用方负责 SSE 包装。"""
    settings = load_settings(username)
    if not (settings.get("api_key") or "").strip():
        yield {
            "type": "stop",
            "kind": "preflight",
            "message": "尚未配置模型密钥：请在「设置 → AI」里填写网关地址、模型与 API Key",
        }
        return
    if not (settings.get("model") or "").strip():
        yield {
            "type": "stop",
            "kind": "preflight",
            "message": "尚未配置模型：请在「设置 → AI」里填写模型 ID",
        }
        return

    root = session_dir(username, sid)
    # cwd 就用会话目录本身：里面只有 pi 自己的配置与会话文件，
    # 没有任何用户材料/文档（材料在服务端解析、稿子在服务端持有）。
    workdir = root
    # 该用户专属 uid：A 的 agent 与 B 的 agent 是两个不同的进程身份，
    # 目录属主也各不相同 —— 这是「A 扫不到 B」的根，不靠路径猜。
    uid, gid = await user_ids(username)
    _prepare_workdir(root, uid, gid)
    _write_models_json(root, settings)
    if uid > 0 and os.geteuid() == 0:
        # pi 要读 models.json：降权后仍可读（里面只有 $VOFFICE_AI_KEY 占位）
        try:
            os.chown(root / ".pi-agent" / "models.json", uid, gid)
            os.chmod(root / ".pi-agent" / "models.json", 0o644)
        except OSError:
            pass
    argv = _build_argv(settings, root, prompt, resume)
    env = _pi_env(settings, root)

    turn_timeout = float(settings.get("turn_timeout_s") or 900)
    idle_timeout = float(settings.get("idle_timeout_s") or 240)
    started = time.monotonic()
    deadline = started + turn_timeout

    LOG.info(
        "ai: turn start user=%s sid=%s resume=%s model=%s uid=%s timeout=%ss",
        username, sid, resume, settings.get("model"), uid or "none", turn_timeout,
    )

    # 降权：服务是 root（要写应用私有存储），agent 只拿自己的 uid。
    # uid 非 root + 目录只归它所有 = 别的用户的数据读不到、系统也改不了。
    priv = (
        {"user": uid, "group": gid}
        if uid > 0 and os.geteuid() == 0
        else {}
    )
    try:
        proc = await asyncio.create_subprocess_exec(
            *argv,
            cwd=str(workdir),
            env=env,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            start_new_session=True,  # 自成进程组 → 可整组 kill
            **priv,
        )
    except FileNotFoundError:
        yield {
            "type": "stop",
            "kind": "preflight",
            "message": f"未找到可执行文件 {PI_BIN}（服务端未安装 pi）",
        }
        return

    _running[sid] = proc
    stderr_tail: list[str] = []
    text_parts: list[str] = []
    usage: dict | None = None
    stop_reason: str | None = None
    session_id: str | None = None

    async def drain_stderr() -> None:
        assert proc.stderr is not None
        while True:
            line = await proc.stderr.readline()
            if not line:
                break
            stderr_tail.append(line.decode("utf-8", "replace").rstrip())
            del stderr_tail[:-STDERR_TAIL]

    stderr_task = asyncio.create_task(drain_stderr())
    killed = False
    stop_kind: str | None = None
    stop_message: str | None = None
    last_activity = time.monotonic()
    try:
        assert proc.stdout is not None
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                killed = True
                stop_kind = "timeout"
                stop_message = (
                    f"本轮超过 {int(turn_timeout)} 秒仍未结束，已中止"
                    "（可在「设置 → AI」里调大整轮超时）"
                )
                break
            try:
                # 等待切片同时受「整轮剩余」和「空闲上限」约束：
                # 只按心跳间隔切的话，空闲超时永远不会触发（实测踩到过）
                slice_timeout = max(0.5, min(remaining, PING_INTERVAL_S, idle_timeout))
                line = await asyncio.wait_for(
                    proc.stdout.readline(), timeout=slice_timeout
                )
                last_activity = time.monotonic()
            except asyncio.TimeoutError:
                if proc.returncode is not None:
                    break
                idle = time.monotonic() - last_activity
                if idle >= idle_timeout:
                    killed = True
                    stop_kind = "idle"
                    stop_message = (
                        f"超过 {int(idle_timeout)} 秒没有任何输出，已中止本轮"
                        "（可在「设置 → AI」里调大空闲超时）"
                    )
                    break
                yield {
                    "type": "ping",
                    "elapsed_s": int(time.monotonic() - started),
                    "idle_s": int(idle),
                }
                continue
            if not line:
                break  # stdout 结束，进程收尾
            raw = line.decode("utf-8", "replace").strip()
            if not raw:
                continue
            if not raw.startswith("{"):
                # 极端情况下 pi 会打非 JSON 行（进度/告警）：当噪声丢弃，
                # 真结果以 message_end / agent_end 为准
                LOG.debug("ai: non-json line ignored sid=%s: %.120s", sid, raw)
                continue
            try:
                event = json.loads(raw)
            except ValueError:
                continue
            for item in _translate(event):
                if item["type"] == "delta":
                    text_parts.append(item["text"])
                    yield item
                elif item["type"] == "message_end":
                    if item.get("text"):
                        # 以完整消息为准做一次校正：delta 可能因为上游断流缺尾巴
                        text_parts = [item["text"]]
                    usage = item.get("usage") or usage
                    yield item
                elif item["type"] == "session":
                    session_id = item.get("id")
                    yield item
                else:
                    yield item
            if event.get("type") == "message_end":
                message = event.get("message") or {}
                if message.get("role") == "assistant":
                    stop_reason = message.get("stopReason") or stop_reason

        if killed:
            _kill_tree(proc)  # 先动手再等退出：判定中止后不该让用户再等一个模型回合
        try:
            await asyncio.wait_for(proc.wait(), timeout=5)
        except asyncio.TimeoutError:
            killed = True
            _kill_tree(proc)
        exit_code = proc.returncode
    finally:
        if killed or (proc.returncode is None):
            _kill_tree(proc)
        _running.pop(sid, None)
        stderr_task.cancel()
        try:
            await stderr_task
        except (asyncio.CancelledError, Exception):  # noqa: BLE001 - 收尾阶段不再抛
            pass

    text = "".join(text_parts).strip()
    detail = "\n".join(stderr_tail[-6:])
    LOG.info(
        "ai: turn done user=%s sid=%s exit=%s chars=%d killed=%s",
        username, sid, exit_code, len(text), killed,
    )

    # 被我们中止（超时 / 空闲 / 用户停止）：不再重试；已经产出的部分照旧回给前端
    # （用户按了停止不该把已写的内容丢掉）
    if killed:
        yield {
            "type": "stop",
            "kind": stop_kind or "aborted",
            "message": stop_message or "已中止本轮",
            "text": text,
            "session": session_id,
            # 退出码非空 = 进程树确实已经回收（不是只发了信号就撒手）
            "exitCode": exit_code,
        }
        return

    # 兜底（最轻的一种）：只有「完全没产出 + 非零退出」才算失败，交给调用方重试
    if not text and (exit_code or 0) != 0:
        yield {"type": "failed", "exitCode": exit_code, "detail": detail,
               "session": session_id}
        return

    if not text and detail:
        yield {"type": "warn", "message": detail.splitlines()[-1][:300]}
    # 解析交给调用方落地（草稿/变更/落盘都是业务逻辑，不属于「怎么跑一个回合」）
    yield {"type": "final", "text": text, "usage": usage,
           "stopReason": stop_reason or "stop", "session": session_id,
           "parsed": parse_model_output(text)}


def _land_turn(
    username: str, sid: str, parsed: dict, *, save: bool, autosave: bool = True,
    anchor: str = "",
) -> list[dict]:
    """把模型这一轮的输出「落地」：更新草稿 / 生成待确认变更 / 写进我的文档。

    规则（刻意做成可预测的）：
    - 草稿还是空的 → 这一轮算初稿，**直接落**到草稿并保存进我的文档（用户要的「丝滑」）
    - 草稿已有内容 → 只产**待确认变更**，用户点接受才改稿
    - 用户点名了段落（anchor）而模型给的是**单条**变更 → 以用户点的那段为准。
      模型在这件事上不可靠（实测会把「第 2 段」写成 3），而用户点的是哪一段
      是确定的；内容仍然是模型的，只有落点按用户的意图纠偏。
    - 无论哪种，落盘都由服务端做，agent 不碰文件
    - `autosave=False` 表示「别自动存」：写作栏目自己管保存（它有独立的存稿链路）
    """
    events: list[dict] = []
    draft = load_draft(username, sid)
    patches: list[dict] = parsed.get("patches") or []
    final_doc: Optional[str] = parsed.get("final_doc")
    is_first = not (draft.get("blocks") or [])

    if anchor and len(patches) == 1 and anchor.isdigit():
        requested = str(patches[0].get("anchor") or "")
        if requested != anchor:
            LOG.info(
                "ai: patch anchor corrected sid=%s model=%s -> user=%s",
                sid, requested or "-", anchor,
            )
            patches = [{**patches[0], "anchor": anchor}]

    if final_doc:
        blocks = markdown_to_blocks(final_doc, draft.get("title") or "")
        if is_first:
            # 标题兜底：会话标题（用户新建会话时给的）优先于模型自己起的
            title = (draft.get("title") or "").strip() or (read_meta(username, sid).get("title") or "")
            draft = {**draft, "title": title, "blocks": blocks}
            save_draft(username, sid, draft)
            events.append({"type": "draft", "draft": public_draft(draft)})
            if autosave:
                saved = _save_draft_to_docs(username, sid, draft)
                if saved:
                    events.append({"type": "saved", "name": saved})
            return events
        # 整篇重写：作为一条「全文替换」变更待确认，before 给前端展示用
        events.append({
            "type": "patch",
            "patch": {
                "anchor": "all",
                "op": "replace",
                "text": final_doc,
                "before": draft_to_markdown(draft),
                "heading": "",
            },
        })
        return events

    if not patches:
        return events

    if is_first:
        new_draft, applied, skipped = apply_patches(draft, patches)
        if applied:
            save_draft(username, sid, new_draft)
            events.append({"type": "draft", "draft": public_draft(new_draft)})
            if autosave:
                saved = _save_draft_to_docs(username, sid, new_draft)
                if saved:
                    events.append({"type": "saved", "name": saved})
        if skipped:
            events.append({
                "type": "warn",
                "message": "；".join(f"第 {s.get('anchor')} 段未改：{s.get('reason')}" for s in skipped),
            })
        return events

    blocks = draft.get("blocks") or []
    for patch in patches:
        anchor = str(patch.get("anchor") or "")
        before = ""
        if anchor.isdigit() and 1 <= int(anchor) <= len(blocks):
            before = blocks[int(anchor) - 1].get("text") or ""
        events.append({
            "type": "patch",
            "patch": {**patch, "before": before, "status": "proposed"},
        })
    return events


async def stream_turn(
    username: str,
    sid: str,
    instruction: str,
    *,
    anchor: str = "",
    selection: str = "",
    save: bool = False,
    autosave: bool = True,
    resume: bool = True,
) -> AsyncIterator[dict]:
    """带并发闸门 + 一次性兜底重试 + 落地（草稿/变更/落盘）的回合流。"""
    settings = load_settings(username)
    per_user = max(1, int(settings.get("max_concurrency") or 1))
    gate_user = _user_gate(username, per_user)
    gate_global = _gate()
    try:
        await asyncio.wait_for(gate_global.acquire(), timeout=QUEUE_WAIT_S)
    except asyncio.TimeoutError:
        yield {"type": "error", "message": "服务繁忙（全局并发已满），请稍后重试"}
        return
    try:
        try:
            await asyncio.wait_for(gate_user.acquire(), timeout=QUEUE_WAIT_S)
        except asyncio.TimeoutError:
            yield {"type": "error", "message": "你还有请求在跑，请等它结束或点停止"}
            return
        try:
            attempts = 2  # 最轻兜底：只在「完全没产出」时多跑一趟（Pi 自己还有 auto retry）
            for attempt in range(attempts):
                final: dict | None = None
                failed: dict | None = None
                stopped: dict | None = None
                # 每趟都重新拼 prompt：真值（材料 + 当前稿）在服务端，
                # 所以第二趟哪怕丢了会话上下文也是完整的
                prompt = _build_turn_prompt(
                    username, sid, instruction,
                    anchor=anchor, selection=selection,
                    include_materials=(attempt > 0) or (not resume),
                )
                async for item in _run_turn(username, sid, prompt,
                                            resume=resume and attempt == 0):
                    if item["type"] == "final":
                        final = item
                    elif item["type"] == "failed":
                        failed = item
                    elif item["type"] == "stop":
                        stopped = item
                    else:
                        yield item
                # 超时/空闲/配置缺失这类「已判定」的终止：直接上报，不再重试
                if stopped is not None:
                    yield stopped
                    return
                if final is not None:
                    parsed = final.pop("parsed", None) or {}
                    try:
                        for event in _land_turn(
                            username, sid, parsed, save=save, autosave=autosave, anchor=anchor
                        ):
                            yield event
                    except Exception as exc:  # noqa: BLE001 落地失败不能吞掉这一轮的正文
                        LOG.exception("ai: landing failed sid=%s", sid)
                        yield {"type": "warn", "message": f"改稿落地失败：{exc}"}
                    yield final
                    return
                # 走到这里说明这一趟完全没产出：重试一次（第二次不带 -c，躲开坏会话）
                if attempt + 1 < attempts:
                    LOG.warning("ai: empty turn, retrying sid=%s detail=%.200s",
                                sid, (failed or {}).get("detail", ""))
                    yield {
                        "type": "retry",
                        "attempt": 2,
                        "max": attempts,
                        "message": "本轮没有产出，正在重试一次",
                    }
                    continue
                yield {
                    "type": "error",
                    "message": "模型没有返回内容，请检查「设置 → AI」里的网关/模型/密钥",
                    "detail": (failed or {}).get("detail", ""),
                }
                return
        finally:
            gate_user.release()
    finally:
        gate_global.release()


def _sse(item: dict) -> str:
    return f"data: {json.dumps(item, ensure_ascii=False)}\n\n"


async def sse_turn(
    username: str,
    sid: str,
    instruction: str,
    *,
    anchor: str = "",
    selection: str = "",
    save: bool = False,
    autosave: bool = True,
    resume: bool = True,
) -> AsyncIterator[str]:
    """SSE 包装：始终以一个终止事件收尾，前端不用猜。"""
    yield _sse({"type": "ready", "session": sid})
    try:
        async for item in stream_turn(
            username, sid, instruction,
            anchor=anchor, selection=selection, save=save,
            autosave=autosave, resume=resume,
        ):
            if item["type"] == "final":
                # 注意顺序：type 放最后，否则会被 item 里的 "final" 覆盖
                yield _sse({**item, "type": "done"})
            elif item["type"] == "stop":
                # 中止：error 是这一轮的最后一个事件（不再补 done），
                # 已产出的文本随 error 一起给前端，避免丢掉半成品
                yield _sse({
                    "type": "error",
                    "kind": item.get("kind"),
                    "message": item.get("message") or "已中止本轮",
                    "text": item.get("text") or "",
                    "exitCode": item.get("exitCode"),
                })
            else:
                yield _sse(item)
    except asyncio.CancelledError:
        # 客户端断开：把这一回合的进程树收掉，别留孤儿
        _kill_tree(_running.pop(sid, None))
        LOG.info("ai: client disconnected, killed sid=%s", sid)
        raise
    except Exception as exc:  # noqa: BLE001 - 兜住一切，保证前端拿到终止事件
        LOG.exception("ai: turn crashed sid=%s", sid)
        yield _sse({"type": "error", "message": f"服务内部错误：{exc}"})
    finally:
        yield "data: [DONE]\n\n"


# ── 路由 ───────────────────────────────────────────────────────────────────

class SettingsPatch(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    thinking: Optional[str] = None
    max_concurrency: Optional[int] = None
    turn_timeout_s: Optional[int] = None
    idle_timeout_s: Optional[int] = None
    auto_approve: Optional[bool] = None
    allow_shell: Optional[bool] = None
    skills: Optional[list[str]] = None
    system_prompt: Optional[str] = None


class CreateSessionRequest(BaseModel):
    title: str = ""
    skill: str = ""


class ChatRequest(BaseModel):
    """一轮对话。

    `anchor` / `selection` 是「改哪里」：段落编号或选中原文，二者可同时给。
    `save` = 这一轮结束后立刻把草稿写进我的文档（初稿会自动保存一次）。
    """
    prompt: str
    resume: bool = True
    anchor: str = ""
    selection: str = ""
    save: bool = False
    # 写作栏目自己管保存（有独立存稿链路）→ autosave=False
    autosave: bool = True


@router.get("/health")
async def health() -> JSONResponse:
    version = None
    available = shutil.which(PI_BIN) is not None
    if available:
        try:
            proc = await asyncio.create_subprocess_exec(
                PI_BIN, "--version",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
            )
            out, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
            version = out.decode("utf-8", "replace").strip().splitlines()[0] if out else None
        except (asyncio.TimeoutError, OSError):
            available = False
    return JSONResponse({
        "ok": available,
        "pi": {"available": available, "path": PI_BIN, "version": version},
        "skills_dir": SKILLS_DIR,
        "running": list(_running),
        "global_concurrency": GLOBAL_CONCURRENCY,
        # 隔离状态：per_user=True 表示每个用户一个专属 uid（A 看不到 B 的前提）
        "sandbox": {
            "per_user": RUN_UID == 0,
            "enforced": RUN_UID == 0 and os.geteuid() == 0,
            "uid_base": UID_BASE,
            "users": len(_uid_map or {}),
        },
    })


@router.get("/settings")
async def get_settings(request: Request) -> JSONResponse:
    return JSONResponse(public_settings(load_settings(await _user(request))))


@router.put("/settings")
async def put_settings(request: Request, patch: SettingsPatch) -> JSONResponse:
    username = await _user(request)
    async with _settings_lock:
        data = save_settings(username, {k: v for k, v in patch.model_dump().items() if v is not None})
    LOG.info("ai: settings updated user=%s model=%s base_url=%s",
             username, data.get("model"), data.get("base_url") or "(default)")
    return JSONResponse(public_settings(data))


@router.get("/sessions")
async def get_sessions(request: Request) -> JSONResponse:
    return JSONResponse({"sessions": list_sessions(await _user(request))})


@router.post("/sessions")
async def post_session(request: Request, body: CreateSessionRequest) -> JSONResponse:
    username = await _user(request)
    meta = await create_session(username, title=body.title, skill=body.skill)
    return JSONResponse(meta)


@router.delete("/sessions/{sid}")
async def delete_session(request: Request, sid: str) -> JSONResponse:
    username = await _user(request)
    root = session_dir(username, sid)
    _kill_tree(_running.pop(sid, None))
    shutil.rmtree(root, ignore_errors=True)
    _meta_path(username, sid).unlink(missing_ok=True)
    _materials_path(username, sid).unlink(missing_ok=True)
    _draft_path(username, sid).unlink(missing_ok=True)
    LOG.info("ai: session deleted user=%s sid=%s", username, sid)
    return JSONResponse({"deleted": sid})


@router.get("/sessions/{sid}/draft")
async def get_draft(request: Request, sid: str) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    return JSONResponse(public_draft(load_draft(username, sid)))


class DraftImport(BaseModel):
    """从编辑器导入当前稿（用户在编辑器里手改过，agent 是不知道的）。"""
    markdown: str
    title: str = ""


@router.put("/sessions/{sid}/draft")
async def put_draft(request: Request, sid: str, body: DraftImport) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    draft = load_draft(username, sid)
    if body.title.strip():
        draft["title"] = body.title.strip()
    draft["blocks"] = markdown_to_blocks(body.markdown, draft.get("title") or "")
    save_draft(username, sid, draft)
    LOG.info("ai: draft imported user=%s sid=%s blocks=%d", username, sid, len(draft["blocks"]))
    return JSONResponse(public_draft(draft))


class ApplyRequest(BaseModel):
    """用户点「接受」后落文。patches 为空 = 把模型给的全篇替换落下来。"""
    patches: list[dict] = []
    title: str = ""
    save: bool = True


@router.post("/sessions/{sid}/apply")
async def apply_many(request: Request, sid: str, body: ApplyRequest) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    draft = load_draft(username, sid)
    if body.title.strip():
        draft["title"] = body.title.strip()
    if not body.patches:
        raise HTTPException(status_code=400, detail="empty patches")
    # 整篇替换：patch 里带 full=true（前端从 <final-doc> 变更里带来的）
    if len(body.patches) == 1 and body.patches[0].get("full"):
        draft = {**draft, "blocks": markdown_to_blocks(body.patches[0].get("text") or "")}
        applied, skipped = [{"anchor": "all", "op": "replace"}], []
    else:
        draft, applied, skipped = apply_patches(draft, body.patches)
    save_draft(username, sid, draft)
    saved = _save_draft_to_docs(username, sid, draft) if body.save else None
    LOG.info(
        "ai: applied user=%s sid=%s applied=%d skipped=%d saved=%s",
        username, sid, len(applied), len(skipped), saved or "-",
    )
    return JSONResponse({
        "applied": applied,
        "skipped": skipped,
        "draft": public_draft(draft),
        "saved": saved,
    })


@router.post("/sessions/{sid}/save")
async def save_to_docs(request: Request, sid: str) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    draft = load_draft(username, sid)
    if not draft.get("blocks"):
        raise HTTPException(status_code=400, detail="草稿还是空的，先生成内容")
    saved = _save_draft_to_docs(username, sid, draft)
    if not saved:
        raise HTTPException(status_code=502, detail="保存到「我的文档」失败")
    return JSONResponse({"saved": saved, "draft": public_draft(draft)})


# ── 与编辑器内核（Collabora）互通：docx 出稿 / docx 回读 ────────────────────
#
# 草稿是服务端的真值（Markdown），编辑器只认 docx/odt，两边必须能来回：
#   出稿：草稿 → md → md_to_docx.py → 「我的文档」里的 .docx → Collabora 打开
#   回读：用户在编辑器里改完 → docx_to_md.py → 草稿（agent 才知道用户改了什么）
#
# 两个脚本都是技能包里现成的确定性工具（不经过模型），所以走「起子进程」而不是
# 让 agent 自己动手：转换必须有确定结果，不能看模型心情。


def _skill_tool(filename: str) -> Optional[Path]:
    """在技能目录里定位一个确定性脚本（技能包升级换目录也不写死路径）。"""
    base = Path(SKILLS_DIR)
    if not base.is_dir():
        return None
    for path in sorted(base.glob(f"*/tools/{filename}")):
        if path.is_file():
            return path
    return None


async def _run_tool(argv: list[str], timeout: float) -> tuple[int, str]:
    """跑一次性转换脚本：独立进程组 + 超时杀整棵树（与 agent 同一套回收口径）。"""
    proc = await asyncio.create_subprocess_exec(
        *argv,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        start_new_session=True,
    )
    try:
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        _kill_tree(proc)
        LOG.warning("ai: docx tool timeout argv=%s", argv[1:3])
        return 124, "timeout"
    return proc.returncode or 0, (out or b"").decode("utf-8", "replace")[-2000:]


async def _convert_docx(
    *, tool: str, src: bytes, src_suffix: str, out_suffix: str, root: Path,
) -> Optional[bytes]:
    """把字节在 md / docx 之间转一次。转换失败返回 None（调用方决定怎么报错）。"""
    script = _skill_tool(tool)
    if script is None:
        LOG.warning("ai: skill tool missing name=%s skills=%s", tool, SKILLS_DIR)
        return None
    # 工作目录放在会话目录下：技能脚本会随手写临时文件，别落到系统 /tmp 之外的地方
    with tempfile.TemporaryDirectory(dir=str(root)) as tmp:
        src_path = Path(tmp) / f"in{src_suffix}"
        out_path = Path(tmp) / f"out{out_suffix}"
        src_path.write_bytes(src)
        code, tail = await _run_tool(
            [sys.executable, str(script), "-i", str(src_path), "-o", str(out_path)],
            DOCX_TOOL_TIMEOUT_S,
        )
        if code != 0 or not out_path.is_file():
            LOG.warning("ai: %s failed code=%s tail=%s", tool, code, tail)
            return None
        return out_path.read_bytes()


@router.post("/sessions/{sid}/docx")
async def export_docx(request: Request, sid: str) -> JSONResponse:
    """草稿 → .docx 写进「我的文档」，返回文件名（前端据此用 Collabora 打开）。

    刻意不做在每轮保存里：转换要起 Python 子进程，塞进每轮对话会拖慢出字；
    这里按需触发，只在用户真的要打开编辑器时转一次。
    """
    username = await _user(request)
    root = session_dir(username, sid)
    if _save_document is None:
        raise HTTPException(status_code=503, detail="存储服务不可用")
    draft = load_draft(username, sid)
    markdown = draft_to_markdown(draft)
    if not markdown:
        # 空稿也要能开编辑器：撰写室一进来就是 Collabora，用户可以先在文档里
        # 自己写，或一边写一边让 AI 改。给一份只有标题的空文档即可。
        title_only = (draft.get("title") or "").strip() or "未命名稿件"
        markdown = f"# {title_only}\n"

    data = await _convert_docx(
        tool="md_to_docx.py", src=markdown.encode("utf-8"),
        src_suffix=".md", out_suffix=".docx", root=root,
    )
    if not data:
        raise HTTPException(status_code=502, detail="生成 docx 失败（技能脚本未就绪或超时）")

    title = (draft.get("title") or "未命名稿件").strip() or "未命名稿件"
    try:
        name = _safe_name(f"{title}.docx")
    except HTTPException:
        name = "未命名稿件.docx"
    saved = _save_document(username, name, data)
    LOG.info("ai: exported docx user=%s sid=%s name=%s bytes=%d", username, sid, saved, len(data))
    return JSONResponse({"saved": saved, "draft": public_draft(draft)})


def _clean_converted_markdown(text: str) -> str:
    """收拾技能脚本转出来的 Markdown，再进草稿。

    转换器会在开头写一行 HTML 注释式的元信息，直接进草稿会变成一个莫名其妙的
    段落（还会被下一轮当成正文喂给模型）；标题里的点号也会被转义成 `2\\.1`，
    不撤销的话每来回一次就多一层反斜杠，最后标题都对不上。
    """
    text = re.sub(r"^\s*<!--.*?-->\s*", "", text, count=1, flags=re.S)
    return re.sub(r"\\([\\`*_{}\[\]()#+\-.!~>|])", r"\1", text)


class DocxImport(BaseModel):
    """要回读的文件名（「我的文档」里的那份 docx）。"""

    name: str


@router.post("/sessions/{sid}/import-docx")
async def import_docx(request: Request, sid: str, body: DocxImport) -> JSONResponse:
    """把「我的文档」里的 docx 回读成草稿：用户在编辑器里手改过，agent 是不知道的。"""
    username = await _user(request)
    root = session_dir(username, sid)
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="missing name")
    if _read_document is None:
        raise HTTPException(status_code=503, detail="存储服务不可用")
    try:
        src = _read_document(username, name)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 读不到就当成「还没导出过」
        raise HTTPException(status_code=404, detail=f"读不到文件：{name}") from exc

    markdown = await _convert_docx(
        tool="docx_to_md.py", src=src,
        src_suffix=".docx", out_suffix=".md", root=root,
    )
    if markdown is None:
        raise HTTPException(status_code=502, detail="读取 docx 失败（技能脚本未就绪或超时）")

    draft = load_draft(username, sid)
    text = _clean_converted_markdown(markdown.decode("utf-8", "replace"))
    draft["blocks"] = markdown_to_blocks(text, draft.get("title") or "")
    save_draft(username, sid, draft)
    LOG.info("ai: imported docx user=%s sid=%s name=%s blocks=%d",
             username, sid, name, len(draft["blocks"]))
    return JSONResponse({"draft": public_draft(draft), "source": name})


@router.post("/sessions/{sid}/stop")
async def stop_session(request: Request, sid: str) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    proc = _running.get(sid)
    if proc is None:
        return JSONResponse({"stopped": False})
    _kill_tree(proc)
    LOG.info("ai: stop requested user=%s sid=%s", username, sid)
    return JSONResponse({"stopped": True})


@router.post("/sessions/{sid}/chat")
async def chat(request: Request, sid: str, body: ChatRequest) -> StreamingResponse:
    username = await _user(request)
    root = session_dir(username, sid)
    prompt = (body.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="empty prompt")
    # 恢复标记写进 meta：第一轮回合不能用 -c（还没有会话文件）
    meta = read_meta(username, sid)
    resume = bool(body.resume and (meta.get("turn") or 0) > 0)
    meta["turn"] = int(meta.get("turn") or 0) + 1
    meta["updated_at"] = time.time()
    if not meta.get("title") or meta.get("title") == "新会话":
        meta["title"] = prompt.splitlines()[0][:60]
    _write_meta(username, sid, meta)

    return StreamingResponse(
        sse_turn(
            username, sid, prompt,
            anchor=(body.anchor or "").strip(),
            selection=(body.selection or "").strip()[:4000],
            save=body.save,
            autosave=body.autosave,
            resume=resume,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 关掉反代缓冲，否则流式会一批批地来
        },
    )


@router.post("/sessions/{sid}/materials")
async def upload_material(
    request: Request, sid: str, name: str = Query(default="")
) -> JSONResponse:
    """上传材料：服务端**当场解析成文本**，不落进 agent 够得到的地方。

    agent 不挂盘——它永远看不到这份文件，只能看到我们拼进 prompt 的文本。
    解析在工作线程里做（docx/pdf/pptx 是同步库），别卡住事件循环。
    """
    username = await _user(request)
    session_dir(username, sid)
    filename = _safe_name(name or "material.txt")
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    suffix = Path(filename).suffix.lower()
    with tempfile.TemporaryDirectory(prefix="voffice-ai-") as tmpdir:
        staged = Path(tmpdir) / filename
        staged.write_bytes(body)
        parsed = await asyncio.to_thread(extract_text, staged, max_chars=MATERIAL_MAX_CHARS)

    items = load_materials(username, sid)
    items = [i for i in items if i.get("name") != parsed["name"]] + [parsed]
    save_materials(username, sid, items)
    LOG.info(
        "ai: material parsed user=%s sid=%s name=%s bytes=%d chars=%d err=%s",
        username, sid, filename, len(body), parsed["chars"], parsed["parse_error"] or "-",
    )
    return JSONResponse({
        "name": parsed["name"],
        "size": parsed["bytes"],
        "chars": parsed["chars"],
        "truncated": parsed["truncated"],
        "parseError": parsed["parse_error"],
    })


@router.get("/sessions/{sid}/materials")
async def list_materials(request: Request, sid: str) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    items = load_materials(username, sid)
    return JSONResponse({
        "materials": [
            {
                "name": i.get("name"),
                "size": i.get("bytes"),
                "chars": i.get("chars"),
                "truncated": i.get("truncated"),
                "parseError": i.get("parse_error"),
            }
            for i in items
        ]
    })


@router.delete("/sessions/{sid}/materials/{name}")
async def delete_material(request: Request, sid: str, name: str) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    items = [i for i in load_materials(username, sid) if i.get("name") != name]
    save_materials(username, sid, items)
    return JSONResponse({"removed": name})


@router.get("/sessions/{sid}/state")
async def session_state(request: Request, sid: str) -> JSONResponse:
    """一个会话的全部可见状态：材料（已解析）、草稿、进行中的回合。

    产物不在这里——成稿直接写进用户「我的文档」，走文档存储那套接口读。
    """
    username = await _user(request)
    session_dir(username, sid)
    items = load_materials(username, sid)
    draft = load_draft(username, sid)
    return JSONResponse({
        "materials": [
            {
                "name": i.get("name"),
                "size": i.get("bytes"),
                "chars": i.get("chars"),
                "truncated": i.get("truncated"),
                "parseError": i.get("parse_error"),
            }
            for i in items
        ],
        "draft": public_draft(draft),
        "running": sid in _running,
    })
