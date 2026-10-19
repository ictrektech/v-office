"""把用户上传的源码 ZIP 安全地解成会话目录里的 `project/`。

为什么由服务端解而不是让 agent 自己 `bash unzip`：

- 解压炸弹、Zip Slip（`../` 穿越）、符号链接这些坑必须由一个确定性实现统一挡住，
  不能让模型「看着办」；
- 解压后要立刻给出一份项目概况（文件数 / 源码行数 / 主要语言），agent 才能直接
  拿它当源程序量和业务证据，UI 也能当场显示「识别到 React 项目，1284 个文件」；
- `project/` 是**只读的项目根**，与 `materials/`（用户原始材料）语义分开，
  并且不对外列出，避免几千个源码文件涌进「产物文件」面板。

约定：一个会话只保留一个项目包，重复上传即整体替换。
"""

from __future__ import annotations

import json
import os
import shutil
import zipfile
from pathlib import Path

from safe_fs import discard_tree

PROJECT_DIRNAME = "project"
SUMMARY_NAME = ".project.json"

# 解压上限：单个源码包按 200MB 收，解开后不超过 1GB / 2 万个文件。
ARCHIVE_MAX_BYTES = int(os.environ.get("V_OFFICE_AI_MAX_ARCHIVE", str(200 * 1024 * 1024)))
EXTRACT_MAX_BYTES = int(os.environ.get("V_OFFICE_AI_MAX_PROJECT_BYTES", str(1024**3)))
EXTRACT_MAX_FILES = int(os.environ.get("V_OFFICE_AI_MAX_PROJECT_FILES", "20000"))
EXTRACT_MAX_FILE_BYTES = 100 * 1024 * 1024
# 压缩比超过这个值基本可以判定是解压炸弹（正常源码包 3~20 倍）
MAX_COMPRESSION_RATIO = 200

# 这些目录是构建产物/依赖，源码材料里用不到，解出来只会白占空间
IGNORED_DIRS = {
    "node_modules", ".git", ".svn", ".hg", "__pycache__", ".pytest_cache",
    ".mypy_cache", ".ruff_cache", ".cache", ".next", ".nuxt", ".svelte-kit",
    "dist", "build", "out", "coverage", ".venv", "venv", "env", ".idea",
    ".vscode", ".gradle", ".terraform", "Pods", ".dart_tool",
}

# 媒体/二进制/压缩包：不是源码，也不该进代码材料
IGNORED_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".ico", ".svg",
    ".mp3", ".mp4", ".mov", ".avi", ".wav", ".flac",
    ".zip", ".gz", ".tgz", ".bz2", ".xz", ".7z", ".rar", ".tar",
    ".so", ".dll", ".dylib", ".exe", ".bin", ".class", ".jar", ".wasm",
    ".pyc", ".pyo", ".o", ".a", ".lib", ".pdb", ".woff", ".woff2", ".ttf",
    ".eot", ".map",
}

LANGUAGE_BY_SUFFIX = {
    ".py": "Python", ".pyw": "Python",
    ".ts": "TypeScript", ".tsx": "TypeScript", ".mts": "TypeScript", ".cts": "TypeScript",
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
    ".vue": "Vue", ".svelte": "Svelte",
    ".java": "Java", ".kt": "Kotlin", ".kts": "Kotlin", ".scala": "Scala",
    ".go": "Go", ".rs": "Rust", ".c": "C", ".h": "C", ".cc": "C++", ".cpp": "C++",
    ".hpp": "C++", ".cs": "C#", ".rb": "Ruby", ".php": "PHP", ".swift": "Swift",
    ".dart": "Dart", ".lua": "Lua", ".sql": "SQL", ".sh": "Shell", ".bash": "Shell",
    ".ps1": "PowerShell", ".vue": "Vue", ".html": "HTML", ".css": "CSS",
    ".scss": "SCSS", ".less": "Less", ".sol": "Solidity", ".gd": "GDScript",
}


class ProjectZipError(RuntimeError):
    """压缩包不可用（损坏、越界、超限）。"""


def _utf8_name(info: zipfile.ZipInfo) -> str:
    """还原文件名。

    Windows 资源管理器压缩的中文名不带 UTF-8 标记，`zipfile` 会按 cp437 解码，
    直接落盘就是一堆乱码，代码选材清单会变成不可读的乱码路径。
    """
    name = info.filename
    if info.flag_bits & 0x800:
        return name
    try:
        return name.encode("cp437").decode("gbk")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return name


def _rel_parts(info: zipfile.ZipInfo) -> list[str] | None:
    name = _utf8_name(info).replace("\\", "/")
    while name.startswith("./"):
        name = name[2:]
    name = name.lstrip("/")
    if not name:
        return None
    # Windows 盘符（C:/...）也算绝对路径
    if len(name) > 1 and name[1] == ":":
        return None
    parts = [p for p in name.split("/") if p not in ("", ".")]
    if not parts or ".." in parts:
        return None
    return parts


def _is_symlink(info: zipfile.ZipInfo) -> bool:
    mode = (info.external_attr >> 16) & 0o170000
    return mode == 0o120000


def _skip(parts: list[str]) -> bool:
    for part in parts[:-1]:
        if part in IGNORED_DIRS or part.startswith("."):
            return True
    filename = parts[-1]
    if filename.startswith("."):
        return True
    return Path(filename).suffix.lower() in IGNORED_SUFFIXES


def _count_lines(path: Path) -> int:
    try:
        size = path.stat().st_size
    except OSError:
        return 0
    if size == 0 or size > 2 * 1024 * 1024:
        return 0
    try:
        with path.open("rb") as handle:
            head = handle.read(8192)
    except OSError:
        return 0
    if b"\x00" in head:
        return 0
    try:
        return path.read_bytes().count(b"\n") + (0 if head.endswith(b"\n") else 1)
    except OSError:
        return 0


