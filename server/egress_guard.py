"""Agent 出网闸门：按 uid 只放行模型网关，其余一律丢。

为什么要有这一层
----------------
给 pi 开 bash，等于把 curl / pip / 爬虫一起给了它 —— 技能包里本来就躺着
`cnipa_epub_crawler.py`、`browser.py`、`bootstrap_cad_venv.py`（会 pip install）。
`_pi_env` 的环境白名单与 PATH 精简都只是**君子协定**：bash 里一行
`socket.create_connection` 就绕过去了。真正的边界只能在网络层。

为什么按 uid 匹配而不是按命令名
------------------------------
pi 是降权到「每用户专属 uid」起来的（见 `ai._run_turn` 的 `priv`），而
iptables 的 owner 模块正好能按「发起连接的进程 uid」匹配。于是可以只掐
agent，服务端自己（root）照常联网 —— 它还要走 VOS 存储与 OIDC 用户信息。

为什么规则要可重建
------------------
网关是域名（`api.deepseek.com` 之类），实测解析出多个 IP 且会漂。所以不能
把 IP 写死在配置里：启动解析一次，之后定时刷新；用户在设置里换了网关也会
触发一次重建。

安全降级
--------
容器没有 NET_ADMIN / 没装 iptables 时**只记日志**，绝不阻塞服务启动。
解析不到任何网关时**保留旧规则**，不改成「全丢」—— 后者会把 AI 整个打死。
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import socket
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

LOG = logging.getLogger("egress")

# 自定义链：所有 agent 的出口判断都收敛到这里，刷新时只动这条链，
# 不碰 Docker 自己在 OUTPUT 上铺的规则。
CHAIN = "AGENT_EGRESS"

AI_HOME = Path(os.environ.get("V_OFFICE_AI_HOME", "/data/.ai"))
DEFAULT_BASE_URL = os.environ.get("V_OFFICE_AI_BASE_URL", "https://ai.ictrek.com/v1")

# agent 的 uid 段。必须与 ai.py 的 uid 分配对齐（同一个 V_OFFICE_AI_UID_BASE）。
UID_BASE = int(os.environ.get("V_OFFICE_AI_UID_BASE", "20000"))
UID_COUNT = int(os.environ.get("V_OFFICE_AI_UID_COUNT", "1000"))
UID_RANGE = f"{UID_BASE}-{UID_BASE + UID_COUNT - 1}"

# 1 = 启用；0 = 关掉（本地调试用，生产别关）
_ENABLED = (os.environ.get("V_OFFICE_AI_EGRESS_GUARD", "1") or "1").strip() != "0"
# 网关 IP 会漂，定期重解析。0 表示不刷新。
REFRESH_S = float(os.environ.get("V_OFFICE_AI_EGRESS_REFRESH_S", "300") or "0")
IPTABLES = os.environ.get("V_OFFICE_AI_IPTABLES", "iptables")


def enabled() -> bool:
    return _ENABLED


def _run(args: list[str]) -> tuple[int, str]:
    """跑一条 iptables 命令。永远不抛：这层失败不该掀翻服务端。"""
    try:
        proc = subprocess.run(
            [IPTABLES, *args],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 127, str(exc)
    out = (proc.stderr or proc.stdout or "").strip()
    return proc.returncode, out


def _collect_targets() -> list[tuple[str, int]]:
    """所有「实际在用」的网关：默认值 + 每个用户设置里的 base_url。

    只看环境变量是不够的：实测 admin 把 base_url 改成了 api.deepseek.com，
    与 V_OFFICE_AI_BASE_URL 完全不是一回事。漏掉它 = 把用户的 AI 断掉。
    """
    urls: list[str] = [DEFAULT_BASE_URL]
    try:
        for path in sorted((AI_HOME / "settings").glob("*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            url = str(data.get("base_url") or "").strip()
            if url:
                urls.append(url)
    except OSError:
        pass

    targets: set[tuple[str, int]] = set()
    for raw in urls:
        parts = urlsplit(raw if "//" in raw else f"https://{raw}")
        host = parts.hostname
        if not host:
            continue
        port = parts.port or (80 if parts.scheme == "http" else 443)
        targets.add((host.lower(), port))
    return sorted(targets)


def _resolve(targets: list[tuple[str, int]]) -> list[tuple[str, int]]:
    """域名 → (IPv4, port)。只取 IPv4：容器内实测无 IPv6。"""
    out: set[tuple[str, int]] = set()
    for host, port in targets:
        try:
            infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
        except OSError as exc:
            LOG.warning("egress: 解析失败 host=%s err=%s", host, exc)
            continue
        for info in infos:
            if info[0] == socket.AF_INET:
                out.add((info[4][0], port))
    return sorted(out)


def _apply(entries: list[tuple[str, int]]) -> bool:
    """重建 AGENT_EGRESS 链并挂到 OUTPUT 上。返回是否成功。"""
    # 建链：已存在会报错，忽略即可（幂等）
    _run(["-N", CHAIN])
    code, msg = _run(["-F", CHAIN])
    if code != 0:
        LOG.warning("egress: 清空链失败 err=%s", msg)
        return False

    # loopback 放行：pi（node）要靠 Docker 内嵌 DNS(127.0.0.11) 解析网关域名，
    # 解析不了就连不上模型。这条同时放行容器内的本地服务，属已知且可接受的面。
    _run(["-A", CHAIN, "-o", "lo", "-j", "ACCEPT"])
    for ip, port in entries:
        _run(
            ["-A", CHAIN, "-d", ip, "-p", "tcp", "--dport", str(port), "-j", "ACCEPT"]
        )
    # 兜底：其余全丢。必须留在链尾。
    _run(["-A", CHAIN, "-j", "DROP"])

    # 挂链：已在 OUTPUT 上就不重复插（-C 是「检查」）
    check, _ = _run(
        ["-C", "OUTPUT", "-m", "owner", "--uid-owner", UID_RANGE, "-j", CHAIN]
    )
    if check != 0:
        code, msg = _run(
            ["-I", "OUTPUT", "1", "-m", "owner", "--uid-owner", UID_RANGE, "-j", CHAIN]
        )
        if code != 0:
            LOG.warning("egress: 挂链失败 err=%s", msg)
            return False
    return True


def _forget() -> None:
    """撤掉规则（关闭开关时用，避免残留把 agent 关在门外）。"""
    _run(["-D", "OUTPUT", "-m", "owner", "--uid-owner", UID_RANGE, "-j", CHAIN])
    _run(["-F", CHAIN])
    _run(["-X", CHAIN])


def refresh() -> bool:
    """重解析网关并重建规则。可反复调用。"""
    if not _ENABLED:
        return False
    entries = _resolve(_collect_targets())
    if not entries:
        # 关键的安全降级：解析全失败时**保留旧规则**，不改写成「全丢」。
        LOG.warning("egress: 未解析到任何网关地址，保留现有规则不动")
        return False
    ok = _apply(entries)
    if ok:
        LOG.info(
            "egress: uid %s 出网收敛到 %s",
            UID_RANGE,
            ", ".join(f"{ip}:{port}" for ip, port in entries),
        )
    return ok


def refresh_soon() -> None:
    """设置变更时调用：丢到线程里跑，别阻塞请求。"""
    if not _ENABLED:
        return
    try:
        asyncio.get_running_loop().run_in_executor(None, refresh)
    except RuntimeError:
        refresh()


def install() -> None:
    """服务启动时调用：可用就配规则，不可用只记日志。"""
    if not _ENABLED:
        LOG.info("egress: 出网闸门已关闭（V_OFFICE_AI_EGRESS_GUARD=0）")
        return
    code, msg = _run(["--version"])
    if code != 0:
        LOG.warning(
            "egress: iptables 不可用（缺 NET_ADMIN 或未安装），出网闸门未启用 err=%s",
            msg or code,
        )
        return
    refresh()


async def refresh_loop() -> None:
    """网关 IP 漂移的对策：定时重解析。REFRESH_S<=0 表示不刷新。"""
    if not _ENABLED or REFRESH_S <= 0:
        return
    while True:
        await asyncio.sleep(REFRESH_S)
        try:
            await asyncio.to_thread(refresh)
        except Exception:  # noqa: BLE001 定时任务不能因单次失败而死
            LOG.exception("egress: 定时刷新失败")
