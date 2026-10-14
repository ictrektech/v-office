# 打包进镜像的技能（AgentSkills 包）

镜像里的 AI（Pi agent）会从这里加载技能：

- 容器内路径：`/opt/patent-skills`（由 `server/Dockerfile` 的 `COPY skills/` 打入）
- 服务端环境变量：`V_OFFICE_AI_SKILLS`（默认就是上面那个路径）
- 加载逻辑：`server/ai.py` 的 `_skill_args()` —— 请求没点名技能时，把这个目录下的
  **每个子目录**依次用 `--skill` 传给 pi；子目录里必须有自己的 `SKILL.md`。

## 怎么放技能进来

**正常情况下不用手工拷**：`build_image.sh` 构建 storage 镜像前会自动同步，来源按
顺序取

1. `PATENT_SKILLS_DIR`（显式指定）
2. `../patent-disclosure-skill/skills`（本地 clone 的技能仓库，改技能时用这份）
3. `vendor/patent-skills`（**仓库内的固定副本**，兜底）

第 3 档是必须的：以前第 2 档找不到就**静默跳过**，产出一个 md↔docx 转换全坏、
编辑器打不开的镜像（用户只看到「生成 docx 失败」）——换台机器 pull 下来构建就会
踩到。别去掉它。

临时手工拷也可以（比如单独试某个技能）：

```bash
cp -r /path/to/skills/. server/skills/
```

本目录在 .gitignore 里，**只是构建中转**，别往里提交东西——技能的可版本化副本在
`vendor/patent-skills/`，来源与更新方式见那里的 README。

## 为什么不在运行时挂卷

VOS 应用是 pull 模式安装：宿主机上并没有技能仓库的目录，挂卷会挂空。
所以技能随镜像走；要更新技能就重新构建 storage 镜像（体积代价约 10MB）。
