---
name: software-copyright
description: >
  生成中国计算机软件著作权（软著）登记申请资料：读取真实项目源码，先形成业务理解，
  再产出申请表信息、操作手册、前 30 页 / 后 30 页代码材料，最终用 OfficeCLI 输出 Word/TXT。
  当用户提到 软著、软件著作权、软件著作权申请资料、软著代码材料、软著操作手册、
  申请表信息 时使用本技能。
metadata:
  short-description: 中国软著申请资料（Word/TXT）
  author: Fokkyp（原 SoftwareCopyright-Skill v2.6）
  version: "1.0-voffice"
  repository: https://github.com/Fokkyp/SoftwareCopyright-Skill
---

# 软著申请资料生成（V-Office 版）

这个技能把真实项目整理成一套可提交的中国软著登记材料。**这里描述的是 V-Office
沙箱里的运行方式，不是原作者本地 Codex 环境**，执行前先读完整份文档。

## 运行环境（本沙箱专用，不要照抄外部文档）

- 当前工作目录就是本案件的会话目录，所有路径都相对它：
  - `project/`：用户上传源码 ZIP 后由服务端解开得到的**真实项目根目录**，只读使用。
  - `materials/`：用户上传的其它材料原件（需求文档、设计文档、测试用例、截图…）。
  - `outputs/`：**所有产物必须写在这里**，界面上的「产物文件」面板只列这一层以下。
- 本技能的脚本固定在镜像内：
  `SKILL_DIR=/opt/patent-skills/software-copyright`
  本地开发时是 `vendor/patent-skills/software-copyright`。所有命令用
  `python3 "$SKILL_DIR/scripts/xxx.py"` 执行。
- 工作目录统一用 `outputs/软著`（下文记作 `$WORK`），第一次用时先
  `mkdir -p outputs/软著/草稿`。
- DOCX 后端是 OfficeCLI（`officecli` 已在 PATH，固定 1.0.151，无需安装、不要尝试升级）。
- 页数由 `officecli_backend.stats()` 内部调用 LibreOffice 转 PDF 得到，**不要**自己
  用 markdown 页数当最终页数。
- 沙箱**不能联网**：不要 git clone、pip install、curl。用户源码只能来自
  `project/` 或 `materials/` 里的压缩包。
- 截图**不要尝试自动截图**：容器里跑不起用户的软件项目。截图方式只能是
  `skip`（默认）或 `user-supplied`（用户把图片放进 `materials/`）。

## 铁律

1. 代码材料只能来自 `project/`（或 `materials/` 里用户上传的源码包）中的真实文件，
   **禁止编造、改写、补全任何源码**。
2. 写申请表和操作手册之前，必须先产出 `$WORK/草稿/业务理解.md/json` 并让用户确认。
3. 软件全称、版本号以 `$WORK/草稿/申请表信息.md` 为唯一事实源；文件名、页眉、正文都用它。
4. 源程序量 = 项目全部源程序总行数，不是已选材行数。
5. 需要用户确认的节点必须停下（见下文「门禁」），不得默认继续。
6. 正式 Word/TXT 只能由 `build_docx_from_md.py` 生成，不要用 python-docx 手写。

## 工作流

按顺序执行，每一步把结论用一段话讲给用户看，并把 Markdown 草稿留在 `$WORK/草稿/`。

### 0. 环境与项目分析

```bash
mkdir -p outputs/软著/草稿
python3 "$SKILL_DIR/scripts/check_environment.py" --out-dir outputs/软著
python3 "$SKILL_DIR/scripts/analyze_project.py" \
  --project project \
  --out outputs/软著/analysis/project.json
```

- 如果 `project/` 不存在：告诉用户「请上传项目源码 ZIP（排除 node_modules/.git/dist）」，
  然后停下等上传。不要用 `materials/` 里的零散文件假装成一个项目。
- 分析后向用户报告：识别到的框架、源码文件数、总行数、主要入口/页面。
  **源程序量只认 `analysis/project.json` 的 `source.total_line_count`**（已排除锁文件与
  数据 JSON）；`project/` 上层的估算行数只用于界面预览，两者不一致时以分析结果为准。
