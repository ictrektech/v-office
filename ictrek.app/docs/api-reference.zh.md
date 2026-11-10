# V-Office API 详细参考

## 地址与身份

应用内“API 接入指南”提供核心示例和“完整 API 字段参考”，后者列出实际服务的全部接口、请求体与返回值。VOS 同源入口为 `/api/com.ictrek.v-office`；容器直连 `http://v-office-storage:5000`（以 compose 的服务监听配置为准）。OpenAPI 为 `/openapi.json`，完整参考为 `/api/v1/docs`。在 VOS 入口后追加这些路径；不要把前端 `v-office:80` 当成存储接口。

普通文件与 AI 会话接口使用 `Authorization: Bearer <VOS access_token>`；先调用 `GET /api/v1/me` 确认身份。私有文档按实际 VOS 用户隔离；公共源仅限平台授权挂载的目录，写入还受共享写开关控制。健康检查、客户端诊断日志与 Collabora 状态不需要用户认证。开发用 AUTH_DISABLED 不属于部署鉴权方案。

应用没有自己的客户端 API Key 管理功能。AI 设置中的 `api_key` 是手动配置的上游凭据，写入后不回显；GET 设置只返回 `has_api_key`。使用 V-Scheduler 时，模型发现和推理携带当前 VOS 身份，模型 ID 使用目录中的完整 ID。厂商 Key、V-Scheduler 访问 Key、VOS token 和短时 WOPI capability 不能混用。

## 文件、共享目录与冲突

上传是原始二进制请求体，不是 multipart；文件名与查询参数需要 URL 编码。下载返回文件字节。GET 文件响应的 `X-VOffice-Token` 是内容版本；保存时通过查询参数 `if-match-token` 提交，实现冲突检测。409 的 detail 包含 `reason=version-changed` 和当前 token；应重新读取并由调用方决定如何合并，不能盲目重试覆盖。旧调用省略 token 仍可覆盖，不提供相同冲突保护。

PUT 保存的 `unchanged=true` 可能表示编辑器产物与目标格式不兼容，原文件未写入；不能只看 HTTP200 判断已经保存。共享目录的 `copy-from-file` 会覆盖同名文件并留底，新增返回201、覆盖返回200；该操作返回 `version` 而不是 PUT 保存的 `token`。423 表示其他协同会话正在占用。历史版本支持只读打开、导出到私有文档和恢复；恢复会修改共享文件。DELETE 文件或会话是实际删除，不是“停止”。

目录列表支持 `refresh=1` 跳过短期缓存；递归文档列表的 `truncated=true` 表示达到扫描限额，不是完整目录。文件大小与正文长度上限由运行配置决定，超限413；缺少/空正文400，路径或内容无效400，不存在404，权限不足401/403。

## AI 会话、流与停止

创建会话后可分别管理草稿、材料、模板、转录、多个 artifacts 与会话产物。草稿的 `anchor` 是字符串段号，时间戳为 Unix 秒。`apply` 的 patches 必须非空；单个 `{full:true,text:"..."}` 替换整篇，局部 patches 按服务的锚点/操作解释。返回 applied/skipped 数组应逐项检查。保存或出稿的 `saved` 是文件名字符串，不是文件对象；apply 未保存时它为 null。批量 to-docs 的每个元素分别返回 saved 文件名或 error，HTTP200 可包含部分失败。

POST chat 返回 SSE，`data:` JSON 包含 ready、原生进度/工具/文本、done 或 error，最后 `data: [DONE]`。HTTP200 只表示流建立，必须检查 error 和完成事件；正文可能仅有部分输出。断开连接会请求终止进程树；POST stop 返回 stopped=false 表示无活动进程，true 表示已发起本会话进程停止，不等于独立的全局调度器资源释放回执。普通会话 API 不会创建 V-Scheduler 管理密钥。

转录 PUT 只保留最近300条、每条白名单 role/text/at/thinking/anchor 字段；saved=false 表示持久化失败。会话删除返回 `{deleted:"<session-id>"}`。会话文件编辑仅限允许的文本扩展名，base_sha256 用于内容冲突检测；推理运行期间或文件变化可返回409。DOCX 转换不可用返回502，存储不可用503。

## Collabora / WOPI

`/api/v1/wopi/session` 和 `/api/v1/documents/editor-link` 为指定文档生成短时编辑地址。`edit=0` 请求只读，`version` 控制编辑会话重开，不是保存 CAS。WOPI 回调通过 query access_token 认证，并用 X-WOPI-Override、X-WOPI-Lock 等协议头进行锁操作；这些是 Collabora 内部协议，不能当作外部 Agent 的通用 Key API。不要记录或公开包含 token 的编辑 URL。接口原始错误可能是 FastAPI detail、artifact error 或代理文本，请同时检查状态和 Content-Type。

