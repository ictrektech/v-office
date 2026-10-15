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
import io
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

from safe_fs import discard_file, discard_tree

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from extract_text import extract_text
from docx_revise import apply_revisions as revise_docx
from docx_revise import apply_scoped_style

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
    # 技能目录是 md↔docx 转换的**唯一**依赖：没有它，编辑器永远打不开，
    # 而用户看到的只是一句「生成 docx 失败」。这里把它显式喊出来，
    # 省掉「翻代码才知道缺什么」那一轮。
    if not _looks_like_skills_dir(SKILLS_DIR):
        log.warning(
            "ai: no skills under %s — md/docx conversion will fail "
            "(set V_OFFICE_AI_SKILLS, or run build_image.sh to sync "
            "server/skills/, or keep the patent skill repo next to this one)",
            SKILLS_DIR,
        )


async def _user(request: Request) -> str:
    if _current_username is None:
        raise HTTPException(status_code=503, detail="ai module not initialised")
    return await _current_username(request)


# ── 配置 ───────────────────────────────────────────────────────────────────

AI_HOME = Path(os.environ.get("V_OFFICE_AI_HOME", "/data/.ai"))
PI_BIN = os.environ.get("V_OFFICE_AI_PI_BIN", "pi")


def _looks_like_skills_dir(path: Path | str) -> bool:
    """目录里是否真的躺着技能包——判据是子目录自带 SKILL.md。

    只判「目录存在」不够：镜像里 `server/skills/` 即使没同步进技能也仍是
    一个目录（只有 README.md），拿它当技能目录会让后面每个转换都静默失败。
    """
    path = Path(path)
    try:
        return any(
            (child / "SKILL.md").is_file()
            for child in path.iterdir()
            if child.is_dir()
        )
    except OSError:
        return False


def _resolve_skills_dir() -> Path:
    """技能目录在哪：显式环境变量 > 镜像内固定路径 > 仓库内/同级技能包。

    为什么要有这一串兜底：技能在镜像里固定放 `/opt/patent-skills`，而本地 dev
    是直接起 `server/main.py`，那个路径**不存在**——此时 md↔docx 转换一律返回
    None，前端只能看到「生成 docx 失败（技能脚本未就绪或超时）」，错误信息
    指向不了真正的原因（技能目录没挂上）。这里按顺序探测，任一个真的是技能包
    的目录都可用；一个都没有时仍返回镜像默认值，让启动日志把它原样暴露出来。
    """
    explicit = os.environ.get("V_OFFICE_AI_SKILLS", "").strip()
    if explicit:
        return Path(explicit)
    here = Path(__file__).resolve().parent
    for candidate in (
        Path("/opt/patent-skills"),  # 镜像内（server/Dockerfile COPY skills/）
        here / "skills",  # 仓库内同步副本（build_image.sh 会拷进来）
        # 同级技能仓库。两种常见摆放都要认：
        #   <repo>/server/../patent-disclosure-skill/skills   （仓库根旁）
        #   <repo>/server/../../patent-disclosure-skill/skills（工作区根旁，本机就是这种）
        here.parent / "patent-disclosure-skill" / "skills",
        here.parent.parent / "patent-disclosure-skill" / "skills",
    ):
        if _looks_like_skills_dir(candidate):
            return candidate
    return Path("/opt/patent-skills")


# 保持 str：这个值会直接进 /health 的 JSON（Path 不能 JSON 序列化），
# 也会进日志与 pi 的 `--skill` 参数。
SKILLS_DIR = str(_resolve_skills_dir())
DEFAULT_BASE_URL = os.environ.get("V_OFFICE_AI_BASE_URL", "https://ai.ictrek.com/v1")
# 读 pi 输出用的行缓冲上限（asyncio 默认 64KiB，长文必爆）
STDOUT_LIMIT_BYTES = int(os.environ.get("V_OFFICE_AI_STDOUT_LIMIT", 8 * 1024 * 1024))

GLOBAL_CONCURRENCY = max(1, int(os.environ.get("V_OFFICE_AI_CONCURRENCY", "3")))
QUEUE_WAIT_S = float(os.environ.get("V_OFFICE_AI_QUEUE_WAIT", "30"))
MAX_UPLOAD_BYTES = int(os.environ.get("V_OFFICE_AI_MAX_UPLOAD", str(50 * 1024 * 1024)))
# SSE 心跳间隔（秒）。**必须与前端看门狗成对改**：`hooks/use-ai-chat.ts` 的
# `STREAM_WATCHDOG_MS` 要留在它的 2~3 倍以上，否则心跳稍晚到就会被判成断线。
# 可调是为了本地验证心跳真的在发（调小到 3s，看流里有没有 type:"ping"）。
PING_INTERVAL_S = float(os.environ.get("V_OFFICE_AI_PING_INTERVAL", "15"))
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
- 交付物必须干净：正文整篇放进 `<final-doc>…</final-doc>`，**前后不要**写计划、理由、
  自评，也不要写「我先读一下技能」「Reason for each choice」这类过程说明——
  它们会被当成正文落进文档，变成开头的垃圾段落（实测发生过）。
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
        # 点目录跳过：会话 id 是十六进制，点开头的一定是内部目录（`safe_fs` 兜底
        # 挪出来的 `.trash/`、历史遗留的 `.conv-*`），列出来只会变成幽灵会话
        if child.is_dir() and not child.name.startswith("."):
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


# ── 模板：用户上传的成稿模板（结构蓝图，不是材料）────────────────────────────
#
# 和材料同款思路：服务端当场解析成文本，原文件不落进 agent 够得到的地方，agent
# 每轮只在 prompt 里收到一段「按这个结构成文」。区别在语义——材料是「写什么」，
# 模板是「按什么结构写」：公司交底书模板、四件套模板，传上来就照着出稿。

def _templates_dir(username: str) -> Path:
    d = AI_HOME / "templates" / username
    d.mkdir(parents=True, exist_ok=True)
    if os.geteuid() == 0:
        try:
            os.chmod(d, 0o700)
        except OSError:
            pass
    return d


def _template_path(username: str, sid: str) -> Path:
    return _templates_dir(username) / f"{_safe_sid(sid)}.json"