- 用户确认环境与项目口径后记录门禁：

```bash
python3 "$SKILL_DIR/scripts/confirm_stage.py" --workdir outputs/软著 \
  --stage environment --note "<用户确认内容>"
python3 "$SKILL_DIR/scripts/confirm_stage.py" --workdir outputs/软著 \
  --stage project --note "<用户确认内容>"
```

### 1. 业务理解（必须停下等确认）

```bash
python3 "$SKILL_DIR/scripts/generate_business_context.py" \
  --project project --analysis outputs/软著/analysis/project.json \
  --software-name "<软件全称>" --out-dir outputs/软著/草稿
```

先只跑这一条收集证据，然后**你自己**读 `草稿/业务理解证据.md`、README、路由、
页面文案、接口和必要源码，判断行业、目标用户、核心价值、主要功能、典型操作流程，
写一份业务理解模型稿 JSON（字段见 `references/business_understanding_rules.md`），
再带上 `--model-context <json>` 跑同一条命令生成 `草稿/业务理解.md/json`。

`manual_modules` 必须按真实页面/流程逐条填写（title / evidence / purpose /
usage / entry / visible_elements / operation_steps / validation_rules / feedback /
screenshot），缺 `usage` 就不能往下走。

产出后停下，把草稿贴给用户确认。确认后记录 `business` 门禁。

### 2. 代码选材（必须停下等确认）

```bash
python3 "$SKILL_DIR/scripts/propose_code_selection.py" \
  --project project --analysis outputs/软著/analysis/project.json \
  --out-dir outputs/软著/草稿
```

脚本只列候选，不替你选。你读候选清单、入口文件、页面文件和关键源码后，改
`草稿/代码文件选择.json`：`selected` 置 true/false，`model_reason` 写清选择理由。
优先前端入口、页面、核心组件、接口封装、状态管理；不足 60 页再补后端业务源码。
锁文件、数据 JSON、压缩产物已在 `excluded` 里排除，不要绕过它去选。
把选择结果（文件数、行数、预估页数）讲给用户确认，确认后记录 `code-selection` 门禁。

### 3. 抽取代码材料

```bash
python3 "$SKILL_DIR/scripts/extract_code_material.py" \
  --project project --analysis outputs/软著/analysis/project.json \
  --selection outputs/软著/草稿/代码文件选择.json \
  --software-name "<软件全称>" --version "<版本号>" \
  --out-dir outputs/软著/草稿
```

- ≥60 页：生成 `代码-前30页.md` / `代码-后30页.md`。
- <60 页且候选已用尽：生成 `代码-全部.md`。
- <60 页但还有候选：回到第 2 步让用户继续补选，不要说「凑不够就这样」。

### 4. 申请表信息（必须停下等用户补字段）

放在代码抽取之后：`页数` 字段直接取决于抽取结果，先出申请表会让用户确认两次。

```bash
python3 "$SKILL_DIR/scripts/generate_application_info.py" \
  --analysis outputs/软著/analysis/project.json \
  --code-manifest outputs/软著/草稿/代码提取清单.json \
  --business-context outputs/软著/草稿/业务理解.json \
  --software-name "<软件全称>" --version "<版本号>" \
  --out-dir outputs/软著/草稿
```

生成后停下，逐字段和用户确认：软件全称、简称、版本号、著作权人、开发完成日期、
首次发表日期、开发方式、权利取得方式、软件分类、开发环境、运行环境、源程序量、
页数、主要功能、技术特点。字段口径见 `references/application_fields.md`。
确认后记录 `application-fields` 门禁。

### 5. 操作手册

```bash
python3 "$SKILL_DIR/scripts/generate_manual_draft.py" \
  --analysis outputs/软著/analysis/project.json \
  --business-context outputs/软著/草稿/业务理解.json \
  --software-name "<软件全称>" --version "<版本号>" \
  --out-dir outputs/软著/草稿
```

