# 专利全流程（patent-docket）问题记录与交接

> 记录时间：2026-11-02（2026-11-03 00:10 更新：软著大项目 8 轮实测通过，修 4 个问题）
> 结论：**全流程（patent-docket）与软著（software-copyright）端到端均可用**。docket 最好成绩 14.4 分钟收口 `terminal_complete`；软著 demo 17 分钟出齐三件套；软著**真实大项目**（V-Office 自身 210 文件 / 36719 行）8 轮门禁跑通，前后 30 页各正好 30 页、页眉/申请表/手册/OpenXML 全部达标，耗时约 64 分钟（其中 30 分钟是最后一轮撞超时上限）。产物质量人工复核见第二节，待改清单见第六节。
> 剩余最大变量是模型网关的速度与稳定性（26~40 tok/s 波动，偶发整轮无响应）：耗时里约八成是模型在生成 token（单轮最多 27k 输出），不是流程在等工具。

---

## 一、当前状态

### 可用的

- 交底书（`patent-disclosure`）：能产出交底 md，质量可用；docx 产出不稳定（同一 prompt 两次，一次只有 md）。
- 申请文件（`patent-application`）：四件套 md + docx 全部生成，产物完整。
- 专利解读（`patent-reader`）：权要拆成 15 个特征行，缺说明书时没有编造段号。
- 前端“产出物”已过滤中间件，只展示成品（docx/xlsx/pdf/图片/成稿 md）。

### 不可用的

- 全流程（`patent-docket`）：一次跑 1735 秒，474 次工具调用，最终被服务端循环保护中止。
- 公告检索（`patent-search`）：605 秒超时，卡在反复调试 Playwright。
- 审查答复（`patent-oa`）：能出答复文本，但不落文件（技能设计为确认后才出 Word），且出现编造引用（“说明书第 [图2][图3] 段”）。

---

## 二、全流程实测数据（真实报告）

报告目录（本地）：

```
scripts/patent-e2e/reports/20261102-141619/
├── SUMMARY.md
└── docket/
    ├── report.md / report.json
    ├── transcript.md      # 服务端原始会话记录，20762 行，含每次工具调用与返回
    └── files/             # 25 个产物，828K
```

关键数字：

| 项 | 数值 |
| --- | --- |
| 总耗时 | 1735.5 秒 |
| 模型回合 | 252 |
| 工具调用 | 474（read 18 / bash 456） |
| 每回合工具数 | 平均 1.88；222 个回合恰好 2 个 |
| bash 命令首词 | grep 221、cd 219、sed 6、cat 3、ls 2、python 1 |
| 完全重复命令 | 23 次相同 grep（`FIG_UNREGISTERED`） |
| 工具返回总字符 | 约 148 万 |
| 每轮上下文 | 平均 7 万 token，峰值 11.2 万 |
| 中止原因 | 同一操作累计 12 次，触发循环保护 |

产物本身是齐的（交底 md+docx+2 图、查新定位、申请四件套、docket.yaml、TRACKER.md），但流程停在 `phase: bootstrap_application`，没有收口。

### 252 轮的去向（2026-11-02 解析 pi 会话 jsonl，`/data/.ai/sessions/local/24e1a7e987ce4e60/.pi-sessions/`）

252 轮不是一个整体，是三段：

| 段 | 轮数（约） | 干什么 | 问题 |
| --- | --- | --- | --- |
| 1 | ~78 | 正常开工：读材料、立案、写交底 | 第 ~30 轮起模型开始 `sed -n` 整段读 patent-application 的 5 个工具脚本源码（audit_claims / check_support / render_invention_figures / plan_figures / check_numeral_register），单条结果 5-10KB，上下文涨到 112k → 第 1 次压缩 |
| 2 | ~95 | 写申请四件套，真正有效的工作 | 中间又压缩 2 次 |
| 3 | ~80 | 自检修复阶段 | 全程**一次都没真正运行** `check_numeral_register.py`（会话里只匹配到 3 条误命中的 python 单行命令）；对 `FIG_UNREGISTERED` grep 了 90 次校验器源码（每次 `-B60 -A30` 拉 3-5KB） |

关键事实：

- **一次会话触发了 7 次压缩**（tokensBefore 均在 112-113k，即 contextWindow−16384 触发线），其中 4 次发生在第 3 段；
- 252 个 assistant 回合 `stopReason` 全部是 `toolUse`，从未产出正文收口（最终回复只有 76 字符）；
- 恶性循环：读源码/长输出把上下文打满 → 压缩 → 摘要把刚「学」到的工具行为细节冲掉 → 模型重新考古 → 再打满 → 再压缩。第 3 段完全陷在这个循环里，最后 ~30 轮是纯 grep 死循环被外部循环保护杀掉。

