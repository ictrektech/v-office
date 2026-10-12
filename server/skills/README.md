# 打包进镜像的技能（AgentSkills 包）

镜像里的 AI（Pi agent）会从这里加载技能：

- 容器内路径：`/opt/patent-skills`（由 `server/Dockerfile` 的 `COPY skills/` 打入）
- 服务端环境变量：`V_OFFICE_AI_SKILLS`（默认就是上面那个路径）
- 加载逻辑：`server/ai.py` 的 `_skill_args()` —— 请求没点名技能时，把这个目录下的
  **每个子目录**依次用 `--skill` 传给 pi；子目录里必须有自己的 `SKILL.md`。

## 怎么放技能进来

构建 storage 镜像前，把技能仓库的子包拷进来即可（目录会被打进镜像）：

```bash
# 例如 patent-disclosure-skill 仓库
cp -r ../patent-disclosure-skill/skills/* server/skills/
```

`build_image.sh` 在构建 storage 镜像前会做这件事：默认从
`${PATENT_SKILLS_DIR:-../patent-disclosure-skill/skills}` 同步（目录不存在就跳过，
镜像里就只有本文件，AI 仍可用、只是没有专用技能）。

## 为什么不在运行时挂卷

VOS 应用是 pull 模式安装：宿主机上并没有技能仓库的目录，挂卷会挂空。
所以技能随镜像走；要更新技能就重新构建 storage 镜像（体积代价约 10MB）。