按 `references/manual_structure.md` 的骨架写：一、相关文档（表格）二、说明
三、功能特点 四、系统要求 五、按真实页面逐章操作 … 常见问题解答、术语表。
正文用连续段落，不用项目符号和编号列表；不写框架、接口、状态管理等技术细节；
不写「本手册用于…」这类元话语。脚本会同时产出 `草稿/操作手册自检记录.md/json`，
自检发现章节过薄、重复、AI 味时继续补写，不要把问题留给用户。
文件必须写入 `outputs/软著/草稿/操作手册自检记录.md/json`。

### 6. 截图方式（必须停下由用户选择）

- 用户在 `materials/` 里给了截图：`mkdir -p outputs/软著/用户截图`，把图片复制进去
  并按操作手册模块顺序加数字前缀（`1-首页.png`、`2-列表.png`…），然后：

```bash
python3 "$SKILL_DIR/scripts/capture_screenshots.py" \
  --input-dir outputs/软著/用户截图 --out-dir outputs/软著/截图 --method user-supplied
```

- 用户没给截图 / 说先跳过：记录 skip，手册里保留可见的
  `【截图预留：请在此处插入“XXX”页面截图。】`，不要用 HTML 注释。

```bash
python3 "$SKILL_DIR/scripts/confirm_stage.py" --workdir outputs/软著 \
  --stage screenshot-method --method skip --note "用户选择暂不截图"
```

### 7. 用户确认 Markdown（必须停下）

把 `草稿/` 下四份 Markdown 的要点列给用户：软件名称与版本号、代码来源清单、
手册章节、截图预留位置。用户确认后记录 `markdown` 门禁：

```bash
python3 "$SKILL_DIR/scripts/confirm_stage.py" --workdir outputs/软著 \
  --stage markdown --note "<用户确认内容>"
```

### 8. 生成正式 Word/TXT

```bash
python3 "$SKILL_DIR/scripts/build_docx_from_md.py" \
  --workdir outputs/软著 --software-name "<软件全称>" --version "<版本号>" \
  --skip-preview
```

- 页数由 LibreOffice 实测。前 30 页/后 30 页必须正好 30 页；脚本默认因此失败退出，
  这是对的——按 `正式资料/生成报告.md` 的提示调整选材量后重跑。
- 只有在用户明确说「先出一版看看」时才加 `--allow-page-mismatch`，并在回复里
  明确告知「页数未达标，不可直接提交」。

产物在 `outputs/软著/正式资料/`：
`申请表信息.txt`、`<软件全称>_操作手册.docx`、
`<软件全称>-代码(前30页).docx`、`<软件全称>-代码(后30页).docx`（不足 60 页时为 `(全部)`）、
`生成报告.md`。

### 9. 交付

用一段话汇报：产物清单、代码页数、源程序量、仍需人工注意的点（页数、截图、
著作权人信息）。不要在对话里贴整篇材料。

## 页面按钮 → 指令对照

界面上的快捷按钮会发出下面这些指令，按对应阶段推进，不要另起流程：

| 用户说 | 你做什么 |
| --- | --- |
| `开始软著办理` | 第 0 步：环境检查 + 项目分析，报告框架/文件数/总行数 |
| `确认项目，生成业务理解` | 第 1 步 |
| `确认业务理解，生成代码选材` | 记录 business 门禁 + 第 2 步 |
| `确认选材，抽取代码` | 记录 code-selection 门禁 + 第 3 步 |
| `确认代码材料，生成申请表信息` | 第 4 步 |
| `确认申请表，生成操作手册` | 记录 application-fields 门禁 + 第 5 步 |
| `截图跳过` / `已上传截图` | 第 6 步，method=skip / user-supplied |
| `确认草稿，生成正式资料` | 记录 markdown 门禁 + 第 8 步 |

## 参考文档（按阶段读，不要一次全读）

- 业务研判：`references/business_understanding_rules.md`
- 申请表字段：`references/application_fields.md`
- 代码选材：`references/code_selection_rules.md`、`references/copyright_material_rules.md`
- 操作手册：`references/manual_structure.md`
- DOCX 后端：`references/officecli_backend.md`
