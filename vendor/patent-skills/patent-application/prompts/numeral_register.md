# 申请文件 · 件号 / 模块标记核对

## 登记表格式（最小样例，照这个写，不要去读校验脚本源码）

```yaml
# 件号登记表.yaml —— 顶层 figures 登记入文图；parts 登记件号
figures:
  - fig: 1
    title: 密封结构剖视示意图
  - fig: 2
    title: 密封结构爆炸示意图
parts:
  - id: "1"          # 与 structure_schema.parts.id 同一套
    name: 杯盖
    figures: [1, 2]  # 该件出现在哪些图
    claims: [1, 2]   # 该件（名称或件号）出现在哪些权利要求
  - id: "2"
    name: 密封圈
    figures: [1]
    claims: [1]
```

实用新型：`id` 与 `structure_schema.parts` 同一套。  
发明系统框图与系统权要均不使用（10）（20）件号：`parts` 可空，只登记 `figures`（图 1 框图、图 2 流程）。  
发明流程图步骤一…不要登记成 parts。

```bash
python skills/patent-application/tools/check_numeral_register.py \
  --register <产出>/件号登记表.yaml \
  --claims <产出>/权利要求书.md \
  --spec <产出>/说明书.md
```

实用新型再加 `--schema` 与 `--figure-plan`。发明无结构 schema 则不要传 `--schema`。点名场景图登记在 `figures`，`kind: source_image`，`disclosure_only: false`。

交付前再跑：

```bash
python skills/patent-application/tools/check_support.py --dir <产出>
```

`APPLICATION_NUMERALS: ok=0` 先改表或正文。`check_support` 会并入串号 / 未登记号 / 同名不同号，并写出 `标号核对.md`。警告进问题清单。
