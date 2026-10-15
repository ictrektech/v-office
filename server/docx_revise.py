"""把 AI 的改动以 **Word 修订（track changes）** 打进 docx。

为什么是修订：Collabora 按文档键缓存会话，外部改文件必须换会话才能看到；
把改动写成修订后，「接受 / 拒绝」在编辑器里用 Word 原生审阅完成——**零刷新**。

实现取向：只做**段落级**的三种操作（insert / replace / delete），用文本匹配定位。
匹配不到就跳过该条（调用方决定兜底策略），绝不抛异常打断出稿。
"""

from __future__ import annotations

import copy
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


def _new_run(text: str, template=None, bold: bool = False):
    """建一个新 run。

    `template` 是**被替换掉的原文 run**：复制它的 `rPr`，字体就在里面——
    包括中文 / 韩文要用的东亚字体（`w:rFonts` 的 `eastAsia`）。新 run 不带它，
    Word / Collabora 会拿默认的西文字体去排这些字符，**整段显示成 □**
    （「变成韩语」那一轮实测就是一片方框）。

    注意：run 必须是**游离的顶层元素**（不能挂在临时父节点下），
    否则后面 addprevious/append 会把内容插进游离树里，目标段落拿不到。
    """
    run = etree.Element(_q("w:r"))
    rPr = None
    if template is not None:
        src = template.find(_q("w:rPr"))
        if src is not None:
            rPr = copy.deepcopy(src)
    if bold:
        if rPr is None:
            rPr = etree.Element(_q("w:rPr"))
        if rPr.find(_q("w:b")) is None:
            etree.SubElement(rPr, _q("w:b"))
    if rPr is not None:
        run.append(rPr)  # rPr 必须是 run 的第一个子元素
    t = etree.SubElement(run, _q("w:t"))
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = text
    return run


_BOLD_WRAP_RE = re.compile(r"^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*$", re.S)


def unwrap_bold(text: str) -> tuple[str, bool]:
    """认掉 markdown 的加粗标记：返回 (纯文本, 是否整体加粗)。

    替换结果是要**直接写进 docx** 的，标记不认掉就会变成字面符号——实测文档里
    出现过 `**`、`__`（用户的指令就是「文字加粗」，模型用 markdown 表达加粗，
    我们却把符号原样写进去了）。整体被 `**…**` 包住时按加粗处理；其余成对的
    标记只剥掉不当格式——宁可少一次加粗，也不能让文档里留一堆符号。
    """
    raw = (text or "").strip()
    m = _BOLD_WRAP_RE.match(raw)
    if m:
        return m.group(1).strip(), True
    return re.sub(r"\*\*|__", "", raw), False


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


def _paragraph_full_text(p) -> str:
    """段落里**所有**文字，含已被修订标记删除的（`w:delText`）。

    `_paragraph_text` 只读 `w:t`：修订过的段落用它去匹配，会漏掉那部分「已标记
    删除」的原文，于是「在同一段上再改一次」就定位不到——实测的表现是
    「字体 / 字号没能落到文档上」，可那句话明明还在文档里。
    """
    return "".join(
        (t.text or "")
        for tag in ("w:t", "w:delText")
        for t in p.iter(_q(tag))
    )


def _find_paragraph(doc, text: str):
    """按归一化文本找段落：完全匹配优先，其次包含。

    匹配用**含修订删除内容**的全文（见 `_paragraph_full_text`）：否则在一段被
    改过一次之后，再针对同一段做第二次改动就会定位失败。
    """
    want = _norm(text)
    if not want:
        return None
    # 段落可能被包在 sdt 等容器里，必须深度遍历
    paras = list(doc.element.body.iter(_q("w:p")))
    for p in paras:
        if _norm(_paragraph_full_text(p)) == want:
            return p
    for p in paras:
        if want in _norm(_paragraph_full_text(p)):
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


def _apply_style_to_paragraph(paragraph, style: dict) -> bool:
    """把字号 / 字体 / 行距直接写进**这一段**的 run 与段落属性；改到了返回 True。

    抽出来是为了让「单段」和「多段」共用同一套写法：多段只是多循环几次，
    写法一个字节都不能变（字号立刻生效是这里的硬要求）。
    """
    runs = _runs_of(paragraph)
    size_pt = style.get("size_pt")
    font = style.get("font")
    if not runs or not (size_pt or font):
        return False

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
    return True