```bash
BASE='http://<vos-host>/api/com.ictrek.v-office'
curl --fail-with-body "$BASE/api/v1/me" -H "Authorization: Bearer $VOS_TOKEN"
curl --fail-with-body "$BASE/api/v1/files/report.docx" -H "Authorization: Bearer $VOS_TOKEN" -D headers.txt -o report.docx
# 从响应头读取 X-VOffice-Token；保存时 URL 编码 token。
curl --fail-with-body -X PUT "$BASE/api/v1/files/report.docx?if-match-token=<encoded-token>" -H "Authorization: Bearer $VOS_TOKEN" -H 'Content-Type: application/octet-stream' --data-binary @report.docx
```


## 完整接口与返回

### GET /api/v1/ai/health

身份：公开接口 / 按文中调用边界

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `ok` | boolean | 可选 |  |
| `pi` | object | 可选 |  |
| `pi.available` | boolean | 必填 |  |
| `pi.path` | string | 必填 |  |
| `pi.version` | string  /  null | 必填 |  |
| `skills_dir` | string | 可选 |  |
| `running` | array<string> | 可选 |  |
| `global_concurrency` | integer | 可选 |  |
| `sandbox` | object | 可选 |  |
| `sandbox.per_user` | boolean | 可选 |  |
| `sandbox.enforced` | boolean | 可选 |  |
| `sandbox.uid_base` | integer | 可选 |  |
| `sandbox.users` | integer | 可选 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/settings

身份：VOSBearer

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeAISettings`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### PUT /api/v1/ai/settings

身份：VOSBearer

请求体：application/json

`SettingsPatch`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeAISettings`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/models

身份：VOSBearer

当前可选的模型列表：V-Scheduler 模式下拉用；本地手填模式返回空。

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `source` | string | 必填 |  |
| `models` | array<object> | 必填 |  |
| `selected` | string | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions

身份：VOSBearer

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `sessions` | array<OfficeSession> | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions

身份：VOSBearer

请求体：application/json

`CreateSessionRequest`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeSession`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}

身份：VOSBearer

删掉一条会话线（会话目录 + 它的 meta / 材料 / 草稿）。

删除全部走 `safe_fs` 的兜底：宿主环境的删除护栏会 `raise SystemExit`，用
`shutil.rmtree(..., ignore_errors=True)` 拦不住它，结果是「删除会话」500、
会话还在——用户点几次都是 500，比删不掉更糟。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `deleted` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/draft

身份：VOSBearer

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeDraft`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### PUT /api/v1/ai/sessions/{sid}/draft

身份：VOSBearer

- `path: sid` · string · 必填 · 

请求体：application/json

