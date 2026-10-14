"""整篇样式指令（<doc-style … />）的链路测试。

这个功能有一类特别难查的失败：**代码跑了，但没体现**——属性名解析错、参数没传到
脚本、值被静默丢掉，界面上看起来都只是「AI 说改好了，字号却没变」。所以这里不只测
解析，而是一路测到**导出的 docx**：真跑一次 md_to_docx.py，再把 run 的字号读回来。

跑法：
    cd server && python3 -m unittest test_ai_style -v
"""

import logging
import os
import tempfile
import unittest
from pathlib import Path

# AI_HOME 是模块级常量（import 时就定了），要在 import ai **之前**指到临时目录，
# 否则测试会往真实的 /data/.ai 里写草稿和会话。
_TMP_HOME = tempfile.mkdtemp(prefix="vo-ai-style-home-")
os.environ.setdefault("V_OFFICE_AI_HOME", _TMP_HOME)

import ai  # noqa: E402

# ai.LOG 默认 None（由 main.py 启动时注入）。不接上，转换一出错就是
# `'NoneType' has no attribute 'warning'`，真实失败原因反而被盖掉。
ai.LOG = logging.getLogger("test-ai-style")


class DocStyleParseTest(unittest.TestCase):
    """<doc-style/> 的解析与剥离。"""

    def test_style_and_text_patch_coexist(self):
        out = ai.parse_model_output(
            '这段改一下'
            '<doc-style body-size="14" body-font="宋体" line-spacing="1.5"/>'
            '<patch anchor="2">新文本</patch>'
        )
        self.assertEqual(
            out["doc_style"],
            {"font": "宋体", "size_pt": 14.0, "line_spacing": 1.5},
        )
        self.assertEqual([p["anchor"] for p in out["patches"]], ["2"])
        self.assertEqual(out["prose"], "这段改一下")

    def test_style_tag_never_leaks_into_prose(self):
        """样式标签绝不能当正文写进草稿（以前 <final-doc> 就这样漏过）。"""
        out = ai.parse_model_output('<doc-style body-size="12"/>这是说明')
        self.assertNotIn("doc-style", out["prose"])
        self.assertNotIn("body-size", out["prose"])
        self.assertEqual(out["prose"], "这是说明")

    def test_style_only_turn(self):
        out = ai.parse_model_output('<doc-style heading-size="16"/>')
        self.assertEqual(out["doc_style"], {"heading_size_pt": 16.0})
        self.assertEqual(out["patches"], [])
        self.assertEqual(out["prose"], "")

    def test_underscore_and_hyphen_both_accepted(self):
        # 曾经踩过：属性正则的 \w+ 匹配不了连字符，body-size 被读成 size，整条指令静默失效
        hyphen = ai.parse_model_output('<doc-style body-size="14"/>')["doc_style"]
        under = ai.parse_model_output('<doc-style body_size="14"/>')["doc_style"]
        self.assertEqual(hyphen, {"size_pt": 14.0})
        self.assertEqual(under, {"size_pt": 14.0})

    def test_out_of_range_values_rejected(self):
        """这些值会直接写进 docx——字号 9999 会让用户拿到一份没法看的文档。"""
        out = ai.parse_model_output(
            '<doc-style body-size="9999" heading-size="0" line-spacing="12"/>'
        )
        self.assertEqual(out["doc_style"], {})

    def test_plain_output_unaffected(self):
        out = ai.parse_model_output("就一段普通的说明文字")
        self.assertEqual(out["doc_style"], {})
        self.assertEqual(out["prose"], "就一段普通的说明文字")


class StyleArgsTest(unittest.TestCase):
    """草稿 styles → md_to_docx.py 命令行参数。"""

    def test_builds_expected_argv(self):
        args = ai._style_args(
            {"styles": {"font": "宋体", "size_pt": 14.0, "line_spacing": 1.5}}
        )
        self.assertEqual(
            args, ["--body-font", "宋体", "--body-size", "14.0", "--line-spacing", "1.5"]
        )

    def test_no_styles_means_no_args(self):
        """没样式的稿子，转换命令必须与从前逐字一致——这功能对既有链路是零影响。"""
        self.assertEqual(ai._style_args({}), [])
        self.assertEqual(ai._style_args({"styles": {}}), [])
        self.assertEqual(ai._style_args({"styles": {"font": "", "size_pt": None}}), [])


