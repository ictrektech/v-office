"""OpenAPI documentation metadata; no handler or response-filtering changes."""
from copy import deepcopy
from fastapi.openapi.utils import get_openapi
from fastapi.routing import APIRoute

S = {"type": "string"}
I = {"type": "integer"}
N = {"type": "number"}
B = {"type": "boolean"}
def obj(properties, required=None):
    return {"type": "object", "properties": deepcopy(properties), "required": list(properties) if required is None else required, "additionalProperties": True}
def arr(schema): return {"type": "array", "items": schema}
def ref(name): return {"$ref": "#/components/schemas/" + name}
def nullable(schema): return {"anyOf": [schema, {"type": "null"}]}


def build_openapi(app, ai_router):
    if app.openapi_schema: return app.openapi_schema
    spec = get_openapi(title=app.title, version=app.version, routes=app.routes, servers=[{"url": "."}])
    schemas = spec.setdefault("components", {}).setdefault("schemas", {})
    file = obj({"name": S, "size": I, "modified": {**I, "description": "Unix seconds."}})
    entry = obj({"name": S, "path": S, "isDir": B, "size": I, "modified": I})
    source = obj({"id": S, "name": S, "kind": S, "readOnly": B, "roots": arr(obj({"name": S, "path": S}))})
    draft = obj({"title": S, "blocks": arr(obj({"anchor": S, "heading": S, "text": S})), "chars": I, "updated_at": nullable(N)})
    session = obj({"id": S, "title": S, "skill": S, "created_at": N, "updated_at": N, "turn": I})
    saved = obj({"name": S, "size": I, "token": S, "path": S, "status": S, "version": S, "backup": nullable(S)}, [],)
    template = nullable(obj({"name": nullable(S), "size": nullable(I), "uploaded_at": nullable(N)}))
    material = obj({"name": S, "size": I})
    project = nullable(obj({"archive": S, "archive_bytes": I, "extracted_bytes": I, "files": I, "source_files": I, "source_lines": I, "languages": arr(obj({"name": S, "files": I, "lines": I})), "top_dirs": arr(obj({"name": S, "files": I}))}))
    artifact = obj({"key": S, "title": S, "chars": I, "updated_at": N}, ["key", "title", "chars"])
    schemas.update({"OfficeFile": file, "OfficeSourceEntry": entry, "OfficeDocumentSource": source, "OfficeDraft": draft, "OfficeSession": session, "OfficeSavedDocument": saved, "OfficeTemplate": template, "OfficeMaterial": material, "OfficeProject": project, "OfficeArtifact": artifact})
    settings = obj({k:deepcopy(v) for k,v in schemas["SettingsPatch"]["properties"].items() if k != "api_key"}, [])
    settings["properties"].update({"has_api_key": B, "model_source": S, "effective_base_url": S, "effective_tools": arr(S), "policy_text": S})
    schemas["OfficeAISettings"] = settings
    schemas["SettingsPatch"]["properties"]["api_key"]["writeOnly"] = True
    shared_write = obj({"status": S, "path": S, "size": I, "token": S, "backup": nullable(S), "unchanged": B, "version": S}, ["status", "path", "size", "token"])
    storage = {
        "healthz": obj({"status": S}), "client_log": obj({"status": S}), "me": obj({"username": S}),
        "list_files": obj({"files": arr(ref("OfficeFile"))}),
        "put_file": obj({"status": S, "name": S, "size": I, "token": S, "unchanged": B}, ["status", "name", "size", "token"]),
        "delete_file": obj({"status": S}), "rename_file": obj({"status": S, "name": S}),
        "list_sources": obj({"sources": arr(ref("OfficeDocumentSource")), "cached": B}),
        "list_source_entries": obj({"source": S, "path": S, "parent": nullable(S), "entries": arr(ref("OfficeSourceEntry")), "truncated": B, "cached": B}),
        "list_source_documents": obj({"source": S, "path": S, "documents": arr(obj({"name": S, "path": S, "folder": S, "size": I, "modified": I})), "truncated": B, "cached": B}),
        "put_source_file": shared_write, "copy_file_to_source": obj({"status": S, "path": S, "size": I, "version": S, "backup": S}), "source_file_history_restore": obj({"status": S, "path": S, "size": I, "version": S, "backup": S}),
        "source_file_history": obj({"versions": arr(obj({"id": S, "name": S, "exportName": S, "size": I, "modified": I, "by": S, "version": S})), "keep": I, "writable": B}),
        "source_file_history_export": obj({"status": S, "name": S, "size": I}), "copy_source_file_to_storage": obj({"status": S, "name": S, "size": I}),
        "wopi_status": obj({"state": S, "ready": B}),
        "wopi_session": obj({"editorUrl": S, "wopiSrc": S, "accessToken": {**S, "description": "Short-lived WOPI capability; keep URLs/tokens private."}, "name": S, "canWrite": B}),
        "editor_link": obj({"url": S, "name": S, "canWrite": B, "expiresIn": I}),
        "wopi_check_file_info": obj({**{k:S for k in ("BaseFileName","Version","OwnerId","UserId","UserFriendlyName","PostMessageOrigin")},"Size":I,**{k:B for k in ("UserCanWrite","UserCanRename","SupportsUpdate","SupportsLocks","SupportsExtendedLockLength","SupportsGetLock")}}),
    }
    ai = {
        "health": obj({"ok": B, "pi": obj({"available": B, "path": S, "version": nullable(S)}), "skills_dir": S, "running": arr(S), "global_concurrency": I, "sandbox": obj({"per_user": B, "enforced": B, "uid_base": I, "users": I}, [])}, []),
        "get_settings": ref("OfficeAISettings"), "put_settings": ref("OfficeAISettings"),
        "list_models": obj({"source": S, "models": arr(obj({"id": S, "name": S})), "selected": S}),
        "get_sessions": obj({"sessions": arr(ref("OfficeSession"))}), "post_session": ref("OfficeSession"), "delete_session": obj({"deleted": S}),
        "get_draft": ref("OfficeDraft"), "put_draft": ref("OfficeDraft"),
        "apply_many": obj({"applied": arr(obj({"anchor": S, "op": S}, [])), "skipped": arr(obj({"anchor": S, "reason": S}, [])), "draft": ref("OfficeDraft"), "saved": nullable(S)}),
        "save_to_docs": obj({"saved": nullable(S), "draft": ref("OfficeDraft"), "already": B}, ["saved", "draft"]),
        "doc_chars": obj({"chars": I}), "get_transcript": obj({"messages": arr(obj({"role": S, "text": S, "at": S, "thinking": S, "anchor": S}, ["role", "text", "at"]))}), "put_transcript": obj({"saved": B}),
        "export_docx": obj({"saved": S, "draft": ref("OfficeDraft")}), "draft_html": obj({"html": S, "draft": ref("OfficeDraft")}),
        "import_docx": obj({"draft": ref("OfficeDraft"), "source": S}), "stop_session": obj({"stopped": B}),
        "upload_material": obj({"name": S, "size": I, "project": ref("OfficeProject")}, ["name", "size"]),
        "get_project": obj({"project": ref("OfficeProject")}), "delete_project": obj({"project": {"type": "null"}}), "list_materials": obj({"materials": arr(ref("OfficeMaterial"))}),
        "delete_material": obj({"removed": S}), "upload_template": obj({"template": ref("OfficeTemplate")}), "get_template": obj({"template": ref("OfficeTemplate")}), "delete_template": obj({"template": {"type": "null"}}),
        "list_files": obj({"files": arr(obj({"path": S, "size": I, "mtime": I}))}), "rebuild_final_docx": obj({"ok": B, "message": S}, ["ok"]), "rebuild_source_docx": obj({"ok": B, "message": S}, ["ok"]),
        "save_session_file": obj({"ok": B}), "save_files_to_docs": obj({"saved": arr(obj({"path": S, "error": S, "saved": S}, ["path"]))}),
        "session_state": obj({"materials": arr(ref("OfficeMaterial")), "project": ref("OfficeProject"), "template": ref("OfficeTemplate"), "draft": ref("OfficeDraft"), "artifacts": arr(ref("OfficeArtifact")), "activeArtifact": S, "running": B}),
        "get_artifacts": obj({"artifacts": arr(ref("OfficeArtifact")), "active": S}), "post_artifact": ref("OfficeArtifact"), "get_artifact": obj({"key": S, "title": S, "markdown": S}), "del_artifact": obj({"removed": S}),
    }
    spec["components"]["securitySchemes"] = {"VOSBearer": {"type": "http", "scheme": "bearer", "description": "Verified VOS user identity; not a provider or Scheduler model Key."}, "WOPICapability": {"type": "apiKey", "in": "query", "name": "access_token", "description": "Short-lived capability issued for the Collabora session, restricted to that user/file and read/write mode."}}
    seen = set()
    for router in (ai_router, app):
        for route in router.routes:
            if not isinstance(route, APIRoute) or not route.include_in_schema: continue
            name = route.endpoint.__name__
            mapping = ai if route.path.startswith("/api/v1/ai/") or router is ai_router else storage
            for method in route.methods:
                path = route.path if router is app else "/api/v1/ai" + route.path
                if path not in spec["paths"] or (path, method) in seen: continue
                seen.add((path, method)); op = spec["paths"][path][method.lower()]
                op["summary"] = name.replace("_", " ").capitalize()
                op["security"] = ([{"WOPICapability": []}] if path.startswith("/wopi/") else [] if name in {"healthz", "client_log", "health", "wopi_status"} else [{"VOSBearer": []}])
                extra = []
                if name in {"list_sources", "list_source_entries", "list_source_documents"}:
                    extra.append({"name": "refresh", "in": "query", "required": False, "schema": {"type": "string", "enum": ["1", "true"]}, "description": "Bypass the short listing cache."})
                if name in {"wopi_session", "editor_link"}:
                    extra.extend([{"name": "edit", "in": "query", "required": False, "schema": {"type": "string", "default": "1"}, "description": "0 or false requests read-only access."}, {"name": "version", "in": "query", "required": False, "schema": {"type": "integer", "default": 0, "minimum": 0}, "description": "Editor session version; not a save CAS token."}])
                if extra: op.setdefault("parameters", []).extend(extra)
                if name in mapping:
                    op["responses"]["200"] = {"description": "Native application JSON; no Scheduler envelope.", "content": {"application/json": {"schema": mapping[name]}}}
                    if name == "copy_file_to_source": op["responses"]["201"] = deepcopy(op["responses"]["200"])
                elif name == "chat":
                    op["responses"]["200"] = {"description": "SSE data records with type ready, native progress/tool/text, done or error, then data: [DONE]. HTTP200 is not proof of success; error can carry partial text. Disconnect requests process-tree cancellation.", "content": {"text/event-stream": {"schema": S}}}
                elif name in {"wopi_put_contents", "wopi_file_operations"}:
                    op["responses"] = {"default": {"description": "Native WOPI status and headers, usually an empty body. Check X-WOPI-Lock and operation-specific conflict/lock/read-write status; not an ordinary JSON file API."}}
                else:
                    op["responses"]["200"] = {"description": "File/media bytes. Inspect Content-Type; errors can remain JSON.", "content": {"*/*": {"schema": {"type": "string", "format": "binary"}}}}
                if name in {"get_file", "get_source_file"} and router is app:
                    op["responses"]["200"]["headers"] = {"X-VOffice-Token": {"description": "Content-version token; send as if-match-token query when saving to prevent lost updates.", "schema": S}}
                if name in {"put_file", "put_source_file", "convert_file", "upload_material", "upload_template", "wopi_put_contents"}:
                    op["requestBody"] = {"required": True, "content": {"application/octet-stream": {"schema": {"type": "string", "format": "binary"}}}}
                op["responses"].setdefault("default", {"description": "Check HTTP status and Content-Type. FastAPI detail may be a message or structured conflict/validation details. Some artifact errors use error; gateway errors may be plain text.", "content": {"application/json": {"schema": obj({"detail": {"description": "String, validation list or structured conflict details."}, "error": S}, [])}, "text/plain": {"schema": S}}})
    app.openapi_schema = spec
    return spec
