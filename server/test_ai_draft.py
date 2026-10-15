"""草稿块与文档标题的往返测试。

这一层曾经整个没有测试，于是漏掉一个会**累积**的 bug：markdown 的一级标题
（`# 标题`）是文档标题本身，draft_to_markdown 导出时会自己写这一行；它若再被
markdown_to_blocks 当成一个正文块存进 blocks，导出就成了「# 标题」紧跟着
「## 标题」。更糟的是从编辑器回读（docx_to_md → markdown_to_blocks）时首行标题
又变成一个块，下一轮导出多一行，再回读再多一行——用户看到的症状就是「每改一轮，
正文里多一个标题」。

跑法：
    cd server && python3 -m unittest test_ai_draft -v
"""

import os
import tempfile
import unittest

# AI_HOME 是模块级常量（import 时就定了），指到临时目录，别往真实 /data/.ai 里写
os.environ.setdefault("V_OFFICE_AI_HOME", tempfile.mkdtemp(prefix="vo-ai-draft-home-"))

import ai  # noqa: E402


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
    """导出 → 回读 → 再导出：标题不该越滚越多。"""

    TITLE = "xjx50 年"

    def test_title_count_stays_one_across_rounds(self):
        draft = {
            "title": self.TITLE,
            "blocks": [{"heading": "技术领域", "text": "本方案涉及空气处理。"}],
        }
        markdown = ai.draft_to_markdown(draft)
        for round_no in range(1, 6):
            draft = {**draft, "blocks": ai.markdown_to_blocks(markdown, draft["title"])}
            markdown = ai.draft_to_markdown(draft)
            with self.subTest(round=round_no):
                self.assertEqual(
                    markdown.count(f"# {self.TITLE}"),
                    1,
                    f"第 {round_no} 轮后标题开始累积：\n{markdown}",
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


if __name__ == "__main__":
    unittest.main()
