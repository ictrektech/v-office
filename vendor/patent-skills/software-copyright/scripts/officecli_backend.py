#!/usr/bin/env python3
"""Deterministic OfficeCLI adapter used by the final DOCX builder."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any


TESTED_OFFICECLI_VERSION = "1.0.151"
OFFICECLI_DOWNLOAD_URL = "https://github.com/iOfficeAI/OfficeCLI/releases/tag/v1.0.151"
OFFICECLI_INSTALL_URL = "https://raw.githubusercontent.com/iOfficeAI/OfficeCLI/main/install.ps1"
OFFICECLI_INSTALL_COMMAND = f"irm {OFFICECLI_INSTALL_URL} | iex"


class OfficeCliError(RuntimeError):
    """Raised when OfficeCLI is missing or reports a failed operation."""


def resolve_officecli() -> Path | None:
    """Resolve a globally installed OfficeCLI from the current process PATH."""
    for name in ("officecli", "officecli.exe"):
        found = shutil.which(name)
        if found:
            path = Path(found)
            if path.is_file():
                return path.resolve()
    return None


def pending_windows_officecli_install() -> Path | None:
    """Return the official Windows install path when PATH has not refreshed yet."""
    local_app_data = os.environ.get("LOCALAPPDATA")
    if os.name != "nt" or not local_app_data:
        return None
    path = Path(local_app_data) / "OfficeCLI" / "officecli.exe"
    return path.resolve() if path.is_file() else None


def officecli_environment() -> dict[str, str]:
    """Return a deterministic environment for non-interactive CLI execution."""
    env = os.environ.copy()
    env["OFFICECLI_SKIP_UPDATE"] = "1"
    # Background residents can retain file handles and stdout pipes on Windows.
    # A one-shot process is slower but predictable for document generation.
    env["OFFICECLI_NO_AUTO_RESIDENT"] = "1"
    return env


def _soffice_binary() -> str | None:
    """LibreOffice headless，用来在非 Windows 环境拿真实分页页数。"""
    for name in ("soffice", "libreoffice"):
        found = shutil.which(name)
        if found:
            return found
    return None


def _count_pdf_pages(pdf: Path) -> int | None:
    """优先 pypdf；没装就退回 poppler 的 pdfinfo（镜像里两者都可能有）。"""
    try:
        from pypdf import PdfReader  # type: ignore

        return len(PdfReader(str(pdf)).pages)
    except Exception:  # noqa: BLE001 缺依赖或读不动都走兜底
        pass
    info = shutil.which("pdfinfo")
    if not info:
        return None
    try:
        completed = subprocess.run(
            [info, str(pdf)], text=True, encoding="utf-8", errors="replace",
            capture_output=True, timeout=120,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    match = re.search(r"^Pages:\s+(\d+)", completed.stdout, re.MULTILINE)
    return int(match.group(1)) if match else None


def libreoffice_page_count(docx: Path) -> int | None:
    """docx → PDF → 页数。非 Windows 上这是唯一可信的分页来源。

    为什么必须自己数：OfficeCLI 只在 Windows 通过 Word 重新分页，其它平台的
    `--page-count` 是它自己的估算，不能当成 Word 的自动分页结果——而软著要求
    前 30 页/后 30 页材料**正好** 30 页，估错一页就要被补正。
    """
    binary = _soffice_binary()
    if not binary:
        return None
    docx = docx.resolve()
    with tempfile.TemporaryDirectory(prefix=".soffice-pages-", dir=str(docx.parent)) as tmp:
        env = os.environ.copy()
        env["HOME"] = tmp
        env.setdefault("SAL_USE_VCLPLUGIN", "svp")
        try:
            subprocess.run(
                [binary, "--headless", "--norestore", "--nologo",
                 "--convert-to", "pdf", "--outdir", tmp, str(docx)],
                text=True, encoding="utf-8", errors="replace",
                capture_output=True, timeout=600, env=env,
            )
        except (OSError, subprocess.SubprocessError):
            return None
        pdf = Path(tmp) / f"{docx.stem}.pdf"
        if not pdf.is_file():
            return None
        return _count_pdf_pages(pdf)


def _parse_json_output(output: str) -> dict[str, Any]:
    text = output.strip()
    if not text:
        return {}
    decoder = json.JSONDecoder()
    for match in re.finditer(r"\{", text):
        try:
            value, _ = decoder.raw_decode(text[match.start() :])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    return {"raw": text}


class OfficeCli:
    def __init__(self, require_tested_version: bool = True) -> None:
        resolved = resolve_officecli()
        if resolved is None:
            raise OfficeCliError(
                "当前 Codex 进程无法调用全局 officecli。请按官方方式全局安装 OfficeCLI，"
                "然后重启 Codex 再继续："
                f"{OFFICECLI_INSTALL_COMMAND}"
            )
        self.executable = resolved
        self.version = self._read_version()
        if require_tested_version and self.version != TESTED_OFFICECLI_VERSION:
            raise OfficeCliError(
                f"OfficeCLI 版本不匹配：检测到 {self.version}，当前 skill 只验证过 "
                f"{TESTED_OFFICECLI_VERSION}。请安装固定版本，或显式使用 --allow-untested-officecli。"
            )

    def _run(
        self,
        args: list[str],
        *,
        timeout: int = 120,
        expect_json: bool = True,
        check: bool = True,
    ) -> dict[str, Any]:
        command = [str(self.executable), *args]
        completed = subprocess.run(
            command,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=timeout,
            env=officecli_environment(),
        )
        combined = "\n".join(part for part in (completed.stdout, completed.stderr) if part).strip()
        payload = _parse_json_output(combined) if expect_json else {"raw": combined}
        failed_payload = isinstance(payload, dict) and payload.get("success") is False
        if check and (completed.returncode != 0 or failed_payload):
            detail = payload.get("error") if isinstance(payload, dict) else None
            raise OfficeCliError(f"OfficeCLI 命令失败：{' '.join(args[:3])}\n{detail or combined}")
        payload.setdefault("returncode", completed.returncode)
        return payload

    def _read_version(self) -> str:
        result = self._run(["--version"], expect_json=False)
        raw = str(result.get("raw", "")).strip()
        match = re.search(r"\d+\.\d+\.\d+", raw)
        return match.group(0) if match else raw or "unknown"

    def _run_batch_file(self, output: Path, batch_path: Path, command_count: int) -> dict[str, Any]:
        args = ["batch", str(output), "--input", str(batch_path), "--stop-on-error", "--json"]
        timeout = max(120, min(900, 60 + command_count // 8))
        last_error: OfficeCliError | None = None
        for delay in (0.0, 0.3, 1.0):
            if delay:
                time.sleep(delay)
            try:
                return self._run(args, timeout=timeout)
            except OfficeCliError as exc:
                last_error = exc
                if "io_error" not in str(exc):
                    raise
        assert last_error is not None
        raise last_error

    def create(self, output: Path, commands: list[dict[str, Any]], *, locale: str = "zh-CN") -> dict[str, Any]:
        output = output.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        self._run(["create", str(output), "--force", "--locale", locale, "--json"])

        batch_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".officecli-batch.json",
                prefix=f".{output.stem}-",
                dir=output.parent,
                encoding="utf-8",
                delete=False,
            ) as handle:
                json.dump(commands, handle, ensure_ascii=False, indent=2)
                batch_path = Path(handle.name)
            return self._run_batch_file(output, batch_path, len(commands))
        finally:
            if batch_path:
                batch_path.unlink(missing_ok=True)

    def run_batch(self, output: Path, commands: list[dict[str, Any]]) -> dict[str, Any]:
        if not commands:
            return {"success": True, "data": {"summary": {"total": 0, "failed": 0}}}
        batch_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".officecli-batch.json",
                prefix=f".{output.stem}-",
                dir=output.parent,
                encoding="utf-8",
                delete=False,
            ) as handle:
                json.dump(commands, handle, ensure_ascii=False, indent=2)
                batch_path = Path(handle.name)
            return self._run_batch_file(output.resolve(), batch_path, len(commands))
        finally:
            if batch_path:
                batch_path.unlink(missing_ok=True)

    def get(self, output: Path, path: str) -> dict[str, Any]:
        return self._run(["get", str(output.resolve()), path, "--json"])

    def validate(self, output: Path) -> dict[str, Any]:
        return self._run(["validate", str(output.resolve()), "--json"], timeout=180)

    def raw(self, output: Path, part: str) -> dict[str, Any]:
        return self._run(["raw", str(output.resolve()), part, "--json"], timeout=180)

    def raw_set(self, output: Path, part: str, xpath: str, action: str, xml: str) -> dict[str, Any]:
        return self._run(
            [
                "raw-set", str(output.resolve()), part,
                "--xpath", xpath, "--action", action, "--xml", xml, "--json",
            ],
            timeout=180,
        )

    def issues(self, output: Path) -> dict[str, Any]:
        return self._run(["view", str(output.resolve()), "issues", "--json"], timeout=180)

    def stats(self, output: Path, *, native_page_count: bool = False) -> dict[str, Any]:
        # OfficeCLI 只在 Windows 通过 Word 重新分页；其它平台的 --page-count 是它
        # 自己的估算，不能当成自动分页结果。非 Windows 一律用 LibreOffice 转 PDF
        # 数页，把结果写回同一个 `data.pages` 字段，调用方无需区分来源。
        if native_page_count and os.name == "nt":
            return self._run(
                ["view", str(output.resolve()), "stats", "--page-count", "--json"],
                timeout=300,
                check=False,
            )
        try:
            payload = self._run(
                ["view", str(output.resolve()), "stats", "--json"],
                timeout=300,
                check=False,
            )
        except OfficeCliError:
            payload = {}
        if not isinstance(payload, dict):
            payload = {}
        data = payload.get("data")
        if not isinstance(data, dict):
            data = {}
            payload["data"] = data
        pages = libreoffice_page_count(output)
        if pages:
            data["pages"] = pages
            data["page_count_source"] = "libreoffice"
        return payload

    def screenshot(self, output: Path, target: Path, *, render: str = "auto") -> dict[str, Any]:
        target.parent.mkdir(parents=True, exist_ok=True)
        return self._run(
            [
                "view",
                str(output.resolve()),
                "screenshot",
                "--grid",
                "auto",
                "--render",
                render,
                "--out",
                str(target.resolve()),
                "--json",
            ],
            timeout=300,
            expect_json=False,
        )


def json_data(payload: dict[str, Any]) -> dict[str, Any]:
    value = payload.get("data") if isinstance(payload, dict) else None
    return value if isinstance(value, dict) else {}


def structural_error_count(payload: dict[str, Any]) -> int:
    value = json_data(payload).get("count", 0)
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def issue_count(payload: dict[str, Any]) -> int:
    value = json_data(payload).get("count", 0)
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0
