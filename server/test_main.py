import asyncio
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx

import main


class MountedDirectoryContractTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.data_root = Path(self.temp_dir.name)
        main.DATA_ROOT = self.data_root
        main.AUTH_DISABLED = True

        transport = httpx.ASGITransport(app=main.app)
        self.client = httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        )
        self.addAsyncCleanup(self.client.aclose)

    async def test_lists_reads_and_overwrites_files_in_mounted_directory(self) -> None:
        target = self.data_root / "local" / "mapped.docx"
        target.parent.mkdir()
        target.write_bytes(b"original")

        listed = await self.client.get("/files")
        saved = await self.client.put("/files/mapped.docx", content=b"edited")
        read_back = await self.client.get("/files/mapped.docx")

        self.assertEqual(
            [item["name"] for item in listed.json()["files"]],
            ["mapped.docx"],
        )
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(read_back.status_code, 200)
        self.assertEqual(read_back.content, b"edited")
        self.assertEqual(target.read_bytes(), b"edited")

    async def test_users_cannot_access_each_others_files(self) -> None:
        self.data_root.joinpath("alice").mkdir()
        alice_file = self.data_root / "alice" / "private.docx"
        alice_file.write_bytes(b"alice")

        with patch.object(main, "current_username", AsyncMock(return_value="bob")):
            listed = await self.client.get("/files")
            read_other = await self.client.get("/files/private.docx")
            overwrite_same_name = await self.client.put(
                "/files/private.docx", content=b"bob"
            )
            delete_same_name = await self.client.delete("/files/private.docx")

        self.assertEqual(listed.json()["files"], [])
        self.assertEqual(read_other.status_code, 404)
        self.assertEqual(overwrite_same_name.status_code, 200)
        self.assertEqual(delete_same_name.status_code, 200)
        self.assertEqual(alice_file.read_bytes(), b"alice")
        self.assertFalse(self.data_root.joinpath("bob", "private.docx").exists())

    async def test_versioned_api_supports_the_full_file_lifecycle(self) -> None:
        health = await self.client.get("/api/v1/health")
        saved = await self.client.put(
            "/api/v1/files/agent-report.docx", content=b"agent output"
        )
        listed = await self.client.get("/api/v1/files")
        downloaded = await self.client.get("/api/v1/files/agent-report.docx")
        renamed = await self.client.patch(
            "/api/v1/files/agent-report.docx",
            json={"name": "renamed-report.docx"},
        )
        renamed_download = await self.client.get(
            "/api/v1/files/renamed-report.docx"
        )
        deleted = await self.client.delete("/api/v1/files/renamed-report.docx")

        self.assertEqual(health.json(), {"status": "ok"})
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(
            [item["name"] for item in listed.json()["files"]],
            ["agent-report.docx"],
        )
        self.assertEqual(downloaded.content, b"agent output")
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.json()["name"], "renamed-report.docx")
        self.assertEqual(renamed_download.content, b"agent output")
        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(
            self.data_root.joinpath("local", "agent-report.docx").exists()
        )

    async def test_rename_rejects_existing_target_and_invalid_names(self) -> None:
        directory = self.data_root / "local"
        directory.mkdir()
        directory.joinpath("source.docx").write_bytes(b"source")
        directory.joinpath("existing.docx").write_bytes(b"existing")

        conflict = await self.client.patch(
            "/files/source.docx", json={"name": "existing.docx"}
        )
        invalid = await self.client.patch(
            "/files/source.docx", json={"name": "../escape.docx"}
        )

        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(directory.joinpath("source.docx").read_bytes(), b"source")
        self.assertEqual(
            directory.joinpath("existing.docx").read_bytes(), b"existing"
        )

    async def test_rejects_content_that_does_not_match_extension(self) -> None:
        """护栏只保护 PDF：内容是内核内部容器时不写坏文件。

        回归守卫——PDF 保存曾把内核内部容器（docx 结构）写成 .pdf：文件当场
        "保存成功"，下次打开报「内容与扩展名不一致」，原内容不可恢复。
        其它扩展名**不校验**：客户端给 .doc/.xls/.ppt 交付的本来就是 OOXML
        （zip）字节，Word/Excel 照常打开；按魔数硬校验会把正常保存拦成 400
        （线上真实发生过：EMC及安规测试委托认证申请表(1).doc 保存失败）。
        """
        directory = self.data_root / "local"
        directory.mkdir(exist_ok=True)

        # 正常内容放行
        good_pdf = await self.client.put(
            "/files/report.pdf", content=b"%PDF-1.7\n...\n%%EOF\n"
        )
        good_doc = await self.client.put(
            "/files/legacy.doc", content=b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1old-doc"
        )
        # docx 容器冒充 pdf，且目标文件不存在（文档已在"我的文档"里被删除、
        # 却仍在编辑器里打开、每 10 秒自动保存一次的真实场景）：
        # 不写坏、不报错、也不新建文件
        fake_pdf = await self.client.put(
            "/files/report2.pdf", content=b"PK\x03\x04\x14\x00\x00\x00word/"
        )
        # .doc 收到 OOXML（zip）字节：放行落盘，不能拦（Word 能正常打开）
        ooxml_doc = await self.client.put(
            "/files/legacy2.doc", content=b"PK\x03\x04\x14\x00\x00\x00word/"
        )
        # 已存在的有效 PDF 收到容器内容：保持原文件不动，但回成功（Ctrl+S 不能报错）
        kept = await self.client.put(
            "/files/report.pdf", content=b"PK\x03\x04\x14\x00\x00\x00word/"
        )

        self.assertEqual(good_pdf.status_code, 200)
        self.assertEqual(good_doc.status_code, 200)
        self.assertEqual(fake_pdf.status_code, 200)
        self.assertTrue(fake_pdf.json().get("unchanged"))
        self.assertFalse(directory.joinpath("report2.pdf").exists())
        self.assertEqual(ooxml_doc.status_code, 200)
        self.assertEqual(kept.status_code, 200)
        self.assertTrue(kept.json().get("unchanged"))
        self.assertEqual(
            directory.joinpath("report.pdf").read_bytes(), b"%PDF-1.7\n...\n%%EOF\n"
        )
        self.assertEqual(
            directory.joinpath("legacy2.doc").read_bytes(),
            b"PK\x03\x04\x14\x00\x00\x00word/",
        )
        self.assertEqual(
            sorted(p.name for p in directory.iterdir()),
            ["legacy.doc", "legacy2.doc", "report.pdf"],
        )

    async def test_accepts_real_world_document_titles(self) -> None:
        """网页标题那种名字要能存下来：全角引号 / 顿号 / 空格都不是路径隐患。

        回归守卫——之前文件名走"常见标点白名单"，这类名字保存时被 400 拒绝，
        表现为「Ctrl+S 保存失败」。
        """
        title = (
            "总书记的人民情怀 _ “推动未来产业同新兴产业、"
            "传统产业相得益彰”__中国政府网.pdf"
        )
        directory = self.data_root / "local"

        saved = await self.client.put(
            f"/files/{title}", content=b"%PDF-1.7\nfake pdf body\n%%EOF\n"
        )
        # 老格式（Collabora 路线）也要能落到私有目录：打开前要把它推给服务端渲染
        legacy_ppt = await self.client.put(
            "/files/旧版演示.ppt", content=b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1ppt"
        )
        legacy_xls = await self.client.put(
            "/files/旧版表格.xls", content=b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1xls"
        )
        hidden = await self.client.put("/files/.hidden.pdf", content=b"x")
        wrong_ext = await self.client.put("/files/runner.exe", content=b"x")
        backslash = await self.client.put("/files/..\\escape.pdf", content=b"x")

        self.assertEqual(saved.status_code, 200)
        self.assertEqual(legacy_ppt.status_code, 200)
        self.assertEqual(legacy_xls.status_code, 200)
        self.assertEqual(
            directory.joinpath(title).read_bytes(),
            b"%PDF-1.7\nfake pdf body\n%%EOF\n",
        )
        for rejected in (hidden, wrong_ext, backslash):
            self.assertEqual(rejected.status_code, 400)
        self.assertEqual(
            sorted(p.name for p in directory.iterdir()),
            sorted([title, "旧版演示.ppt", "旧版表格.xls"]),
        )