`DraftImport`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeDraft`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/apply

身份：VOSBearer

- `path: sid` · string · 必填 · 

请求体：application/json

`ApplyRequest`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `applied` | array<object> | 必填 |  |
| `skipped` | array<object> | 必填 |  |
| `draft` | OfficeDraft | 必填 |  |
| `saved` | string  /  null | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/save

身份：VOSBearer

「保存到我的文档」：把草稿出成 docx 写进「我的文档」。

最容易把人绕晕的是空草稿：文档名 = 会话标题，而**换会话 / 重开页面**都会新起
一个空草稿的会话，标题却一模一样。此时编辑器里开着的那份文档（内容都在）和
服务端的空草稿是同一个名字——早先这里直接报「草稿还是空的」，用户看到的却是
眼前一篇完整的稿子，只能理解成「保存坏了」。

正确做法：空草稿 + 盘上已有同名文档 = 用户手里这本就是那份文档，**如实回「已经
在「我的文档」里」**；真的什么都没有（既没草稿也没文档）才报错。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `saved` | string  /  null | 必填 |  |
| `draft` | OfficeDraft | 必填 |  |
| `already` | boolean | 可选 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/doc-chars

身份：VOSBearer

量一下「我的文档」里那份 docx 的正文长度。**只读，绝不碰草稿。**

用途只有一个：AI 的稿子贴进编辑器之后，核对落盘的是不是完整那一版。
粘贴是异步的（见 ai-studio 的注入注释），保存抢跑就会存进半篇；这个数字
就是那条断言——短于草稿就重贴，再短就让编辑器从服务端那份完整 docx 重读。

读不到 / 转不动一律回 0：调用方把 0 当「这次没量上」，不当成失败（否则一次
存储抖动就会引发无谓的重贴）。

- `path: sid` · string · 必填 · 

- `query: name` · string · 可选 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `chars` | integer | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/transcript

身份：VOSBearer

取这条会话的对话记录；没有就返回空列表（不是错误）。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `messages` | array<object> | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### PUT /api/v1/ai/sessions/{sid}/transcript

身份：VOSBearer

存下这条会话的对话记录（前端在对话停下来后落库）。

- `path: sid` · string · 必填 · 

请求体：application/json

`TranscriptBody`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `saved` | boolean | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/docx

身份：VOSBearer

草稿 → .docx 写进「我的文档」，返回文件名（前端据此用 Collabora 打开）。

刻意不做在每轮保存里：转换要起 Python 子进程，塞进每轮对话会拖慢出字；
这里按需触发，只在用户真的要打开编辑器时转一次。

`blank=1` 是**撰写室打开编辑器的载体请求**，与「出稿」分开：

- 默认（用户主动出稿/保存）：空稿回 400「还没有内容」。正文里没有内容时
  产出一份 docx 没有意义，历史上正是「空稿兜底造标题」把同名文档写成了
  10 个字符，把用户写了半天的正文整份覆盖掉。
- `blank=1`（撰写室一进来就是 Collabora，用户得先有个文档才能写）：空稿给
  一份**完全空白**的 docx 作载体。Collabora 只认 docx，没文件就没法起内核，
  这里没有选择；但它**不含任何标题**——标题不进正文是硬口径，载体也不能破。

- `path: sid` · string · 必填 · 

- `query: blank` · integer · 可选 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `saved` | string | 必填 |  |
| `draft` | OfficeDraft | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/draft-html

身份：VOSBearer

草稿 → HTML，供编辑器内嵌注入用（前端只粘贴，不自己渲染 Markdown）。

为什么绕「md→docx→mammoth」这一圈：md→docx 由技能脚本做，而它就是用户
最终拿到的那份 docx 的渲染器；mammoth 再把这份 docx 转成 HTML。前端早先
自己写过一个 markdown→HTML，结果两套渲染器各画各的——`**加粗**` 原样粘进
了文档、标题还重复。长相只以 docx 为准：这里给的就是「那份 docx 的 HTML 版」，
粘进编辑器后与 apply 写盘的内容完全一致。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `html` | string | 必填 |  |
| `draft` | OfficeDraft | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/import-docx

身份：VOSBearer

把「我的文档」里的 docx 回读成草稿：用户在编辑器里手改过，agent 是不知道的。

- `path: sid` · string · 必填 · 

请求体：application/json

`DocxImport`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `draft` | OfficeDraft | 必填 |  |
| `source` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/stop

身份：VOSBearer

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `stopped` | boolean | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/chat

身份：VOSBearer

- `path: sid` · string · 必填 · 

请求体：application/json

`ChatRequest`

响应 200 — SSE data records with type ready, native progress/tool/text, done or error, then data: [DONE]. HTTP200 is not proof of success; error can carry partial text. Disconnect requests process-tree cancellation.

`text/event-stream`

`string`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/materials

身份：VOSBearer

上传材料：**原件直接放进 agent 的工作目录**（`materials/`）。

这里刻意不做「解析成文本」：那是替 agent 嚼碎材料——表格、图、排版都在
那一步丢掉，它想换个方式重新解析也没原件可用。文件给它，怎么读由它决定。

源码 ZIP 是特例：服务端顺手解成 `project/`，并回一份项目概况（文件数、
源码行数、主要语言）。软著的代码材料只能来自真实源码，让 agent 自己去解
一个几百 MB 的包既慢又挡不住解压炸弹。

- `path: sid` · string · 必填 · 

- `query: name` · string · 可选 · 

请求体：application/octet-stream

`string`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 必填 |  |
| `size` | integer | 必填 |  |
| `project` | OfficeProject | 可选 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/materials

身份：VOSBearer

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `materials` | array<OfficeMaterial> | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/project

身份：VOSBearer

当前会话的项目概况（没传源码包就是 null）。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `project` | OfficeProject | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}/project

身份：VOSBearer

丢掉已解开的项目目录（重新上传前用；上传本身也会整体替换）。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `project` | null | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}/materials/{name}

身份：VOSBearer

撤掉一份材料：清单去掉，工作目录里的原件也一起删。

原件现在是 agent 能直接读到的东西——只删清单会留下"幽灵文件"：
用户以为删了，下一轮 agent 照样读得到。

- `path: sid` · string · 必填 · 

- `path: name` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `removed` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/template

身份：VOSBearer

上传成稿模板（docx/md/txt 均可）：**原件落到工作目录的 `templates/`**。

与材料的区别：材料是「写什么」，模板是「按什么结构写」——prompt 只指明模板
文件在哪儿并要求严格按它的栏目成文，正文由 agent 自己读。

- `path: sid` · string · 必填 · 

- `query: name` · string · 可选 · 

请求体：application/octet-stream

`string`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `template` | OfficeTemplate | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/template

身份：VOSBearer

当前会话的模板摘要（没有就是 null）。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `template` | OfficeTemplate | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}/template

身份：VOSBearer

撤掉模板：下一轮 prompt 不再带结构约束，`templates/` 下的原件也删掉。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `template` | null | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/files

身份：VOSBearer

列出工作目录里的产物文件（图、Word、Excel…），按路径排序。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `files` | array<object> | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/files/{path}

身份：公开接口 / 按文中调用边界

取工作目录里的一个文件（原样发回，前端直接展示或下载）。

- `path: sid` · string · 必填 · 

- `path: path` · string · 必填 · 

响应 200 — Successful Response

`application/json`

`JSON`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

### POST /api/v1/ai/sessions/{sid}/rebuild-final

身份：VOSBearer

重算软著草稿指纹并重建正式资料（docx/txt/生成报告）。

用与该用户 agent 相同的 uid 跑（文件属主才一致），cwd 锁在技能脚本目录
（脚本从同目录 import common/officecli_backend）。workdir 在运行时由会话
目录推导，代码里不写死任何机器相关路径。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `ok` | boolean | 必填 |  |
| `message` | string | 可选 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/rebuild-docx

身份：VOSBearer

把会话里某一份 md 源重建成同名 Word（专利交底 / 申请文件 / 审查答复通用）。

- `path: sid` · string · 必填 · 

请求体：application/json

`RebuildDocxRequest`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `ok` | boolean | 必填 |  |
| `message` | string | 可选 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/file

身份：VOSBearer

把用户在网页上编辑的 md/txt 源写回会话目录（原子写 + 冲突检测）。

- `path: sid` · string · 必填 · 

请求体：application/json

`SaveFileRequest`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `ok` | boolean | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/to-docs

身份：VOSBearer

把会话目录里的产物（Word / Excel / 图）收进用户「我的文档」。

为什么需要这个接口：agent 现在能跑技能脚本，产物由脚本按技能包约定直接写在
会话目录（`outputs/`）里——这条路**绕过了服务端**，所以「我的文档」看不到它们。
这里补上那座桥的第二个入口：第一个是草稿（`_save_draft_docx`），第二个就是
这些文件。写入仍走 `_save_document`，原子写、路径校验、留底全在应用层。

为什么不让 agent 自己往「我的文档」写：它按用户降权跑，碰不到 DATA_ROOT；
而且那目录里是用户**所有**文档，把路径交给它等于拆掉沙箱。

- `path: sid` · string · 必填 · 

请求体：application/json

`ToDocsRequest`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `saved` | array<object> | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/state

身份：VOSBearer

一个会话的全部可见状态：材料（已解析）、草稿、进行中的回合。

产物不在这里——成稿直接写进用户「我的文档」，走文档存储那套接口读。

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `materials` | array<OfficeMaterial> | 必填 |  |
| `project` | OfficeProject | 必填 |  |
| `template` | OfficeTemplate | 必填 |  |
| `draft` | OfficeDraft | 必填 |  |
| `artifacts` | array<OfficeArtifact> | 必填 |  |
| `activeArtifact` | string | 必填 |  |
| `running` | boolean | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/artifacts

身份：VOSBearer

- `path: sid` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `artifacts` | array<OfficeArtifact> | 必填 |  |
| `active` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/artifacts

身份：VOSBearer

- `path: sid` · string · 必填 · 

请求体：application/json

`ArtifactSave`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeArtifact`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/artifacts/{key}