结论：有效工作只需 ~100-120 轮；多出的 130+ 轮全部来自「读工具源码 ↔ 压缩失忆」的循环。三个根因都有对应修法：报错不自解释（已修）、护栏未禁止读源码（已加）、pi 截断阈值 50KB/2000 行是编译死的（`dist/core/tools/truncate.js:10-12`，无配置覆盖，无法从外部收紧）。

### 全流程（patent-docket）修复后复测（报告 `scripts/patent-e2e/reports/20261102-170519/`，会话 `3ad61948c9724cb0`）

| 项 | 修复前（14:16 那次） | 修复后（17:05 那次） |
| --- | --- | --- |
| 状态 | error（循环保护中止） | **ok** |
| 回合数 | 252 | **48** |
| 压缩次数 | 7 | **0** |
| 读工具源码 | 全程考古（145+ 次 grep 源码） | **0** |
| 最终阶段 | 卡死 bootstrap_application | **terminal_complete** |
| 产物 | 25 个 | 19 个（交底 md+docx、申请四件套 docx+md、docket.yaml、TRACKER、问题清单、对照表） |
| 权要质量 | 权利要求 1 写成方法步骤 | 独权已写成**产品**权要（自检还会提示如需方法保护怎么补） |
| 耗时 | 1735s（失败） | 1743s（成功） |

耗时没降的原因已查明：修复前 6.9s/回合 × 252 回合；修复后 36s/回合 × 48 回合。单轮时间 = 输出 token ÷ 生成速度——模型每回合在正文里写 ~900 token 的英文思考草稿（thinking=off，模型把 text 当草稿纸），网关 `api.xiaomimimo.com` 实测只有 ~26 tok/s（旧会话走 ictrek 网关是 40 tok/s）。下一步降时长：① 护栏/技能里要求工具回合的正文压到 1-2 句；② 或换更快的网关。行为问题已全部解决，剩下的是模型与网关的速度问题。

第三次复测（报告 `reports/20261102-180749/`，会话 `64af93a908da466d`）：**864 秒（14.4 分钟）、59 回合、0 压缩、20 个产物、terminal_complete 收口**，网关速度正常时全程可以压到 15 分钟内。产物人工复核（权要/说明书/摘要合规性）发现的问题已记入第六节待办 10-12。

### 软著（software-copyright）端到端实测（2026-11-02 21:15，报告 `reports/20261102-211539/`，会话 `f105c466ff674385`）

结果：**ok**，1021 秒 / 47 回合 / 27 个产物。测试材料：`materials/05-ledger-demo.zip`（625 行 Flask 记账 demo，e2e 新增 `copyright` 用例）。第一次尝试因网关整轮无响应被空闲保护中止，重跑即过。

产物验收（人工复核）：

- `正式资料/申请表信息.txt`：字段齐全（名称/版本/分类/日期/开发方式/权利/环境/功能/技术特点），「主要功能」按九项功能成段叙述，源程序量 625 与实际一致；
- `正式资料/简易记账本-代码(全部).docx`：10 页（demo 源码不足 60 页，按"全交"口径），OpenXML 校验 0 错误，页数口径在报告中如实声明"未达标不可直接提交"；
- `正式资料/简易记账本_操作手册.docx`：章节完整，9 处截图预留位（skip 口径）；
- `正式资料/生成报告.md`：把页数、OfficeCLI 版本风险、截图缺口全部如实列出。

过程中发现并处理的问题：

1. ~~技能里硬编码 `SKILL_DIR=/opt/patent-skills/<包>`，本地不存在，agent 白绕 3 回合~~ **已修**：`server/tools/rewrite_skills.py` 增加 `OPT_PATTERN`，`/opt/patent-skills/<包>` 一并重写为运行时路径（整树重生成会触发环境的批量删除保护，>500 文件需确认；增量可用 `--src server/skills --dest server/skills --in-place` 原地改写）。
2. **OfficeCLI 版本锁**：技能要求精确 1.0.151（Dockerfile 同版本），本地 1.0.159 被判不可用触发 STOP_FOR_USER。技能自带出口 `--allow-untested-officecli`（显式自担风险），e2e 提示词已授权。**线上镜像版本固定，无此问题**；生成报告显示"1.0.160"与命令行 `--version` 的 1.0.159 不一致，未查（小疑点）。
3. **网关偶发整轮无响应**：第一次软著 e2e 在第 6 回合请求后 600 秒无任何事件，服务端空闲保护 SIGKILL 兜底（exit=-9），重跑即过。docket 两次耗时差异（29 分钟 vs 14 分钟）也印证网关速度波动。**这是当前最大的不稳定因素**。
4. 申请表"开发的硬件环境"直接抄了运行机器的配置（128 核/295GB——测试机配置），真实用户需替换；申请表确认环节没有明确提示这一点（小改进项，见第六节待办 13）。

