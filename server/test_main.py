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


if __name__ == "__main__":
    unittest.main()