身份：VOSBearer

取一份产物的正文（打开它时用）。

- `path: sid` · string · 必填 · 

- `path: key` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `key` | string | 必填 |  |
| `title` | string | 必填 |  |
| `markdown` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}/artifacts/{key}

身份：VOSBearer

- `path: sid` · string · 必填 · 

- `path: key` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `removed` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /healthz

身份：公开接口 / 按文中调用边界

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/health

身份：公开接口 / 按文中调用边界

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /client-log

身份：公开接口 / 按文中调用边界

Unauthenticated diagnostic sink: the frontend reports save-flow steps
and failures here so they are visible in the container logs.

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/me

身份：VOSBearer

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `username` | string | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/files

身份：VOSBearer

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `files` | array<OfficeFile> | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/files/{name}

身份：VOSBearer

- `path: name` · string · 必填 · 

响应 200 — File/media bytes. Inspect Content-Type; errors can remain JSON.

`*/*`

`string`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### PUT /api/v1/files/{name}

身份：VOSBearer

- `path: name` · string · 必填 · 

- `query: if-match-token` · string · 可选 · 

请求体：application/octet-stream

`string`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |
| `name` | string | 必填 |  |
| `size` | integer | 必填 |  |
| `token` | string | 必填 |  |
| `unchanged` | boolean | 可选 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### DELETE /api/v1/files/{name}