结论：**软著链路可用**。前端合并（软著入口并入 patent workbench，方案二见对话记录）可以先不动，等这一版上线验证后再做。

### 软著 · 真实项目实测（大项目 / 8 轮门禁，2026-11-02 23:15 → 2026-11-03 00:10）

按 `scripts/patent-e2e/软著真实项目实测方案.md` 执行。驱动脚本新写：`scripts/patent-e2e/run_copyright_multi.py`
（复用 `run.py` 的 HTTP 函数，逐轮发消息、每轮之间检查磁盘产物、超时/断线可 `--session` 续跑）。
会话 `45eb4996b96c4cab`，报告 `scripts/patent-e2e/reports/20261102-231556-copyright-real/`。

素材 `materials/06-v-office-src.zip`：仓库自身 git 跟踪的文本源码，排除 `vendor/`。
**实际 210 个文件 / 36719 行源码（analyze_project 计 196 文件 / 43231 行）**；方案文档里写的
"688 文件 / 13 万行"是**含 vendor/ 的口径**（666 文件 / 130407 行），排除后缩水，但仍远超
60 页（3000 行）门槛，≥60 页分支照样被逼出来。

产物实测（`outputs/软著/正式资料/`）：

| 项 | 结果 |
| --- | --- |
| `申请表信息.txt` | 24 字段齐全；全称已是改后的「V-Office 协同办公平台」（旧名零残留）；源程序量 43231 = analysis 总行数；页数 60 |
| `...-代码(前30页).docx` | **30 页**（第 1–30 页） |
| `...-代码(后30页).docx` | **30 页**（第 31–60 页） |
| 页眉 | 三份都是「V-Office 协同办公平台 V0.1 + 第 N 页」，PDF 渲染实测逐页递增（第 2 页=第2页，后30页从第31页起） |
| `..._操作手册.docx` | 13 页、17 章、10844 字，含「十六、常见问题解答」7 问（内容对得上产品真实行为，不是套话），10 处截图预留位 |
| OpenXML | 结构错误 0 |
| 代码真实性 | 抽查 4 处（`app/layout.tsx`、`components/main/template-view.tsx`、`server/project_zip.py`、`server/safe_fs.py`）逐字命中 `project/` 原文；前后 30 页无重叠（前段 app/components 19 文件，后段 server 3 文件） |

结论：**G1/G2/G4/G5/G6/G7 通过，G3（读码预算）未通过**（读了 10 个源码文件 > 8 个预算，且没按
`sed -n` 截取，详见下文）。材料本身可直接作为提交件（除申请表硬件环境仍是测试机占位）。

耗时（这是唯一不理想的地方）：

| 轮 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 秒 | 125 | **835** | 292 | 64 | 134 | 252 | 95 | 157 | **1800（timeout）** |

合计约 64 分钟（T1–T8 共 33 分钟；T9 撞到单轮 1800s 上限被脚本判 timeout，不是人工中断）。
121 个模型回合 / 125 次工具调用 / 上下文峰值 112226 token / **压缩 1 次**（G4 ✓）。
7 个门禁 json 按序生成（G5 ✓）。

G3（读码预算）**未通过**：模型读了 **10 个** `project/` 源码文件，预算是 ≤8；而且全部用 `read`
整文件读、没有用 `sed -n` 截取 200 行。也就是说 SKILL.md 第 1 步的"≤8 文件、每个 ≤200 行"目前
只是**文字约束、没有强制**——`read` 工具本身不给行数上限，脚本也不校验。修法（未做）：在
`generate_business_context.py` 产出的证据里直接给出"推荐精读清单（≤8 个文件的关键片段）"，
或给 `read` 包一层行数限制。

**慢的根因是"输出 token ÷ 网关速度"，不是流程**：T9 单轮 17 个回合、**27044 个输出 token**，
网关 26 tok/s → 光生成就 17 分钟，工具执行加起来不到 1 分钟。`thinking=off` 让模型把
"Let me… / Actually, wait…" 的英文草稿写进正文，约占八成。压缩/失忆循环这次只出现 1 次，
没有演变成 docket 那种死循环。

### 软著实测发现的问题（2026-11-03 已修 4 项）

