#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把技能包里的 `skills/<包>` 相对路径改写成真实绝对路径。

为什么需要
----------
技能包（vendor/patent-skills）的 SKILL.md / prompts 里，命令和 Read 路径都写成
`skills/patent-chart/tools/...`，这是相对「仓库根」的。但 agent 运行时的工作
目录是每个用户的案件目录（/data/.ai/sessions/<user>/<sid>），那里没有
`skills/` 这一层，agent 只能靠 grep/find 猜路径，一轮能烧掉几百次工具调用。

这里在构建时把技能复制一份，并把路径改写成运行时真实的技能根：
- 镜像里：/opt/patent-skills/patent-chart/tools/...
- 本地：  <repo>/server/skills/patent-chart/tools/...

源包 vendor/patent-skills 一个字不动，方便和上游对比、随时重新生成。
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

# 只认技能包名，避免误伤普通文档里的 "skills/" 字样。
# 负向后顾允许前缀是空白、引号、反引号、括号等，但不允许紧贴字母数字或连字符。
PACKAGES = r"(?:patent-[a-z0-9-]+|software-copyright|writing)"
PATTERN = re.compile(rf"(?<![\w-])skills/({PACKAGES})")
OPT_PATTERN = re.compile(rf"(?<![\w-])/opt/patent-skills/({PACKAGES})")
# 上游作者本机的绝对路径，例如
#   SKILL_DIR=/home/wr/v-office/server/software-copyright      （少一层 skills/）
#   /home/wr/SoftwareCopyright-Skill/software-copyright-materials（作者仓库名）
# 这两类路径既不是 `skills/<包>` 也不是 `/opt/patent-skills/<包>`，上面两条正则都抓不到。
# 实测后果（2026-11-03）：agent 按 SKILL.md 里的 SKILL_DIR 执行，目录不存在，于是自己
# `ls /home/wr` 摸到作者的原仓库跑另一份脚本——换到镜像里没有那个目录，第一步就卡死。
# 只认 /home、/Users 下的作者本机路径：不能写成「任意绝对路径 + 包名」，
# 否则 `/opt/patent-skills` 里的 `patent-skills` 会被当成包名再替换一遍
# （实测会得到 `/opt/patent-skills/patent-skills/...`）。
ABS_PATTERN = re.compile(
    rf"(?:/home|/Users)/[\w.\-/]*/({PACKAGES})(?:-materials)?(?![-\w])"
)

TEXT_EXT = {".md", ".py", ".yaml", ".yml", ".txt", ".json"}
SKIP_DIRS = {"__pycache__", ".git", ".mypy_cache", ".pytest_cache"}


def _copy_tree(src: Path, dest: Path) -> None:
    """复制技能树，保留 dest 顶层 README.md（仓库自己的说明，不属于上游）。"""
    keep_readme = ""
    readme = dest / "README.md"
    if readme.is_file():
        keep_readme = readme.read_text(encoding="utf-8", errors="ignore")
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(
        src,
        dest,
        ignore=shutil.ignore_patterns(*SKIP_DIRS, "*.pyc"),
    )
    if keep_readme:
        (dest / "README.md").write_text(keep_readme, encoding="utf-8")


def rewrite(src: Path, dest: Path, root: str, in_place: bool) -> int:
    root = root.rstrip("/")
    if src.resolve() != dest.resolve():
        _copy_tree(src, dest)
    hits = 0
    for path in dest.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXT:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        new, count = PATTERN.subn(lambda m: f"{root}/{m.group(1)}", text)
        # 镜像内的硬编码绝对路径（SKILL_DIR=/opt/patent-skills/<pkg>）本地不存在，
        # 一并重写，避免本地调试时 agent 白白绕路去找不存在的目录。
        new2, count2 = OPT_PATTERN.subn(lambda m: f"{root}/{m.group(1)}", new)
        count += count2
        new = new2
        new3, count3 = ABS_PATTERN.subn(lambda m: f"{root}/{m.group(1)}", new)
        count += count3
        new = new3
        if count:
            path.write_text(new, encoding="utf-8")
            hits += count
    return hits


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="改写技能包里的相对路径")
    parser.add_argument("--src", default="vendor/patent-skills")
    parser.add_argument("--dest", default="server/skills")
    parser.add_argument("--root", required=True, help="运行时的技能绝对路径")
    parser.add_argument("--in-place", action="store_true", help="src 与 dest 相同，只替换不复制")
    args = parser.parse_args(argv)

    src = Path(args.src)
    dest = Path(args.dest)
    if not src.is_dir():
        print(f"ERROR: 源目录不存在: {src}", file=sys.stderr)
        return 2
    hits = rewrite(src, dest, args.root, args.in_place)
    print(f"rewritten {hits} refs -> {args.root} ({dest})", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
