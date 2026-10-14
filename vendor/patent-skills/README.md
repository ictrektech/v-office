# vendor/patent-skills

技能包（AgentSkills）的**固定副本**，构建 storage 镜像时打进镜像，随镜像分发。

## 为什么放进仓库

`server/skills/` 只是构建期的中转目录——`build_image.sh` 会先清空它、再从技能
来源同步一次。所以技能必须有个**可版本化**的落脚点，否则：

- 换一台机器 `git pull` 之后，隔壁没有技能仓库那个目录 → 构建出的镜像**没有技能**
- 而"没有技能"不是少个锦上添花的功能：md↔docx 转换一律失败，**编辑器根本打不开**，
  用户只看得到一句「生成 docx 失败」

放进仓库之后就是一个仓库自足：`git pull` 完就能构建。

## 来源与本地改动

上游：<https://github.com/handsomestWei/patent-disclosure-skill>
（`LICENSE.txt` 随包保留）

**本副本含未合并回上游的本地改动**，至少包括：

- `*/tools/md_to_docx.py`：三份转换脚本都加了整篇样式参数
  （`--body-font` / `--body-size` / `--heading-font` / `--heading-size` /
  `--line-spacing`），供 AI 工作台的 `<doc-style/>` 指令使用。
  **三份必须同步修改**：`_skill_tool` 优先用「本次会话所属技能包」的那份，
  只改一份的后果很隐蔽——用另一个技能写稿时脚本不认参数、转换直接失败，
  用户看到的是「AI 说改好了，文档却没更新」。
- `writing/`：公文写作技能（上游尚未收录）。

## 更新上游时

```bash
cp -r /path/to/patent-disclosure-skill/skills/. vendor/patent-skills/
cp /path/to/patent-disclosure-skill/LICENSE.txt vendor/patent-skills/

# 关键一步：确认上面的本地改动没被覆盖掉
git diff --stat vendor/patent-skills
grep -c 'body-size' vendor/patent-skills/*/tools/md_to_docx.py   # 三份都应为 1
```

## 与 server/skills 的关系

构建 storage 镜像前，这里的内容会被同步进 `server/skills/`（该目录被 .gitignore
忽略，纯中转）。本地开发者若在隔壁 clone 了技能仓库、想直接用那份，可以覆盖：

```bash
PATENT_SKILLS_DIR=../patent-disclosure-skill/skills ./build_image.sh --storage
```
