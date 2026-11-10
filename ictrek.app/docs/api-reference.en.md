# V-Office API reference

## Addresses and identity

The in-app API Guide links to the complete operation and field reference. Use the VOS same-origin base `/api/com.ictrek.v-office` or the storage container `http://v-office-storage:5000` (check its compose listener). Append `/openapi.json` for the native contract or `/api/v1/docs` for the full reference. The frontend alias `v-office:80` is not the storage API.

File and AI session APIs require `Authorization: Bearer <VOS access_token>`. Call GET `/api/v1/me` to confirm the actual user. Private files are user-isolated; shared sources are limited to platform-authorized mounts and the shared-write setting. Health, client diagnostics and Collabora status do not require user authentication. AUTH_DISABLED is a development setting, not deployment authentication.

This app does not issue client API keys. The `api_key` AI setting is an upstream credential for manual mode: it is write-only, with only `has_api_key` returned. Scheduler mode discovers models and performs inference using the current VOS identity and complete catalog model IDs. Provider keys, Scheduler access keys, VOS tokens and short-lived WOPI capabilities have different purposes.

## Files, shared sources and conflicts

Uploads use raw bytes, not multipart; URL-encode names and query values. Downloads return file bytes. GET includes `X-VOffice-Token`, a content version. Send it in the `if-match-token` query when saving. On 409, detail includes `reason=version-changed` and the current token; re-read and resolve the conflict instead of blindly overwriting. Legacy callers may omit the token, losing this protection.

`unchanged=true` on PUT may mean an editor output was incompatible with the target format and the original was left untouched. HTTP200 alone does not prove a write. Shared `copy-from-file` overwrites existing names with a history snapshot: creation returns201, overwrite200. Its result uses `version`, unlike PUT's `token`. HTTP423 reports another collaborative editor using the file. History supports read-only download, export into private documents and restore; restore modifies the shared file. DELETE actually deletes a file or session, rather than merely stopping it.

Listings support `refresh=1` to bypass the short cache. Recursive listing `truncated=true` means the configured scan limit was reached. Configured size limits return413; missing/empty or invalid content/path400, missing resources404, identity/permission failures401/403.

## AI sessions, events and stopping

After session creation, manage draft, materials, template, transcript, artifacts and generated files separately. Draft anchors are string paragraph numbers; timestamps are Unix seconds. Apply requires nonempty patches; a single `{full:true,text:"..."}` replaces the entire draft, while local patches use the service's anchor/operation contract. Inspect both applied and skipped arrays. Save/export `saved` is a filename string, not a file object; apply returns null when no save occurs. Each batch to-docs result separately contains saved filename or error, so HTTP200 can include partial failure.

Chat returns SSE: `data:` JSON records contain ready, native progress/tool/text, done or error, followed by `data: [DONE]`. HTTP200 only establishes the stream; inspect error and completion events, including partial output. Disconnect requests termination of the process tree. POST stop returns stopped=false if no process exists, or true when session process termination was requested; this is not a separate global Scheduler resource-release receipt.

Transcript PUT retains the last300 messages and role/text/at/thinking/anchor fields; saved=false indicates persistence failure. Session deletion returns `{deleted:"<session-id>"}`. Session text-file editing uses base_sha256 for conflict protection; an active inference or changed file can return409. DOCX conversion failure returns502 and missing storage503.

## Collabora / WOPI

`/api/v1/wopi/session` and `/api/v1/documents/editor-link` issue short-lived editor URLs for one document. `edit=0` requests read-only mode; `version` reopens an editor session and is not a save CAS token. WOPI uses query access_token and X-WOPI-Override/X-WOPI-Lock headers for its internal lock protocol. It is not a general Agent API-key interface. Keep editor URLs private. Errors can be FastAPI detail, artifact error or proxy text: check status and Content-Type together.

```bash
BASE='http://<vos-host>/api/com.ictrek.v-office'
curl --fail-with-body "$BASE/api/v1/me" -H "Authorization: Bearer $VOS_TOKEN"
curl --fail-with-body "$BASE/api/v1/files/report.docx" -H "Authorization: Bearer $VOS_TOKEN" -D headers.txt -o report.docx
# Read X-VOffice-Token from the response headers and URL-encode it.
curl --fail-with-body -X PUT "$BASE/api/v1/files/report.docx?if-match-token=<encoded-token>" -H "Authorization: Bearer $VOS_TOKEN" -H 'Content-Type: application/octet-stream' --data-binary @report.docx
```