身份：VOSBearer

- `path: name` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### PATCH /api/v1/files/{name}

身份：VOSBearer

- `path: name` · string · 必填 · 

请求体：application/json

`RenameFileRequest`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |
| `name` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/convert

身份：VOSBearer

LibreOffice headless format conversion (老格式 <-> 现代格式), auth required.

The editor engine cannot write legacy binaries at all（.doc / .ppt）and reads
them poorly, so the web app opens a LibreOffice-converted docx/pptx copy and
converts the edited copy back to the original legacy format on save.
`frm` is the source extension, `to` the target extension.

- `query: to` · string · 可选 · 

- `query: frm` · string · 可选 · 

请求体：application/octet-stream

`string`

响应 200 — File/media bytes. Inspect Content-Type; errors can remain JSON.

`*/*`

`string`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/sources

身份：VOSBearer

列出可浏览的文档源（共享目录 / NAS）及其解析后的授权目录。

- `query: refresh` · string · 可选 · Bypass the short listing cache.

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `sources` | array<OfficeDocumentSource> | 必填 |  |
| `cached` | boolean | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/entries

身份：VOSBearer

列出某个文档源下的一级内容（子目录 + 可打开的文档）。

- `path: source` · string · 必填 · 

- `query: path` · string · 可选 · 

- `query: refresh` · string · 可选 · Bypass the short listing cache.

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `source` | string | 必填 |  |
| `path` | string | 必填 |  |
| `parent` | string  /  null | 必填 |  |
| `entries` | array<OfficeSourceEntry> | 必填 |  |
| `truncated` | boolean | 必填 |  |
| `cached` | boolean | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/file

身份：VOSBearer

下载（打开）源里的一个文档，供浏览器端编辑器加载。

- `path: source` · string · 必填 · 

- `query: path` · string · 必填 · 

响应 200 — File/media bytes. Inspect Content-Type; errors can remain JSON.

`*/*`

`string`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### PUT /api/v1/sources/{source}/file

身份：VOSBearer

把编辑后的文档写回共享源——即"编辑 NAS 上的原文档"。

覆盖已有文件；文件不存在时作为新文档创建（父目录必须已存在）。写回始终
落在原路径上，因此共享盘上的文件名/位置保持不变。

if-match-token：编辑器打开这份文档时服务端随内容一起给它的版本标记
（见 GET .../file 的 X-VOffice-Token 响应头）。带上就做一次 CAS —— 盘上
已经不是他看到的那一版就拒写。

为什么必须补这一刀：共享盘里刻意排除协同的那几类（pdf / txt / md / csv /
rtf）走的就是单机内核保存 → 这条路径。它此前**既没有排队锁、也没有版本
校验、也没有留底**，是共享盘写入里唯一还敞着的口子：A 刚发布上去的内容，
会被 B 手里那份"打开时的旧副本"整份写回抹掉，而且不可恢复。

- `path: source` · string · 必填 · 

- `query: path` · string · 必填 · 

- `query: if-match-token` · string · 可选 · 

请求体：application/octet-stream

`string`

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |
| `path` | string | 必填 |  |
| `size` | integer | 必填 |  |
| `token` | string | 必填 |  |
| `backup` | string  /  null | 可选 |  |
| `unchanged` | boolean | 可选 |  |
| `version` | string | 可选 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/documents

身份：VOSBearer

递归遍历一个授权目录，平铺返回其中所有可打开的文档。

挂载进来的盘里，文档常埋在多级子目录里（如 A/B/C/…），让用户一层层点进去
很费劲。这里一次遍历到底，返回每个文档的源内路径与所在子目录，前端直接
平铺展示；点开编辑、保存写回原路径。

安全与成本：深度上限 MAX_WALK_DEPTH，文档数上限 MAX_WALK_DOCUMENTS（超出
截断并置 truncated=true）；跳过隐藏目录与系统目录；软链解析后越出授权根
目录的一律不遍历。

- `path: source` · string · 必填 · 

- `query: path` · string · 可选 · 