1. ~~**页数校验会静默降级，30 页形同没校验**~~ **已修**：`officecli_backend.libreoffice_page_count()`
   只设 `HOME` 不够——机器上已有 soffice 在跑时（agent 自己也会转 PDF 校页数），新进程把转换请求
   转交给那个实例，拿到旧 PDF 或干脆没输出。实测同一份 **30 页** docx 被数成 **29 页**，
   `docx_checks()` 于是走"无法取得 Word 原生页数，按估算"分支，严格的 30 页硬校验被绕过
   （生成报告里那句"草稿按 30 页估算"就是这么来的，模型还据此反复 `--lines-per-page` 试，
   白烧 19 分钟）。修法：每次转换用独立 `-env:UserInstallation=<profile>` + 失败重试；
   页数取不到时**不再降级**，`strict_pages` 下直接报错（`build_docx_from_md.py`）。
   复验：6 并发 × 3 次调用，前后各 30 页 / 手册 13 页稳定不抖。
2. ~~**SKILL_DIR 指向不存在的路径，agent 去跑作者原仓库的脚本**~~ **已修**：
   `server/skills/software-copyright/SKILL.md` 写死 `SKILL_DIR=/home/wr/v-office/server/software-copyright`
   （少一层 `skills/`，实际不存在）。`rewrite_skills.py` 的两条正则只认 `skills/<包>` 与
   `/opt/patent-skills/<包>`，抓不到这类作者本机绝对路径；agent 于是 `ls /home/wr` 摸到作者原仓库
   `/home/wr/SoftwareCopyright-Skill/software-copyright-materials` 跑**另一份脚本**（与仓库副本
   7 个脚本不一致）。线上没有那个目录，第 1 步就会卡死。修法：① SKILL.md 改成
   `SKILL_DIR="${PATENT_SKILLS_DIR:-/opt/patent-skills}/software-copyright"`（`ai.py` 已注入该变量）；
   ② `rewrite_skills.py` 新增 `ABS_PATTERN`，把 `/home|/Users` 下的作者路径一并重写成运行时路径
   （注意别写成"任意绝对路径+包名"，否则 `/opt/patent-skills` 会被二次替换成
   `/opt/patent-skills/patent-skills`——这个坑当场踩到并已避开）。
3. ~~**门禁措辞歧义，白等一轮**~~ **已修**：用户说"选材偏重 server/，确认选材并抽取"，模型改完
   `代码文件选择.json` 又停下问"确认无误我就记录门禁"（T4 0 产物）。SKILL.md 门禁表补了
   `确认选材并抽取`，明确"这句话本身就是确认，直接记录 code-selection 门禁并执行第 3 步"。
4. ~~**申请表字段分几轮追问**~~ **已修**：T8 卡在开发完成日期/发表状态/著作权人/首次发表日期
   （模型拒绝编造是对的），一条消息只问了一部分。SKILL.md 第 4 步改为"一次性列全待确认字段，
   允许用户一句话全部回复或说『用默认（未发表 + 占位著作权人）』"。
5. **模型爱写长草稿（未彻底解决，只能压）**：见上表耗时分析。已在 `ai.py` 系统护栏与
   SKILL.md「回合纪律」里加硬规则（工具回合正文 1-2 句、禁止 "Let me…" 草稿），效果待下次实测；
   根治要换快网关或把 thinking 打开。**另外实测确认沙箱没有 `write` 工具**（模型第一步调它，
   返回 `Tool write not found`），护栏已写明"写文件只能用 bash heredoc"。
6. **驱动脚本补充 T9 的原因**（不改产品，记脚本口径）：方案文档的 8 轮脚本没给开发完成日期/
   发表状态/著作权人，T8 因此必然停在门禁（这是产品的正确行为）。`run_copyright_multi.py`
   因此在 T8 后加了 T9「字段这样定…」继续生成，真实用户走这一步也是这样补。
7. **读码预算没有强制（G3 未通过，未修）**：模型读了 10 个 `project/` 源码文件（预算 8），
   全是 `read` 整文件、没按 `sed -n` 截 200 行。SKILL.md 里那句"≤8 个文件、每个 ≤200 行"
   目前只是文字约束。可行修法：`generate_business_context.py` 直接输出"推荐精读清单"，
   或在系统护栏里要求"读 project/ 源码必须用 `sed -n '1,200p'`，禁止 read 整文件"。

### 已确认的产物质量问题

- 权利要求 1 写成了方法步骤（“步骤一……步骤五……”），主题却是“密封结构”，产品权利要求不应有步骤。
- `docket.yaml` 里 `docket_dir` 指向 `/home/wr/v-office/outputs/docket/anti-spill-cup`（仓库根），不是会话目录；原因是 `patent-docket/tools/docket_paths.py` 的 `default_output_root()` 会向上找 `.git`/`outputs`，本地仓库结构下命中仓库根。线上 `/opt/patent-skills` 没有 `.git`，会回退 cwd，属本地特有问题。