## Operations and responses

### GET /api/v1/ai/health

Identity: public operation / boundary described above

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `ok` | boolean | Optional |  |
| `pi` | object | Optional |  |
| `pi.available` | boolean | Required |  |
| `pi.path` | string | Required |  |
| `pi.version` | string  /  null | Required |  |
| `skills_dir` | string | Optional |  |
| `running` | array<string> | Optional |  |
| `global_concurrency` | integer | Optional |  |
| `sandbox` | object | Optional |  |
| `sandbox.per_user` | boolean | Optional |  |
| `sandbox.enforced` | boolean | Optional |  |
| `sandbox.uid_base` | integer | Optional |  |
| `sandbox.users` | integer | Optional |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/settings

Identity: VOSBearer

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeAISettings`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### PUT /api/v1/ai/settings

Identity: VOSBearer

Request body: application/json

`SettingsPatch`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeAISettings`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/models

Identity: VOSBearer



Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `source` | string | Required |  |
| `models` | array<object> | Required |  |
| `selected` | string | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions

Identity: VOSBearer

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `sessions` | array<OfficeSession> | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions

Identity: VOSBearer

Request body: application/json

`CreateSessionRequest`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeSession`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `deleted` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/draft

Identity: VOSBearer

- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeDraft`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### PUT /api/v1/ai/sessions/{sid}/draft

Identity: VOSBearer

- `path: sid` · string · Required · 

Request body: application/json