- `query: refresh` · string · 可选 · Bypass the short listing cache.

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `source` | string | 必填 |  |
| `path` | string | 必填 |  |
| `documents` | array<object> | 必填 |  |
| `truncated` | boolean | 必填 |  |
| `cached` | boolean | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/sources/{source}/copy-from-file

身份：VOSBearer

把「我的文档」里的一个文件写入共享源目录（例如 NAS 的公共目录）。

服务端直接读私有目录、写共享盘，不需要把文件下载到浏览器再上传一遍。
同名**直接覆盖**：用户点这个入口本来就是"把我这份放上去"，不需要再来一次
"你看到的是哪一版"的比对。覆盖掉的那一版会留底，随时能从文件列表的「版本」
里取回来或退回去 —— 强制覆盖之所以能接受，靠的就是这一步。

- `path: source` · string · 必填 · 

- `query: name` · string · 必填 · 

- `query: path` · string · 可选 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |
| `path` | string | 必填 |  |
| `size` | integer | 必填 |  |
| `version` | string | 必填 |  |
| `backup` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 201 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |
| `path` | string | 必填 |  |
| `size` | integer | 必填 |  |
| `version` | string | 必填 |  |
| `backup` | string | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/history

身份：VOSBearer

某个共享文件的留底版本（最近的在前），供界面「版本」用。

文件被覆盖时服务端会先把旧内容留底到同目录的隐藏目录；这里把它读出来，让用户可以
回退到之前某一版（"反悔"）。留底与读取都在服务端做，前端不需要知道目录结构。

- `path: source` · string · 必填 · 

- `query: path` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `versions` | array<object> | 必填 |  |
| `keep` | integer | 必填 |  |
| `writable` | boolean | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/sources/{source}/history/restore

身份：VOSBearer

把某个留底版本写回原文件（用户点「回退」）。

回退本身也先给"当前版本"留底，所以回退错了还能再回退回来 —— 不留底的回退等于
用一个不可逆操作去修另一个不可逆操作。

与「覆盖添加」共用同一把按目标的排队锁和同一套审计日志：两者都是对同一个文件的
整份写入，必须串行。

- `path: source` · string · 必填 · 

- `query: path` · string · 必填 · 

- `query: id` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |
| `path` | string | 必填 |  |
| `size` | integer | 必填 |  |
| `version` | string | 必填 |  |
| `backup` | string | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/sources/{source}/history/export

身份：VOSBearer

把某个留底版本「保存到我的文档」，**不动公共盘上的原文件**。

这是"想反悔但先不急着回退"的出路：把旧版本取回自己名下看一眼、接着改，确认了再
决定要不要回退。落到私有目录一律不覆盖同名文件（撞名自动加 (1)(2)…），文件名带上
那一版的时刻，方便一眼看出拿的是哪一版。

- `path: source` · string · 必填 · 

- `query: path` · string · 必填 · 

- `query: id` · string · 必填 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |
| `name` | string | 必填 |  |
| `size` | integer | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/history/file

身份：VOSBearer

取某个留底版本的字节，用于界面上「打开」看内容。

只读、不改任何东西：界面里"打开一个历史版本"就是把这份字节当成**本地文件**交给
编辑器（保存只可能另存或下载），公共盘上的原文件与留底都不受影响。

- `path: source` · string · 必填 · 

- `query: path` · string · 必填 · 

- `query: id` · string · 必填 · 

响应 200 — File/media bytes. Inspect Content-Type; errors can remain JSON.

`*/*`

`string`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/sources/{source}/copy-to-file

身份：VOSBearer

把共享源里的文档复制到「我的文档」（用户私有目录）。

与 copy-from-file 相反的方向：服务端直接读共享盘、写私有目录，不经
浏览器。默认不覆盖同名文件（overwrite=true 才会覆盖）。

- `path: source` · string · 必填 · 

- `query: path` · string · 必填 · 

- `query: overwrite` · boolean · 可选 · 

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `status` | string | 必填 |  |
| `name` | string | 必填 |  |
| `size` | integer | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/wopi/status

身份：公开接口 / 按文中调用边界

前端轮询：Collabora 是否就绪（驱动「启动中」按钮态与等待提示）。

state 取值：
  ok          —— discovery 可用，可以正常打开文档
  warming_up  —— 容器冷启动中（启动后 5s 一次探活），前端应等待重试
  unavailable —— 超过 WARMUP_TIMEOUT 仍未就绪，大概率未部署，前端应立即回退
unknown 不会出现在这里：状态接口本身 404/超时时由前端按"无 storage 服务"处理。

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `state` | string | 必填 |  |
| `ready` | boolean | 必填 |  |

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### POST /api/v1/wopi/session