def load_template(username: str, sid: str) -> dict:
    try:
        data = json.loads(_template_path(username, sid).read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def save_template(username: str, sid: str, info: dict) -> None:
    path = _template_path(username, sid)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(info, ensure_ascii=False), encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    tmp.replace(path)


def public_template(info: dict) -> Optional[dict]:
    """模板的对外视图：全文不回给前端（可能很长），摘要就够画界面。"""
    if not info:
        return None
    return {
        "name": info.get("name"),
        "chars": info.get("chars") or 0,
        "truncated": bool(info.get("truncated")),
        "parse_error": info.get("parse_error"),
        "uploaded_at": info.get("uploaded_at"),
    }


def template_context(username: str, sid: str) -> str:
    """模板文本 → prompt 里的「成文结构」提示段。"""
    info = load_template(username, sid)
    text = (info.get("text") or "").strip()
    if not text:
        return ""
    return (
        f"# 成稿模板（用户上传：{info.get('name') or '模板'}）\n\n"
        "严格按下面这个模板的结构与栏目成文：栏目一个不缺、顺序一致、"
        "标题措辞沿用模板；模板里没有的内容不要自己加栏目。\n\n" + text
    )


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



# ── 契约标签剥离 ────────────────────────────────────────────────────────
# <final-doc>…</final-doc> / <patch …>…</patch> 是模型与我们之间的**协议标记**，
# 不是正文。前端展示层有 visibleText() 剥它，但落文这条链路（parse → apply →
# markdown_to_blocks）原来没有，导致标签被当正文写进草稿、粘进 Word
# （实测出现过 block[0] 末尾挂着 "<final-doc>"）。
# 这里做一份服务端等价实现，所有落文入口统一走它。

_TAG_RE = re.compile(r"</?(?:final-doc|patch|doc-style)(?:\s[^>]*)?>", re.IGNORECASE)
_PATCH_BLOCK_RE = re.compile(r"<patch\b[^>]*>[\s\S]*?</patch>", re.IGNORECASE)
# 自闭合的 <doc-style … />：整篇样式指令。它不产生正文，只改 docx 的字体/字号/行距
# （写进草稿的 styles，导出时传给 md_to_docx.py）。
_DOC_STYLE_RE = re.compile(r"<doc-style\b([^>]*)/?>", re.IGNORECASE)
# 属性名专用：ATTR_RE 的 `\w+` **匹配不了连字符**，`body-size="14"` 会被读成
# `size="14"`，白名单里对不上——整个指令静默失效（实测踩过）。现有 patch 的属性
# 名都是纯字母（anchor/op/heading），所以那边一直没暴露这个问题。
_DOC_STYLE_ATTR_RE = re.compile(r"([\w-]+)\s*=\s*\"([^\"]*)\"")
_FENCE_RE = re.compile(r"^\s*```[a-zA-Z0-9_-]*\s*$", re.MULTILINE)


def strip_contract_tags(text: str) -> str:
    """去掉协议标记与随之产生的裸代码围栏，返回干净的正文。"""
    if not text:
        return ""
    out = _PATCH_BLOCK_RE.sub("", text)
    out = _DOC_STYLE_RE.sub("", out)
    out = _TAG_RE.sub("", out)
    out = _FENCE_RE.sub("", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


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


def _strip_leading_duplicate_heading(text: str, heading: str) -> str:
    """抹掉块文本开头重复写了一遍的本块标题。

    AI 的 patch 常把整段 markdown**连标题一起**交回来（anchor 指向某块、text 以
    `## 该块标题` 开头），apply 之后块里就存着「标题 + 又一遍标题」，渲染时
    docx 和编辑器里都会把标题出两遍（实测过：一个标题出现三次）。渲染前抹掉，
    存的是什么不管——docx、编辑器 HTML、喂给模型的上下文全都因此干净。
    """
    if not heading:
        return text
    lines = text.lstrip().splitlines()
    if not lines:
        return text
    m = re.match(r"^#{1,6}\s+(.*)$", lines[0].strip())
    if m and m.group(1).strip() == heading.strip():
        return "\n".join(lines[1:]).lstrip()
    return text


def draft_to_markdown(draft: dict) -> str:
    """草稿 → Markdown，**只输出正文**，不含文档标题那一行。

    为什么标题不进正文（产品口径）：文档名只体现在「我的文档」的文件名和 Word
    标题栏里，正文从第一段实际内容开始。以前这里先写 `# {title}`，于是标题必然
    出现在正文里——用户明确要求这个标题名称「不许出现在正文」。

    空草稿返回空串，调用方据此判断「还没有内容」，不再造一份只有标题的文件。
    """
    blocks = draft.get("blocks") or []
    parts: list[str] = []
    for block in blocks:
        heading = (block.get("heading") or "").strip()
        if heading:
            parts.append(f"## {heading}")
        text = _strip_leading_duplicate_heading((block.get("text") or "").strip(), heading)
        if text:
            parts.append(text)
    return "\n\n".join(parts).strip()


def _drop_leading_title_lines(lines: list[str], title: str) -> list[str]:
    """剥掉开头连续的、与文档标题同名的标题行。

    一级标题（`# 标题`）是**文档标题本身**，产品口径上它不写进正文
    （draft_to_markdown 只输出 blocks）。但它仍会从别处溜进正文：从编辑器回读
    （docx_to_md → markdown_to_blocks）时首行标题会变成一个块，用户在编辑器里
    自己敲的同名大标题也一样。

    而且它会**累积**：回读一轮多存一个同名块，下一轮导出就多一行标题，再回读又多
    一个（实测：标题能堆成一串）。这里按「同名」剥，才能一次剥干净。

    为什么按「同名」而不是「一律剥掉」：文档标题只出现在最前面，且只有与
    draft.title 相同的那几行才是重复产物。title 未知（空）时一律保留，别把内容
    丢了；文档中间出现的同名标题是合法的段落标题，不动。
    """
    want = re.sub(r"\s+", "", title or "")
    if not want:
        return lines
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        m = re.match(r"^#{1,6}\s+(.*\S)\s*$", line)
        if m and re.sub(r"\s+", "", m.group(1)) == want:
            index += 1
            continue
        break
    return lines[index:]


def markdown_to_blocks(text: str, title: str = "") -> list[dict]:
    text = strip_contract_tags(text)
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

    for raw in _drop_leading_title_lines((text or "").splitlines(), title):
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


def _parse_doc_style(text: str) -> dict:
    """解析 <doc-style …/>：样式（字体 / 字号 / 行距）+ 可选的作用域。

    字段走白名单 + 范围校验：这些值会**直接写进 docx**，字号传成 0 或 9999，
    用户拿到的就是一份打不开或没法看的文档——宁可不认。

    `anchor="段落编号"` 表示**只改那一段**（用户在编辑器里选中了某处说「字体变大」）。
    没有 anchor 就是整篇统一——历史上只有整篇这一个口径，于是用户明明选中了
    一段，模型照样输出不带 anchor 的 <doc-style/>，全篇被一起放大。
    """
    style: dict = {}
    scope = ""
    for attrs in _DOC_STYLE_RE.findall(text or ""):
        meta = {
            k.lower().replace("_", "-"): v
            for k, v in _DOC_STYLE_ATTR_RE.findall(attrs or "")
        }
        scope = scope or (meta.get("anchor") or "").strip()
        for key, field in (
            ("body-font", "font"),
            ("body-size", "size_pt"),
            ("heading-font", "heading_font"),
            ("heading-size", "heading_size_pt"),
            ("line-spacing", "line_spacing"),
        ):
            raw = (meta.get(key) or "").strip()
            if not raw:
                continue
            if field in ("size_pt", "heading_size_pt", "line_spacing"):
                try:
                    value = float(raw)
                except ValueError:
                    continue
                if field == "line_spacing":
                    if not (0.8 <= value <= 4.0):
                        continue
                elif not (6.0 <= value <= 72.0):
                    continue
                style[field] = value
            else:
                style[field] = raw[:64]
    if scope:
        style["_anchor"] = scope
    return style


# <doc-style/> 落地后要跟用户说一句人话（前端 case "style" 直接 addNote 显示）。
# 字段顺序按「正文字体 → 正文字号 → 标题字体 → 标题字号 → 行距」排，与用户下指令
# 时的自然顺序一致，读起来才像在复述他刚做的事。
_STYLE_FIELDS: tuple[tuple[str, str, str], ...] = (
    ("font", "正文字体", ""),
    ("size_pt", "正文字号", " 磅"),
    ("heading_font", "标题字体", ""),
    ("heading_size_pt", "标题字号", " 磅"),
    ("line_spacing", "行距", " 倍"),
)


def _style_summary(doc_style: dict, *, whole: bool = True) -> str:
    """把 <doc-style/> 的落地结果说成一句人话。

    少了这句，用户只看到文档自己刷新了一下，不知道是 AI 改了样式，会当成
    「AI 说改好了却没生效」——这正是前端那条注释要防的事。

    `whole=False` 用于**按段生效**的样式：说成「正文字号 16 磅」而不是「整篇…」，
    否则用户会以为整篇都被放大了——他明明只选中了一段。

    `%g` 去掉浮点尾巴：14.0 说成「14 磅」而不是「14.0 磅」，1.15 保持原样。
    """
    items: list[str] = []
    for field, label, unit in _STYLE_FIELDS:
        if not (doc_style or {}).get(field):
            continue
        value = doc_style[field]
        shown = f"{value:g}" if isinstance(value, (int, float)) else str(value)
        items.append(f"{label} {shown}{unit}")
    if not items:
        return "样式已更新" if not whole else "整篇样式已更新"
    prefix = "整篇样式已更新：" if whole else ""
    return prefix + "、".join(items)


def parse_model_output(text: str) -> dict:
    """解析模型输出：patch 优先，整篇 <final-doc> 次之，都没有就是纯说明。"""
    patches: list[dict] = []
    for attrs, body in PATCH_RE.findall(text or ""):
        meta = dict(ATTR_RE.findall(attrs or ""))
        patches.append({
            "anchor": (meta.get("anchor") or meta.get("id") or "").strip(),
            "op": (meta.get("op") or "replace").strip(),
            "heading": (meta.get("heading") or "").strip(),
            "text": strip_contract_tags(body or ""),
        })
    final = FINAL_RE.search(text or "")
    prose = PATCH_RE.sub("", (text or ""))
    prose = FINAL_RE.sub("", prose)
    prose = _DOC_STYLE_RE.sub("", prose).strip()
    return {
        "patches": patches,
        "final_doc": strip_contract_tags(final.group(1)) if final else None,
        "prose": strip_contract_tags(prose),
        "doc_style": _parse_doc_style(text or ""),
    }


OUTPUT_CONTRACT = """# 改稿输出契约（严格遵守）
- 改现有段落：<patch anchor="段落编号">该段新文本</patch>，可一次给多个
- 新增段落：<patch anchor="段落编号" op="insert">新段落文本</patch>（插在该段之后；末尾用 anchor="end"）
- 删除段落：<patch anchor="段落编号" op="delete"></patch>
- 只有需要重写整篇时才用 <final-doc>…</final-doc> 包裹完整全文
- patch 之外可以写一两句说明你的改动理由；<patch> 里不要放代码块围栏

样式（字体 / 字号 / 行距）——**只在用户明确要求时写**：
- <doc-style body-font="宋体" body-size="14" line-spacing="1.5"/>
- 可用字段：body-font、body-size、heading-font、heading-size、line-spacing
- 字号写磅值：五号=10.5、小四=12、四号=14、小三=15、三号=16、小二=18、二号=22
- 行距写倍数：1.5 = 1.5 倍行距
- 「调大一档」这类相对说法，先按常见字号换算成磅值再写进去（如 10.5 → 14）
- **作用域**：用户选中了某段（本节给了「本次要改的位置」）时必须写 anchor，只改那一段：
  - <doc-style anchor="N" body-size="16"/> —— 只改第 N 段
  - 用户明确要「整篇/全文」变时才写 anchor="all"：<doc-style anchor="all" body-size="16"/>
  - 不确定用户要改哪段时，按他选中的范围写，**绝不**在选中场景下省略 anchor
- 要强调某几个字，用 Markdown 的 **粗体** 就够了
- 用户没提样式就**不要写**这个标签，也不要为了「看起来更整齐」自作主张改

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
        if anchor and selection:
            # 「只改这里」（用户在 Word 里选中了一处）：改动范围必须收窄到这一段。
            # 两条约束都是实测踩出来的：模型爱顺手改别的段（用户没要），也爱在
            # 这种场景下整篇重出（final-doc）——那等于把整篇都改了。
            # 选区常常只是半句话，而 patch 的落点是**整段**，所以要说清：
            # 重写整个第 N 段，没选中的部分保留并衔接好。
            locate.append(
                "\n【只改这一处】用户只选中了上面这段文字。请只输出**一条**针对编号 "
                f"{anchor} 的 patch：重写整个第 {anchor} 段（用户没选中的部分也要保留、"
                "衔接自然），不要输出其他段落的 patch，不要用 <final-doc> 整篇重写。"
            )
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

    template = template_context(username, sid)
    if template:
        parts.append(template)

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


def _style_args(draft: dict) -> list[str]:
    """把草稿里的 styles 翻成 md_to_docx.py 的命令行参数。

    没有样式（绝大多数稿子）就返回空表，转换命令与从前**逐字一致**——这个功能
    对既有链路因此是零影响的，真出问题也只会出在「用户明确改过样式」的稿子上。
    """
    styles = draft.get("styles") or {}
    args: list[str] = []
    for key, flag in (
        ("font", "--body-font"),
        ("size_pt", "--body-size"),
        ("heading_font", "--heading-font"),
        ("heading_size_pt", "--heading-size"),
        ("line_spacing", "--line-spacing"),
    ):
        value = styles.get(key)
        if value in (None, ""):
            continue
        args.extend([flag, str(value)])
    return args


def _draft_doc_name(title: str) -> str:
    """草稿对应的那份 docx 文件名（「我的文档」里的名字）。

    全流程只有这一处口径：出稿、保存、空稿判重都按它算。以前是每个调用点各自
    `_safe_name(f"{title}.docx")` 一遍，改一处漏一处就会出现「同一个草稿被当成
    两个不同文档」（判重说没有、保存说覆盖，症状自相矛盾）。
    """
    stem = (title or "").strip() or "未命名稿件"
    try:
        return _safe_name(f"{stem}.docx")
    except HTTPException:
        return "未命名稿件.docx"


def _doc_exists(username: str, name: str) -> bool:
    """「我的文档」里是否已经有这个名字的文档。"""
    if _read_document is None:
        return False
    try:
        _read_document(username, name)
        return True
    except Exception:  # noqa: BLE001 不存在 / 越权 / 存储不可用，一律按「没有」
        return False


def _guard_empty_overwrite(username: str, name: str, draft: dict) -> Optional[str]:
    """空草稿不许覆盖已有文档；被挡下时返回那份已有文档的名字，否则 None。

    为什么必须挡（实测丢稿）：文档名 = **会话标题**，而新建会话用的还是同一套
    标题（如「专利交底书 - 发明」）。于是新建一个空会话再打开撰写室，启动路径
    会把一份**只有标题**的 docx 按同一个名字写进「我的文档」，把用户写了半天的
    正文整份覆盖掉；空草稿紧接着还会触发编辑器注入（全选 + 粘贴只有标题的
    HTML），把编辑器里活着的内容也清掉。

    现场就是这条链：17:11 那份草稿有 5,875 字（完整的四件套），17:14 一个 0 字
    的新会话把同名文档覆盖成 10 个字符（只剩标题）。

    注意判据是「草稿没有 blocks」而不是「正文为空」：新建会话的草稿只带标题，
    而标题不进正文，`draft_to_markdown` 返回空串——没有任何实质内容。
    """
    if draft.get("blocks"):
        return None  # 有实质内容：正常覆盖（AI 重写整篇就是要覆盖）
    if not _doc_exists(username, name):
        return None  # 同名文档还不存在：这份空稿就是在建新文档，放行
    LOG.warning(
        "ai: blocked EMPTY draft from overwriting existing doc user=%s name=%s",
        username,
        name,
    )
    return name


async def _save_draft_docx(username: str, sid: str, draft: dict) -> Optional[str]:
    """成稿写进用户「我的文档」——**产出 Word**，Markdown 只留在会话目录当工作稿。

    交付物必须是 docx（用技能包里确定的 md_to_docx.py 转换，不经过模型）；转换
    失败时退回 md，宁可给个能用的文件也别静默丢稿。
    """
    if _save_document is None:
        return None
    markdown = draft_to_markdown(draft)
    if not markdown:
        return None
    title = (draft.get("title") or "未命名稿件").strip() or "未命名稿件"
    data: Optional[bytes] = None
    try:
        data = await _convert_docx(
            tool="md_to_docx.py", src=markdown.encode("utf-8"),
            src_suffix=".md", out_suffix=".docx", root=session_dir(username, sid),
            prefer=_session_skill(username, sid),
            extra_args=_style_args(draft),
        )
    except Exception as exc:  # noqa: BLE001 转换挂了不该吞掉这一轮结果
        LOG.warning("ai: docx convert crashed user=%s sid=%s: %s", username, sid, exc)
    if data:
        name = _draft_doc_name(title)
        kept = _guard_empty_overwrite(username, name, draft)
        if kept:
            return kept  # 空稿不覆盖：当作这一轮没产出新文档
        try:
            saved = _save_document(username, name, data)
            LOG.info("ai: saved docx to my-docs user=%s sid=%s name=%s bytes=%d",
                     username, sid, saved, len(data))
            return saved
        except Exception as exc:  # noqa: BLE001
            LOG.warning("ai: save docx failed user=%s sid=%s: %s", username, sid, exc)
    try:
        name = _safe_name(f"{title}.md")
    except HTTPException:
        name = "未命名稿件.md"
    try:
        saved = _save_document(username, name, markdown.encode("utf-8"))
        LOG.warning("ai: docx unavailable, saved md instead user=%s sid=%s name=%s",
                    username, sid, saved)
        return saved
    except Exception as exc:  # noqa: BLE001 落盘失败不该吞掉这一轮结果
        LOG.warning("ai: save to my-docs failed user=%s sid=%s: %s", username, sid, exc)
        return None


async def _apply_scoped_docx_style(
    username: str, sid: str, draft: dict, anchor: str, style: dict
) -> Optional[str]:
    """把**按段**的样式改动直接写进「我的文档」里那份 docx，返回文件名。

    走的是「读 base docx → 只改那一段的 run 格式 → 写回」这条路，与修订链路
    （`_save_draft_docx_revised`）共用同一个 base：用户选中的那段就活在编辑器
    开着的那份 docx 里，改它才对。base 不存在（还没导出过）或定位不到段落时
    返回 None——宁可不动，也不能把格式抹到错的段落上。
    """
    if _save_document is None or _read_document is None or not style:
        return None
    title = (draft.get("title") or "未命名稿件").strip() or "未命名稿件"
    try:
        base_name = _safe_name(f"{title}.docx")
    except HTTPException:
        base_name = "未命名稿件.docx"
    try:
        base = _read_document(username, base_name)
    except Exception:  # noqa: BLE001 还没导出过就当没有
        return None
    if not base:
        return None
    index = int(anchor) if str(anchor).isdigit() else 0
    blocks = draft.get("blocks") or []
    before = blocks[index - 1].get("text") or "" if 1 <= index <= len(blocks) else ""
    try:
        data, applied = apply_scoped_style(base, style, before=before, index=index)
    except Exception as exc:  # noqa: BLE001 格式改动失败不影响其余链路
        LOG.warning("ai: scoped style crashed user=%s sid=%s: %s", username, sid, exc)
        return None
    if applied <= 0:
        LOG.warning(
            "ai: scoped style missed user=%s sid=%s anchor=%s（base 里没找到该段）",
            username, sid, anchor,
        )
        return None
    try:
        saved = _save_document(username, base_name, data)
        LOG.info("ai: saved scoped style user=%s sid=%s name=%s anchor=%s style=%s",
                 username, sid, saved, anchor, style)
        return saved
    except Exception as exc:  # noqa: BLE001
        LOG.warning("ai: save scoped style failed user=%s sid=%s: %s", username, sid, exc)
        return None


async def _save_draft_docx_revised(
    username: str, sid: str, old_draft: dict, new_draft: dict, resolved: list[dict]
) -> Optional[str]:
    """把 AI 的改动以 **Word 修订（track changes）** 打进「我的文档」里那份 docx。

    base 就是当前交付物（标题.docx）：在它上面打 w:ins/w:del，Collabora 重载后
    用户用 Word 原生审阅接受/拒绝——不再需要「点接受 → 重写文件 → 刷新编辑器」。
    base 不存在或一条修订都没打上时，退回整篇重出（无修订标记）。
    """
    if _save_document is None:
        return None
    title = (new_draft.get("title") or old_draft.get("title") or "未命名稿件").strip() or "未命名稿件"
    try:
        base_name = _safe_name(f"{title}.docx")
    except HTTPException:
        base_name = "未命名稿件.docx"
    base: Optional[bytes] = None
    if _read_document is not None:
        try:
            base = _read_document(username, base_name)
        except Exception:  # noqa: BLE001 还没导出过就当没有
            base = None
    if base:
        try:
            data, applied = revise_docx(base, resolved)
        except Exception as exc:  # noqa: BLE001 修订失败不影响出稿
            LOG.warning("ai: revise docx crashed user=%s sid=%s: %s", username, sid, exc)
            data, applied = None, 0
        if data and applied > 0:
            try:
                saved = _save_document(username, base_name, data)
                LOG.info("ai: saved tracked docx user=%s sid=%s name=%s revisions=%d",
                         username, sid, saved, applied)
                return saved
            except Exception as exc:  # noqa: BLE001
                LOG.warning("ai: save tracked docx failed user=%s sid=%s: %s", username, sid, exc)
    return await _save_draft_docx(username, sid, new_draft)


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

    为什么要显式声明 `reasoning` 与 `thinkingFormat`（不是可选装饰）：
      pi 只有在 `model.reasoning === true` 时才会去处理思考档位，否则一个
      思考参数都不发 —— 于是「设置里选 off」形同虚设，网关按自己的默认档
      （DeepSeek-V4.1-Flash 默认 effort=high）一路深度思考：实测同一道题
      400 个输出 token **全部**是推理、正文一个字没出，首字要等三十多秒。
      声明 `reasoning: true` 且 `thinkingFormat: "deepseek"` 后，选 off 会发出
      `thinking: {"type": "disabled"}`，同一道题 1.2s 出正文（3.0s → 1.2s），
      这才是「不思考」该有的速度。
    """
    model = settings.get("model") or ""
    provider = {
        "baseUrl": settings.get("base_url") or DEFAULT_BASE_URL,
        "api": "openai-completions",
        "apiKey": "$VOFFICE_AI_KEY",
        "models": [{"id": model, "reasoning": True, "compat": {"thinkingFormat": "deepseek"}}]
        if model
        else [],
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


def _assistant_thinking(message: dict) -> str:
    """取模型这一轮的思考过程（content 里 type=="thinking" 的块）。

    与正文（`_assistant_text`）**分开走**：思考只给用户看，绝不进草稿，
    也不进 text_parts —— 否则模型的内心戏会被当成专利正文落盘。
    """
    content = message.get("content")
    if not isinstance(content, list):
        return ""
    parts = []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "thinking":
            parts.append(str(block.get("thinking") or ""))
    return "".join(parts)


def _tool_target(args: dict) -> str:
    """从工具入参里挑一个「人看得懂的对象」：文件路径 / 命令 / 检索词。

    只报工具名（read）对用户毫无意义——一屏二十条「调用工具：read」就是这么来的。
    """
    for key in ("path", "file", "file_path", "command", "query", "pattern", "url"):
        value = args.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
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
        # 思考块也逐字转发：深度思考能持续几十秒，期间把推理过程实时显示出来，
        # 用户就不用对着一个转圈干等（这次「连接中断」的根因正是这段长时间的
        # 静默）。注意它和 delta 是**两种事件**：thinking 只上屏、不落稿。
        if inner.get("type") == "thinking_delta" and inner.get("delta"):
            return [{"type": "thinking", "text": inner["delta"]}]
        # 每次工具调用**单独**发一条（带看得懂的对象）：前端因此能显示成
        # 一行「正在读取 xxx（第 5 步）」并就地更新，而不是把每轮的
        # 「调用工具：read、read」堆成一面墙。
        if inner.get("type") == "toolcall_end":
            call = inner.get("toolCall") or {}
            name = str(call.get("name") or "")
            args = call.get("arguments")
            if name:
                return [
                    {
                        "type": "tool",
                        "name": name,
                        "target": _tool_target(args if isinstance(args, dict) else {}),
                    }
                ]
            return []
        return []
    if kind == "message_end":
        message = event.get("message") or {}
        if message.get("role") != "assistant":
            return []
        out = [{"type": "message_end", "text": _assistant_text(message), "usage": message.get("usage")}]
        # 与正文同口径：delta 可能缺尾巴，以完整消息里的思考块做权威校正
        # （final=true 让前端用这整段替换它自己拼的）。
        think = _assistant_thinking(message)
        if think:
            out.append({"type": "thinking", "text": think, "final": True})
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
            # pi 是 --mode json：一整轮输出可能是一行巨大的 JSON（交底书这类长文
            # 单行能到几百 KB～几 MB）。asyncio 默认行缓冲只有 64KiB，一超就抛
            # LimitOverrunError: "Separator is not found"，整轮 500 —— 给足缓冲。
            limit=STDOUT_LIMIT_BYTES,
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
    # 「上一次真的发东西给客户端」的时刻。必须与 last_activity 分开：
    # last_activity 是「pi 打印了一行」（含被 _translate 丢掉的噪音），
    # last_emit 才是「客户端看到了一个事件」——心跳要按后者算。
    last_emit = time.monotonic()
    try:
        assert proc.stdout is not None
        while True:
            # 心跳在**循环顶部**按时间判定，而不是只在"读超时"里发：
            # pi 调工具/思考时会持续吐事件，但那些事件被 _translate 丢成 0 条，
            # 客户端一个字节都收不到。只在读超时里发 ping，遇到"噪音行比切片下限
            # 还密"的时候（实测首轮读技能那段连吐 35s）永远轮不到心跳，前端看门狗
            # 就把一轮完全正常的回合掐成「连接中断」。
            # 放这里 = 每读到一行、每次切片超时都重新判一次，噪音再密也拦不住心跳。
            now = time.monotonic()
            if now - last_emit >= PING_INTERVAL_S:
                yield {
                    "type": "ping",
                    "elapsed_s": int(now - started),
                    "idle_s": int(now - last_activity),
                }
                last_emit = time.monotonic()

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
                # 等待切片受三件事约束：整轮剩余、空闲上限、距该发心跳还差多久。
                # 第三条只负责把「完全没有输出」的静默期也切成能发心跳的片。
                slice_timeout = max(
                    0.5,
                    min(
                        remaining,
                        idle_timeout,
                        max(0.5, PING_INTERVAL_S - (time.monotonic() - last_emit)),
                    ),
                )
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
                continue
            except (asyncio.LimitOverrunError, ValueError):
                # 行缓冲仍不够（异常内容单行超过 limit）：中止并说人话，
                # 别把 python 的 LimitOverrunError 原文糊到界面上
                killed = True
                stop_kind = "error"
                stop_message = (
                    f"模型单行输出超过 {STDOUT_LIMIT_BYTES // 1024 // 1024}MB 上限，已中止。"
                    "可把材料拆小后重试，或换上下文更短的模型。"
                )
                break
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
                # 只有真的往客户端发了东西才算「发过事件」——ping 的判据就是它
                last_emit = time.monotonic()
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


async def _land_turn(
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

    # 整篇样式指令（<doc-style/>）：并进草稿的 styles，导出 docx 时生效。
    # 它和文字改动是**两条独立的线**——用户只是想「换个字号」时，不该被迫接受
    # 一堆文字变更，所以在这里单独落地，不参与下面的「待确认变更」流程。
    style_changed = False
    doc_style = parsed.get("doc_style") or {}
    # 作用域样式（<doc-style anchor="N"/>）：只改那一段，**不进 styles**。
    # styles 是整篇口径（md→docx 时统一套用），用户选了一段说「字体变大」却
    # 全篇被放大，根因就是模型输出了不带 anchor 的整篇指令。
    #
    # 作用域判定（按优先级）：
    # - 模型明确写了 anchor="all" → 整篇（用户确实要全文统一，尊重它）；
    # - 其余情况一律以**用户的选区段落**为准：模型写了 N 或漏写了 anchor，
    #   都收敛到用户选中处——落点按用户的意图纠偏，与下面的 patch 校正同理。
    style_scope = str(doc_style.pop("_anchor", "") or "").strip()
    if style_scope.lower() in ("all", "doc", "whole", "document"):
        style_scope = ""
    elif anchor and anchor.isdigit():
        style_scope = anchor
    if style_scope:
        saved_name = (
            await _apply_scoped_docx_style(username, sid, draft, style_scope, doc_style)
            if autosave
            else None
        )
        events.append({
            "type": "style",
            "scope": "selection",
            "anchor": style_scope,
            "styles": doc_style,
            "message": f"第 {style_scope} 段：{_style_summary(doc_style, whole=False)}",
            "draft": public_draft(draft),
        })
        if saved_name:
            events.append({"type": "saved", "name": saved_name})
        LOG.info(
            "ai: scoped doc style sid=%s anchor=%s style=%s saved=%s",
            sid, style_scope, doc_style, bool(saved_name),
        )
        doc_style = {}  # 已经按段落地，不再当整篇指令处理
    if doc_style:
        merged_style = {**(draft.get("styles") or {}), **doc_style}
        if merged_style != (draft.get("styles") or {}):
            draft = {**draft, "styles": merged_style}
            save_draft(username, sid, draft)
            style_changed = True
            LOG.info("ai: doc style applied sid=%s style=%s", sid, merged_style)
            events.append({
                "type": "style",
                "styles": merged_style,
                "message": _style_summary(doc_style),
                "draft": public_draft(draft),
            })

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
                saved = await _save_draft_docx(username, sid, draft)
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
        # 只有样式变更：必须**整篇重新导出**。修订链路是在原 docx 上打 Word 修订、
        # 不会重排样式，用它的话用户会看到「AI 说改好了，字号却没变」——这正是
        # 这类功能最容易翻车的地方。
        if style_changed and autosave:
            saved = await _save_draft_docx(username, sid, draft)
            if saved:
                events.append({"type": "saved", "name": saved})
        return events

    if is_first:
        new_draft, applied, skipped = apply_patches(draft, patches)
        if applied:
            save_draft(username, sid, new_draft)
            events.append({"type": "draft", "draft": public_draft(new_draft)})
            if autosave:
                saved = await _save_draft_docx(username, sid, new_draft)
                if saved:
                    events.append({"type": "saved", "name": saved})
        if skipped:
            events.append({
                "type": "warn",
                "message": "；".join(f"第 {s.get('anchor')} 段未改：{s.get('reason')}" for s in skipped),
            })
        return events

    blocks = draft.get("blocks") or []
    # 给前端看的变更摘要（旧值供展示/定位）；改动**立即生效**到草稿——
    # 审阅发生在编辑器的 Word 修订里，不再需要「点接受」这一步。
    resolved: list[dict] = []
    for patch in patches:
        anchor = str(patch.get("anchor") or "")
        before = ""
        if anchor.isdigit() and 1 <= int(anchor) <= len(blocks):
            before = blocks[int(anchor) - 1].get("text") or ""
        events.append({
            "type": "patch",
            "patch": {**patch, "before": before, "status": "applied"},
        })
        resolved.append({
            "op": (patch.get("op") or "replace").lower(),
            "before": before,
            "after": before,
            "text": str(patch.get("text") or ""),
        })

    new_draft, applied, skipped = apply_patches(draft, patches)
    if applied:
        save_draft(username, sid, new_draft)
        events.append({"type": "draft", "draft": public_draft(new_draft)})
        if autosave:
            saved = await _save_draft_docx_revised(username, sid, draft, new_draft, resolved)
            if saved:
                events.append({"type": "saved", "name": saved})
    if skipped:
        events.append({
            "type": "warn",
            "message": "；".join(f"第 {s.get('anchor')} 段未改：{s.get('reason')}" for s in skipped),
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
                #
                # 材料**每轮都要带**：材料经常是会话进行到一半才上传的，
                # pi 的会话记忆里根本没有它。早先只在首轮/重试带（靠记忆兜底），
                # 结果「我上传了外部文件，你看看」这类追问里 agent 一份材料也看不到，
                # 会理直气壮地回「没有收到材料」。
                prompt = _build_turn_prompt(
                    username, sid, instruction,
                    anchor=anchor, selection=selection,
                    include_materials=True,
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
                        for event in await _land_turn(
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
    """删掉一条会话线（会话目录 + 它的 meta / 材料 / 草稿）。

    删除全部走 `safe_fs` 的兜底：宿主环境的删除护栏会 `raise SystemExit`，用
    `shutil.rmtree(..., ignore_errors=True)` 拦不住它，结果是「删除会话」500、
    会话还在——用户点几次都是 500，比删不掉更糟。
    """
    username = await _user(request)
    root = session_dir(username, sid)
    _kill_tree(_running.pop(sid, None))
    discard_tree(root)
    discard_file(_meta_path(username, sid))
    discard_file(_materials_path(username, sid))
    discard_file(_draft_path(username, sid))
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
        draft = {**draft, "blocks": markdown_to_blocks(
            body.patches[0].get("text") or "", draft.get("title") or "",
        )}
        applied, skipped = [{"anchor": "all", "op": "replace"}], []
    else:
        draft, applied, skipped = apply_patches(draft, body.patches)
    save_draft(username, sid, draft)
    saved = await _save_draft_docx(username, sid, draft) if body.save else None
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
    """「保存到我的文档」：把草稿出成 docx 写进「我的文档」。

    最容易把人绕晕的是空草稿：文档名 = 会话标题，而**换会话 / 重开页面**都会新起
    一个空草稿的会话，标题却一模一样。此时编辑器里开着的那份文档（内容都在）和
    服务端的空草稿是同一个名字——早先这里直接报「草稿还是空的」，用户看到的却是
    眼前一篇完整的稿子，只能理解成「保存坏了」。

    正确做法：空草稿 + 盘上已有同名文档 = 用户手里这本就是那份文档，**如实回「已经
    在「我的文档」里」**；真的什么都没有（既没草稿也没文档）才报错。
    """
    username = await _user(request)
    session_dir(username, sid)
    draft = load_draft(username, sid)
    if not draft.get("blocks"):
        name = _draft_doc_name(draft.get("title") or "")
        if _doc_exists(username, name):
            # 刻意什么都不做：不读回草稿、更不重写文件。
            #  - 读回草稿要动 updated_at，而前端**就是**按 updated_at 决定是否
            #    「全选 + 粘贴整篇」注入编辑器的（ai-studio 的注入 effect）——
            #    借一次保存把用户在 Word 里排好的版式重排一遍，说不通；
            #  - 重写文件更糟：md→docx 一圈回来，用户的版式/表格就没了。
            # 文档本来就好好地在「我的文档」里，这就是「已保存」。
            LOG.info(
                "ai: save ok (nothing to write) user=%s sid=%s name=%s",
                username, sid, name,
            )
            return JSONResponse({
                "saved": name,
                "draft": public_draft(draft),
                "already": True,
            })
        raise HTTPException(
            status_code=409,
            detail="这份稿子还没有内容：先在对话里让 AI 生成，或直接在编辑器里写",
        )
    saved = await _save_draft_docx(username, sid, draft)
    if not saved:
        raise HTTPException(status_code=502, detail="保存到「我的文档」失败")
    return JSONResponse({"saved": saved, "draft": public_draft(draft)})


# ── 对话记录（模型的思考过程 + 输出）────────────────────────────────────────
#
# 为什么单独存一份：面板里的对话以前只活在浏览器内存里，刷新一下整段没了；而 pi
# 自己的 `.pi-sessions/*.jsonl` 是它的私有格式，前端不该去解析它。这里由服务端
# 按会话存一份干净的对话记录，下次进同一条会话线时原样恢复。
#
# 只存白名单字段（role / text / thinking / at / anchor）：`streaming`、
# `activity` 这类转瞬即逝的 UI 状态存下来，恢复出来的界面会怪怪的。


def _transcript_path(username: str, sid: str) -> Path:
    return session_dir(username, sid) / "transcript.json"


TRANSCRIPT_MAX_BYTES = 2 * 1024 * 1024
TRANSCRIPT_MAX_ITEMS = 300


class TranscriptBody(BaseModel):
    messages: list[dict] = []


@router.get("/sessions/{sid}/doc-chars")
async def doc_chars(request: Request, sid: str, name: str = "") -> JSONResponse:
    """量一下「我的文档」里那份 docx 的正文长度。**只读，绝不碰草稿。**

    用途只有一个：AI 的稿子贴进编辑器之后，核对落盘的是不是完整那一版。
    粘贴是异步的（见 ai-studio 的注入注释），保存抢跑就会存进半篇；这个数字
    就是那条断言——短于草稿就重贴，再短就让编辑器从服务端那份完整 docx 重读。

    读不到 / 转不动一律回 0：调用方把 0 当「这次没量上」，不当成失败（否则一次
    存储抖动就会引发无谓的重贴）。
    """
    username = await _user(request)
    root = session_dir(username, sid)
    name = (name or "").strip()
    if not name or _read_document is None:
        return JSONResponse({"chars": 0})
    try:
        src = _read_document(username, name)
    except Exception:  # noqa: BLE001 不存在 / 越权 / 存储不可用
        return JSONResponse({"chars": 0})
    markdown = await _convert_docx(
        tool="docx_to_md.py", src=src,
        src_suffix=".docx", out_suffix=".md", root=root,
        prefer=_session_skill(username, sid),
    )
    if markdown is None:
        return JSONResponse({"chars": 0})
    text = _clean_converted_markdown(markdown.decode("utf-8", "replace"))
    return JSONResponse({"chars": len(text)})


@router.get("/sessions/{sid}/transcript")
async def get_transcript(request: Request, sid: str) -> JSONResponse:
    """取这条会话的对话记录；没有就返回空列表（不是错误）。"""
    username = await _user(request)
    path = _transcript_path(username, sid)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return JSONResponse({"messages": []})
    msgs = data.get("messages") if isinstance(data, dict) else None
    return JSONResponse({"messages": msgs if isinstance(msgs, list) else []})


@router.put("/sessions/{sid}/transcript")
async def put_transcript(request: Request, sid: str, body: TranscriptBody) -> JSONResponse:
    """存下这条会话的对话记录（前端在对话停下来后落库）。"""
    username = await _user(request)
    clean: list[dict] = []
    for raw in body.messages[-TRANSCRIPT_MAX_ITEMS:]:
        if not isinstance(raw, dict):
            continue
        item = {
            "role": "user" if raw.get("role") == "user" else "agent",
            "text": str(raw.get("text") or "")[:20000],
            "at": str(raw.get("at") or ""),
        }
        thinking = str(raw.get("thinking") or "")
        if thinking:
            item["thinking"] = thinking[:20000]
        anchor = str(raw.get("anchor") or "")
        if anchor:
            item["anchor"] = anchor[:20]
        clean.append(item)
    path = _transcript_path(username, sid)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_name(path.name + ".tmp")
        tmp.write_bytes(json.dumps({"messages": clean}, ensure_ascii=False).encode("utf-8"))
        os.replace(tmp, path)
    except OSError as exc:
        # 记录存不上不该影响用户：对话照常能用，只是这次刷新后恢复不了
        LOG.warning("ai: transcript save failed user=%s sid=%s: %s", username, sid, exc)
        return JSONResponse({"saved": False})
    return JSONResponse({"saved": True})


# ── 与编辑器内核（Collabora）互通：docx 出稿 / docx 回读 ────────────────────
#
# 草稿是服务端的真值（Markdown），编辑器只认 docx/odt，两边必须能来回：
#   出稿：草稿 → md → md_to_docx.py → 「我的文档」里的 .docx → Collabora 打开
#   回读：用户在编辑器里改完 → docx_to_md.py → 草稿（agent 才知道用户改了什么）
#
# 两个脚本都是技能包里现成的确定性工具（不经过模型），所以走「起子进程」而不是
# 让 agent 自己动手：转换必须有确定结果，不能看模型心情。


def _skill_tool(filename: str, prefer: str = "") -> Optional[Path]:
    """在技能目录里定位一个确定性脚本（技能包升级换目录也不写死路径）。

    `prefer` 是**本次会话用的技能包名**（如 patent-disclosure）。必须优先它：
    `md_to_docx.py` 这类工具在多个技能包里各有一份同名实现（专利交底 / 申请
    文件 / 审查意见的排版口径并不相同），只按目录名排序取第一个，等于让
    「审查意见」的稿子用「申请文件」的转换器——脚本各自能跑通，排版/结构却
    悄悄按错的那套走。找不到该技能包自己的那份时再退回全局第一个。
    """
    base = Path(SKILLS_DIR)
    if not base.is_dir():
        return None
    if prefer:
        own = base / prefer / "tools" / filename
        if own.is_file():
            return own
    for path in sorted(base.glob(f"*/tools/{filename}")):
        if path.is_file():
            return path
    return None


def _session_skill(username: str, sid: str) -> str:
    """本会话点名用的技能包名（读不到就当没点名，退回全局兜底）。"""
    skill = read_meta(username, sid).get("skill")
    return skill.strip() if isinstance(skill, str) else ""


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
    *,
    tool: str,
    src: bytes,
    src_suffix: str,
    out_suffix: str,
    root: Path,
    prefer: str = "",
    extra_args: Optional[list[str]] = None,
) -> Optional[bytes]:
    """把字节在 md / docx 之间转一次。转换失败返回 None（调用方决定怎么报错）。

    `prefer`：优先用哪个技能包里的同名脚本（见 `_skill_tool`）。
    `extra_args`：追加给脚本的命令行参数（如 md_to_docx.py 的 `--body-size`）。
    """
    script = _skill_tool(tool, prefer)
    if script is None:
        LOG.warning(
            "ai: skill tool missing name=%s prefer=%s skills=%s", tool, prefer or "-", SKILLS_DIR
        )
        return None
    # 工作目录放在会话目录下（每用户可见、也方便排查）。刻意不用
    # TemporaryDirectory：它的清理是整棵树 rmtree，会撞上宿主环境的删除护栏；
    # 这里只删单个文件 + 移除空目录，稳。
    tmp = root / f".conv-{uuid.uuid4().hex}"
    tmp.mkdir(parents=True, exist_ok=True)
    src_path = tmp / f"in{src_suffix}"
    out_path = tmp / f"out{out_suffix}"
    try:
        src_path.write_bytes(src)
        argv = [sys.executable, str(script), "-i", str(src_path), "-o", str(out_path)]
        if extra_args:
            argv.extend(str(a) for a in extra_args)
        code, tail = await _run_tool(argv, DOCX_TOOL_TIMEOUT_S)
        if code != 0 or not out_path.is_file():
            LOG.warning("ai: %s failed code=%s tail=%s", tool, code, tail)
            return None
        return out_path.read_bytes()
    finally:
        # 收尾**只能尽力而为**，而且必须连 BaseException 一起吞。
        #
        # 踩过的坑：某些宿主环境（沙箱/IDE 的 safe-delete shim）会接管
        # os.rmdir，把它当「删除目录」交给自己的批量删除护栏，护栏一不高兴就
        # 直接 `raise SystemExit(1)`——转换早就成功了、字节也读出来了，却因为
        # 删一个空目录把整个请求打成 500（前端只看到「编辑器内核打不开」）。
        # 残留的 .conv-* 目录无害（下次同名目录照样复用），绝不能让它掀翻请求。
        for f in (src_path, out_path):
            try:
                f.unlink()
            except BaseException:  # noqa: BLE001
                pass
        try:
            tmp.rmdir()
        except BaseException:  # noqa: BLE001  # 见上：删除护栏可能抛 SystemExit
            pass


@router.post("/sessions/{sid}/docx")
async def export_docx(request: Request, sid: str, blank: int = 0) -> JSONResponse:
    """草稿 → .docx 写进「我的文档」，返回文件名（前端据此用 Collabora 打开）。

    刻意不做在每轮保存里：转换要起 Python 子进程，塞进每轮对话会拖慢出字；
    这里按需触发，只在用户真的要打开编辑器时转一次。

    `blank=1` 是**撰写室打开编辑器的载体请求**，与「出稿」分开：

    - 默认（用户主动出稿/保存）：空稿回 400「还没有内容」。正文里没有内容时
      产出一份 docx 没有意义，历史上正是「空稿兜底造标题」把同名文档写成了
      10 个字符，把用户写了半天的正文整份覆盖掉。
    - `blank=1`（撰写室一进来就是 Collabora，用户得先有个文档才能写）：空稿给
      一份**完全空白**的 docx 作载体。Collabora 只认 docx，没文件就没法起内核，
      这里没有选择；但它**不含任何标题**——标题不进正文是硬口径，载体也不能破。
    """
    username = await _user(request)
    root = session_dir(username, sid)
    if _save_document is None:
        raise HTTPException(status_code=503, detail="存储服务不可用")
    draft = load_draft(username, sid)
    markdown = draft_to_markdown(draft)
    empty = not markdown.strip()
    if empty and not blank:
        raise HTTPException(status_code=400, detail="还没有内容")
    # 空稿载体：空文档转换需要一个非空的字节流，用一个空段落喂转换器，产出的是
    # 真正的空白 docx（正文里没有任何一个字）
    src = (markdown if not empty else "\n").encode("utf-8")

    data = await _convert_docx(
        tool="md_to_docx.py", src=src,
        src_suffix=".md", out_suffix=".docx", root=root,
        prefer=_session_skill(username, sid),
    )
    if not data:
        raise HTTPException(status_code=502, detail="生成 docx 失败（技能脚本未就绪或超时）")

    name = _draft_doc_name(draft.get("title") or "")
    # 空稿不覆盖已有文档：直接把已有那份的名字回给前端（编辑器据此打开它）
    kept = _guard_empty_overwrite(username, name, draft)
    if kept:
        return JSONResponse({"saved": kept, "draft": public_draft(draft)})
    saved = _save_document(username, name, data)
    LOG.info("ai: exported docx user=%s sid=%s name=%s blank=%s bytes=%d",
             username, sid, saved, bool(empty), len(data))
    return JSONResponse({"saved": saved, "draft": public_draft(draft)})


@router.get("/sessions/{sid}/draft-html")
async def draft_html(request: Request, sid: str) -> JSONResponse:
    """草稿 → HTML，供编辑器内嵌注入用（前端只粘贴，不自己渲染 Markdown）。

    为什么绕「md→docx→mammoth」这一圈：md→docx 由技能脚本做，而它就是用户
    最终拿到的那份 docx 的渲染器；mammoth 再把这份 docx 转成 HTML。前端早先
    自己写过一个 markdown→HTML，结果两套渲染器各画各的——`**加粗**` 原样粘进
    了文档、标题还重复。长相只以 docx 为准：这里给的就是「那份 docx 的 HTML 版」，
    粘进编辑器后与 apply 写盘的内容完全一致。
    """
    username = await _user(request)
    root = session_dir(username, sid)
    draft = load_draft(username, sid)
    markdown = draft_to_markdown(draft)
    if not markdown.strip():
        # 与 /docx 同口径：空稿没有正文，不注入任何内容（更不能注入一个标题）
        return JSONResponse({"html": "", "draft": public_draft(draft)})

    data = await _convert_docx(
        tool="md_to_docx.py", src=markdown.encode("utf-8"),
        src_suffix=".md", out_suffix=".docx", root=root,
        prefer=_session_skill(username, sid),
    )
    if not data:
        raise HTTPException(status_code=502, detail="生成 docx 失败（技能脚本未就绪或超时）")

    # mammoth 是同步 CPU 活（专利稿毫秒级），扔线程里别堵事件循环
    try:
        import mammoth

        html = await asyncio.to_thread(
            lambda: mammoth.convert_to_html(io.BytesIO(data)).value
        )
    except Exception as exc:  # noqa: BLE001 缺库/坏档都按「渲染不可用」报
        LOG.warning("ai: mammoth failed user=%s sid=%s err=%s", username, sid, exc)
        raise HTTPException(status_code=502, detail="docx 转 HTML 失败") from exc

    return JSONResponse({"html": html, "draft": public_draft(draft)})


def _clean_converted_markdown(text: str) -> str:
    """收拾技能脚本转出来的 Markdown，再进草稿。

    转换器会在开头写一行 HTML 注释式的元信息，直接进草稿会变成一个莫名其妙的
    段落（还会被下一轮当成正文喂给模型）；标题里的点号也会被转义成 `2\\.1`，
    不撤销的话每来回一次就多一层反斜杠，最后标题都对不上。
    """
    text = re.sub(r"^\s*<!--.*?-->\s*", "", text, count=1, flags=re.S)
    return re.sub(r"\\([\\`*_{}\[\]()#+\-.!~>|])", r"\1", text)


async def _read_docx_into_draft(
    username: str, sid: str, name: str, draft: dict
) -> Optional[dict]:
    """把「我的文档」里那份 docx 读回草稿（回读）。读不到 / 转不了返回 None。

    这是「草稿与文档恢复一致」的唯一手段：编辑器（Collabora）改的就是文档本身，
    草稿只是它的镜像。换会话、重开页面之后草稿是空的，而文档里内容还在——此时
    只有把文档读回来，两边才重新对上；否则用户看到的是**编辑器里满满的正文**，
    而服务端张口就是「草稿是空的」。

    这是确定性转换（技能脚本），不经过模型。
    """
    if _read_document is None:
        return None
    try:
        src = _read_document(username, name)
    except Exception:  # noqa: BLE001 不存在 / 越权 / 存储不可用，一律当读不到
        return None
    markdown = await _convert_docx(
        tool="docx_to_md.py", src=src,
        src_suffix=".docx", out_suffix=".md", root=session_dir(username, sid),
        prefer=_session_skill(username, sid),
    )
    if markdown is None:
        return None
    text = _clean_converted_markdown(markdown.decode("utf-8", "replace"))
    blocks = markdown_to_blocks(text, draft.get("title") or "")
    if not blocks:
        return None  # 文档是空的（比如只有标题）：认回来没意义，交给调用方按空稿处理
    updated = {**draft, "blocks": blocks}
    save_draft(username, sid, updated)
    LOG.info(
        "ai: read docx back into draft user=%s sid=%s name=%s blocks=%d",
        username, sid, name, len(blocks),
    )
    return updated


class DocxImport(BaseModel):
    """要回读的文件名（「我的文档」里的那份 docx）。"""

    name: str


@router.post("/sessions/{sid}/import-docx")
async def import_docx(request: Request, sid: str, body: DocxImport) -> JSONResponse:
    """把「我的文档」里的 docx 回读成草稿：用户在编辑器里手改过，agent 是不知道的。"""
    username = await _user(request)
    session_dir(username, sid)
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="missing name")
    if _read_document is None:
        raise HTTPException(status_code=503, detail="存储服务不可用")
    draft = load_draft(username, sid)
    updated = await _read_docx_into_draft(username, sid, name, draft)
    if updated is None:
        # 与 /save 的空稿分支同一套判据：能读到的文档一定是「有内容」的，
        # 读不回来只可能是读不到文件或转换失败，两者对用户是两件事。
        if not _doc_exists(username, name):
            raise HTTPException(status_code=404, detail=f"读不到文件：{name}")
        raise HTTPException(status_code=502, detail="读取 docx 失败（技能脚本未就绪或超时）")
    return JSONResponse({"draft": public_draft(updated), "source": name})


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


@router.post("/sessions/{sid}/template")
async def upload_template(
    request: Request, sid: str, name: str = Query(default=""),
) -> JSONResponse:
    """上传成稿模板（docx/md/txt 均可）：服务端当场解析成文本，按会话保存。

    与材料的区别：材料是「写什么」，模板是「按什么结构写」——每轮 prompt 都会
    带上「严格按这个模板的栏目成文」。原文件同样不落进 agent 够得到的地方。
    """
    username = await _user(request)
    session_dir(username, sid)
    filename = _safe_name(name or "template.docx")
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    with tempfile.TemporaryDirectory(prefix="voffice-ai-") as tmpdir:
        staged = Path(tmpdir) / filename
        staged.write_bytes(body)
        parsed = await asyncio.to_thread(extract_text, staged, max_chars=MATERIAL_MAX_CHARS)

    info = {
        "name": parsed.get("name") or filename,
        "chars": parsed.get("chars") or 0,
        "truncated": bool(parsed.get("truncated")),
        "parse_error": parsed.get("parse_error"),
        "text": parsed.get("text") or "",
        "uploaded_at": time.time(),
    }
    save_template(username, sid, info)
    LOG.info(
        "ai: template uploaded user=%s sid=%s name=%s chars=%d err=%s",
        username, sid, info["name"], info["chars"], info["parse_error"] or "-",
    )
    return JSONResponse({"template": public_template(info)})


@router.get("/sessions/{sid}/template")
async def get_template(request: Request, sid: str) -> JSONResponse:
    """当前会话的模板摘要（没有就是 null）。"""
    username = await _user(request)
    return JSONResponse({"template": public_template(load_template(username, sid))})


@router.delete("/sessions/{sid}/template")
async def delete_template(request: Request, sid: str) -> JSONResponse:
    """撤掉模板：下一轮 prompt 就不再带结构约束。"""
    username = await _user(request)
    discard_file(_template_path(username, sid))
    return JSONResponse({"template": None})


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
        "template": public_template(load_template(username, sid)),
        "draft": public_draft(draft),
        "artifacts": list_artifacts(username, sid),
        "activeArtifact": active_artifact(username, sid),
        "running": sid in _running,
    })


# ══════════════════════════════════════════════════════════════════
# 产物（artifacts）——一会话多份成文
#
# 为什么需要它：草稿只有一份，但「申请文件四件套」这类任务天生是多份产物
# （权利要求书 / 说明书 / 摘要 / 附图）。把每份产物单独存一份 markdown，
# 界面才能摆出「四张卡、各自状态」——而不是一份稿子反复被覆盖。
#
# 活动产物（active）就是当前在编辑器里改的那份：切换产物 = 把该产物灌进
# 会话草稿，走既有的 Collabora 注入链路（零刷新），不新增另一套文档通道。
# ══════════════════════════════════════════════════════════════════


def _artifacts_dir(username: str, sid: str) -> Path:
    d = AI_HOME / "artifacts" / username / _safe_sid(sid)
    d.mkdir(parents=True, exist_ok=True)
    if os.geteuid() == 0:
        try:
            os.chmod(d, 0o700)
        except OSError:
            pass
    return d


def _artifacts_index(username: str, sid: str) -> Path:
    return _artifacts_dir(username, sid) / "index.json"


def _load_artifacts(username: str, sid: str) -> dict:
    """索引结构：{"active": "claims", "items": {"claims": {...}, ...}}"""
    try:
        data = json.loads(_artifacts_index(username, sid).read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("items"), dict):
            data.setdefault("active", "")
            return data
    except (OSError, ValueError):
        pass
    return {"active": "", "items": {}}


def _save_artifacts(username: str, sid: str, data: dict) -> None:
    path = _artifacts_index(username, sid)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    tmp.replace(path)


def _artifact_body(username: str, sid: str, key: str) -> str:
    try:
        return (_artifacts_dir(username, sid) / f"{key}.md").read_text(encoding="utf-8")
    except OSError:
        return ""


def list_artifacts(username: str, sid: str) -> list[dict]:
    """产物清单（不含正文——正文要按需单取，别把四份全文塞进每次 state 响应）。"""
    data = _load_artifacts(username, sid)
    out: list[dict] = []
    for key, item in (data.get("items") or {}).items():
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "key": key,
                "title": item.get("title") or key,
                "chars": int(item.get("chars") or 0),
                "updated_at": float(item.get("updated_at") or 0),
            }
        )
    out.sort(key=lambda a: float(a.get("updated_at") or 0))
    return out


def active_artifact(username: str, sid: str) -> str:
    return str(_load_artifacts(username, sid).get("active") or "")


def save_artifact(username: str, sid: str, key: str, title: str, markdown: str) -> dict:
    """写入（或覆盖）一份产物，并把它设为活动产物。"""
    key = _safe_name(key) or "artifact"
    body = markdown or ""
    path = _artifacts_dir(username, sid) / f"{key}.md"
    tmp = path.with_suffix(".tmp")
    tmp.write_text(body, encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    tmp.replace(path)

    data = _load_artifacts(username, sid)
    items = data.setdefault("items", {})
    items[key] = {
        "title": title or key,
        "chars": len(body),
        "updated_at": time.time(),
    }
    data["active"] = key
    _save_artifacts(username, sid, data)
    return {"key": key, "title": items[key]["title"], "chars": items[key]["chars"]}


def delete_artifact(username: str, sid: str, key: str) -> None:
    data = _load_artifacts(username, sid)
    items = data.get("items") or {}
    items.pop(key, None)
    if data.get("active") == key:
        data["active"] = ""
    _save_artifacts(username, sid, data)
    discard_file(_artifacts_dir(username, sid) / f"{key}.md")


@router.get("/sessions/{sid}/artifacts")
async def get_artifacts(request: Request, sid: str) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    return JSONResponse(
        {
            "artifacts": list_artifacts(username, sid),
            "active": active_artifact(username, sid),
        }
    )


class ArtifactSave(BaseModel):
    key: str
    title: str = ""
    markdown: str = ""


@router.post("/sessions/{sid}/artifacts")
async def post_artifact(request: Request, sid: str, body: ArtifactSave) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    saved = save_artifact(username, sid, body.key, body.title, body.markdown)
    LOG.info("ai: artifact saved user=%s sid=%s key=%s chars=%d", username, sid, saved["key"], saved["chars"])
    return JSONResponse(saved)


@router.get("/sessions/{sid}/artifacts/{key}")
async def get_artifact(request: Request, sid: str, key: str) -> JSONResponse:
    """取一份产物的正文（打开它时用）。"""
    username = await _user(request)
    session_dir(username, sid)
    body = _artifact_body(username, sid, key)
    if not body:
        return JSONResponse({"error": "not found"}, status_code=404)
    data = _load_artifacts(username, sid)
    item = (data.get("items") or {}).get(key) or {}
    return JSONResponse({"key": key, "title": item.get("title") or key, "markdown": body})


@router.delete("/sessions/{sid}/artifacts/{key}")
async def del_artifact(request: Request, sid: str, key: str) -> JSONResponse:
    username = await _user(request)
    session_dir(username, sid)
    delete_artifact(username, sid, key)
    return JSONResponse({"removed": key})