class StyleConversionTest(unittest.IsolatedAsyncioTestCase):
    """端到端：样式真的落到 docx 的 run 上（不只是"参数传出去了"）。"""

    MD = "# 测试标题\n\n这是正文段落，用来验证字号。\n\n行内代码 `code_here` 不该被改。\n"

    async def _convert(self, styles: dict, prefer: str = "") -> bytes:
        with tempfile.TemporaryDirectory() as tmp:
            data = await ai._convert_docx(
                tool="md_to_docx.py",
                src=self.MD.encode("utf-8"),
                src_suffix=".md",
                out_suffix=".docx",
                root=Path(tmp),
                prefer=prefer,
                extra_args=ai._style_args({"styles": styles}),
            )
        return data

    async def test_every_skill_pack_supports_style(self):
        """技能包里**每一份** md_to_docx.py 都得认样式参数。

        `_skill_tool` 优先用「本次会话所属技能包」的那份同名脚本，所以只改一份的
        后果很隐蔽：用另一个技能写稿时，脚本不认 --body-size、转换直接失败，
        用户看到的是「AI 说改好了，文档却没更新」。
        """
        from docx import Document
        import io

        packs = sorted(
            p.parent.parent.name for p in Path(ai.SKILLS_DIR).glob("*/tools/md_to_docx.py")
        )
        self.assertTrue(packs, "技能目录下找不到 md_to_docx.py")
        for pack in packs:
            with self.subTest(pack=pack):
                data = await self._convert({"size_pt": 14.0}, prefer=pack)
                self.assertIsNotNone(data, f"{pack} 的转换脚本不支持 --body-size")
                doc = Document(io.BytesIO(data))
                sizes = [
                    r.font.size.pt
                    for p in doc.paragraphs
                    for r in p.runs
                    if "这是正文" in r.text and r.font.size
                ]
                self.assertEqual(sizes[:1], [14.0], f"{pack} 的字号没生效")

    def setUp(self):
        if ai._skill_tool("md_to_docx.py", "") is None:
            self.skipTest("技能包未就绪（md_to_docx.py 不在 SKILLS_DIR），跳过转换测试")

    async def test_body_size_reaches_docx(self):
        from docx import Document
        import io

        data = await self._convert({"size_pt": 14.0})
        self.assertIsNotNone(data, "转换失败：拿不到 docx 字节")
        doc = Document(io.BytesIO(data))
        sizes = {
            r.text[:8]: (r.font.size.pt if r.font.size else None)
            for p in doc.paragraphs
            for r in p.runs
            if r.text.strip()
        }
        body = [v for k, v in sizes.items() if "这是正文" in k]
        self.assertTrue(body and body[0] == 14.0, f"正文字号没生效：{sizes}")

    async def test_mono_run_not_touched(self):
        """等宽 run 是代码，统一改样式时必须跳过，否则代码跟着正文一起变样。"""
        from docx import Document
        import io

        data = await self._convert({"size_pt": 14.0})
        doc = Document(io.BytesIO(data))
        mono = [
            r
            for p in doc.paragraphs
            for r in p.runs
            if (r.font.name or "") == "Consolas"
        ]
        self.assertTrue(mono, "找不到等宽 run，测试样本失效")
        for r in mono:
            self.assertEqual(r.font.size.pt, 9.0, "等宽 run 被误改了字号")

    async def test_default_conversion_unchanged(self):
        """不传样式时，正文仍是原来的 10.5：确认新参数默认完全不改变旧行为。"""
        from docx import Document
        import io

        data = await self._convert({})
        doc = Document(io.BytesIO(data))
        body = [
            r.font.size.pt
            for p in doc.paragraphs
            for r in p.runs
            if "这是正文" in r.text and r.font.size
        ]
        self.assertEqual(body[:1], [10.5])


if __name__ == "__main__":
    unittest.main()