class SharedSourceBrowsingTest(unittest.IsolatedAsyncioTestCase):
    """只读共享源（/exposed、NAS 挂载目录）的浏览与打开契约。"""

    async def asyncSetUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        base = Path(self.temp_dir.name)

        main.DATA_ROOT = base / "data"
        main.DATA_ROOT.mkdir()
        main.AUTH_DISABLED = True

        self._original_roots = (main.SHARED_ROOT, main.NAS_ROOT)
        self.addCleanup(self._restore_roots)
        self._original_writable = main.SHARED_WRITABLE
        self.addCleanup(self._restore_shared_writable)

        # 模拟 VOS 授权目录：workspace 下 public（公共）+ users/<用户>/data（私人）
        self.shared_root = base / "exposed"
        workspace = self.shared_root / "volumes" / "wr"
        (workspace / "public").mkdir(parents=True)
        (workspace / "users" / "alice" / "data").mkdir(parents=True)
        (self.shared_root / "lost+found").mkdir()
        main.SHARED_ROOT = self.shared_root
        main.NAS_ROOT = base / "nas-unmounted"

        public = workspace / "public"
        (public / "report.pptx").write_bytes(b"deck")
        (public / "budget.xlsx").write_bytes(b"sheet")
        (public / "notes.txt").write_bytes(b"notes")
        (public / "secret.exe").write_bytes(b"nope")
        (public / ".hidden.docx").write_bytes(b"hidden")
        (workspace / "users" / "alice" / "data" / "private-notes.docx").write_bytes(b"priv")

        transport = httpx.ASGITransport(app=main.app)
        self.client = httpx.AsyncClient(transport=transport, base_url="http://test")
        self.addAsyncCleanup(self.client.aclose)

        # 并发相关的状态是模块级的：上一个用例留下的协同锁 / 排队锁 / 幂等键
        # 会漏进下一个用例，必须在每个用例结束时清掉。
        self.addCleanup(main._wopi_locks.clear)
        self.addCleanup(main._copy_locks.clear)
        self.addCleanup(main._copy_idempotency.clear)

    def _restore_roots(self) -> None:
        main.SHARED_ROOT, main.NAS_ROOT = self._original_roots

    def _restore_shared_writable(self) -> None:
        main.SHARED_WRITABLE = self._original_writable

    async def test_browses_the_vos_workspace_layout(self) -> None:
        sources = await self.client.get("/api/v1/sources")
        root_entries = await self.client.get("/api/v1/sources/shared/entries")
        public_entries = await self.client.get(
            "/api/v1/sources/shared/entries",
            params={"path": "volumes/wr/public"},
        )
        user_entries = await self.client.get(
            "/api/v1/sources/shared/entries",
            params={"path": "volumes/wr/users/alice/data"},
        )

        self.assertEqual(
            [source["id"] for source in sources.json()["sources"]], ["shared"]
        )
        # 默认允许写回（编辑原文档）；只读开关的用例见 test_read_only_mode_*
        self.assertFalse(sources.json()["sources"][0]["readOnly"])
        # lost+found 属系统目录，不入列表
        self.assertEqual(
            [entry["name"] for entry in root_entries.json()["entries"]], ["volumes"]
        )
        self.assertEqual(
            [entry["name"] for entry in public_entries.json()["entries"]],
            ["budget.xlsx", "notes.txt", "report.pptx"],
        )
        self.assertEqual(public_entries.json()["path"], "volumes/wr/public")
        self.assertEqual(public_entries.json()["parent"], "volumes/wr")
        self.assertEqual(
            [entry["name"] for entry in user_entries.json()["entries"]],
            ["private-notes.docx"],
        )

    async def test_entries_expose_directory_metadata(self) -> None:
        entries = (
            await self.client.get(
                "/api/v1/sources/shared/entries",
                params={"path": "volumes/wr"},
            )
        ).json()["entries"]

        self.assertEqual([entry["name"] for entry in entries], ["public", "users"])
        self.assertTrue(all(entry["isDir"] for entry in entries))
        self.assertEqual(
            [entry["path"] for entry in entries],
            ["volumes/wr/public", "volumes/wr/users"],
        )

    async def test_opens_a_document_and_rejects_everything_else(self) -> None:
        opened = await self.client.get(
            "/api/v1/sources/shared/file",
            params={"path": "volumes/wr/public/report.pptx"},
        )
        traversal = await self.client.get(
            "/api/v1/sources/shared/file", params={"path": "../../../etc/passwd"}
        )
        unsupported = await self.client.get(
            "/api/v1/sources/shared/file",
            params={"path": "volumes/wr/public/secret.exe"},
        )
        missing = await self.client.get(
            "/api/v1/sources/shared/file",
            params={"path": "volumes/wr/public/missing.pptx"},
        )
        no_path = await self.client.get("/api/v1/sources/shared/file")
        empty_path = await self.client.get(
            "/api/v1/sources/shared/file", params={"path": ""}
        )

        self.assertEqual(opened.status_code, 200)
        self.assertEqual(opened.content, b"deck")
        self.assertEqual(traversal.status_code, 400)
        self.assertEqual(unsupported.status_code, 400)
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(no_path.status_code, 422)  # 缺少必填 path
        self.assertEqual(empty_path.status_code, 400)

    async def test_directory_traversal_is_rejected_for_listing(self) -> None:
        escaped = await self.client.get(
            "/api/v1/sources/shared/entries", params={"path": "../.."}
        )
        unknown_source = await self.client.get("/api/v1/sources/nas/entries")

        self.assertEqual(escaped.status_code, 400)
        # NAS 未挂载：源不可用（前端因此不会展示入口）
        self.assertEqual(unknown_source.status_code, 404)

    async def test_symlinks_escaping_the_root_are_hidden(self) -> None:
        outside = Path(self.temp_dir.name) / "outside"
        outside.mkdir()
        (outside / "leak.docx").write_bytes(b"leak")
        link = self.shared_root / "escape"
        try:
            link.symlink_to(outside, target_is_directory=True)
        except OSError as exc:  # pragma: no cover - 平台不支持软链时跳过
            self.skipTest(f"symlinks unavailable: {exc}")

        entries = (await self.client.get("/api/v1/sources/shared/entries")).json()
        opened = await self.client.get(
            "/api/v1/sources/shared/file", params={"path": "escape/leak.docx"}
        )

        self.assertEqual([entry["name"] for entry in entries["entries"]], ["volumes"])
        self.assertEqual(opened.status_code, 400)

    async def test_scan_runs_off_the_event_loop(self) -> None:
        """目录遍历必须在工作线程里跑：期间事件循环仍要能调度别的协程。

        回归守卫——同步遍历会把单进程服务卡到遍历结束（实测 781ms 里事件循环
        只调度了 1 次），表现为「打开 / 保存 / 列文档全都慢」。
        """
        calls = 0

        def slow_walk(_root, _directory):
            nonlocal calls
            calls += 1
            time.sleep(0.2)  # 模拟慢盘
            return [], False

        ticks = 0

        async def heartbeat() -> None:
            nonlocal ticks
            while True:
                ticks += 1
                await asyncio.sleep(0.01)

        with patch.object(main, "_walk_documents_sync", slow_walk):
            beat = asyncio.create_task(heartbeat())
            response = await self.client.get(
                "/api/v1/sources/shared/documents",
                params={"path": "volumes/wr/public"},
            )
            beat.cancel()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(calls, 1)
        # 修复前这里只会有 0~1 次心跳（事件循环被占死）
        self.assertGreater(ticks, 5)

    async def test_mounted_authorized_dir_wins_over_scaffolding(self) -> None:
        """授权目录是单独挂进来的子目录时，公共入口必须指向它本身。

        平台把用户选定的公共目录挂成 /exposed/<空间>/public/<目录>（bind mount），
        父目录 public 只是脚手架。若照脚手架路径读写，用户在自己的公共文件夹
        里看不到这些文件——就是"上传了却看不到"。
        """
        public = self.shared_root / "volumes" / "wr" / "public"
        authorized = public / "office"
        authorized.mkdir()
        (authorized / "inside.docx").write_bytes(b"x")
        mounts = {authorized}

        with patch.object(main, "_is_mount_point", lambda path: Path(path) in mounts):
            roots = main._shared_roots("alice")

        self.assertEqual(roots[0]["path"], "volumes/wr/public/office")
        self.assertEqual(roots[0]["kind"], "public")

    async def test_copies_a_private_document_into_the_public_folder(self) -> None:
        """「我的文档」→ 公共目录：服务端复制、默认不覆盖、只读时拒绝。"""
        original_writable = main.SHARED_WRITABLE
        self.addCleanup(setattr, main, "SHARED_WRITABLE", original_writable)

        public = self.shared_root / "volumes" / "wr" / "public"
        params = {"name": "季度报告.docx", "path": "volumes/wr/public"}

        uploaded = await self.client.put(
            "/api/v1/files/季度报告.docx", content=b"private-bytes"
        )
        copied = await self.client.post(
            "/api/v1/sources/shared/copy-from-file", params=params
        )
        again = await self.client.post(
            "/api/v1/sources/shared/copy-from-file", params=params
        )
        missing = await self.client.post(
            "/api/v1/sources/shared/copy-from-file",
            params={"name": "不存在.docx", "path": "volumes/wr/public"},
        )
        traversal = await self.client.post(
            "/api/v1/sources/shared/copy-from-file",
            params={"name": "季度报告.docx", "path": "../../escape"},
        )
        main.SHARED_WRITABLE = False
        readonly = await self.client.post(
            "/api/v1/sources/shared/copy-from-file", params=params
        )
        main.SHARED_WRITABLE = True

        self.assertEqual(uploaded.status_code, 200)
        # 新建走 201：调用方要能区分"新写入"和"覆盖了别人的东西"
        self.assertEqual(copied.status_code, 201)
        self.assertEqual(copied.json()["status"], "created")
        self.assertEqual(copied.json()["path"], "volumes/wr/public/季度报告.docx")
        # 回报的内容版本是后续「覆盖」要带的 if-match 凭据，必须非空
        self.assertTrue(copied.json()["version"])
        self.assertEqual((public / "季度报告.docx").read_bytes(), b"private-bytes")
        # 同名默认拒绝（fail），且不能动到已有文件；409 要带回当前文件信息，
        # 否则界面没法让用户做"覆盖 / 保留两者 / 取消"的选择
        self.assertEqual(again.status_code, 409)
        self.assertEqual(again.json()["detail"]["reason"], "target-exists")
        self.assertEqual(
            again.json()["detail"]["current"]["name"], "季度报告.docx"
        )
        self.assertEqual((public / "季度报告.docx").read_bytes(), b"private-bytes")
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(traversal.status_code, 400)
        self.assertEqual(readonly.status_code, 403)

    async def test_copies_a_shared_document_into_my_documents(self) -> None:
        """NAS → 我的文档：服务端复制、默认不覆盖、路径越权拒绝。"""
        public = self.shared_root / "volumes" / "wr" / "public"
        (public / "共享样本.docx").write_bytes(b"shared-bytes")
        params = {"path": "volumes/wr/public/共享样本.docx"}

        copied = await self.client.post(
            "/api/v1/sources/shared/copy-to-file", params=params
        )
        again = await self.client.post(
            "/api/v1/sources/shared/copy-to-file", params=params
        )
        missing = await self.client.post(
            "/api/v1/sources/shared/copy-to-file",
            params={"path": "volumes/wr/public/none.docx"},
        )
        traversal = await self.client.post(
            "/api/v1/sources/shared/copy-to-file", params={"path": "../../escape.docx"}
        )
        listed = await self.client.get("/api/v1/files")

        stored = main.DATA_ROOT / "local" / "共享样本.docx"
        self.assertEqual(copied.status_code, 200)
        self.assertEqual(copied.json()["name"], "共享样本.docx")
        self.assertEqual(stored.read_bytes(), b"shared-bytes")
        # 同名默认拒绝，不动已有文件
        self.assertEqual(again.status_code, 409)
        self.assertEqual(stored.read_bytes(), b"shared-bytes")
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(traversal.status_code, 400)
        self.assertIn("共享样本.docx", [f["name"] for f in listed.json()["files"]])

    async def test_no_sources_when_nothing_is_mounted(self) -> None:
        main.SHARED_ROOT = Path(self.temp_dir.name) / "absent"

        sources = await self.client.get("/api/v1/sources")

        self.assertEqual(sources.json()["sources"], [])

    async def test_writes_an_edited_document_back_to_the_shared_file(self) -> None:
        public = self.shared_root / "volumes" / "wr" / "public"
        report = public / "report.pptx"

        saved = await self.client.put(
            "/api/v1/sources/shared/file",
            params={"path": "volumes/wr/public/report.pptx"},
            content=b"edited-deck",
        )
        read_back = await self.client.get(
            "/api/v1/sources/shared/file",
            params={"path": "volumes/wr/public/report.pptx"},
        )
        created = await self.client.put(
            "/api/v1/sources/shared/file",
            params={"path": "volumes/wr/public/new-deck.pptx"},
            content=b"fresh",
        )
        unsupported = await self.client.put(
            "/api/v1/sources/shared/file",
            params={"path": "volumes/wr/public/secret.exe"},
            content=b"x",
        )
        traversal = await self.client.put(
            "/api/v1/sources/shared/file",
            params={"path": "../../escape.pptx"},
            content=b"x",
        )
        empty = await self.client.put(
            "/api/v1/sources/shared/file",
            params={"path": "volumes/wr/public/report.pptx"},
            content=b"",
        )

        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(report.read_bytes(), b"edited-deck")
        self.assertEqual(read_back.content, b"edited-deck")
        self.assertEqual(created.status_code, 200)
        self.assertTrue((public / "new-deck.pptx").is_file())
        self.assertEqual(unsupported.status_code, 400)
        self.assertEqual(traversal.status_code, 400)
        self.assertEqual(empty.status_code, 400)
        # 非法的空写入不得破坏原文件
        self.assertEqual(report.read_bytes(), b"edited-deck")

    async def test_read_only_mode_refuses_writes(self) -> None:
        report = self.shared_root / "volumes" / "wr" / "public" / "report.pptx"
        main.SHARED_WRITABLE = False

        sources = await self.client.get("/api/v1/sources")
        blocked = await self.client.put(
            "/api/v1/sources/shared/file",
            params={"path": "volumes/wr/public/report.pptx"},
            content=b"nope",
        )

        self.assertTrue(sources.json()["sources"][0]["readOnly"])
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(report.read_bytes(), b"deck")

    async def test_collabora_wopi_edits_the_shared_original(self) -> None:
        report = self.shared_root / "volumes" / "wr" / "public" / "report.pptx"
        token = await self._shared_wopi_token("volumes/wr/public/report.pptx")

        info = await self.client.get(
            "/wopi/files/volumes/wr/public/report.pptx",
            params={"access_token": token},
        )
        contents = await self.client.get(
            "/wopi/files/volumes/wr/public/report.pptx/contents",
            params={"access_token": token},
        )
        saved = await self.client.post(
            "/wopi/files/volumes/wr/public/report.pptx/contents",
            params={"access_token": token},
            content=b"collabora-edited",
        )
        mismatched = await self.client.get(
            "/wopi/files/volumes/wr/public/budget.xlsx",
            params={"access_token": token},
        )

        self.assertEqual(info.status_code, 200)
        self.assertEqual(info.json()["BaseFileName"], "report.pptx")
        self.assertTrue(info.json()["UserCanWrite"])
        self.assertEqual(contents.content, b"deck")
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(report.read_bytes(), b"collabora-edited")
        # 令牌绑定具体文件：换成同目录另一个文件必须被拒
        self.assertEqual(mismatched.status_code, 403)

    async def test_read_only_wopi_token_cannot_overwrite_the_original(self) -> None:
        report = self.shared_root / "volumes" / "wr" / "public" / "report.pptx"
        token = await self._shared_wopi_token("volumes/wr/public/report.pptx", edit=False)

        info = await self.client.get(
            "/wopi/files/volumes/wr/public/report.pptx",
            params={"access_token": token},
        )
        blocked = await self.client.post(
            "/wopi/files/volumes/wr/public/report.pptx/contents",
            params={"access_token": token},
            content=b"nope",
        )

        self.assertFalse(info.json()["UserCanWrite"])
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(report.read_bytes(), b"deck")

    async def test_collabora_editor_url_carries_the_ui_language(self) -> None:
        """界面语言随会话下发；缺省/非法值不拼 lang，维持「跟随浏览器语言」。

        Collabora 默认只跟随浏览器语言：应用内切了语言编辑器不会跟着变，因此
        前端按应用语言显式下发。非法值必须丢掉而不是原样拼进 URL。
        """
        template = "http://collabora:9980/browser/abc/cool.html?"
        with patch.object(
            main, "_collabora_discover", AsyncMock(return_value=template)
        ):
            zh = await main._collabora_editor_url("http://wopi/x", "tok", "zh-CN")
            absent = await main._collabora_editor_url("http://wopi/x", "tok")
            malformed = await main._collabora_editor_url(
                "http://wopi/x", "tok", "zh CN; drop"
            )

        self.assertIn("&lang=zh-CN", zh)
        self.assertNotIn("lang=", absent)
        self.assertNotIn("lang=", malformed)

    async def _shared_wopi_token(self, path: str, edit: bool = True) -> str:
        """换一份共享源的 WOPI 令牌；Collabora discovery 在单测里用桩替代。"""
        with patch.object(
            main,
            "_collabora_editor_url",
            AsyncMock(return_value="http://collabora/editor"),
        ):
            response = await self.client.post(
                "/api/v1/wopi/session",
                params={"source": "shared", "path": path, "edit": "1" if edit else "0"},
            )
        self.assertEqual(response.status_code, 200)
        return response.json()["accessToken"]

    async def test_publish_overwrite_needs_the_version_the_user_saw(self) -> None:
        """覆盖必须带"我看到的那个版本"；凭据过期或缺失一律拒绝。

        这是整条链路的关键不变量：用户确认的是他看过的那一版，不是"当前随便
        哪一版"。缺凭据就退化成 fail，绝不退化成无条件覆盖。
        """
        public = self.shared_root / "volumes" / "wr" / "public"
        target = public / "报表.docx"
        params = {"name": "报表.docx", "path": "volumes/wr/public"}
        await self.client.put("/api/v1/files/报表.docx", content=b"mine-v1")

        created = await self.client.post(
            "/api/v1/sources/shared/copy-from-file", params=params
        )
        seen = created.json()["version"]

        # 别人把盘上那份改掉了：我手里的凭据已经过期
        target.write_bytes(b"someone-else")
        stale = await self.client.post(
            "/api/v1/sources/shared/copy-from-file",
            params={**params, "on-conflict": "overwrite", "if-match": seen},
        )
        # 旧的 overwrite=true 仍然接受，但没有凭据时必须退化成 fail
        legacy = await self.client.post(
            "/api/v1/sources/shared/copy-from-file",
            params={**params, "overwrite": "true"},
        )

        self.assertEqual(created.status_code, 201)
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.json()["detail"]["reason"], "version-changed")
        self.assertEqual(legacy.status_code, 409)
        self.assertEqual(legacy.json()["detail"]["reason"], "target-exists")
        # 两次拒绝之后盘上那份必须原封不动
        self.assertEqual(target.read_bytes(), b"someone-else")

    async def test_overwrite_keeps_the_previous_bytes_in_history(self) -> None:
        """覆盖成功要留底并回报 previousVersion —— 否则误覆盖不可回滚。"""
        public = self.shared_root / "volumes" / "wr" / "public"
        target = public / "留底.docx"
        params = {"name": "留底.docx", "path": "volumes/wr/public"}

        await self.client.put("/api/v1/files/留底.docx", content=b"first")
        await self.client.post(
            "/api/v1/sources/shared/copy-from-file", params=params
        )
        current = (
            await self.client.get(
                "/api/v1/sources/shared/version",
                params={"path": "volumes/wr/public/留底.docx"},
            )
        ).json()

        await self.client.put("/api/v1/files/留底.docx", content=b"second")
        overwritten = await self.client.post(
            "/api/v1/sources/shared/copy-from-file",
            params={
                **params,
                "on-conflict": "overwrite",
                "if-match": current["version"],
            },
        )

        self.assertEqual(overwritten.status_code, 200)
        body = overwritten.json()
        self.assertEqual(body["status"], "overwritten")
        self.assertEqual(body["previousVersion"], current["version"])
        self.assertNotEqual(body["version"], current["version"])
        self.assertEqual(target.read_bytes(), b"second")

        # 备份里是被覆盖掉的那一版，文件名带它的版本号前缀
        self.assertTrue(body["backup"].startswith(main.HISTORY_DIR_NAME + "/"))
        self.assertIn(current["version"][:8], body["backup"])
        self.assertEqual((public / body["backup"]).read_bytes(), b"first")

    async def test_concurrent_publishes_let_exactly_one_win(self) -> None:
        """同一个目标名同时发两次「存入」：只能有一个成功，另一个必须收到冲突。

        两个请求在目标不存在时同时进来，一个有界锁把它们串起来，后来者看到的是
        "已经存在"，而不是各自通过检查后互相覆盖。
        """
        public = self.shared_root / "volumes" / "wr" / "public"
        await self.client.put("/api/v1/files/并发.docx", content=b"concurrent")
        params = {"name": "并发.docx", "path": "volumes/wr/public"}

        first, second = await asyncio.gather(
            self.client.post("/api/v1/sources/shared/copy-from-file", params=params),
            self.client.post("/api/v1/sources/shared/copy-from-file", params=params),
        )

        self.assertEqual(sorted([first.status_code, second.status_code]), [201, 409])
        self.assertEqual((public / "并发.docx").read_bytes(), b"concurrent")

    async def test_publish_refuses_a_file_that_is_being_edited(self) -> None:
        """别人正在协同编辑这份文件时，「覆盖添加」必须先被挡住。

        Collabora 手里握着整份内存副本，它下一次保存会把我们刚写进去的内容整份
        写回去，而且双方都不会收到任何提示。这里锁的是"另一个用户"，发布者自己
        持锁不算冲突。
        """
        public = self.shared_root / "volumes" / "wr" / "public"
        target = public / "report.pptx"
        await self.client.put("/api/v1/files/report.pptx", content=b"mine")

        alice = main.issue_wopi_token(
            "alice", "volumes/wr/public/report.pptx", True, "shared"
        )
        locked = await self.client.post(
            "/wopi/files/volumes/wr/public/report.pptx",
            params={"access_token": alice},
            headers={"X-WOPI-Override": "LOCK", "X-WOPI-Lock": "alice-lock"},
        )
        blocked = await self.client.post(
            "/api/v1/sources/shared/copy-from-file",
            params={"name": "report.pptx", "path": "volumes/wr/public"},
        )

        self.assertEqual(locked.status_code, 200)
        self.assertEqual(blocked.status_code, 423)
        self.assertEqual(blocked.json()["detail"]["reason"], "in-use")
        self.assertEqual(blocked.json()["detail"]["holder"], "alice")
        self.assertEqual(target.read_bytes(), b"deck")

    async def test_publish_rename_keeps_both_files(self) -> None:
        """"保留两者"由服务端在锁内挑名字：前端挑名字必然又是一次竞态。"""
        public = self.shared_root / "volumes" / "wr" / "public"
        (public / "重复.docx").write_bytes(b"theirs")
        await self.client.put("/api/v1/files/重复.docx", content=b"mine")

        renamed = await self.client.post(
            "/api/v1/sources/shared/copy-from-file",
            params={
                "name": "重复.docx",
                "path": "volumes/wr/public",
                "on-conflict": "rename",
            },
        )

        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.json()["status"], "renamed")
        self.assertEqual(
            renamed.json()["path"], "volumes/wr/public/重复 (1).docx"
        )
        self.assertEqual((public / "重复.docx").read_bytes(), b"theirs")
        self.assertEqual((public / "重复 (1).docx").read_bytes(), b"mine")

    async def test_idempotency_key_turns_a_retry_into_a_no_op(self) -> None:
        """超时后用户再点一次（同一个幂等键）：只写一遍、只留一份底。"""
        public = self.shared_root / "volumes" / "wr" / "public"
        target = public / "幂等.docx"
        params = {"name": "幂等.docx", "path": "volumes/wr/public"}

        await self.client.put("/api/v1/files/幂等.docx", content=b"v1")
        await self.client.post(
            "/api/v1/sources/shared/copy-from-file", params=params
        )
        current = (
            await self.client.get(
                "/api/v1/sources/shared/version",
                params={"path": "volumes/wr/public/幂等.docx"},
            )
        ).json()

        await self.client.put("/api/v1/files/幂等.docx", content=b"v2")
        retry = {
            **params,
            "on-conflict": "overwrite",
            "if-match": current["version"],
            "idempotency-key": "retry-1",
        }
        first = await self.client.post(
            "/api/v1/sources/shared/copy-from-file", params=retry
        )
        second = await self.client.post(
            "/api/v1/sources/shared/copy-from-file", params=retry
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json(), second.json())
        self.assertEqual(target.read_bytes(), b"v2")
        self.assertEqual(
            len(list((public / main.HISTORY_DIR_NAME).iterdir())), 1
        )

    async def test_history_directory_is_not_reachable_through_the_api(self) -> None:
        """留底目录必须彻底不可达：否则猜得到路径的人能把备份列出来取走。"""
        public = self.shared_root / "volumes" / "wr" / "public"
        params = {"name": "备份.docx", "path": "volumes/wr/public"}

        await self.client.put("/api/v1/files/备份.docx", content=b"v1")
        await self.client.post(
            "/api/v1/sources/shared/copy-from-file", params=params
        )
        current = (
            await self.client.get(
                "/api/v1/sources/shared/version",
                params={"path": "volumes/wr/public/备份.docx"},
            )
        ).json()
        await self.client.put("/api/v1/files/备份.docx", content=b"v2")
        await self.client.post(
            "/api/v1/sources/shared/copy-from-file",
            params={
                **params,
                "on-conflict": "overwrite",
                "if-match": current["version"],
            },
        )
        backup_name = next((public / main.HISTORY_DIR_NAME).iterdir()).name

        listed = await self.client.get(
            "/api/v1/sources/shared/entries",
            params={"path": main.HISTORY_DIR_NAME},
        )
        fetched = await self.client.get(
            "/api/v1/sources/shared/file",
            params={"path": f"{main.HISTORY_DIR_NAME}/{backup_name}"},
        )
        top = await self.client.get(
            "/api/v1/sources/shared/entries", params={"path": "volumes/wr/public"}
        )

        self.assertEqual(listed.status_code, 400)
        self.assertEqual(fetched.status_code, 400)
        self.assertNotIn(
            main.HISTORY_DIR_NAME, [e["name"] for e in top.json()["entries"]]
        )

    async def test_wopi_save_rejects_a_stale_version(self) -> None:
        """Collabora 保存时若盘上内容已被别人改过，必须拒 —— 否则整份内存副本
        写回去会把别人刚写进来的内容抹掉，而且双方都没有任何提示。"""
        report = self.shared_root / "volumes" / "wr" / "public" / "report.pptx"
        token = await self._shared_wopi_token("volumes/wr/public/report.pptx")
        info = await self.client.get(
            "/wopi/files/volumes/wr/public/report.pptx",
            params={"access_token": token},
        )
        opened_version = info.json()["Version"]

        # 别人用「覆盖添加」换掉了盘上那份，并强制推进 mtime（秒级精度的文件系统）
        report.write_bytes(b"someone-else")
        os.utime(report, (time.time() + 10, time.time() + 10))

        stale = await self.client.post(
            "/wopi/files/volumes/wr/public/report.pptx/contents",
            params={"access_token": token},
            headers={"X-WOPI-ItemVersion": opened_version},
            content=b"stale-save",
        )
        fresh = await self.client.post(
            "/wopi/files/volumes/wr/public/report.pptx/contents",
            params={"access_token": token},
            headers={"X-WOPI-ItemVersion": main._file_token(report)},
            content=b"fresh-save",
        )

        self.assertNotEqual(opened_version, main._file_token(report))
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.json()["error"], "version mismatch")
        self.assertEqual(fresh.status_code, 200)
        self.assertEqual(report.read_bytes(), b"fresh-save")

    async def test_reports_resolved_authorized_roots(self) -> None:
        """源列表直接给出已解析的授权入口，前端不必自己穿平台内部路径。"""
        sources = (await self.client.get("/api/v1/sources")).json()["sources"]

        self.assertEqual(
            [root["name"] for root in sources[0]["roots"]],
            ["公共", "用户（alice）"],
        )
        self.assertEqual(
            [root["path"] for root in sources[0]["roots"]],
            ["volumes/wr/public", "volumes/wr/users/alice/data"],
        )

    async def test_exposes_public_and_user_data_as_entries(self) -> None:
        """入口按平台语义给出「公共目录」与「用户数据」，不含 volumes 等脚手架层。"""
        base = Path(self.temp_dir.name) / "exposed-two-entries"
        space = base / "volumes" / "01M31B5XDFHPXSKCBSXAZVZA83"
        media_video = space / "public" / "media_video"
        media_video.mkdir(parents=True)
        (media_video / "课件.pptx").write_bytes(b"deck")
        (media_video / "setup.exe").write_bytes(b"x")
        (space / "users" / "admin" / "data").mkdir(parents=True)
        main.SHARED_ROOT = base

        with patch.object(main, "current_username", AsyncMock(return_value="admin")):
            sources = (await self.client.get("/api/v1/sources")).json()["sources"]
        roots = sources[0]["roots"]

        self.assertEqual(
            [root["name"] for root in roots],
            ["公共", "用户（admin）"],
        )
        self.assertEqual(
            [root["path"] for root in roots],
            [
                "volumes/01M31B5XDFHPXSKCBSXAZVZA83/public",
                "volumes/01M31B5XDFHPXSKCBSXAZVZA83/users/admin/data",
            ],
        )

        # 公共目录的下一层就是用户自己的目录结构，再进去只列可编辑文档
        public = (
            await self.client.get(
                "/api/v1/sources/shared/entries", params={"path": roots[0]["path"]}
            )
        ).json()
        self.assertEqual([entry["name"] for entry in public["entries"]], ["media_video"])

        detail = (
            await self.client.get(
                "/api/v1/sources/shared/entries",
                params={"path": f"{roots[0]['path']}/media_video"},
            )
        ).json()
        self.assertEqual(
            [entry["name"] for entry in detail["entries"]], ["课件.pptx"]
        )

    async def test_deduplicates_the_volumes_alias_of_the_same_space(self) -> None:
        """平台同时挂 /exposed/<空间> 与 /exposed/volumes/<别名>（软链）时不重复列。"""
        base = Path(self.temp_dir.name) / "exposed-with-alias"
        space = base / "01M31B5XDFHPXSKCBSXAZVZA83"
        media_video = space / "public" / "media_video"
        media_video.mkdir(parents=True)
        (media_video / "借用协议模版.docx").write_bytes(b"doc")
        (base / "volumes").mkdir()
        try:
            (base / "volumes" / "vos_workspace").symlink_to(space)
        except OSError as exc:  # pragma: no cover - 不支持软链的平台跳过
            self.skipTest(f"symlinks unavailable: {exc}")
        main.SHARED_ROOT = base

        sources = (await self.client.get("/api/v1/sources")).json()["sources"]

        # 直挂路径与 volumes 别名软链指向同一目录：只保留一个入口，不重复
        self.assertEqual(
            [root["name"] for root in sources[0]["roots"]], ["公共"]
        )

    async def test_walks_all_levels_and_flattens_documents(self) -> None:
        """挂载 A/B/C 时，把 C 及其子目录里的可打开文档全部遍历出来。"""
        base = Path(self.temp_dir.name) / "exposed-walk"
        public = base / "volumes" / "space" / "public"
        deep = public / "A" / "B" / "C"
        deep.mkdir(parents=True)
        (deep / "课件.pptx").write_bytes(b"deck")
        (deep / "宣传.pptx").write_bytes(b"deck")
        (deep / "素材.mp4").write_bytes(b"x")
        (public / "顶层.xlsx").write_bytes(b"sheet")
        hidden = public / ".thumbnails"
        hidden.mkdir()
        (hidden / "隐藏.docx").write_bytes(b"x")
        (public / "lost+found").mkdir()
        (public / "lost+found" / "系统.docx").write_bytes(b"x")
        main.SHARED_ROOT = base

        listing = (
            await self.client.get(
                "/api/v1/sources/shared/documents",
                params={"path": "volumes/space/public"},
            )
        ).json()
        by_name = {doc["name"]: doc for doc in listing["documents"]}

        self.assertEqual(sorted(by_name), ["宣传.pptx", "课件.pptx", "顶层.xlsx"])
        self.assertEqual(by_name["课件.pptx"]["folder"], "A/B/C")
        self.assertEqual(by_name["顶层.xlsx"]["folder"], "")
        self.assertEqual(
            by_name["课件.pptx"]["path"], "volumes/space/public/A/B/C/课件.pptx"
        )
        self.assertFalse(listing["truncated"])

    async def test_walk_stops_at_the_document_limit(self) -> None:
        base = Path(self.temp_dir.name) / "exposed-walk-limit"
        public = base / "volumes" / "space" / "public"
        public.mkdir(parents=True)
        for index in range(3):
            (public / f"文档{index}.docx").write_bytes(b"x")
        main.SHARED_ROOT = base
        original = main.MAX_WALK_DOCUMENTS
        main.MAX_WALK_DOCUMENTS = 2
        self.addCleanup(setattr, main, "MAX_WALK_DOCUMENTS", original)

        listing = (
            await self.client.get(
                "/api/v1/sources/shared/documents",
                params={"path": "volumes/space/public"},
            )
        ).json()

        self.assertEqual(len(listing["documents"]), 2)
        self.assertTrue(listing["truncated"])

    async def test_keeps_a_folder_that_has_multiple_branches(self) -> None:
        """授权目录下确实有多条分支时不折叠，让用户自己逐层进入。"""
        public = (
            Path(self.temp_dir.name)
            / "exposed-multi-branch"
            / "volumes"
            / "space"
            / "public"
        )
        (public / "电影").mkdir(parents=True)
        (public / "电视剧").mkdir(parents=True)
        main.SHARED_ROOT = public.parent.parent.parent

        sources = (await self.client.get("/api/v1/sources")).json()["sources"]

        self.assertEqual(
            [root["name"] for root in sources[0]["roots"]], ["公共"]
        )


if __name__ == "__main__":
    unittest.main()