身份：VOSBearer

前端调用：为一个文档换取 Collabora 编辑器地址与 access_token。

不带 source：应用私有存储里的文档，name 为文件名。
带 source/path：共享源（平台授权目录 / NAS）里的文档，path 为源内相对路径，
此时 Collabora 通过 WOPI 直接读写**原文件**，保存即写回共享盘。
lang：编辑器界面语言（BCP-47）；缺省时 Collabora 跟随浏览器语言。

- `query: name` · string · 可选 · 

- `query: source` · string · 可选 · 

- `query: path` · string · 可选 · 

- `query: lang` · string · 可选 · 

- `query: edit` · string · 可选 · 0 or false requests read-only access.

- `query: version` · integer · 可选 · Editor session version; not a save CAS token.

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `editorUrl` | string | 必填 |  |
| `wopiSrc` | string | 必填 |  |
| `accessToken` | string | 必填 | Short-lived WOPI capability; keep URLs/tokens private. |
| `name` | string | 必填 |  |
| `canWrite` | boolean | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /api/v1/documents/editor-link

身份：VOSBearer

给外部宿主一个可以直接嵌进 iframe 的 Collabora 地址。

链接指向的是 Collabora 自己的前端（cool.html，带 WOPISrc 与短时效
access_token），**不是本应用的页面**：宿主不需要为"编辑"另做一个页面，
也不用转发任何字节——保存由 Collabora 通过 WOPI 直接写回本服务的私有
存储。

和 /wopi/session 的区别只有两点：只接受私有存储里的文件名，且返回的是
浏览器可直接使用的**绝对地址**（宿主拿不到本应用的 base path 规则）。

- `query: name` · string · 可选 · 

- `query: lang` · string · 可选 · 

- `query: edit` · string · 可选 · 0 or false requests read-only access.

- `query: version` · integer · 可选 · Editor session version; not a save CAS token.

响应 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `url` | string | 必填 |  |
| `name` | string | 必填 |  |
| `canWrite` | boolean | 必填 |  |
| `expiresIn` | integer | 必填 |  |

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

响应 default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | JSON | 可选 | String, validation list or structured conflict details. |
| `error` | string | 可选 |  |

`text/plain`

`string`

### GET /wopi/files/{name}/contents

身份：公开接口 / 按文中调用边界

- `path: name` · string · 必填 · 

响应 200 — Successful Response

`application/json`

`JSON`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

### POST /wopi/files/{name}/contents

身份：公开接口 / 按文中调用边界

- `path: name` · string · 必填 · 

响应 200 — Successful Response

`application/json`

`JSON`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

### GET /wopi/files/{name}

身份：公开接口 / 按文中调用边界

- `path: name` · string · 必填 · 

响应 200 — Successful Response

`application/json`

`JSON`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

### POST /wopi/files/{name}

身份：公开接口 / 按文中调用边界

WOPI 锁操作：通过 X-WOPI-Override 区分 LOCK/UNLOCK/REFRESH_LOCK/GET_LOCK。

- `path: name` · string · 必填 · 

响应 200 — Successful Response

`application/json`

`JSON`

响应 422 — Validation Error

`application/json`

`HTTPValidationError`

## 共享数据结构

字段保持 API 的原始拼写；JSON 任意扩展字段按其所属服务说明解释。

### ApplyRequest

用户点「接受」后落文。patches 为空 = 把模型给的全篇替换落下来。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `patches` | array<object> | 可选 |  · default=[] |
| `title` | string | 可选 |  · default="" |
| `save` | boolean | 可选 |  · default=true |

### ArtifactSave

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `key` | string | 必填 |  |
| `title` | string | 可选 |  · default="" |
| `markdown` | string | 可选 |  · default="" |

### ChatRequest

一轮对话。

`anchor` / `selection` 是「改哪里」：段落编号或选中原文，二者可同时给。
`save` = 这一轮结束后立刻把草稿写进我的文档（初稿会自动保存一次）。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `prompt` | string | 必填 |  |
| `resume` | boolean | 可选 |  · default=true |
| `anchor` | string | 可选 |  · default="" |
| `selection` | string | 可选 |  · default="" |
| `save` | boolean | 可选 |  · default=false |
| `autosave` | boolean | 可选 |  · default=true |
| `language` | string | 可选 |  · default="" |

### CreateSessionRequest

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 可选 |  · default="" |
| `skill` | string | 可选 |  · default="" |

### DocxImport

要回读的文件名（「我的文档」里的那份 docx）。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 必填 |  |

### DraftImport