def apply_scoped_style(
    docx_bytes: bytes, style: dict, *, before: str = "", index: int = 0,
    targets: Optional[list[dict]] = None,
) -> tuple[bytes, int]:
    """**只**给指定的段落套字号/字体/行距（用户在编辑器里选中了一块区域）。

    为什么必须直改 docx 而不能走 md→docx：那条路是整篇重建，样式参数
    （`--body-size` 之类）作用于**全文**，用户选了一段说「字体变大」，结果整篇
    被一起放大——实测里就是这么全篇变大的。局部格式只能以直接格式（run 级
    rPr / 段落级 pPr）写在现有 docx 上。

    不打 w:rPrChange：格式修订在 Collabora/Word 里的显示与接受行为都不够稳，
    这里的取舍是「字号立刻生效且可手工改回来」，不做逐条审阅。

    两种指定方式（二选一）：
    - `targets`：**多段**（跨段选区的样式改动），每项
      `{"before": 该段原文, "index": 该段在草稿里的编号}`——多带原文是因为
      docx 的段落划分与草稿块并不一一对应，按原文定位最稳；
    - `before` / `index`：单段（历史调用与既有测试走这条）。
    返回 (新字节, 命中段数)；一段都没定位到就返回 (原字节, 0)。
    """
    if not style:
        return docx_bytes, 0
    plan: list[dict] = list(targets) if targets else [{"before": before, "index": index}]
    doc = Document(io.BytesIO(docx_bytes))
    applied = 0
    for item in plan:
        try:
            paragraph = _style_scope_paragraph(
                doc,
                before=str(item.get("before") or ""),
                index=int(item.get("index") or 0),
            )
        except (TypeError, ValueError):
            continue
        if paragraph is not None and _apply_style_to_paragraph(paragraph, style):
            applied += 1
    if applied <= 0:
        return docx_bytes, 0
    out = io.BytesIO()
    doc.save(out)
    return out.getvalue(), applied


def apply_whole_doc_style(docx_bytes: bytes, style: dict) -> tuple[bytes, int]:
    """把样式套到**整篇**（用户要「全文统一字号 / 字体」时）。

    就地改现有 docx，**绝不走「草稿 → 重新生成」那条路**：那条路会把用户在
    编辑器里排好的字体、颜色、表格样式全部按脚本默认重排——「打开一次就变
    一次样」就是这么来的。这里只动传进来的那几项（只给字号就只改字号）。
    返回 (新字节, 动过的段落数)；一段都没动就返回原字节。
    """
    if not style:
        return docx_bytes, 0
    doc = Document(io.BytesIO(docx_bytes))
    applied = 0
    for paragraph in doc.element.body.iter(_q("w:p")):
        if _apply_style_to_paragraph(paragraph, style):
            applied += 1
    if applied <= 0:
        return docx_bytes, 0
    out = io.BytesIO()
    doc.save(out)
    return out.getvalue(), applied


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


# ── 文字级替换：只改「用户选中的那段文字」────────────────────────────────────
#
# 与上面的段落级操作的区别：段落级的落点是**整段**，用户只选了半句话也会整段
# 重写。选区落在哪个段，本来要靠「草稿块编号 ↔ docx 段落」换算——而这两套结构
# 天然对不上（草稿按 Markdown 标题切块，编辑器按 Writer 段落排），一遇到没有
# 标题的稿子就退化成「整篇一块」，选区作用域直接失效。
#
# 这里换一条路：**用选中的文字本身当坐标**。用户已经告诉我们他选了哪段文字，
# 根本不需要知道那是第几段——直接把它在文档里换掉即可。


def _norm_map(text: str) -> tuple[str, list[int]]:
    """归一化文本 + 「第 i 个归一化字符来自原文第几个字符」的映射。

    做文字级替换必须两者一起有：选区是用户从编辑器复制出来的，换行、缩进、
    空格都可能和文档里的原文有出入，直接 `str.find` 常常找不到；而在去掉空白
    的空间里定位之后，又要能映射回原文区间去切——所以一起返回。
    """
    chars: list[str] = []
    index: list[int] = []
    for pos, ch in enumerate(text or ""):
        if ch.isspace():
            continue
        chars.append(ch)
        index.append(pos)
    return "".join(chars), index


def locate_selection_span(text: str, selection: str) -> Optional[tuple[int, int]]:
    """在 text 里定位 selection（按「去空白」对齐），返回**原文**字符区间 [start, end)。"""
    if not text or not selection:
        return None
    norm, index = _norm_map(text)
    want, _ = _norm_map(selection)
    if not want:
        return None
    pos = norm.find(want)
    if pos < 0:
        return None
    return index[pos], index[pos + len(want) - 1] + 1


# 判断「模型给的是整段还是片段」时，选区之外的上下文至少要有这么长
_MIN_CONTEXT_CHARS = 4


