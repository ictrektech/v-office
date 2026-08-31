import tempfile
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


if __name__ == "__main__":
    unittest.main()
