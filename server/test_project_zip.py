"""源码 ZIP 解包链路测试。

这块的失败都很安静：越界写到了上一级目录、把 node_modules 全解出来、
中文名变乱码——都不会报错，只是后面 agent 读到的是一堆垃圾。
所以这里逐条盯住「进不进得来」和「出来了什么」。

跑法：
    cd server && python3 -m unittest test_project_zip -v
"""

import tempfile
import unittest
import zipfile
from pathlib import Path

from project_zip import (
    _utf8_name,
    extract_project_zip,
    read_project_summary,
)


def make_zip(path: Path, entries: list[tuple[str, str]]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in entries:
            zf.writestr(name, data)
    return path


class ProjectZipTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory(prefix="vo-project-zip-")
        self.root = Path(self._tmp.name) / "session"
        self.root.mkdir(parents=True)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_strips_single_top_dir_and_counts_lines(self) -> None:
        archive = make_zip(
            self.root / "materials" / "demo.zip",
            [
                ("demo/src/main.ts", "const a = 1;\nconst b = 2;\n"),
                ("demo/src/util.ts", "export const c = 3;\n"),
                ("demo/README.md", "# demo\n"),
            ],
        )
        summary = extract_project_zip(self.root, archive)

        # 单根目录要剥掉，project/ 才是真正的项目根
        self.assertTrue((self.root / "project" / "src" / "main.ts").is_file())
        self.assertFalse((self.root / "project" / "demo").exists())
        self.assertEqual(summary["files"], 3)
        self.assertEqual(summary["source_files"], 2)
        self.assertEqual(summary["source_lines"], 3)
        self.assertEqual(summary["root"], "project")
        self.assertEqual(read_project_summary(self.root)["files"], 3)

    def test_blocks_path_traversal(self) -> None:
        archive = make_zip(
            self.root / "materials" / "evil.zip",
            [
                ("../escape.txt", "boom"),
                ("../../escape2.txt", "boom"),
                ("ok/app.py", "print(1)\n"),
            ],
        )
        summary = extract_project_zip(self.root, archive)

        self.assertFalse((self.root.parent / "escape.txt").exists())
        self.assertFalse((self.root.parent.parent / "escape2.txt").exists())
        self.assertEqual(summary["files"], 1)

    def test_skips_build_noise_and_hidden_files(self) -> None:
        archive = make_zip(
            self.root / "materials" / "noise.zip",
            [
                ("web/src/App.tsx", "export default 1\n"),
                ("web/node_modules/react/index.js", "module.exports = {};\n"),
                ("web/dist/bundle.js", "// built\n"),
                ("web/.env", "SECRET=1\n"),
                ("web/.git/config", "[core]\n"),
                ("web/logo.png", "not-really-a-png"),
            ],
        )
        summary = extract_project_zip(self.root, archive)

        self.assertEqual(summary["files"], 1)
        self.assertTrue((self.root / "project" / "src" / "App.tsx").is_file())
        self.assertFalse((self.root / "project" / "node_modules").exists())
        self.assertFalse((self.root / "project" / ".env").exists())

    def test_rejects_non_zip(self) -> None:
        archive = self.root / "materials" / "fake.zip"
        archive.parent.mkdir(parents=True, exist_ok=True)
        archive.write_text("not a zip", encoding="utf-8")
        with self.assertRaises(Exception):
            extract_project_zip(self.root, archive)

    def test_gbk_filename_is_restored(self) -> None:
        """Windows 资源管理器压缩的中文名不带 UTF-8 标记，会按 cp437 解码。"""

        class Info:
            flag_bits = 0
            filename = "软件说明.txt".encode("gbk").decode("cp437")

        self.assertEqual(_utf8_name(Info()), "软件说明.txt")

        class AsciiInfo:
            flag_bits = 0
            filename = "main.py"

        self.assertEqual(_utf8_name(AsciiInfo()), "main.py")


if __name__ == "__main__":
    unittest.main()