def _summarize(root: Path, archive: Path, extracted_bytes: int) -> dict:
    files = 0
    total_bytes = 0
    source_files = 0
    source_lines = 0
    lang_files: dict[str, int] = {}
    lang_lines: dict[str, int] = {}
    top_dirs: dict[str, int] = {}
    scanned = 0

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        files += 1
        try:
            size = path.stat().st_size
            total_bytes += size
        except OSError:
            size = 0
        rel = path.relative_to(root)
        if len(rel.parts) > 1:
            top = rel.parts[0]
            top_dirs[top] = top_dirs.get(top, 0) + 1
        suffix = path.suffix.lower()
        language = LANGUAGE_BY_SUFFIX.get(suffix)
        if not language:
            continue
        source_files += 1
        lang_files[language] = lang_files.get(language, 0) + 1
        if scanned < 512 * 1024 * 1024:
            lines = _count_lines(path)
            scanned += size
            source_lines += lines
            lang_lines[language] = lang_lines.get(language, 0) + lines

    languages = [
        {"name": name, "files": count, "lines": lang_lines.get(name, 0)}
        for name, count in sorted(
            lang_files.items(), key=lambda kv: (lang_lines.get(kv[0], 0), kv[1]), reverse=True
        )[:6]
    ]
    return {
        "archive": archive.name,
        "archive_bytes": archive.stat().st_size if archive.exists() else 0,
        "extracted_bytes": extracted_bytes,
        "files": files,
        "source_files": source_files,
        "source_lines": source_lines,
        "languages": languages,
        "top_dirs": [
            {"name": name, "files": count}
            for name, count in sorted(top_dirs.items(), key=lambda kv: kv[1], reverse=True)[:8]
        ],
    }


def _chown_tree(root: Path, uid: int, gid: int) -> None:
    if not uid or os.geteuid() != 0:
        return
    for path in [root, *root.rglob("*")]:
        try:
            os.chown(path, uid, gid)
        except OSError:
            pass


def extract_project_zip(root: Path, archive: Path, *, uid: int = 0, gid: int = 0) -> dict:
    """把 `archive` 解到 `root/project/`，返回项目概况；失败抛 ProjectZipError。"""
    if not archive.is_file():
        raise ProjectZipError("压缩包不存在")
    archive_size = archive.stat().st_size
    if archive_size == 0:
        raise ProjectZipError("压缩包是空的")
    if archive_size > ARCHIVE_MAX_BYTES:
        raise ProjectZipError(f"压缩包超过上限（{ARCHIVE_MAX_BYTES // 1024 // 1024}MB）")

    try:
        zf = zipfile.ZipFile(archive)
    except (zipfile.BadZipFile, OSError) as exc:
        raise ProjectZipError("不是有效的 ZIP 压缩包") from exc

    with zf:
        infos = [i for i in zf.infolist() if not i.is_dir()]
        if not infos:
            raise ProjectZipError("压缩包里没有文件")

        planned: list[tuple[zipfile.ZipInfo, list[str]]] = []
        for info in infos:
            if _is_symlink(info):
                continue
            parts = _rel_parts(info)
            if not parts or _skip(parts):
                continue
            planned.append((info, parts))
        if not planned:
            raise ProjectZipError("压缩包里没有可用的源码文件")

        # 单根目录剥离：`myproject/src/...` → `src/...`
        tops = {parts[0] for _, parts in planned}
        strip = len(tops) == 1 and all(len(parts) > 1 for _, parts in planned)

        total = sum(info.file_size for info, _ in planned)
        if total > EXTRACT_MAX_BYTES:
            raise ProjectZipError(f"解压后超过上限（{EXTRACT_MAX_BYTES // 1024 // 1024}MB）")
        if len(planned) > EXTRACT_MAX_FILES:
            raise ProjectZipError(f"文件数超过上限（{EXTRACT_MAX_FILES}）")
        if archive_size > 1024 * 1024 and total / archive_size > MAX_COMPRESSION_RATIO:
            raise ProjectZipError("压缩比异常，疑似解压炸弹")

        target = root / PROJECT_DIRNAME
        discard_tree(target)
        target.mkdir(parents=True, exist_ok=True)

        written = 0
        for info, parts in planned:
            if info.file_size > EXTRACT_MAX_FILE_BYTES:
                continue
            rel_parts = parts[1:] if strip else parts
            if not rel_parts:
                continue
            dest = target / Path(*rel_parts)
            resolved = dest.resolve()
            if resolved != target.resolve() and target.resolve() not in resolved.parents:
                continue  # 理论上到不了这里，兜底防穿越
            written += info.file_size
            if written > EXTRACT_MAX_BYTES:
                discard_tree(target)
                raise ProjectZipError(f"解压后超过上限（{EXTRACT_MAX_BYTES // 1024 // 1024}MB）")
            try:
                dest.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(info) as src, dest.open("wb") as out:
                    shutil.copyfileobj(src, out, length=256 * 1024)
            except (OSError, zipfile.BadZipFile, RuntimeError):
                continue

    summary = _summarize(target, archive, written)
    summary["root"] = PROJECT_DIRNAME
    _chown_tree(target, uid, gid)
    try:
        (root / SUMMARY_NAME).write_text(
            json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except OSError:
        pass
    return summary


def read_project_summary(root: Path) -> dict | None:
    path = root / SUMMARY_NAME
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def clear_project(root: Path) -> None:
    discard_tree(root / PROJECT_DIRNAME)
    path = root / SUMMARY_NAME
    if path.is_file():
        try:
            path.unlink()
        except OSError:
            pass