---

## 三、已改内容（未提交，git status）

```
M .gitignore
M components/patent/history/history-view.tsx
M components/patent/software-copyright/copyright-overview.tsx
M components/patent/software-copyright/copyright-workspace.tsx
M components/patent/software-copyright/steps.ts
M components/patent/workbench/case-overview.tsx
M components/patent/workbench/config.ts
M components/patent/workbench/stage-workspace.tsx
M server/Dockerfile
M server/ai.py
M vendor/patent-skills/patent-application/**            # 权要/附图/标号相关 9 个文件
M vendor/patent-skills/software-copyright/SKILL.md       # 2026-11-03 实测修复
M vendor/patent-skills/software-copyright/scripts/build_docx_from_md.py
M vendor/patent-skills/software-copyright/scripts/officecli_backend.py
?? HANDOFF.md
?? scripts/patent-e2e/
?? server/tools/
```

> `server/skills/**` 不进 git（构建时由 `server/tools/rewrite_skills.py` 从 vendor 生成）。
> 2026-11-03 已按新规则重生成本地 `server/skills/software-copyright`，与 vendor 逐字一致（0 处重写）。

### 1. 技能路径落地（解决 agent 找不到技能）

问题：技能的 `SKILL.md` / `prompts` 里写的是 `skills/<包>/tools/...`（相对仓库根），而 agent 的 cwd 是 `/data/.ai/sessions/<user>/<sid>`，没有 `skills/` 这一层。实测 456 次 bash 里大量是 `cd /home/wr/v-office/server` 后 grep 找路。

改动：

- 新增 `server/tools/rewrite_skills.py`：复制 `vendor/patent-skills`，把 `skills/<包>` 替换成运行时绝对路径，保留顶层 README，排除 `__pycache__`；
- `server/Dockerfile`：`COPY skills/ /opt/patent-skills/` 之后执行重写，路径为 `/opt/patent-skills/...`；
- 本地已生成：424 处替换，`server/skills` 里是 `/home/wr/v-office/server/skills/...`；
- 删除了实验性的会话 `skills` 软链代码，删除了系统提示里的“技能包位置”补丁；
- `_prepare_workdir` 保留预建 `outputs/`。

状态：本地已生效；线上需重建 storage 镜像。

### 2. agent 隔离加固

线上实测（以 admin 的 agent uid 20002 模拟）：

- 挡住：`ls /data/.ai/sessions`、`ls .../alice`、别人的会话目录（0700，各自 uid）。
- 没挡住：
  - 会话 meta 是 `0644`，知道 sid 就能读标题/技能/时间（实测读到 alice 的）。
  - `/data/.ai/artifacts`、`artifacts/<user>` 是 `0755`，能枚举用户名和该用户全部会话 id。
  - `/data/.ai/materials` 根是 `0755`，能枚举用户名。

改动（`server/ai.py`）：

- `_write_meta` 写后 `chmod 600`；
- `_artifacts_dir` 把 `artifacts/<user>` 收成 `0700`；
- 新增 `_harden_shared_roots()`，启动时把 `sessions / materials / artifacts / drafts / templates` 收成 `0711`。

未完成：线上存量文件需要一次性 chmod（见第六节）。

### 3. 前端只展示成品

`config.ts` 新增 `isDeliverable()`，`stage-workspace.tsx` 用它过滤产出物：

- 保留：docx / xlsx / pptx / pdf / csv / png / jpg / svg / 成稿 md；
- 过滤：json / yaml / `TRACKER.md` / `标号核对.md` / `figure_plan.yaml` / `intake.json` / `chart.json` 等。

测试产物 13 条收敛到 8 条。

### 4. 其他

- `server/ai.py` 给 agent 环境注入 `PATENT_SKILLS_DIR`；
- `PLAYWRIGHT_BROWSERS_PATH` 优先用真实浏览器目录，减少 `playwright install`；
- 前端“全流程”的 skill 已改为 `patent-docket`，材料槽改为 docket 输入，工作台加了案卷进度卡（阶段/轮次/未决问题）。

### 5. 软著真实项目实测修复（2026-11-03）

