"""把 AI 的改动以 **Word 修订（track changes）** 打进 docx。

为什么是修订：Collabora 按文档键缓存会话，外部改文件必须换会话才能看到；
把改动写成修订后，「接受 / 拒绝」在编辑器里用 Word 原生审阅完成——**零刷新**。

实现取向：只做**段落级**的三种操作（insert / replace / delete），用文本匹配定位。
匹配不到就跳过该条（调用方决定兜底策略），绝不抛异常打断出稿。
"""

from __future__ import annotations

import datetime
import io
import re
from typing import Optional

from docx import Document
from lxml import etree

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
AUTHOR = "AI 助手"


def _q(tag: str) -> str:
    """把 "w:p" / "p" 统一转成带命名空间的 Clark 记法（{ns}p）。"""
    return "{" + W + "}" + tag.split(":")[-1]


def _norm(text: str) -> str:
    """匹配用的归一化：撤销 Markdown 转义、去全部空白。"""
    t = re.sub(r"\\([\\`*_{}\[\]()#+\-.!>|])", r"\1", text or "")
    return re.sub(r"\s+", "", t)


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class _Revisions:
    """w:id 计数器 + 时间戳（一次修订会话共用）。"""

    def __init__(self) -> None:
        self.next_id = 9000
        self.date = _now()

    def id(self) -> str:
        self.next_id += 1
        return str(self.next_id)


def _wrap(runs_parent, run, kind: str, rev: _Revisions) -> None:
    """把一个 <w:r> 包进 <w:ins> 或 <w:del>（保持原位置）。"""
    wrap = runs_parent.makeelement(
        _q(f"w:{kind}"),
        {_q("w:id"): rev.id(), _q("w:author"): AUTHOR, _q("w:date"): rev.date},
    )
    run.addprevious(wrap)
    wrap.append(run)
    if kind == "del":
        # 被删除内容的文本节点要改用 w:delText
        for t in run.findall(_q("w:t")):
            t.tag = _q("w:delText")


def _mark_paragraph_mark(kind: str, paragraph, rev: _Revisions) -> None:
    """段落标记本身的插入/删除（整段插入/删除时必须有，否则 Word 里残留空段）。"""
    pPr = paragraph.find(_q("w:pPr"))
    if pPr is None:
        pPr = paragraph.makeelement(_q("w:pPr"), {})
        paragraph.insert(0, pPr)
    rPr = pPr.find(_q("w:rPr"))
    if rPr is None:
        rPr = pPr.makeelement(_q("w:rPr"), {})
        pPr.append(rPr)
    mark = rPr.makeelement(
        _q(f"w:{kind}"),
        {_q("w:id"): rev.id(), _q("w:author"): AUTHOR, _q("w:date"): rev.date},
    )
    rPr.insert(0, mark)


def _new_run(text: str):
    # 注意：run 必须是**游离的顶层元素**（不能挂在临时父节点下），
    # 否则后面 addprevious/append 会把内容插进游离树里，目标段落拿不到。
    run = etree.Element(_q("w:r"))
    t = etree.SubElement(run, _q("w:t"))
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = text
    return run


def _insert_paragraph_after(anchor, text: str, rev: _Revisions, style: Optional[str] = None):
    """在 anchor 段落后面插一个新段落，内容整体标记为插入。"""
    new_p = etree.Element(_q("w:p"))
    anchor.addnext(new_p)
    if style:
        pPr = etree.SubElement(new_p, _q("w:pPr"))
        pStyle = etree.SubElement(pPr, _q("w:pStyle"))
        pStyle.set(_q("w:val"), style)
    run = _new_run(text)
    new_p.append(run)
    _wrap(new_p, run, "ins", rev)
    _mark_paragraph_mark("ins", new_p, rev)
    return new_p


def _paragraph_text(p) -> str:
    return "".join(t.text or "" for t in p.iter(_q("w:t")))


def _find_paragraph(doc, text: str):
    """按归一化文本找段落：完全匹配优先，其次包含。"""
    want = _norm(text)
    if not want:
        return None
    # 段落可能被包在 sdt 等容器里，必须深度遍历
    paras = list(doc.element.body.iter(_q("w:p")))
    for p in paras:
        if _norm(_paragraph_text(p)) == want:
            return p
    for p in paras:
        if want in _norm(_paragraph_text(p)):
            return p
    return None


def _replace_tracked(paragraph, new_text: str, rev: _Revisions) -> None:
    """原段落内容标记为删除，新内容以插入形式追加在同一段里。"""
    for r in list(paragraph.findall(_q("w:r"))):
        _wrap(paragraph, r, "del", rev)
    run = _new_run(new_text)
    paragraph.append(run)
    _wrap(paragraph, run, "ins", rev)


def _delete_tracked(paragraph, rev: _Revisions) -> None:
    for r in list(paragraph.findall(_q("w:r"))):
        _wrap(paragraph, r, "del", rev)
    _mark_paragraph_mark("del", paragraph, rev)


def apply_revisions(docx_bytes: bytes, patches: list[dict]) -> bytes:
    """在 docx 上应用 AI 改动，产出带修订标记的新 docx 字节。

    patches 每一项：
      {"op": "replace", "before": 旧文本, "text": 新文本}
      {"op": "insert",  "after": 锚点文本, "text": 新文本}
      {"op": "delete",  "before": 旧文本}
    匹配不到锚点的条目跳过（不抛错），返回 (新字节, 应用了几条)。
    """
    doc = Document(io.BytesIO(docx_bytes))
    rev = _Revisions()
    applied = 0

    for patch in patches or []:
        op = (patch.get("op") or "").lower()
        try:
            if op == "replace":
                p = _find_paragraph(doc, patch.get("before") or "")
                text = (patch.get("text") or "").strip()
                if p is None or not text:
                    continue
                _replace_tracked(p, text, rev)
                applied += 1
            elif op == "delete":
                p = _find_paragraph(doc, patch.get("before") or "")
                if p is None:
                    continue
                _delete_tracked(p, rev)
                applied += 1
            elif op == "insert":
                anchor = _find_paragraph(doc, patch.get("after") or "")
                text = (patch.get("text") or "").strip()
                if anchor is None or not text:
                    continue
                _insert_paragraph_after(anchor, text, rev)
                applied += 1
        except Exception:  # noqa: BLE001 单条失败不影响其余修订
            continue

    out = io.BytesIO()
    doc.save(out)
    return out.getvalue(), applied