def _looks_like_whole_paragraph(text: str, start: int, end: int, new_text: str) -> bool:
    """模型交回的是**整段**，还是只是「选区那几句的替换 / 追加」？

    判据：新文本里是否出现了**选区之外**的段落文字（前文或后文）。

    为什么不能只看「新文本包含选中的原文」：那样会把「在这句后面再加一句」误判成
    整段——追加时新文本本来就会带着原文，结果整段被替换、段落前半截被吞掉
    （实测：在「讲的是A方案。」后面加一句，前半句「第一段正文，」直接没了）。
    """
    norm_new, _ = _norm_map(new_text)
    if not norm_new:
        return False
    for outside in (_norm_map(text[:start])[0], _norm_map(text[end:])[0]):
        if len(outside) >= _MIN_CONTEXT_CHARS and outside in norm_new:
            return True
    return False


def replace_selection_in_text(text: str, selection: str, new_text: str) -> Optional[str]:
    """把 text 里「选中的那段文字」换成 new_text；定位不到返回 None。

    两种形态都认：
    - new_text 是**片段**（契约要求的样子，也可能是「原文 + 追加内容」）→
      只替换选区那一段，选区前后的文字原样保留；
    - new_text 其实是**整段**（模型把整段塞进来了）→ 整段采用。

    少了第二条，整段会被插进选区位置、把文字搞重复（实测踩到过：
    「第一句。第二句。第三句。」选中「第二句。」却被拼成
    「第一句。第一句。第二句。第三句。第三句。」）。
    """
    span = locate_selection_span(text, selection)
    if span is None:
        return None
    start, end = span
    if _looks_like_whole_paragraph(text, start, end, new_text):
        return new_text
    return text[:start] + (new_text or "") + text[end:]


def _set_paragraph_text(paragraph, text: str, bold: bool = False) -> None:
    """把这一段的内容**直接**换成 text（不留修订标记）。

    - 先清掉**所有** run（含被历史修订包在 `w:ins` / `w:del` 里的）：不清就会
      新旧文字叠着显示。
    - 用原段落第一个 run 的 `rPr` 当模板 → 新文字**继承字体**。东亚字体（中文 /
      韩文要用的那个）就在 `rPr` 里，不继承的话 Word / Collabora 会拿西文字体
      去排，整段变成 □——「变成韩语」那一轮实测就是一片方框。
    """
    runs = list(paragraph.iter(_q("w:r")))
    template = runs[0] if runs else None
    for run in runs:
        parent = run.getparent()
        if parent is not None:
            parent.remove(run)
    # 包过 run 的空壳（w:ins / w:del）一并清掉，别留空元素在段落里
    for tag in ("w:ins", "w:del"):
        for el in list(paragraph.iter(_q(tag))):
            if len(el) == 0:
                parent = el.getparent()
                if parent is not None:
                    parent.remove(el)
    paragraph.append(_new_run(text, template, bold))


def _replace_selection_direct(
    paragraph, selection: str, new_text: str, bold: bool = False
) -> bool:
    """把段落里「选中的那段文字」换成新文本——**直接改，不留修订**。

    为什么不生成修订：修订是**叠加态**（原文变成 `w:delText`、新文包进
    `w:ins`），下一轮再做定位 / 替换时，「看得见的文字」和「文档实际内容」
    就分家了——同一段改第二次必然失准（实测：字号落不上、新旧内容互相叠）。
    直接改让文档每轮都是干净态，定位永远面对当前文字。

    **不拆 run**：一句话常被 LibreOffice 切成好几个 run，按片段改是最麻烦的
    一类操作；这里先算好「替换后的整段文本」，再整段写回。
    """
    original = _paragraph_text(paragraph)
    merged = replace_selection_in_text(original, selection, new_text)
    if merged is None or merged == original:
        return False
    _set_paragraph_text(paragraph, merged, bold=bold)
    return True


def apply_selection_replacement(
    docx_bytes: bytes, selection: str, new_text: str
) -> tuple[bytes, int]:
    """把「用户选中的那段文字」在 docx 里就地替换（**直接改，不生成修订**）。

    markdown 的加粗标记（`**…**`）会被认成真正的加粗：替换结果是直接写进文档的，
    标记不认掉就成了字面符号（实测文档里出现过 `**`、`__`）。

    只处理选区落在**单个段落内**的情况：跨段选区在 docx 里没有单一落点，
    返回 (原字节, 0)，由调用方走段落级兜底（那条路有越界拦截，不会失控）。
    """
    if not selection or not (new_text or "").strip():
        return docx_bytes, 0
    clean, bold = unwrap_bold(new_text)
    if not clean:
        return docx_bytes, 0
    doc = Document(io.BytesIO(docx_bytes))
    paragraph = _find_paragraph(doc, selection)
    if paragraph is None:
        return docx_bytes, 0
    if not _replace_selection_direct(paragraph, selection, clean, bold=bold):
        return docx_bytes, 0
    out = io.BytesIO()
    doc.save(out)
    return out.getvalue(), 1