| 文件 | 改了什么 |
| --- | --- |
| `vendor/.../software-copyright/scripts/officecli_backend.py` | `libreoffice_page_count()` 每次用独立 `-env:UserInstallation=<profile>`，无 PDF 时重试一次（并发 soffice 互抢导致页数乱跳的根因） |
| `vendor/.../software-copyright/scripts/build_docx_from_md.py` | `docx_checks()` 取不到页数时不再静默降级：`strict_pages` 下直接 `OfficeCliError` |
| `vendor/.../software-copyright/SKILL.md` | ① SKILL_DIR 改用 `${PATENT_SKILLS_DIR:-/opt/patent-skills}`，并禁止去别处找脚本；② 新增「回合纪律」（正文 1-2 句、禁止英文草稿、命令串联）；③ 门禁表补 `确认选材并抽取`；④ 第 4 步要求一次性列全待确认字段 + 允许"用默认"；⑤ 第 8 步补"取不到页数等于失败，先 pkill soffice 再重跑" |
| `server/tools/rewrite_skills.py` | 新增 `ABS_PATTERN`：把 `/home`、`/Users` 下的作者本机脚本路径一并重写成运行时路径（受限前缀，避免二次替换 `/opt/patent-skills`） |
| `server/ai.py` | 系统护栏补两条：写文件只能用 bash heredoc（没有 `write` 工具）、工具回合正文压到 1-2 句 |
| `scripts/patent-e2e/run_copyright_multi.py` | 新增多轮驱动（8 轮门禁 + T9 补字段），逐轮快照磁盘产物、导原始 jsonl、自动出 metrics.json + report.md |

---

## 四、原推断 → 已核实（2026-11-02 读 pi 1.1.0 源码，位于 ~/.nvm/.../node_modules/@earendil-works/pi-coding-agent）

1. **已核实（部分成立）**：`--skill` 只把每个技能的「名称 / 描述 / SKILL.md 路径」共 4 行 XML 拼进 system prompt（`dist/core/skills.js:278-303`），SKILL.md 全文和 prompts/、references/ **不会**进 system prompt。挂 12 个技能只多十几 KB 清单，不是上下文膨胀主因。但技能指令要靠模型自己 `Read` SKILL.md 才进上下文——挂全部技能时模型可能多读几份 SKILL.md，仍可能引起犹豫（本轮 transcript 里 docket 确实读了 disclosure / application 的 SKILL.md，这是技能设计要求的派工行为，正常）。
2. **已核实：每轮工具调用数完全由模型决定**。pi 不限数量、默认并行执行（`pi-agent-core/dist/agent-loop.js:366-373`，`Promise.all`），system prompt 里没有任何「每轮几个工具」的指示。平均 2 个/回合是 `mimo-v2.6-flash` 自身行为，与 pi 无关。
3. **已核实**：工具结果按「截断后原样全量回灌」（单条上限 2000 行 / 50KB，bash 保尾部、read 保头部，`dist/core/tools/truncate.js:10-12`）；压缩在 contextWindow−16384 token 时才触发（`dist/core/compaction/compaction.js:173-176`），之前不会瘦身。pi **没有内置循环/重复检测**，我们的外部循环保护是唯一防线，与实测一致。

---

## 五、复现方法

### 启动本地服务

```bash
cd server
V_OFFICE_AUTH_DISABLED=1 python main.py   # 端口 5000
```

### 跑测试

```bash
cd /home/wr/v-office
python3 scripts/patent-e2e/run.py --cases docket --workers 1
```

- 材料：`scripts/patent-e2e/materials/`（防洒保温杯，约 400 字；软著用例用 `05-ledger-demo.zip`，625 行 Flask 记账 demo；真实大项目用 `06-v-office-src.zip`，仓库自身 210 文件 / 36719 行）；
- 软著多轮实测（8 轮门禁 + 中途改需求，逐轮检查磁盘产物）：
  `python3 scripts/patent-e2e/run_copyright_multi.py --zip scripts/patent-e2e/materials/06-v-office-src.zip`
  （断了用 `--session <sid> --start-turn <n> --out <同一报告目录>` 续跑；约 50 分钟，主要时间在等模型出 token）；
- 报告默认落 `scripts/patent-e2e/reports/<时间戳>/`（已被 .gitignore 忽略）；
- `--cases` 可选 `reader,disclosure,application,chart,oa,docket,search,copyright`；
- 必须串行（`--workers 1`）：服务端单用户并发为 1，并发会在 30 秒后报“你还有请求在跑”。

### 关键环境

- 服务：`http://127.0.0.1:5000/api/v1/ai`
- pi：1.1.0
- 模型：`mimo-v2.6-flash`
- AI_HOME：`/data/.ai`，本地 auth disabled 时用户名 `local`
- 本地 sandbox：`enforced: false`（非 root 启动，不降权），隔离只能在线上容器验证

---

## 六、待办（按优先级）

