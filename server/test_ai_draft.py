"""草稿块与文档标题的往返测试。

这一层曾经整个没有测试，于是漏掉两个 bug：

1. **标题会累积**。markdown 的一级标题（`# 标题`）是文档标题本身，可它一旦被
   markdown_to_blocks 当成一个正文块存进 blocks，就会跟着「## 标题」出现在正文里；
   从编辑器回读（docx_to_md → markdown_to_blocks）时首行标题又变成一个块，下一轮
   导出多一行，再回读再多一行——用户看到的症状是「每改一轮，正文里多一个标题」。
2. **标题根本不该在正文**。产品口径：文档名只体现在「我的文档」的文件名和 Word
   标题栏里，正文从第一段实际内容开始。所以 draft_to_markdown 现在只输出 blocks，
   空正文导出成空串，端点据此回「还没有内容」，不再造一份只有标题的 docx。

跑法：
    cd server && python3 -m unittest test_ai_draft -v
"""

import json
import logging
import os
import tempfile
import unittest

# AI_HOME 是模块级常量（import 时就定了），指到临时目录，别往真实 /data/.ai 里写
os.environ.setdefault("V_OFFICE_AI_HOME", tempfile.mkdtemp(prefix="vo-ai-draft-home-"))

import ai  # noqa: E402

# ai.LOG 默认 None（main.py 启动时注入）；不接上，走到 LOG.info 的分支就炸
ai.LOG = logging.getLogger("test-ai-draft")


class TitleDedupTest(unittest.TestCase):
    """文档标题不该在正文里再出现一次。"""

    TITLE = "一种用于户用新风机的过滤模组"

    def test_doc_title_never_becomes_a_block(self):
        blocks = ai.markdown_to_blocks(
            f"# {self.TITLE}\n\n## 技术领域\n\n本方案涉及空气处理。", self.TITLE
        )
        self.assertEqual([b["heading"] for b in blocks], ["技术领域"])

    def test_piled_up_title_lines_dropped_at_once(self):
        """历史累积出来的多行同名标题要一次剥干净，而不是每轮只剥一个。"""
        blocks = ai.markdown_to_blocks(
            f"# {self.TITLE}\n\n## {self.TITLE}\n\n## {self.TITLE}\n\n## 技术领域\n\n正文",
            self.TITLE,
        )
        self.assertEqual([b["heading"] for b in blocks], ["技术领域"])

    def test_title_unknown_keeps_the_line(self):
        """title 为空时一律保留：宁可多一个块，也不能把标题内容丢了。"""
        blocks = ai.markdown_to_blocks(f"# {self.TITLE}\n\n正文", "")
        self.assertEqual(blocks[0]["heading"], self.TITLE)

    def test_same_heading_after_intro_kept(self):
        """只有**开头连续**的同名标题算重复；文档中间的同名标题是合法段落标题。"""
        blocks = ai.markdown_to_blocks(
            "## 技术领域\n\n正文甲\n\n## 引言\n\n正文乙", "引言"
        )
        self.assertEqual([b["heading"] for b in blocks], ["技术领域", "引言"])

    def test_whitespace_insensitive_match(self):
        """标题里的连续空格不算差异：markdown 与 docx 往返都会把空格变形。"""
        blocks = ai.markdown_to_blocks("# 一种  方案\n\n## 技术领域\n\n正文", "一种 方案")
        self.assertEqual([b["heading"] for b in blocks], ["技术领域"])


class RoundTripTest(unittest.TestCase):
    """导出 → 回读 → 再导出：正文里既不该有标题，也不该越滚越多。"""

    TITLE = "xjx50 年"

    def test_title_never_appears_in_body(self):
        """产品口径：文档名只体现在文件名和 Word 标题栏，正文从第一段内容开始。"""
        draft = {
            "title": self.TITLE,
            "blocks": [{"heading": "技术领域", "text": "本方案涉及空气处理。"}],
        }
        markdown = ai.draft_to_markdown(draft)
        self.assertNotIn(self.TITLE, markdown)
        self.assertEqual(markdown, "## 技术领域\n\n本方案涉及空气处理。")

    def test_empty_body_yields_empty_markdown(self):
        """空正文导出成空串——调用方据此回「还没有内容」，不再造只有标题的文件。"""
        self.assertEqual(ai.draft_to_markdown({"title": self.TITLE, "blocks": []}), "")
        self.assertEqual(
            ai.draft_to_markdown(
                {"title": self.TITLE, "blocks": [{"heading": "", "text": "  "}]}
            ),
            "",
        )

    def test_title_count_stays_zero_across_rounds(self):
        draft = {
            "title": self.TITLE,
            "blocks": [{"heading": "技术领域", "text": "本方案涉及空气处理。"}],
        }
        markdown = ai.draft_to_markdown(draft)
        for round_no in range(1, 6):
            draft = {**draft, "blocks": ai.markdown_to_blocks(markdown, draft["title"])}
            markdown = ai.draft_to_markdown(draft)
            with self.subTest(round=round_no):
                self.assertNotIn(
                    self.TITLE,
                    markdown,
                    f"第 {round_no} 轮后标题又冒进正文了：\n{markdown}",
                )

    def test_body_content_survives_round_trip(self):
        draft = {
            "title": self.TITLE,
            "blocks": [{"heading": "技术领域", "text": "本方案涉及空气处理。"}],
        }
        blocks = ai.markdown_to_blocks(ai.draft_to_markdown(draft), draft["title"])
        self.assertEqual(
            blocks, [{"heading": "技术领域", "text": "本方案涉及空气处理。"}]
        )


