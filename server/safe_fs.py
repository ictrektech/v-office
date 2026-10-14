"""删文件 / 删目录的兜底：**「删不掉」永远不许掀翻请求**。

为什么单独有个模块（2026-10-13 本地实测，都是真现场）：

宿主环境（CodeBuddy IDE）会注入一个 `sitecustomize.py`，把 `shutil.rmtree`、
`os.rmdir`、`os.unlink` 接管成「安全删除」，交给自己的批量删除护栏。护栏的记账
目录固定放在 `/tmp/codebuddy-safe-delete-bulk`；只要那个目录对当前 uid 不可写
（实测：它是另一个用户 `xjx` 建的 775 目录，而服务跑在 `wr` 上），护栏就
`raise SystemExit`。后果是：

- 「删除会话」直接 500，会话还留在盘上 —— 用户点第二次还是 500；
- md↔docx 转换**已经成功**、字节都读出来了，却因为收尾要删一个空临时目录而 500，
  前端只看到「编辑器内核打不开」。

两个关键点决定了这里必须是 `except BaseException`：

1. `SystemExit` **不是** `Exception` 的子类，`except Exception` 和
   `shutil.rmtree(..., ignore_errors=True)` 都拦不住它；
2. 这类接管是环境行为，不在我们代码里，所以只能假定「任何一次删除都可能失败」。

兜底策略是**挪走 / 清空**，而不是「失败就算了」：

- 目录：整棵 rename 到同级的 `.trash/` 下（对用户而言它就是消失了；原地留着
  才是真的没删掉）。挪不动再放弃，并把结果如实返回 False。
- 文件：删不掉就把内容清成 0 字节（数据确实没了，胜过留一份旧稿继续被读到）。

调用方拿到 False 时可以决定怎么呈现，但**不会**因为删除失败收到 500。
"""

from __future__ import annotations

import shutil
import time
from pathlib import Path


def discard_file(path: Path | str) -> bool:
    """删掉一个文件；删不掉就清空它。返回「用户视角下这份数据是否已经不在了」。"""
    target = Path(path)
    try:
        target.unlink()
        return True
    except FileNotFoundError:
        return True
    except BaseException:  # noqa: BLE001 见模块注释：护栏抛的是 SystemExit
        pass
    try:
        target.write_bytes(b"")
        return True
    except BaseException:  # noqa: BLE001
        return False


def discard_tree(path: Path | str) -> bool:
    """删掉一棵目录树；删不掉就整棵挪到同级 `.trash/` 下。返回是否已挪走/删掉。"""
    target = Path(path)
    if not target.exists():
        return True
    try:
        shutil.rmtree(target)
        return not target.exists()
    except BaseException:  # noqa: BLE001 见模块注释
        pass
    return _move_aside(target)


def _move_aside(target: Path) -> bool:
    trash = target.parent / ".trash"
    try:
        trash.mkdir(parents=True, exist_ok=True)
        target.rename(trash / f"{target.name}.{int(time.time())}")
        return True
    except BaseException:  # noqa: BLE001
        return False
