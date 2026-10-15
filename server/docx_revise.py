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


def _runs_of(paragraph) -> list:
    """段落里所有 run（含被 w:ins/w:del 包着的）。"""
    runs = list(paragraph.iter(_q("w:r")))
    # 只要有文字 run 才值得改格式；纯空段（书签、分隔符）跳过
    return [r for r in runs if r.find(_q("w:t")) is not None]


def _ensure_rPr(run):
    """取 run 的 <w:rPr>，没有就建（必须是 run 的第一个子元素）。"""
    rPr = run.find(_q("w:rPr"))
    if rPr is None:
        rPr = run.makeelement(_q("w:rPr"), {})
        run.insert(0, rPr)
    return rPr


def _set_child(parent, tag: str, attrs: dict):
    """在 rPr/pPr 里设一个子元素，已存在就改属性。"""
    el = parent.find(_q(tag))
    if el is None:
        el = parent.makeelement(_q(tag), {})
        parent.append(el)
    for k, v in attrs.items():
        el.set(_q(f"w:{k}"), v)
    return el


def _style_scope_paragraph(doc, *, before: str = "", index: int = 0):
    """定位「用户选中的那一段」。

    先按草稿里那段的原文匹配（最稳，用户改过字也能对上），匹配不上再按段落序号
    取第 N 段并要求它非空——宁可改不到，也不能改错段落：改错比不改更糟。
    """
    p = _find_paragraph(doc, before) if before else None
    if p is not None:
        return p
    if index > 0:
        paras = [x for x in doc.element.body.iter(_q("w:p")) if _paragraph_text(x).strip()]
        if index <= len(paras):
            return paras[index - 1]
    return None


def apply_scoped_style(
    docx_bytes: bytes, style: dict, *, before: str = "", index: int = 0
) -> tuple[bytes, int]:
    """**只**给某一段套字号/字体/行距（用户在编辑器里选中了一段）。

    为什么必须直改 docx 而不能走 md→docx：那条路是整篇重建，样式参数
    （`--body-size` 之类）作用于**全文**，用户选了一段说「字体变大」，结果整篇
    被一起放大——实测里就是这么全篇变大的。局部格式只能以直接格式（run 级
    rPr / 段落级 pPr）写在现有 docx 上。

    不打 w:rPrChange：格式修订在 Collabora/Word 里的显示与接受行为都不够稳，
    这里的取舍是「字号立刻生效且可手工改回来」，不做逐条审阅。
    返回 (新字节, 命中段数)；定位不到返回 (原字节, 0)。
    """
    if not style:
        return docx_bytes, 0
    doc = Document(io.BytesIO(docx_bytes))
    paragraph = _style_scope_paragraph(doc, before=before, index=index)
    if paragraph is None:
        return docx_bytes, 0

    runs = _runs_of(paragraph)
    size_pt = style.get("size_pt")
    font = style.get("font")
    if not runs or not (size_pt or font):
        return docx_bytes, 0

    for run in runs:
        rPr = _ensure_rPr(run)
        if size_pt:
            # w:sz 的单位是**半磅**（14 磅 → 28）
            half = str(int(round(float(size_pt) * 2)))
            _set_child(rPr, "w:sz", {"val": half})
            _set_child(rPr, "w:szCs", {"val": half})
        if font:
            _set_child(
                rPr, "w:rFonts",
                {"ascii": str(font), "hAnsi": str(font), "eastAsia": str(font),
                 "cs": str(font)},
            )

    spacing = style.get("line_spacing")
    if spacing:
        pPr = paragraph.find(_q("w:pPr"))
        if pPr is None:
            pPr = paragraph.makeelement(_q("w:pPr"), {})
            paragraph.insert(0, pPr)
        # w:line 单位是 1/240 行（1.5 倍 → 360），auto 规则 = 多倍行距
        _set_child(pPr, "w:spacing", {"line": str(int(round(float(spacing) * 240))),
                                      "lineRule": "auto"})

    out = io.BytesIO()
    doc.save(out)
    return out.getvalue(), 1


def apply_revisions(docx_bytes: bytes, patches: list[dict]) -> tuple[bytes, int]:
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