class ExportEndpointTest(unittest.IsolatedAsyncioTestCase):
    """导出/预览两个端点的空稿口径：没有正文就别产出只有标题的东西。"""

    TITLE = "leo messi"

    async def asyncSetUp(self):
        self._orig = (ai._user, ai._save_document, ai._convert_docx, ai._doc_exists)
        self.converted: list[str] = []
        self.saved: list[str] = []

        async def _user(_request):
            return "tester"

        def _save(_username, name, data):
            self.saved.append(name)
            return name

        async def _convert(*, src, **_kwargs):
            self.converted.append(src.decode("utf-8"))
            return b"PK\x03\x04fake-docx"

        ai._user = _user
        ai._save_document = _save
        ai._convert_docx = _convert
        ai._doc_exists = lambda *_a, **_k: False
        self.sid = "f" + "0" * 15
        (ai._sessions_root("tester") / self.sid).mkdir(parents=True, exist_ok=True)

    async def asyncTearDown(self):
        ai._user, ai._save_document, ai._convert_docx, ai._doc_exists = self._orig

    def _write(self, draft: dict) -> None:
        ai.save_draft("tester", self.sid, draft)

    async def test_empty_draft_refuses_to_export(self):
        self._write({"title": self.TITLE, "blocks": []})
        with self.assertRaises(ai.HTTPException) as ctx:
            await ai.export_docx(None, self.sid)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "还没有内容")
        self.assertEqual(self.converted, [], "空稿不该再起转换")
        self.assertEqual(self.saved, [], "空稿不该写出任何文件")

    async def test_empty_draft_html_is_blank(self):
        self._write({"title": self.TITLE, "blocks": []})
        resp = await ai.draft_html(None, self.sid)
        self.assertEqual(json.loads(resp.body.decode("utf-8"))["html"], "")

    async def test_empty_draft_blank_carrier_for_editor(self):
        """撰写室一进来就是 Collabora，空稿也得有文件可开——但载体必须完全空白。

        这条路径就是 `openEditor()` 走的（blank=1）：早先它被一起拒掉，撰写室
        直接卡在「编辑器内核打不开：还没有内容」。
        """
        self._write({"title": self.TITLE, "blocks": []})
        resp = await ai.export_docx(None, self.sid, blank=1)
        payload = json.loads(resp.body.decode("utf-8"))
        self.assertTrue(payload["saved"].startswith(self.TITLE))
        self.assertEqual(len(self.converted), 1)
        self.assertEqual(self.converted[0].strip(), "", "载体文档里不该有标题或任何字")
        self.assertEqual(self.saved, [payload["saved"]])

    async def test_blank_carrier_does_not_overwrite_existing_doc(self):
        """载体也不能覆盖同名已有文档：挡下时直接回那份已有文档的名字。"""
        self._write({"title": self.TITLE, "blocks": []})
        ai._doc_exists = lambda *_a, **_k: True
        resp = await ai.export_docx(None, self.sid, blank=1)
        payload = json.loads(resp.body.decode("utf-8"))
        self.assertEqual(payload["saved"], f"{self.TITLE}.docx")
        self.assertEqual(self.saved, [], "已有内容不该被空载体覆盖")

    async def test_export_markdown_has_no_title(self):
        self._write(
            {
                "title": self.TITLE,
                "blocks": [{"heading": "技术领域", "text": "本方案涉及空气处理。"}],
            }
        )
        await ai.export_docx(None, self.sid)
        self.assertEqual(len(self.converted), 1)
        self.assertNotIn(self.TITLE, self.converted[0])
        self.assertIn("本方案涉及空气处理。", self.converted[0])
        # 文件名仍然带文档名（只体现在文件名和 Word 标题栏）
        self.assertTrue(self.saved and self.saved[0].startswith(self.TITLE))


if __name__ == "__main__":
    unittest.main()