1. ~~先读 pi 的文档/实现~~ **已完成（2026-11-02），结论见第四节**：`--skill` 只挂技能清单（4 行/个），不全文拼 prompt；每轮工具数由模型决定（pi 默认并行、无上限、无循环检测）；工具结果全量回灌（单条 2000 行/50KB），压缩仅在逼近 contextWindow−16384 时触发。`_skill_args` 挂全部技能的代价主要是模型可能多读几份 SKILL.md，不是 system prompt 膨胀。
2. 对照实验（只挂 docket vs 全部技能）：优先级降低——已确认挂全部技能不会撑大 system prompt；剩余影响（模型多读 SKILL.md）可再看 transcript 里 read 次数判断。
3. ~~修 `check_numeral_register.py` 的 `FIG_UNREGISTERED`~~ **已完成**：报错信息现在直接给出修复方法（往登记表 yaml 顶层 `figures:` 加条目 / 把图号加进部件 `figures:` / 改 figure_plan.yaml），`FIG_UNKNOWN` 同样处理；单测通过；已重新生成 `server/skills` 副本。实测依据：transcript 里模型对 `FIG_UNREGISTERED` 的反应是把校验脚本源码 grep 了 145 次。
4. ~~循环保护阈值 12 → 6~~ **已完成**（`server/ai.py` `REPEAT_TOTAL_LIMIT` 默认值改为 6，仍可用 `V_OFFICE_AI_REPEAT_TOTAL` 覆盖）。
5. ~~全流程入口先下线~~ **作废**：全流程修复后已可稳定收口（14-29 分钟），无需下线。
6. ~~技能侧补登记表样例~~ **已完成**：`numeral_register.md` 已加最小登记表 yaml 样例（顶层 figures / parts 字段），并重生成 `server/skills` 副本。
7. 重建 storage 镜像，让路径重写、meta 0600、目录 0711、系统护栏（禁读源码）生效。
8. 线上存量权限一次性修复：

```bash
chmod 711 /data/.ai/{sessions,materials,artifacts,drafts,templates}
find /data/.ai/sessions -maxdepth 2 -name "*.json" -exec chmod 600 {} +
chmod 700 /data/.ai/artifacts/*
```

9. ~~权利要求“方法步骤写进产品权要”~~ **已解决**：18:07 复测独权已写成产品权要；权要内容的深层校验需求并入第 11 条。
10. ~~画完图必须生成「说明书附图.md」~~ **已完成（2026-11-02 晚）**：`figures.md` 加「收口（硬性）」节——PNG 出齐必须写 `说明书附图.md`（`![图N](figures/图N.png)`）并跑 `emit_application_docx.py`，缺文件按未完成处理；`self_check.md` 三件 Word 口径改四件，并加「figures/ 有 PNG 但无说明书附图.md → 未完成」自检项。
11. ~~权要内容质量问题~~ **已完成（2026-11-02 晚）**：`audit_claims.py` 新增三条校验——`VAGUE_NUMBER`（禁 约/大约/大概/大致/数字+左右，A26.4）、`DEPENDENT_DUPLICATE`（从属剥引用句后与被引用权要覆盖率超阈值 → 未附加新特征）、`TERM_INCONSISTENT`（同义部件词混用，词表 `SYNONYM_GROUPS` 可按领域补）；`claims_builder.md` 加硬规则（禁模糊量词、从属必须附加新特征、同部件单用语、互斥替代方案处理）。防洒杯案例实测：约60°/逐字从属/杯身杯体混用全命中，正常从属无误报。从属引入新术语由既有 `SAID_ANTECEDENT` 覆盖（实测命中「所述杯体」）。**阈值修正（2026-11-03）**：`DEPENDENT_DUPLICATE` 0.95 → **0.75**——0.95 只能抓逐字重复，抓不住「子集+同义词改写」型（权3 剥引用句后与权1 覆盖率 0.79 漏报）；实测其余正常从属覆盖率 0.22-0.56，0.75 无误伤，报错消息现带覆盖率百分比。
12. ~~机械产品附图必须是结构图~~ **已完成（2026-11-02 晚）**：`plan_figures.py` 新增 `claims_subject()`（product/method），产品主题自动剔除 flowchart、无图型时默认 section+pending（不再默认流程图）；`validate_plan` 对 product 主题的 flowchart 报 `SUBJECT_KIND_MISMATCH`（ERROR）、block_diagram 报 WARNING；`figure_plan.md` 加产品图型白名单说明，`specification_builder.md` 具体实施方式禁用步骤叙述结构产品。单测 12 个相关用例全过，副本已同步 `server/skills`。（2026-11-03 注：`tests/test_math_to_omml.py` 有 2 个失败，为 vendor 快照**既有问题**——`_{...}` 下标解析返回 None，与本次改动无关，待单独修。）
12a. **前端产出物正文/草稿分离**（2026-11-02 晚）：`config.ts` 新增 `isDraftFile()`（问题清单/对照表/视图检查清单/生成报告等旁路 md），`isDeliverable()` 不再含旁路文档；`stage-workspace.tsx` 把 rows 拆成成品（落盘交付件）与 draftRows（对话成稿 artifact + 旁路 md）；`case-overview.tsx` 产出物表下方新增「草稿」折叠区（默认收起，点开才见，可预览/下载）。tsc 通过。
13. ~~软著链路收尾项~~ **已完成（2026-11-02 晚）**：①申请表确认环节的硬件环境占位提示已写进 SKILL.md 第 4 步；②OfficeCLI 版本口径已查清——读取逻辑无 bug（正则解析 `--version` 正常），是二进制当天 18:47 自身从 1.0.159 变为 1.0.160（mtime 证实），两次读数都对；③本地用 `--allow-untested-officecli`，镜像内版本固定无此问题。
14. ~~软著前端两个 UI 缺陷~~ **已完成（2026-11-02 晚）**：
    - **进度卡 0/8**：`steps.ts` 新增 `deriveStepMarks()`（按每步的磁盘产物正则推导完成状态）与 `mergeStepMarks()`（磁盘事实 ∪ localStorage 点击记录）；workspace 传给 overview 的 `marks`/`current` 改用合并结果。对话一口气跑完、e2e 驱动、换浏览器打开都会正确点亮。
    - **产出物分层**：overview 的产出物表改为分组折叠——「正式资料」默认展开，「草稿」（含对话成稿 artifact）与「过程记录」（门禁 json/环境检查/analysis）默认折叠、点开才见。tsc 通过。