从编辑器导入当前稿（用户在编辑器里手改过，agent 是不知道的）。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `markdown` | string | 必填 |  |
| `title` | string | 可选 |  · default="" |

### HTTPValidationError

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `detail` | array<ValidationError> | 可选 |  |

### RebuildDocxRequest

要重建的 md 源（相对会话目录的路径）。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `path` | string | 必填 |  |

### RenameFileRequest

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 必填 |  |

### SaveFileRequest

网页编辑 md 源后的写回请求。

`base_sha256` 是用户打开文件时的内容指纹（乐观锁）：保存时若磁盘上的
版本已经变了（多半是 agent 同一轮也改了它），拒绝写入并提示刷新——
无声覆盖等于把助手的活儿删了。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `path` | string | 必填 |  |
| `content` | string | 必填 |  |
| `base_sha256` | string | 可选 |  · default="" |

### SettingsPatch

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `base_url` | string  /  null | 可选 |  |
| `api_key` | string  /  null | 可选 |  |
| `model` | string  /  null | 可选 |  |
| `thinking` | string  /  null | 可选 |  |
| `max_concurrency` | integer  /  null | 可选 |  |
| `turn_timeout_s` | integer  /  null | 可选 |  |
| `idle_timeout_s` | integer  /  null | 可选 |  |
| `auto_approve` | boolean  /  null | 可选 |  |
| `allow_shell` | boolean  /  null | 可选 |  |
| `skills` | array<string>  /  null | 可选 |  |
| `system_prompt` | string  /  null | 可选 |  |

### ToDocsRequest

收件请求：把会话目录里的哪些产物送进「我的文档」。

`names` 可选：路径 → 想存成的文件名（用户改过名才带）。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `paths` | array<string> | 必填 |  |
| `names` | object | 可选 |  · default={} |

### TranscriptBody

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `messages` | array<object> | 可选 |  · default=[] |

### ValidationError

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `loc` | array<string  /  integer> | 必填 |  |
| `msg` | string | 必填 |  |
| `type` | string | 必填 |  |
| `input` | JSON | 可选 |  |
| `ctx` | object | 可选 |  |

### OfficeFile

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 必填 |  |
| `size` | integer | 必填 |  |
| `modified` | integer | 必填 | Unix seconds. |

### OfficeSourceEntry

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 必填 |  |
| `path` | string | 必填 |  |
| `isDir` | boolean | 必填 |  |
| `size` | integer | 必填 |  |
| `modified` | integer | 必填 |  |

### OfficeDocumentSource

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 必填 |  |
| `name` | string | 必填 |  |
| `kind` | string | 必填 |  |
| `readOnly` | boolean | 必填 |  |
| `roots` | array<object> | 必填 |  |

### OfficeDraft

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 必填 |  |
| `blocks` | array<object> | 必填 |  |
| `chars` | integer | 必填 |  |
| `updated_at` | number  /  null | 必填 |  |

### OfficeSession

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 必填 |  |
| `title` | string | 必填 |  |
| `skill` | string | 必填 |  |
| `created_at` | number | 必填 |  |
| `updated_at` | number | 必填 |  |
| `turn` | integer | 必填 |  |

### OfficeSavedDocument

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 可选 |  |
| `size` | integer | 可选 |  |
| `token` | string | 可选 |  |
| `path` | string | 可选 |  |
| `status` | string | 可选 |  |
| `version` | string | 可选 |  |
| `backup` | string  /  null | 可选 |  |

### OfficeTemplate

`object | null`

### OfficeMaterial

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 必填 |  |
| `size` | integer | 必填 |  |

### OfficeProject

`object | null`

### OfficeArtifact

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `key` | string | 必填 |  |
| `title` | string | 必填 |  |
| `chars` | integer | 必填 |  |
| `updated_at` | number | 可选 |  |

### OfficeAISettings

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `base_url` | string  /  null | 可选 |  |
| `model` | string  /  null | 可选 |  |
| `thinking` | string  /  null | 可选 |  |
| `max_concurrency` | integer  /  null | 可选 |  |
| `turn_timeout_s` | integer  /  null | 可选 |  |
| `idle_timeout_s` | integer  /  null | 可选 |  |
| `auto_approve` | boolean  /  null | 可选 |  |
| `allow_shell` | boolean  /  null | 可选 |  |
| `skills` | array<string>  /  null | 可选 |  |
| `system_prompt` | string  /  null | 可选 |  |
| `has_api_key` | boolean | 可选 |  |
| `model_source` | string | 可选 |  |
| `effective_base_url` | string | 可选 |  |
| `effective_tools` | array<string> | 可选 |  |
| `policy_text` | string | 可选 |  |