`DraftImport`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeDraft`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/apply

Identity: VOSBearer

- `path: sid` · string · Required · 

Request body: application/json

`ApplyRequest`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `applied` | array<object> | Required |  |
| `skipped` | array<object> | Required |  |
| `draft` | OfficeDraft | Required |  |
| `saved` | string  /  null | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/save

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `saved` | string  /  null | Required |  |
| `draft` | OfficeDraft | Required |  |
| `already` | boolean | Optional |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/doc-chars

Identity: VOSBearer



- `path: sid` · string · Required · 

- `query: name` · string · Optional · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `chars` | integer | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/transcript

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `messages` | array<object> | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### PUT /api/v1/ai/sessions/{sid}/transcript

Identity: VOSBearer



- `path: sid` · string · Required · 

Request body: application/json

`TranscriptBody`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `saved` | boolean | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/docx

Identity: VOSBearer



- `path: sid` · string · Required · 

- `query: blank` · integer · Optional · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `saved` | string | Required |  |
| `draft` | OfficeDraft | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/draft-html

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `html` | string | Required |  |
| `draft` | OfficeDraft | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/import-docx

Identity: VOSBearer



- `path: sid` · string · Required · 

Request body: application/json

`DocxImport`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `draft` | OfficeDraft | Required |  |
| `source` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/stop

Identity: VOSBearer

- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `stopped` | boolean | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/chat

Identity: VOSBearer

- `path: sid` · string · Required · 

Request body: application/json

`ChatRequest`

Response 200 — SSE data records with type ready, native progress/tool/text, done or error, then data: [DONE]. HTTP200 is not proof of success; error can carry partial text. Disconnect requests process-tree cancellation.

`text/event-stream`

`string`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/materials

Identity: VOSBearer



- `path: sid` · string · Required · 

- `query: name` · string · Optional · 

Request body: application/octet-stream

`string`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `name` | string | Required |  |
| `size` | integer | Required |  |
| `project` | OfficeProject | Optional |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/materials

Identity: VOSBearer

- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `materials` | array<OfficeMaterial> | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/project

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `project` | OfficeProject | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}/project

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `project` | null | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}/materials/{name}

Identity: VOSBearer



- `path: sid` · string · Required · 

- `path: name` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `removed` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/template

Identity: VOSBearer



- `path: sid` · string · Required · 

- `query: name` · string · Optional · 

Request body: application/octet-stream

`string`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `template` | OfficeTemplate | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/template

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `template` | OfficeTemplate | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}/template

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `template` | null | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/files

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `files` | array<object> | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/files/{path}

Identity: public operation / boundary described above



- `path: sid` · string · Required · 

- `path: path` · string · Required · 

Response 200 — Successful Response

`application/json`

`JSON`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

### POST /api/v1/ai/sessions/{sid}/rebuild-final

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `ok` | boolean | Required |  |
| `message` | string | Optional |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/rebuild-docx

Identity: VOSBearer



- `path: sid` · string · Required · 

Request body: application/json

`RebuildDocxRequest`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `ok` | boolean | Required |  |
| `message` | string | Optional |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/file

Identity: VOSBearer



- `path: sid` · string · Required · 

Request body: application/json

`SaveFileRequest`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `ok` | boolean | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/to-docs

Identity: VOSBearer



- `path: sid` · string · Required · 

Request body: application/json

`ToDocsRequest`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `saved` | array<object> | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/state

Identity: VOSBearer



- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `materials` | array<OfficeMaterial> | Required |  |
| `project` | OfficeProject | Required |  |
| `template` | OfficeTemplate | Required |  |
| `draft` | OfficeDraft | Required |  |
| `artifacts` | array<OfficeArtifact> | Required |  |
| `activeArtifact` | string | Required |  |
| `running` | boolean | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/artifacts

Identity: VOSBearer

- `path: sid` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `artifacts` | array<OfficeArtifact> | Required |  |
| `active` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/ai/sessions/{sid}/artifacts

Identity: VOSBearer

- `path: sid` · string · Required · 

Request body: application/json

`ArtifactSave`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`OfficeArtifact`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/ai/sessions/{sid}/artifacts/{key}

Identity: VOSBearer



- `path: sid` · string · Required · 

- `path: key` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `key` | string | Required |  |
| `title` | string | Required |  |
| `markdown` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### DELETE /api/v1/ai/sessions/{sid}/artifacts/{key}

Identity: VOSBearer

- `path: sid` · string · Required · 

- `path: key` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `removed` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /healthz

Identity: public operation / boundary described above

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/health

Identity: public operation / boundary described above

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /client-log

Identity: public operation / boundary described above

Unauthenticated diagnostic sink: the frontend reports save-flow steps
and failures here so they are visible in the container logs.

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/me

Identity: VOSBearer

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `username` | string | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/files

Identity: VOSBearer

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `files` | array<OfficeFile> | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/files/{name}

Identity: VOSBearer

- `path: name` · string · Required · 

Response 200 — File/media bytes. Inspect Content-Type; errors can remain JSON.

`*/*`

`string`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### PUT /api/v1/files/{name}

Identity: VOSBearer

- `path: name` · string · Required · 

- `query: if-match-token` · string · Optional · 

Request body: application/octet-stream

`string`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |
| `name` | string | Required |  |
| `size` | integer | Required |  |
| `token` | string | Required |  |
| `unchanged` | boolean | Optional |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### DELETE /api/v1/files/{name}

Identity: VOSBearer

- `path: name` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### PATCH /api/v1/files/{name}

Identity: VOSBearer

- `path: name` · string · Required · 

Request body: application/json

`RenameFileRequest`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |
| `name` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/convert

Identity: VOSBearer



- `query: to` · string · Optional · 

- `query: frm` · string · Optional · 

Request body: application/octet-stream

`string`

Response 200 — File/media bytes. Inspect Content-Type; errors can remain JSON.

`*/*`

`string`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/sources

Identity: VOSBearer



- `query: refresh` · string · Optional · Bypass the short listing cache.

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `sources` | array<OfficeDocumentSource> | Required |  |
| `cached` | boolean | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/entries

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: path` · string · Optional · 