15. ~~软著业务理解阶段缺读码预算~~ **已完成（2026-11-02 晚）**：SKILL.md 第 1 步加硬规则——以 证据.md/README 为主，源码只读入口/路由/核心模块（≤8 个文件、每个 ≤200 行，`sed -n` 截取），禁止全量通读；代码鉴别材料以 `extract_code_material.py` 输出为准。副本已同步。已核实无风险的：申请表信息.txt 是给版权保护中心线上系统人工填报用的逐字段复制源（write_application_txt 生成，设计如此，前端 isDeliverable 白名单已过滤不显示）；用户上传的截图会在 build 时经 officecli add picture 真实嵌入操作手册 docx（15cm 居中）。
16. 软著剩余待实测/待补（按优先级）：①**设计说明书路线**——纯库/CLI/算法类软件没有 UI，操作手册写不了，规范做法是交设计说明书（模块结构、数据结构、算法流程），技能需补这条分支（**未做**）；②~~**≥60 页分支实测**~~ **已完成（2026-11-03）**：V-Office 自身源码 210 文件 / 36719 行打包上传，走出"前30页 + 后30页"分支，两份 docx 各正好 30 页，详见第二节「软著 · 真实项目实测」；③**user-supplied 截图分支实测**——用户上传截图 → capture_screenshots.py → build 嵌图的链路仍未跑过。驱动脚本 `scripts/patent-e2e/run_copyright_multi.py` 已落地（支持 `--session` 断点续跑）。
16a. 软著实测后的收尾（2026-11-03 新增，按优先级）：①**重建 storage 镜像**，让 `rewrite_skills.py` 的 `ABS_PATTERN`、`libreoffice_page_count()` 的 profile 隔离、SKILL.md 的回合纪律与门禁表改动生效（线上现版本都没有）；②**总时长**——64 分钟里约八成是模型写字，护栏刚加还没复测；目标是同样 8-9 轮压到 20 分钟内，复测时重点看 T2/T9 这类单轮 token 数（>15k 就该怀疑草稿回流）；③**G3 读码预算要强制**——现在只是 SKILL.md 的文字约束，实测被超（10 > 8）且全部整文件读；建议 `read` 包一层行数上限，或证据脚本直接给"推荐精读清单"；④`docx_checks()` 现在拿不到页数会硬失败，若线上容器缺 LibreOffice，需在镜像里补 `libreoffice` + `pdfinfo`，否则软著生成会直接报错。

---

## 七、风险与注意

- 本地 `server/skills` 已被改写成本地绝对路径（该目录不进 git）；重建镜像时 `Dockerfile` 会按 `/opt/patent-skills` 再重写一次，本地调试需重新跑 `server/tools/rewrite_skills.py`。
- `vendor/patent-skills` 未改动，可直接重新生成副本。
- 测试误写的 `server/outputs/`、仓库根 `outputs/` 已清理。
- 模型网关曾返回 `402 Insufficient account balance`，后恢复；长时间跑全流程会消耗大量额度（252 轮 × 7 万 token）。
- 线上 storage 容器当前版本 0.1.62，未包含本文改动。
