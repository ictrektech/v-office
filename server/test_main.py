import tempfile
import unittest
from pathlib import Path

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
        target = self.data_root / "mapped.docx"
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


if __name__ == "__main__":
    unittest.main()
