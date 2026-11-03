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
import os
import re
import shutil
import sys
from pathlib import Path

# 只认技能包名，避免误伤普通文档里的 "skills/" 字样。
# 负向后顾允许前缀是空白、引号、反引号、括号等，但不允许紧贴字母数字或连字符。
PACKAGES = r"(?:patent-[a-z0-9-]+|software-copyright|writing)"
# 反斜杠也要排除：`/home/.../server/skills/x` 这种已经改成绝对路径的写法，
# 再被这条相对规则吃一次就会拼成 `/root//root/...`（实测踩过）。
PATTERN = re.compile(rf"(?<![\w\-/])skills/({PACKAGES})")
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

# 已经写死的技能绝对路径（换机器/换目录就失效）：
#   /home/wr/v-office/server/skills/patent-chart/...   ← 带 skills/ 层
#   /home/wr/v-office/server/patent-chart/...          ← 旧版 bug 漏掉 skills/ 产生的坏路径
# 必须先吃绝对路径再吃相对写法：反过来 PATTERN 会把 `/home/.../server/skills/x` 里的
# `skills/x` 替换掉，剩下 `/home/.../server/<root>/x` 这种拼坏的路径（本地就踩过一次）。
ABS_SKILLS_PATTERN = re.compile(rf"(?:/[\w.\-]+)+/skills/({PACKAGES})(?![-\w])")
LEGACY_SERVER_PATTERN = re.compile(rf"(?:/[\w.\-]+)+/server/({PACKAGES})(?![-\w])")

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


def rewrite_text(text: str, root: str) -> tuple[str, int]:
    """把一段文本里的技能路径改写成 `root/<包>`，返回 (新文本, 命中次数)。"""
    root = root.rstrip("/")
    total = 0
    for pattern in (ABS_SKILLS_PATTERN, LEGACY_SERVER_PATTERN, OPT_PATTERN, ABS_PATTERN, PATTERN):
        text, count = pattern.subn(lambda m: f"{root}/{m.group(1)}", text)
        total += count
    return text, total


def rewrite(src: Path, dest: Path, root: str, in_place: bool) -> int:
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
        new, count = rewrite_text(text, root)
        if count and new != text:
            path.write_text(new, encoding="utf-8")
            hits += count
    return hits


def default_root() -> Path:
    """运行时的技能根：PATENT_SKILLS_DIR（agent 环境）→ V_OFFICE_AI_SKILLS（镜像）→ 本地约定。"""
    for name in ("PATENT_SKILLS_DIR", "V_OFFICE_AI_SKILLS"):
        env = os.environ.get(name, "").strip()
        if env:
            return Path(env)
    return Path(__file__).resolve().parent.parent / "skills"


def ensure_skills_root(root: Path | None = None) -> int:
    """启动自检：把已生成的技能副本就地改写成当前机器的真实路径。

    为什么要这一步：技能副本里的路径是**构建期**写死的绝对路径。仓库被拷到别的
    服务器、或者换了挂载目录直接 `python main.py` 起服务，那些路径全部失效，
    agent 只能瞎找（本地实测：agent 找到写作者的家目录去跑另一份脚本）。镜像里
    构建时已重写，这里多做一次幂等自检，代价是扫 ~450 个文本文件。
    """
    target = (root or default_root()).resolve()
    if not target.is_dir():
        return 0
    hits = 0
    for path in target.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXT:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        new, count = rewrite_text(text, str(target))
        if new == text:
            continue
        try:
            path.write_text(new, encoding="utf-8")
        except OSError:
            continue
        hits += count
    return hits


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="改写技能包里的相对路径")
    parser.add_argument("--src", default="vendor/patent-skills")
    parser.add_argument("--dest", default="server/skills")
    parser.add_argument("--root", default="", help="运行时的技能绝对路径（默认取 PATENT_SKILLS_DIR）")
    parser.add_argument("--in-place", action="store_true", help="src 与 dest 相同，只替换不复制")
    parser.add_argument(
        "--ensure",
        action="store_true",
        help="只做启动自检：把 --root 下的现有副本就地改写成当前路径，不复制",
    )
    args = parser.parse_args(argv)

    root = args.root or str(default_root())
    if args.ensure:
        hits = ensure_skills_root(Path(root))
        print(f"ensured {hits} refs -> {root}", flush=True)
        return 0

    src = Path(args.src)
    dest = Path(args.dest)
    if not src.is_dir():
        print(f"ERROR: 源目录不存在: {src}", file=sys.stderr)
        return 2
    hits = rewrite(src, dest, root, args.in_place)
    print(f"rewritten {hits} refs -> {root} ({dest})", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