- `query: refresh` · string · Optional · Bypass the short listing cache.

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `source` | string | Required |  |
| `path` | string | Required |  |
| `parent` | string  /  null | Required |  |
| `entries` | array<OfficeSourceEntry> | Required |  |
| `truncated` | boolean | Required |  |
| `cached` | boolean | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/file

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: path` · string · Required · 

Response 200 — File/media bytes. Inspect Content-Type; errors can remain JSON.

`*/*`

`string`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### PUT /api/v1/sources/{source}/file

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: path` · string · Required · 

- `query: if-match-token` · string · Optional · 

Request body: application/octet-stream

`string`

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |
| `path` | string | Required |  |
| `size` | integer | Required |  |
| `token` | string | Required |  |
| `backup` | string  /  null | Optional |  |
| `unchanged` | boolean | Optional |  |
| `version` | string | Optional |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/documents

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: path` · string · Optional · 

- `query: refresh` · string · Optional · Bypass the short listing cache.

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `source` | string | Required |  |
| `path` | string | Required |  |
| `documents` | array<object> | Required |  |
| `truncated` | boolean | Required |  |
| `cached` | boolean | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/sources/{source}/copy-from-file

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: name` · string · Required · 

- `query: path` · string · Optional · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |
| `path` | string | Required |  |
| `size` | integer | Required |  |
| `version` | string | Required |  |
| `backup` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response 201 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |
| `path` | string | Required |  |
| `size` | integer | Required |  |
| `version` | string | Required |  |
| `backup` | string | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/history

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: path` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `versions` | array<object> | Required |  |
| `keep` | integer | Required |  |
| `writable` | boolean | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/sources/{source}/history/restore

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: path` · string · Required · 

- `query: id` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |
| `path` | string | Required |  |
| `size` | integer | Required |  |
| `version` | string | Required |  |
| `backup` | string | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/sources/{source}/history/export

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: path` · string · Required · 

- `query: id` · string · Required · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |
| `name` | string | Required |  |
| `size` | integer | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/sources/{source}/history/file

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: path` · string · Required · 

- `query: id` · string · Required · 

Response 200 — File/media bytes. Inspect Content-Type; errors can remain JSON.

`*/*`

`string`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/sources/{source}/copy-to-file

Identity: VOSBearer



- `path: source` · string · Required · 

- `query: path` · string · Required · 

- `query: overwrite` · boolean · Optional · 

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `status` | string | Required |  |
| `name` | string | Required |  |
| `size` | integer | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/wopi/status

Identity: public operation / boundary described above



Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `state` | string | Required |  |
| `ready` | boolean | Required |  |

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### POST /api/v1/wopi/session

Identity: VOSBearer



- `query: name` · string · Optional · 

- `query: source` · string · Optional · 

- `query: path` · string · Optional · 

- `query: lang` · string · Optional · 

- `query: edit` · string · Optional · 0 or false requests read-only access.

- `query: version` · integer · Optional · Editor session version; not a save CAS token.

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `editorUrl` | string | Required |  |
| `wopiSrc` | string | Required |  |
| `accessToken` | string | Required | Short-lived WOPI capability; keep URLs/tokens private. |
| `name` | string | Required |  |
| `canWrite` | boolean | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /api/v1/documents/editor-link

Identity: VOSBearer



- `query: name` · string · Optional · 

- `query: lang` · string · Optional · 

- `query: edit` · string · Optional · 0 or false requests read-only access.

- `query: version` · integer · Optional · Editor session version; not a save CAS token.

Response 200 — Native application JSON; no Scheduler envelope.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `url` | string | Required |  |
| `name` | string | Required |  |
| `canWrite` | boolean | Required |  |
| `expiresIn` | integer | Required |  |

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

Response default — Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.

`application/json`

`object`

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | JSON | Optional | String, validation list or structured conflict details. |
| `error` | string | Optional |  |

`text/plain`

`string`

### GET /wopi/files/{name}/contents

Identity: public operation / boundary described above

- `path: name` · string · Required · 

Response 200 — Successful Response

`application/json`

`JSON`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

### POST /wopi/files/{name}/contents

Identity: public operation / boundary described above

- `path: name` · string · Required · 

Response 200 — Successful Response

`application/json`

`JSON`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

### GET /wopi/files/{name}

Identity: public operation / boundary described above

- `path: name` · string · Required · 

Response 200 — Successful Response

`application/json`

`JSON`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

### POST /wopi/files/{name}

Identity: public operation / boundary described above



- `path: name` · string · Required · 

Response 200 — Successful Response

`application/json`

`JSON`

Response 422 — Validation Error

`application/json`

`HTTPValidationError`

## Shared data types

Field names retain their API spelling. Interpret extension metadata according to its owning service.

### ApplyRequest



| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `patches` | array<object> | Optional |  · default=[] |
| `title` | string | Optional |  · default="" |
| `save` | boolean | Optional |  · default=true |

### ArtifactSave

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `key` | string | Required |  |
| `title` | string | Optional |  · default="" |
| `markdown` | string | Optional |  · default="" |

### ChatRequest



| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `prompt` | string | Required |  |
| `resume` | boolean | Optional |  · default=true |
| `anchor` | string | Optional |  · default="" |
| `selection` | string | Optional |  · default="" |
| `save` | boolean | Optional |  · default=false |
| `autosave` | boolean | Optional |  · default=true |
| `language` | string | Optional |  · default="" |

### CreateSessionRequest

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `title` | string | Optional |  · default="" |
| `skill` | string | Optional |  · default="" |

### DocxImport



| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `name` | string | Required |  |

### DraftImport



| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `markdown` | string | Required |  |
| `title` | string | Optional |  · default="" |

### HTTPValidationError

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `detail` | array<ValidationError> | Optional |  |

### RebuildDocxRequest



| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `path` | string | Required |  |

### RenameFileRequest

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `name` | string | Required |  |

### SaveFileRequest



| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `path` | string | Required |  |
| `content` | string | Required |  |
| `base_sha256` | string | Optional |  · default="" |

### SettingsPatch

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `base_url` | string  /  null | Optional |  |
| `api_key` | string  /  null | Optional |  |
| `model` | string  /  null | Optional |  |
| `thinking` | string  /  null | Optional |  |
| `max_concurrency` | integer  /  null | Optional |  |
| `turn_timeout_s` | integer  /  null | Optional |  |
| `idle_timeout_s` | integer  /  null | Optional |  |
| `auto_approve` | boolean  /  null | Optional |  |
| `allow_shell` | boolean  /  null | Optional |  |
| `skills` | array<string>  /  null | Optional |  |
| `system_prompt` | string  /  null | Optional |  |

### ToDocsRequest



| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `paths` | array<string> | Required |  |
| `names` | object | Optional |  · default={} |

### TranscriptBody

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `messages` | array<object> | Optional |  · default=[] |

### ValidationError

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `loc` | array<string  /  integer> | Required |  |
| `msg` | string | Required |  |
| `type` | string | Required |  |
| `input` | JSON | Optional |  |
| `ctx` | object | Optional |  |

### OfficeFile

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `name` | string | Required |  |
| `size` | integer | Required |  |
| `modified` | integer | Required | Unix seconds. |

### OfficeSourceEntry

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `name` | string | Required |  |
| `path` | string | Required |  |
| `isDir` | boolean | Required |  |
| `size` | integer | Required |  |
| `modified` | integer | Required |  |

### OfficeDocumentSource

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `id` | string | Required |  |
| `name` | string | Required |  |
| `kind` | string | Required |  |
| `readOnly` | boolean | Required |  |
| `roots` | array<object> | Required |  |

### OfficeDraft

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `title` | string | Required |  |
| `blocks` | array<object> | Required |  |
| `chars` | integer | Required |  |
| `updated_at` | number  /  null | Required |  |

### OfficeSession

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `id` | string | Required |  |
| `title` | string | Required |  |
| `skill` | string | Required |  |
| `created_at` | number | Required |  |
| `updated_at` | number | Required |  |
| `turn` | integer | Required |  |

### OfficeSavedDocument

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `name` | string | Optional |  |
| `size` | integer | Optional |  |
| `token` | string | Optional |  |
| `path` | string | Optional |  |
| `status` | string | Optional |  |
| `version` | string | Optional |  |
| `backup` | string  /  null | Optional |  |

### OfficeTemplate

`object | null`

### OfficeMaterial

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `name` | string | Required |  |
| `size` | integer | Required |  |

### OfficeProject

`object | null`

### OfficeArtifact

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `key` | string | Required |  |
| `title` | string | Required |  |
| `chars` | integer | Required |  |
| `updated_at` | number | Optional |  |

### OfficeAISettings

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `base_url` | string  /  null | Optional |  |
| `model` | string  /  null | Optional |  |
| `thinking` | string  /  null | Optional |  |
| `max_concurrency` | integer  /  null | Optional |  |
| `turn_timeout_s` | integer  /  null | Optional |  |
| `idle_timeout_s` | integer  /  null | Optional |  |
| `auto_approve` | boolean  /  null | Optional |  |
| `allow_shell` | boolean  /  null | Optional |  |
| `skills` | array<string>  /  null | Optional |  |
| `system_prompt` | string  /  null | Optional |  |
| `has_api_key` | boolean | Optional |  |
| `model_source` | string | Optional |  |
| `effective_base_url` | string | Optional |  |
| `effective_tools` | array<string> | Optional |  |
| `policy_text` | string | Optional |  |
