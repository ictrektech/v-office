"use client";

/**
 * 公文写作子页面主视图：左侧文档栏（云文档 + 本地上传）、
 * 选择文种、写作设置、生成过程与成稿导出（GenerateView）。
 *
 * 高冷风格：#F6F6F7 固定浅色背景、黑白灰主色（#1D1D1F 主操作）、
 * 单色线性图标、细边框轻阴影，克制的 Apple Pro 质感。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  FileInput,
  FileSpreadsheet,
  FileStack,
  FileText,
  FolderOpen,
  History,
  Layers,
  Lightbulb,
  LineChart,
  ListChecks,
  Loader2,
  Mail,
  Megaphone,
  MessageSquare,
  Mic,
  Newspaper,
  PenLine,
  PieChart,
  Presentation,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Stamp,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  listCloudFiles,
  openCloudFile,
  saveCloudFile,
  type CloudFile,
} from "@/utils/vos/storage";
import { isVOSMode } from "@/utils/vos/fastpath";
import {
  listDocumentKnowledgeBases,
  type KnowledgeBase,
} from "@/utils/hybrag/client";
import {
  saveLocalMaterial,
  removeLocalMaterial,
  clearLocalMaterialSession,
  updateLocalMaterialSession,
  loadLocalMaterial,
  listLocalMaterials,
  type LocalMaterialRecord,
} from "@/utils/writing/local-materials";
import {
  uploadSourceFile,
  WritingClient,
  restoreWriting,
  checkWritingService,
  API_BASE,
  authHeaders,
  type WritingConfig,
  type WritingEvent,
} from "@/utils/writing/client";
import {
  GenerateView,
  type ResultData,
  type StreamItem,
  type StreamKind,
} from "./generate-view";

const DOC_TYPES = [
  "红头文件", "通知", "请示", "批复", "工作报告", "调研报告", "领导讲话稿",
  "会议纪要", "可行性研究报告", "项目立项建议书", "工作/实施方案", "工作总结",
  "述职报告", "汇报材料", "管理制度/办法", "工作简报", "政策解读材料",
  "新闻宣传稿", "大事记", "倡议书/公开信", "数据统计报表", "会议方案",
  "经验交流材料",
];

/** 文种 → 单色线性图标 */
const DOC_TYPE_ICONS: Record<string, LucideIcon> = {
  红头文件: Stamp,
  通知: Bell,
  请示: FileInput,
  批复: FileCheck,
  工作报告: BarChart3,
  调研报告: Search,
  领导讲话稿: Mic,
  会议纪要: ClipboardList,
  可行性研究报告: LineChart,
  项目立项建议书: Lightbulb,
  "工作/实施方案": ListChecks,
  工作总结: CheckCircle2,
  述职报告: Award,
  汇报材料: Presentation,
  "管理制度/办法": Shield,
  工作简报: Newspaper,
  政策解读材料: BookOpen,
  新闻宣传稿: Megaphone,
  大事记: CalendarDays,
  "倡议书/公开信": Mail,
  数据统计报表: PieChart,
  会议方案: Calendar,
  经验交流材料: Users,
};

/** 红头版式文种：显示发文字号输入，导出时按 GB/T 9704-2012 加红头 */
const REDHEAD_DOC_TYPES = new Set([
  "红头文件", "通知", "请示", "批复", "工作报告", "调研报告", "会议纪要",
]);

/** 文种 → 版式说明（与后端 resolveLayout 对应） */
function layoutHint(docType: string): string {
  if (/述职/.test(docType)) return "Word / PDF（报告版式，文末署名落款）";
  if (/演讲|讲话|发言/.test(docType)) return "Word / PDF（演讲版式，加宽行距）";
  if (REDHEAD_DOC_TYPES.has(docType))
    return "Word / PDF（GB/T 9704-2012 红头版式）";
  return "Word / PDF（GB/T 9704-2012 版式）";
}

const ACCEPT = ".docx,.pdf,.xlsx,.csv,.txt,.md";

/** 左栏材料状态：选中即上传解析，实时反馈可不可用 */
type Material =
  | { status: "uploading"; name: string }
  | {
      status: "ready";
      name: string;
      /** 静默后台解析完成前可能缺省（恢复「最近使用」场景） */
      uploadId?: string;
      chars?: number;
      parseError?: string;
    }
  | { status: "error"; name: string; error: string };

interface StreamBlock {
  type?: string;
  text?: string;
  thinking?: string;
  name?: string;
  content?: StreamBlock[];
}

export function WritingView() {
  // ── 配置态 ──
  const [docType, setDocType] = useState("政策解读材料");
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState("");
  const [requirements, setRequirements] = useState("");
  const [lengthWords, setLengthWords] = useState("0");
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);

  // ── 左栏 ──
  const [vosMode, setVosMode] = useState(false);
  const [cloudFiles, setCloudFiles] = useState<CloudFile[] | null>(null);
  const [kbList, setKbList] = useState<KnowledgeBase[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<"local" | "kb">("local");
  const [localFiles, setLocalFiles] = useState<LocalMaterialRecord[]>([]);
  /** agentic-search 写作服务可用性：null 检测中 / false 不可用（提示安装） */
  const [serviceOk, setServiceOk] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 按文件隔离的「材料会话」：每个文件独立保留解析态 / 生成流 / 成稿，点击左栏即切换 ──
  const [sessions, setSessions] = useState<Record<string, FileSession>>({});
  const [activeName, setActiveName] = useState<string | null>(null);
  const [agent, setAgent] = useState<"claude" | "opencode">("claude");
  const clientsRef = useRef<Map<string, WritingClient>>(new Map());
  const loadersRef = useRef<Map<string, () => Promise<File>>>(new Map()); // 重试用
  const configRef = useRef<WritingConfig | null>(null);
  const parsedRef = useRef<Map<string, { uploadId: string; chars: number; parseError?: string }>>(new Map());
  const streamAnchorRef = useRef<HTMLDivElement>(null);
  const configAnchorRef = useRef<HTMLDivElement>(null);

  const active = activeName ? sessions[activeName] : undefined;
  const material = active?.material ?? null;
  const streamVisible =
    !!active && (active.items.length > 0 || active.error !== null || active.result !== null);

  // ── 环境探测 + 最近使用加载 ──
  useEffect(() => {
    void (async () => {
      const vos = await isVOSMode().catch(() => false);
      setVosMode(vos);
      if (vos) {
        listCloudFiles()
          .then((files) => setCloudFiles(files))
          .catch(() => setCloudFiles([]));
      } else {
        setCloudFiles([]);
      }
      listDocumentKnowledgeBases()
        .then((kbs) => setKbList(kbs))
        .catch(() => setKbList([]));
    })();
    listLocalMaterials()
      .then(setLocalFiles)
      .catch(() => setLocalFiles([]));
    // 服务可用性探测：agentic-search 不在则提示用户安装/启动（200 = 可用）
    void checkWritingService().then(setServiceOk);
  }, []);

  // ── 材料选中即上传解析（本地文件 / 云文档统一走这里）──
  const selectMaterial = useCallback(
    async (name: string, getFile: () => Promise<File>, opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      loadersRef.current.set(name, getFile); // 记住加载方式，失败重试用
      setActiveName(name);
      // 已解析过（内存缓存）：切换即达，不重复上传
      const cached = parsedRef.current.get(name);
      if (cached) {
        setSessions((prev) => {
          const base = prev[name] ?? emptySession();
          return {
            ...prev,
            [name]: {
              ...base,
              material: {
                status: "ready" as const,
                name,
                uploadId: cached.uploadId,
                chars: cached.chars,
                parseError: cached.parseError,
              },
            },
          };
        });
        return;
      }
      if (silent) {
        // 静默恢复（点「最近使用」）：材料直接就绪、不显示解析动作，
        // 后台补一次解析拿 uploadId（重新生成时才需要），失败不影响查看成稿
        setSessions((prev) => ({
          ...prev,
          [name]: {
            ...(prev[name] ?? emptySession()),
            material: { status: "ready", name },
          },
        }));
        void (async () => {
          try {
            const f = await getFile();
            const up = await uploadSourceFile(f);
            parsedRef.current.set(name, { uploadId: up.uploadId, chars: up.chars, parseError: up.parseError });
            setSessions((prev) => {
              const cur = prev[name]?.material;
              if (cur?.status !== "ready") return prev;
              return {
                ...prev,
                [name]: {
                  ...prev[name],
                  material: { ...cur, uploadId: up.uploadId, chars: up.chars, parseError: up.parseError },
                },
              };
            });
          } catch {
            // 静默失败：查看/恢复成稿不受影响
          }
        })();
        return;
      }
      setSessions((prev) => {
        const base = prev[name] ?? emptySession();
        return {
          ...prev,
          [name]: {
            ...base,
            material:
              base.material?.status === "ready"
                ? base.material
                : ({ status: "uploading", name } as const),
          },
        };
      });
      try {
        const f = await getFile();
        const up = await uploadSourceFile(f);
        parsedRef.current.set(name, { uploadId: up.uploadId, chars: up.chars, parseError: up.parseError });
        setSessions((prev) => ({
          ...prev,
          [name]: {
            ...(prev[name] ?? emptySession()),
            material: {
              status: "ready",
              name,
              uploadId: up.uploadId,
              chars: up.chars,
              parseError: up.parseError,
            },
          },
        }));
        // 本地上传的文件进「最近使用」（IndexedDB，可点击重新加载）
        void saveLocalMaterial(f)
          .then(() => listLocalMaterials())
          .then(setLocalFiles)
          .catch(() => {});
        // VOS 线上模式：材料同步保存到云端，跨端可见
        if (await isVOSMode().catch(() => false)) {
          void f
            .arrayBuffer()
            .then((buf) => saveCloudFile(f.name, buf))
            .then(() => listCloudFiles())
            .then(setCloudFiles)
            .catch((err) => console.warn("[writing] 云端备份失败:", err));
        }
      } catch (err) {
        setSessions((prev) => ({
          ...prev,
          [name]: {
            ...(prev[name] ?? emptySession()),
            material: {
              status: "error",
              name,
              error: err instanceof Error ? err.message : String(err),
            },
          },
        }));
      }
    },
    [],
  );

  /** 重置：从 0 开始——断开会话、清空生成流与成稿（保留材料与配置） */
  const handleReset = useCallback(
    (name: string) => {
      const client = clientsRef.current.get(name);
      if (client) {
        client.disconnect();
        clientsRef.current.delete(name);
      }
      const cur = sessionsRef.current[name];
      sessionsRef.current = {
        ...sessionsRef.current,
        [name]: {
          ...emptySession(),
          material: cur?.material ?? null,
          materialChars: cur?.materialChars ?? null,
        },
      };
      setSessions({ ...sessionsRef.current });
      void clearLocalMaterialSession(name)
        .then(() => listLocalMaterials())
        .then(setLocalFiles)
        .catch(() => {});
      requestAnimationFrame(() =>
        streamAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    },
    [],
  );

  /** 解析失败重试：用记住的加载方式重走一遍 */
  const retryMaterial = useCallback(
    (name: string) => {
      const loader = loadersRef.current.get(name);
      if (loader) void selectMaterial(name, loader);
    },
    [selectMaterial],
  );

  /** 删除最近使用记录：移除 IndexedDB 记录；若为当前会话则一并关闭 */
  const removeSession = useCallback(
    (name: string) => {
      void removeLocalMaterial(name)
        .then(() => listLocalMaterials())
        .then(setLocalFiles)
        .catch(() => {});
      const client = clientsRef.current.get(name);
      if (client) {
        client.disconnect();
        clientsRef.current.delete(name);
      }
      loadersRef.current.delete(name);
      parsedRef.current.delete(name);
      setSessions((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setActiveName((cur) => (cur === name ? null : cur));
    },
    [],
  );

  // ── 会话状态定点更新 ──
  const sessionsRef = useRef<Record<string, FileSession>>({});
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const patchSession = useCallback(
    (
      name: string,
      patch: Partial<FileSession> | ((prev: FileSession) => Partial<FileSession>),
    ) => {
      // 函数式更新：WS 事件在同一 React 批处理周期内连发时，
      // 每个 patch 都基于最新 prev 计算，避免旧快照互相覆盖
      setSessions((prev) => {
        const cur = prev[name] ?? emptySession();
        const resolved = typeof patch === "function" ? patch(cur) : patch;
        return { ...prev, [name]: { ...cur, ...resolved } };
      });
    },
    [],
  );

  // ── 事件处理（写入指定文件的会话）──
  const handleEvent = useCallback((data: WritingEvent, name: string) => {
    const evt = data._event ?? (data.type as string);
    switch (evt) {
      case "writing_stage": {
        const stage = data.stage as string;
        const status = data.status as "start" | "done";
        const round = data.round as number | undefined;
        if (stage === "export") {
          patchSession(name, { exporting: status === "start" });
          return;
        }
        if (stage === "parse") {
          if (status === "done")
            patchSession(name, { materialChars: Number(data.chars ?? 0) });
          return;
        }
        const key = stage === "rewrite" ? `rewrite-${round ?? 1}` : stage === "revise" ? `revise-${Date.now()}` : stage;
        if (status === "start") {
          const labels: Record<string, string> = {
            // 三阶段新管线
            draft: "写手起草（写手 agent）",
            reviewfix: "审查改稿（审改团队）",
            signoff: "审批定稿（定稿签发人）",
            // 旧五阶段（历史会话恢复）
            review: "审查意见（审查 agent）",
            rewrite: `推稿复写（第 ${round ?? 1} 轮 · 推稿团队）`,
            audit: "审核复核（审核 agent）",
            finalize: "审批定稿（定稿签发人）",
          };
          const instr = typeof data.instruction === "string" ? data.instruction : "";
          const title =
            stage === "revise"
              ? `局部微调（${instr.slice(0, 24)}${instr.length > 24 ? "…" : ""}）`
              : (labels[stage] ?? stage);
          patchSession(name, (cur) => ({
            items: [
              ...cur.items,
              {
                key,
                kind: stage as StreamKind,
                title,
                status: "active",
                round,
                text: "",
                thinking: "",
                tools: [],
              },
            ],
            ...(stage === "revise" ? { revising: true } : {}),
            stageLabel: `【${labelOf(stage, round)}】进行中…`,
          }));
        } else {
          // revise 卡 key 含创建时间戳，done 事件无法按 key 回配——按 kind + active 匹配
          patchSession(name, (cur) => ({
            items: cur.items.map((it) =>
              it.key === key ||
              (stage === "revise" && it.kind === "revise" && it.status === "active")
                ? {
                    ...it,
                    status: "done",
                    // 后端下发的阶段真实耗时（agent 从阶段开始到结束的执行时间）
                    ...(data.elapsedMs != null
                      ? { elapsed: Math.max(1, Math.round(Number(data.elapsedMs) / 1000)) }
                      : {}),
                  }
                : it,
            ),
            ...(stage === "revise" ? { revising: false } : {}),
          }));
        }
        return;
      }
      case "assistant": {
        const msg = ((data.message as StreamBlock | undefined) ?? (data as StreamBlock));
        const blocks = (msg.content as StreamBlock[] | undefined) ?? [];
        if (!blocks.length) return;
        patchSession(name, (cur) => {
          const idx = [...cur.items].reverse().findIndex((it) => it.status === "active");
          if (idx === -1) return {};
          const real = cur.items.length - 1 - idx;
          const item = { ...cur.items[real] };
          for (const b of blocks) {
            if (b?.type === "text" && b.text?.trim()) item.text += b.text;
            else if (b?.type === "thinking" && b.thinking) item.thinking += b.thinking;
            else if (b?.type === "tool_use" && b.name) {
              if (!item.tools.includes(b.name)) item.tools = [...item.tools, b.name];
            }
          }
          const next = [...cur.items];
          next[real] = item;
          return { items: next };
        });
        return;
      }
      case "writing_done": {
        const files = (data.files as ResultData["files"] | undefined) ?? [];
        patchSession(name, (cur) => ({
          result: {
            title: String(data.title ?? cur?.result?.title ?? configRef.current?.title ?? name),
            content: String(data.content ?? ""),
            files,
            revisions: Number(data.revisions ?? 0),
          },
          // 兜底：正常完成时所有阶段卡置 done（左栏 spinner 依赖「无 active 卡」）
          items: cur.items.map((it) =>
            it.status === "active" ? { ...it, status: "done" } : it,
          ),
          stageLabel: "",
          exporting: false,
          revising: false,
          reviseError: null,
        }));
        // 记录文件 → 写作会话映射（刷新后恢复成稿用）
        const sid = clientsRef.current.get(name)?.sessionId;
        if (sid && configRef.current) {
          patchSession(name, { sessionId: sid });
          void updateLocalMaterialSession(name, sid, configRef.current)
            .then(() => listLocalMaterials())
            .then(setLocalFiles)
            .catch(() => {});
        }
        return;
      }
      case "writing_error": {
        patchSession(name, {
          error: String(data.message ?? "生成失败，请重试"),
          // 微调/撤销失败时 result 已存在，error 卡不渲染——在微调区直接显示
          reviseError: String(data.message ?? "操作失败，请重试"),
          // 兜底置 done，避免卡片永久 active 导致左栏一直转圈
          items: (sessionsRef.current[name]?.items ?? []).map((it) =>
            it.status === "active" ? { ...it, status: "done" } : it,
          ),
          stageLabel: "",
          exporting: false,
          revising: false,
        });
        return;
      }
    }
  }, [patchSession]);

  /** 刷新恢复：从服务端版本栈拉回成稿 + 重连会话（微调/撤销可用） */
  const restoreFromServer = useCallback(
    async (name: string, sessionId: string, config: WritingConfig) => {
      try {
        // 关键：同步写作配置，否则微调/撤销因 configRef 为空而静默失效
        configRef.current = config;
        const res = await restoreWriting(sessionId, config);
        if (!res?.restored || !res.content) return;
        patchSession(name, {
          // 完整恢复现场：五阶段过程卡片 + 成稿，如刚生成完
          items: (res.items ?? []) as FileSession["items"],
          result: {
            title: res.title ?? config.title,
            content: res.content,
            files: (res.files ?? []) as ResultData["files"],
            revisions: res.revisions ?? 0,
          },
          sessionId,
        });
        // 静默重连会话：恢复后微调/撤销立即可用
        if (!clientsRef.current.has(name)) {
          const client = new WritingClient();
          client.onClose(() => {
            if (!sessionsRef.current[name]?.error) {
              patchSession(name, { error: "连接已断开，请检查 AI 服务后重试" });
            }
          });
          client.onEvent((d) => handleEvent(d, name));
          try {
            await client.resume(sessionId);
            clientsRef.current.set(name, client);
            patchSession(name, { sessionId });
          } catch (err) {
            console.warn("[writing] 会话重连失败（微调/撤销需重新生成）:", err);
            client.disconnect();
          }
        }
      } catch (err) {
        console.warn("[writing] 成稿恢复失败:", err);
      }
    },
    [patchSession, handleEvent],
  );

  const startWriting = useCallback(async () => {
    const name = activeName;
    const sess = name ? sessionsRef.current[name] : undefined;
    if (!name || !docType || !title.trim() || !sess || sess.starting) return;
    patchSession(name, {
      starting: true,
      error: null,
      result: null,
      items: [],
      materialChars: null,
    });
    try {
      let uploadId: string | undefined;
      if (sess.material?.status === "ready") {
        uploadId = sess.material.uploadId;
      }

      const config: WritingConfig = {
        docType,
        title: title.trim(),
        ...(publisher.trim() ? { publisher: publisher.trim() } : {}),
        ...(docNumber.trim() && REDHEAD_DOC_TYPES.has(docType)
          ? { docNumber: docNumber.trim() }
          : {}),
        ...(audience.trim() ? { audience: audience.trim() } : {}),
        ...(style.trim() ? { style: style.trim() } : {}),
        ...(requirements.trim() ? { requirements: requirements.trim() } : {}),
        lengthWords: Math.max(0, parseInt(lengthWords, 10) || 0),
        ...(selectedKBs.length ? { knowledgeBaseNames: selectedKBs } : {}),
      };
      configRef.current = config;

      const client = new WritingClient();
      clientsRef.current.set(name, client);
      client.onClose(() => {
        if (!sessionsRef.current[name]?.error) {
          patchSession(name, { error: "连接已断开，请检查 AI 服务后重试" });
        }
      });
      client.onEvent((d) => handleEvent(d, name));
      await client.start(config, uploadId, agent);
      if (client.sessionId) patchSession(name, { sessionId: client.sessionId });
      // 同页向下进行：滚动到生成流区
      requestAnimationFrame(() =>
        streamAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (err) {
      patchSession(name, { error: err instanceof Error ? err.message : String(err) });
    } finally {
      patchSession(name, { starting: false });
    }
  }, [activeName, docType, title, publisher, docNumber, audience, style, requirements, lengthWords, selectedKBs, agent, handleEvent, patchSession]);

  // 确保该文件的写作客户端可用：没有则用记录的 sessionId 自动重连
  const ensureClient = useCallback(
    async (name: string): Promise<WritingClient | null> => {
      const existing = clientsRef.current.get(name);
      if (existing) return existing;
      const sid = sessionsRef.current[name]?.sessionId;
      if (!sid) return null;
      const client = new WritingClient();
      client.onClose(() => {
        if (!sessionsRef.current[name]?.error) {
          patchSession(name, { error: "连接已断开，请检查 AI 服务后重试" });
        }
      });
      client.onEvent((d) => handleEvent(d, name));
      try {
        await client.resume(sid);
        clientsRef.current.set(name, client);
        patchSession(name, { sessionId: sid });
        return client;
      } catch {
        client.disconnect();
        return null;
      }
    },
    [handleEvent, patchSession],
  );

  // 成稿后局部微调（写入当前查看文件的会话；连接断了自动重连）
  const handleRevise = useCallback(
    async (instruction: string) => {
      const name = activeName;
      if (!name) return;
      if (sessionsRef.current[name]?.revising) return;
      if (!configRef.current) {
        patchSession(name, { reviseError: "写作配置缺失，请重新打开该文件或重新生成" });
        return;
      }
      // 立即反馈：输入框变「修订中…」，即使重连也要让用户看到点了有效
      patchSession(name, { revising: true, reviseError: null });
      const client = await ensureClient(name);
      if (!client) {
        patchSession(name, {
          revising: false,
          reviseError: "连接已断开且自动重连失败，请检查 AI 服务后重试",
        });
        return;
      }
      try {
        client.revise(instruction, configRef.current);
      } catch (err) {
        patchSession(name, {
          revising: false,
          reviseError: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [activeName, ensureClient, patchSession],
  );

  // 撤销最近一次修改（回退上一版成稿，无 LLM 调用；连接断了自动重连）
  const handleUndo = useCallback(
    async () => {
      const name = activeName;
      if (!name) return;
      if (sessionsRef.current[name]?.revising) return;
      if (!configRef.current) {
        patchSession(name, { reviseError: "写作配置缺失，请重新打开该文件或重新生成" });
        return;
      }
      patchSession(name, { reviseError: null });
      const client = await ensureClient(name);
      if (!client) {
        patchSession(name, {
          reviseError: "连接已断开且自动重连失败，请检查 AI 服务后重试",
        });
        return;
      }
      try {
        client.undo(configRef.current);
      } catch (err) {
        patchSession(name, {
          reviseError: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [activeName, ensureClient, patchSession],
  );

  const stopWriting = useCallback(() => {
    if (!activeName) return;
    clientsRef.current.get(activeName)?.stop();
  }, [activeName]);

  // 上传到云端：把当前成稿（生成/微调后最新版）导出并上传 v-office 云存储
  const handleUploadCloud = useCallback(
    async (): Promise<{ ok: boolean; message: string }> => {
      const name = activeName;
      const sessionId = name ? sessionsRef.current[name]?.sessionId : undefined;
      const config = configRef.current;
      if (!sessionId || !config) {
        return { ok: false, message: "缺少写作会话或配置，请重新生成后再试" };
      }
      try {
        const resp = await fetch(`${API_BASE}/writing/deliver`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ session: sessionId, config }),
        });
        const data = (await resp.json().catch(() => null)) as
          | { error?: string; files?: { name: string; url: string; kind: string }[] }
          | null;
        if (!resp.ok) {
          return { ok: false, message: String(data?.error ?? `上传失败（HTTP ${resp.status}）`) };
        }
        const n = data?.files?.length ?? 0;
        return { ok: true, message: `已上传 ${n} 个文件到云端` };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "网络错误" };
      }
    },
    [activeName],
  );

  const backToConfig = useCallback(() => {
    const name = activeName;
    if (name) {
      clientsRef.current.get(name)?.disconnect();
      clientsRef.current.delete(name);
      parsedRef.current.delete(name);
      setSessions((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setActiveName(null);
    }
    requestAnimationFrame(() =>
      configAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, [activeName]);

  const canStart =
    serviceOk !== false &&
    Boolean(docType && title.trim()) &&
    !(active?.starting ?? false) &&
    material?.status !== "uploading";

  return (
    <div className="h-screen flex flex-col" style={{ background: "#F6F6F7" }}>
      {/* 顶栏：极简返回 */}
      <header className="h-12 shrink-0 flex items-center px-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
      </header>

      <div className="flex-1 flex gap-4 px-5 pb-5 min-h-0">
        {/* ── 左侧文档栏 ── */}
        <aside className="hidden md:flex w-72 shrink-0 flex-col bg-white rounded-2xl border border-black/6 shadow-sm p-4 min-h-0">
          {/* 品牌区 */}
          <div className="flex items-center gap-3 px-1 pt-1 pb-4">
            <span className="flex w-10 h-10 rounded-xl items-center justify-center bg-primary shrink-0">
              <PenLine className="w-5 h-5 text-white" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[#1D1D1F] leading-tight">
                AI 公文写作
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                让公文写作更简单
              </div>
            </div>
          </div>

          {/* 参考材料导航 */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-100/80 px-3 py-2 mb-3">
            <Layers className="w-4 h-4 text-gray-700" strokeWidth={1.75} />
            <span className="text-[13px] font-medium text-[#1D1D1F]">参考材料</span>
          </div>

          <Segmented
            options={vosMode ? ["本地", "云端文档"] : ["本地"]}
            value={tab === "local" ? 0 : 1}
            onChange={(i) => setTab(i === 0 ? "local" : "kb")}
          />

          {/* 本地 tab：上传区 + 最近使用 */}
          {tab === "local" && (
            <>
              <div className="mt-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) void selectMaterial(f.name, () => Promise.resolve(f));
                  }}
                  className={
                    "rounded-xl border border-dashed px-4 py-6 text-center cursor-pointer transition-colors " +
                    (dragOver
                      ? "border-primary bg-gray-50"
                      : "border-gray-200 hover:border-gray-400")
                  }
                >
                  <Upload
                    className={
                      "w-5 h-5 mx-auto mb-2 transition-colors " +
                      (dragOver ? "text-primary" : "text-gray-300")
                    }
                    strokeWidth={1.5}
                  />
                  <div className="text-[12.5px] text-gray-500">
                    点击选择或拖拽文件到此处
                  </div>
                  <div className="mt-1 text-[11px] text-gray-300">
                    支持 Word / PDF / 表格 / 文本
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void selectMaterial(f.name, () => Promise.resolve(f));
                    e.target.value = "";
                  }}
                />
              </div>

              {/* 最近使用（本地上传历史，点击重新加载） */}
              <div className="mt-4 flex-1 overflow-y-auto min-h-0">
                <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-1.5 px-1">
                  <History className="w-3.5 h-3.5" strokeWidth={1.5} />
                  最近使用
                </div>
                {localFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FolderOpen className="w-9 h-9 text-gray-200" strokeWidth={1.25} />
                    <div className="mt-3 text-[13px] text-gray-400">无最近文件</div>
                    <div className="mt-1 text-[11.5px] text-gray-300 leading-4">
                      上传过的材料将显示在此处，以便快速访问
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {localFiles.map((rec) => {
                      const isActive = rec.name === activeName;
                      const sess = sessions[rec.name];
                      const running =
                        (sess?.starting || sess?.items.some((it) => it.status === "active")) ??
                        false;
                      return (
                        <div
                          key={rec.name}
                          className={
                            "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 border transition-all " +
                            (isActive
                              ? "bg-white border-primary/40 shadow-[0_1px_6px_rgba(0,0,0,0.07)]"
                              : "bg-white/60 border-gray-200/70 hover:bg-white hover:shadow-sm")
                          }
                        >
                          <button
                            onClick={() => {
                              // 静默恢复：材料直接就绪（后台补解析），成稿立即从服务端拉回
                              void selectMaterial(rec.name, () =>
                                loadLocalMaterial(rec.name),
                                { silent: true },
                              ).then(() => {
                                // 有历史成稿：从服务端恢复（秒级，无 LLM）
                                if (rec.sessionId && rec.config) {
                                  void restoreFromServer(rec.name, rec.sessionId, rec.config);
                                }
                              });
                            }}
                            className="flex flex-1 items-center gap-2.5 min-w-0 text-left"
                          >
                            <FileBadge name={rec.name} size={28} />
                            <span
                              className={
                                "flex-1 text-[13px] truncate " +
                                (isActive
                                  ? "text-primary font-medium"
                                  : "text-gray-600")
                              }
                            >
                              {rec.name}
                            </span>
                          </button>
                          {running ? (
                            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                          ) : (
                            <span className="text-[11px] text-gray-300 shrink-0 group-hover:hidden">
                              {fmtTime(rec.updatedAt)}
                            </span>
                          )}
                          <button
                            onClick={() => void removeSession(rec.name)}
                            title="从最近使用中删除"
                            className="hidden group-hover:flex w-5 h-5 items-center justify-center rounded-md text-gray-300 hover:text-white hover:bg-[#D93025] transition-colors shrink-0"
                          >
                            <X className="w-3 h-3" strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 云端文档 tab：VOS 云端文件（与主页「最近」一致的空态与列表样式） */}
          {tab === "kb" && vosMode && (
            <div className="mt-4 flex-1 overflow-y-auto min-h-0">
              {cloudFiles === null && (
                <div className="text-[13px] text-gray-300 py-4 text-center">
                  加载中…
                </div>
              )}
              {cloudFiles !== null && cloudFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <FolderOpen className="w-10 h-10 text-gray-200" strokeWidth={1.25} />
                  <div className="mt-3 text-[13.5px] text-gray-500">无最近文件</div>
                  <div className="mt-1 text-[12px] text-gray-300 leading-4">
                    您打开的文件将显示在此处，以便快速访问
                  </div>
                </div>
              )}
              {cloudFiles !== null && cloudFiles.length > 0 && (
                <CloudList
                  files={cloudFiles}
                  selected={
                    material &&
                    material.status !== "error" &&
                    cloudFiles.some((f) => f.name === material.name)
                      ? material.name
                      : null
                  }
                  onSelect={(name) =>
                    void selectMaterial(name, () => openCloudFile(name))
                  }
                />
              )}
            </div>
          )}

          {/* 已选材料（含解析状态） */}
          {material && (
            <MaterialCard
              material={material}
              onRemove={backToConfig}
              onRetry={retryMaterial}
            />
          )}
        </aside>

        {/* ── 主列：配置区 + 生成流同页向下进行 ── */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* 页头 */}
          <div ref={configAnchorRef} className="flex items-start justify-between px-1 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex w-11 h-11 rounded-xl items-center justify-center bg-primary">
                <PenLine className="w-5 h-5 text-white" strokeWidth={1.5} />
              </span>
              <div>
                <h1 className="text-[22px] font-semibold text-[#1D1D1F] leading-tight">
                  AI 公文写作
                </h1>
                <p className="text-[12.5px] text-gray-400 mt-0.5">
                  多 agent 五阶段协作 · 流式打磨交稿
                </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[12px] text-primary tracking-wide">
              智能 · 高效 · 专业
            </span>
          </div>
          {/* 服务不可用提示：agentic-search 探测失败（与 HybRAG 未安装同款式） */}
          {serviceOk === false && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#F0C6C6] bg-[#FDF3F3] px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 shrink-0 rounded-full bg-[#D93025]" />
                <span className="text-[13px] text-[#8A2A22] truncate">
                  AI 写作服务不可用——请先安装并启动 agentic-search 应用
                </span>
              </div>
              <button
                onClick={() => {
                  setServiceOk(null);
                  void checkWritingService().then(setServiceOk);
                }}
                className="shrink-0 rounded-lg border border-[#E5B9B9] bg-white px-3 py-1.5 text-[12.5px] text-[#8A2A22] hover:bg-[#FBEBEB] active:scale-[0.97] transition"
              >
                重试
              </button>
            </div>
          )}
          <ConfigStep
            agent={agent}
            onAgent={setAgent}
            docType={docType}
            onDocType={setDocType}
            title={title}
            onTitle={setTitle}
            publisher={publisher}
            onPublisher={setPublisher}
            docNumber={docNumber}
            onDocNumber={setDocNumber}
            audience={audience}
            onAudience={setAudience}
            style={style}
            onStyle={setStyle}
            requirements={requirements}
            onRequirements={setRequirements}
            lengthWords={lengthWords}
            onLengthWords={setLengthWords}
            kbList={kbList}
            selectedKBs={selectedKBs}
            onToggleKB={(name) =>
              setSelectedKBs((prev) =>
                prev.includes(name) ? prev.filter((k) => k !== name) : [...prev, name],
              )
            }
            canStart={canStart}
            starting={active?.starting ?? false}
            onStart={startWriting}
            material={material}
            onRemoveMaterial={backToConfig}
            onRetryMaterial={retryMaterial}
          />
          {/* 生成流（同页向下展开；随左侧文件切换） */}
          <div ref={streamAnchorRef}>
            {streamVisible && active && activeName && (
              <GenerateView
                items={active.items}
                stageLabel={active.stageLabel}
                exporting={active.exporting}
                materialChars={active.materialChars}
                error={active.error}
                result={active.result}
                revising={active.revising}
                reviseError={active.reviseError}
                historySessionId={active.sessionId}
                onStop={stopWriting}
                onBackToConfig={backToConfig}
                onRevise={handleRevise}
                onUndo={handleUndo}
                onUploadCloud={handleUploadCloud}
                onReset={() => handleReset(activeName)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/** 按文件隔离的写作会话状态：材料解析 + 生成流 + 成稿 */
interface FileSession {
  material: Material | null;
  items: StreamItem[];
  result: ResultData | null;
  error: string | null;
  stageLabel: string;
  exporting: boolean;
  revising: boolean;
  starting: boolean;
  materialChars: number | null;
  /** 写作会话 id（成稿后可回放修订过程 / 恢复微调） */
  sessionId?: string;
  /** 微调/撤销失败提示（成稿后 error 卡不渲染，错误在微调区显示） */
  reviseError?: string | null;
}

function emptySession(): FileSession {
  return {
    material: null,
    items: [],
    result: null,
    error: null,
    stageLabel: "",
    exporting: false,
    revising: false,
    starting: false,
    materialChars: null,
    sessionId: undefined,
    reviseError: null,
  };
}

/** 文种 → 彩色图标配色（与主页彩色文档图标呼应） */
const TYPE_TINTS: Record<string, string> = {
  红头文件: "bg-red-50 text-red-500",
  通知: "bg-orange-50 text-orange-500",
  请示: "bg-amber-50 text-amber-500",
  批复: "bg-rose-50 text-rose-500",
  工作报告: "bg-blue-50 text-blue-500",
  调研报告: "bg-cyan-50 text-cyan-600",
  领导讲话稿: "bg-violet-50 text-violet-500",
  会议纪要: "bg-indigo-50 text-indigo-500",
  可行性研究报告: "bg-sky-50 text-sky-600",
  项目立项建议书: "bg-fuchsia-50 text-fuchsia-500",
  "工作/实施方案": "bg-blue-50 text-blue-500",
  工作总结: "bg-emerald-50 text-emerald-600",
  述职报告: "bg-teal-50 text-teal-600",
  汇报材料: "bg-green-50 text-green-600",
  "管理制度/办法": "bg-slate-100 text-slate-500",
  工作简报: "bg-yellow-50 text-yellow-600",
  政策解读材料: "bg-orange-50 text-orange-500",
  新闻宣传稿: "bg-pink-50 text-pink-500",
  大事记: "bg-purple-50 text-purple-500",
  "倡议书/公开信": "bg-red-50 text-red-400",
  数据统计报表: "bg-blue-50 text-blue-400",
  会议方案: "bg-indigo-50 text-indigo-400",
  经验交流材料: "bg-green-50 text-green-500",
};

function typeTint(docType: string): string {
  return TYPE_TINTS[docType] ?? "bg-primary/10 text-primary";
}

function labelOf(stage: string, round?: number): string {
  switch (stage) {
    // 三阶段新管线
    case "draft":
      return "写手起草";
    case "reviewfix":
      return "审查改稿";
    case "signoff":
      return "审批定稿";
    // 旧五阶段（历史会话恢复）
    case "review":
      return "审查把关";
    case "rewrite":
      return `推稿复写${round ? ` 第${round}轮` : ""}`;
    case "audit":
      return "审核复核";
    case "finalize":
      return "审批定稿";
    case "revise":
      return "局部微调";
    default:
      return stage;
  }
}

// ── 分段控件（iOS Segmented Control，高冷灰）───────────────────────────────

function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  /** 受控索引；不传则组件内部自持 */
  value?: number;
  onChange?: (index: number) => void;
}) {
  const [inner, setActive] = useState(0);
  const active = value ?? inner;
  return (
    <div className="rounded-lg bg-gray-100 p-0.5 flex text-[13px] font-medium">
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={() => {
            setActive(i);
            onChange?.(i);
          }}
          className={
            "flex-1 rounded-md py-1.5 transition-all " +
            (active === i
              ? "bg-white shadow-sm text-[#1D1D1F]"
              : "text-gray-400 hover:text-gray-600")
          }
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/**
 * 文件类型 → 渐变彩块图标（参照飞书/WPS 文件图标：渐变圆角方块 + 白色图形）。
 * Word 蓝 / 表格 绿 / PPT 橙 / PDF 红，其余灰色。
 */
function materialVisual(name: string): { Icon: LucideIcon; cls: string } {
  if (/\.(xlsx|csv)$/i.test(name))
    return {
      Icon: FileSpreadsheet,
      cls: "bg-gradient-to-b from-[#43C666] to-[#1FA564] shadow-[0_1px_3px_rgba(31,165,100,0.35)]",
    };
  if (/\.pptx?$/i.test(name))
    return {
      Icon: Presentation,
      cls: "bg-gradient-to-b from-[#FF8F4D] to-[#EC5B22] shadow-[0_1px_3px_rgba(236,91,34,0.35)]",
    };
  if (/\.pdf$/i.test(name))
    return {
      Icon: FileText,
      cls: "bg-gradient-to-b from-[#FF6A61] to-[#E5452F] shadow-[0_1px_3px_rgba(229,69,47,0.35)]",
    };
  if (/\.(docx?|txt|md)$/i.test(name))
    return {
      Icon: FileText,
      cls: "bg-gradient-to-b from-[#5CA1FA] to-[#2E6FE5] shadow-[0_1px_3px_rgba(46,111,229,0.35)]",
    };
  return {
    Icon: FileStack,
    cls: "bg-gradient-to-b from-[#B9BDC4] to-[#8E939B]",
  };
}

/** 统一的文件彩块图标（左栏列表 / 材料条通用） */
function FileBadge({
  name,
  size = 28,
}: {
  name: string;
  size?: number;
}) {
  const { Icon, cls } = materialVisual(name);
  const icon = size >= 28 ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span
      className={
        "flex shrink-0 items-center justify-center rounded-[7px] text-white " + cls
      }
      style={{ width: size, height: size }}
    >
      <Icon className={icon} strokeWidth={2} />
    </span>
  );
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return sameDay ? `${hh}:${mm}` : `${d.getMonth() + 1}/${d.getDate()}`;
}

function CloudList({
  files,
  selected,
  onSelect,
}: {
  files: CloudFile[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  if (files.length === 0) {
    return (
      <div className="text-[13px] text-gray-300 py-4 text-center">
        云端暂无文档
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      {files.map((f) => (
        <button
          key={f.name}
          onClick={() => onSelect(f.name)}
          className={
            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors " +
            (selected === f.name
              ? "bg-gray-100"
              : "hover:bg-gray-50")
          }
        >
          <FileBadge name={f.name} size={24} />
          <span
            className={
              "flex-1 text-[13px] truncate " +
              (selected === f.name ? "text-primary font-medium" : "text-gray-600")
            }
          >
            {f.name}
          </span>
          <span className="text-[11px] text-gray-300">{fmtSize(f.size)}</span>
        </button>
      ))}
    </div>
  );
}

function fmtSize(size: number): string {
  if (!size) return "";
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

// ── 材料状态展示（左栏卡片 + 设置卡内联条）──────────────────────────────────

function fmtChars(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)} 万字`;
  return `${n} 字`;
}

function MaterialStatusLine({
  material,
}: {
  material: Material;
}): { text: string; tone: "muted" | "warn" } {
  if (material.status === "uploading")
    return { text: "上传解析中…", tone: "muted" };
  if (material.status === "error")
    return { text: material.error, tone: "warn" };
  if (material.parseError)
    return { text: material.parseError, tone: "warn" };
  return {
    text: material.chars !== undefined ? `已解析 ${fmtChars(material.chars)}` : "已就绪",
    tone: "muted",
  };
}

function MaterialCard({
  material,
  onRemove,
  onRetry,
}: {
  material: Material;
  onRemove: () => void;
  onRetry: (name: string) => void;
}) {
  const line = MaterialStatusLine({ material });
  const warn = line.tone === "warn";
  const canRetry =
    material.status === "error" ||
    (material.status === "ready" && !!material.parseError);
  return (
    <div
      className={
        "mt-3 rounded-lg border px-3 py-2 flex items-start gap-2 shrink-0 " +
        (warn ? "bg-[#FFF5F3] border-[#FFD5CC]" : "bg-gray-50 border-gray-200")
      }
    >
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] text-[#1D1D1F] truncate">{material.name}</div>
        <div
          className={
            "mt-0.5 text-[11px] leading-4 " +
            (warn ? "text-[#D93025]" : "text-gray-400")
          }
        >
          {material.status === "uploading" && (
            <Loader2 className="w-3 h-3 inline-block mr-1 -mt-0.5 animate-spin text-gray-400" />
          )}
          {line.text}
        </div>
        {canRetry && (
          <button
            onClick={() => onRetry(material.name)}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[#FFD5CC] bg-white px-2 py-0.5 text-[11px] text-[#D93025] hover:bg-[#FFF5F3] active:scale-[0.97] transition"
          >
            <Loader2 className="w-3 h-3" strokeWidth={2} />
            重试解析
          </button>
        )}
      </div>
      <button
        onClick={onRemove}
        className="text-gray-300 hover:text-gray-600 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── 配置步（文种 + 写作设置 + 开始）────────────────────────────────────────

interface ConfigStepProps {
  agent: "claude" | "opencode";
  onAgent: (a: "claude" | "opencode") => void;
  docType: string;
  onDocType: (v: string) => void;
  title: string;
  onTitle: (v: string) => void;
  publisher: string;
  onPublisher: (v: string) => void;
  docNumber: string;
  onDocNumber: (v: string) => void;
  audience: string;
  onAudience: (v: string) => void;
  style: string;
  onStyle: (v: string) => void;
  requirements: string;
  onRequirements: (v: string) => void;
  lengthWords: string;
  onLengthWords: (v: string) => void;
  kbList: KnowledgeBase[] | null;
  selectedKBs: string[];
  onToggleKB: (name: string) => void;
  canStart: boolean;
  starting: boolean;
  onStart: () => void;
  material: Material | null;
  onRemoveMaterial: () => void;
  onRetryMaterial: (name: string) => void;
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="flex w-7 h-7 rounded-lg bg-[#FF7A45] items-center justify-center">
        <Icon className="w-4 h-4 text-white" strokeWidth={1.75} />
      </span>
      <div>
        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">{title}</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function ConfigStep(p: ConfigStepProps) {
  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* 选择文种 */}
      <section className="bg-white rounded-2xl border border-black/6 shadow-sm p-6">
        <SectionHeader icon={FileStack} title="选择文种" subtitle="不同文种有不同的格式与写作规范" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {DOC_TYPES.map((t) => {
            const Icon = DOC_TYPE_ICONS[t] ?? FileStack;
            const active = p.docType === t;
            return (
              <button
                key={t}
                onClick={() => p.onDocType(t)}
                className={
                  "relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-medium border transition-all active:scale-[0.98] " +
                  (active
                    ? "bg-white text-[#FF7A45] border-[#FF7A45] shadow-[0_1px_6px_rgba(255,122,69,0.12)]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700")
                }
              >
                <span
                  className={
                    "flex w-7 h-7 shrink-0 rounded-lg items-center justify-center transition-colors " +
                    typeTint(t)
                  }
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </span>
                <span className="truncate">{t}</span>
                {active && (
                  <span className="absolute -top-1.5 -right-1.5 flex w-[18px] h-[18px] rounded-full bg-[#FF7A45] items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 选择模型 */}
      <section className="bg-white rounded-2xl border border-black/6 shadow-sm p-6">
        <SectionHeader
          icon={Bot}
          title="选择模型"
          subtitle="不同模型在能力和效果上有所差异，请根据需求选择合适的模型"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          {([
            { id: "claude", label: "Claude Code", desc: "擅长长文本与公文格式控制" },
            { id: "opencode", label: "OpenCode", desc: "国产模型替代方案" },
          ] as const).map((opt) => {
            const active = p.agent === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => p.onAgent(opt.id)}
                className={
                  "relative flex items-center justify-between rounded-xl border px-4 py-3.5 transition-all active:scale-[0.98] " +
                  (active
                    ? "border-[#FF7A45] bg-orange-50/40 text-[#1D1D1F] shadow-[0_1px_6px_rgba(255,122,69,0.12)]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700")
                }
              >
                <span className="flex items-center gap-3">
                  <span
                    className={
                      "flex w-9 h-9 rounded-lg items-center justify-center " +
                      (active ? "bg-[#FF7A45] text-white" : "bg-orange-100 text-orange-500")
                    }
                  >
                    <Bot className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="text-left">
                    <span className="block text-[14px] font-medium text-[#1D1D1F]">
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">{opt.desc}</span>
                  </span>
                </span>
                {active && <Check className="w-5 h-5 text-[#FF7A45]" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* 写作要求 */}
      <section className="bg-white rounded-2xl border border-black/6 shadow-sm p-6">
        <SectionHeader
          icon={PenLine}
          title="写作要求"
          subtitle="请填写公文标题与核心需求，AI 将根据您的要求生成公文"
        />
        <textarea
          value={p.title}
          onChange={(e) => p.onTitle(e.target.value)}
          rows={4}
          placeholder="如：解读某市四年度政策，重点说明背景、主要内容和落实要求..."
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] text-[#1D1D1F] outline-none focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FF7A45]/10 transition resize-none placeholder:text-gray-300"
        />
      </section>

      {/* 基础信息 */}
      <section className="bg-white rounded-2xl border border-black/6 shadow-sm p-6">
        <SectionHeader icon={Settings2} title="基础信息" subtitle="补充公文的基础要素（可留空）" />

        {p.kbList !== null && p.kbList.length > 0 && (
          <div className="mb-4">
            <label className="block text-[13px] text-gray-500 mb-2">引用知识库</label>
            <div className="flex flex-wrap gap-2">
              {p.kbList.map((kb) => {
                const active = p.selectedKBs.includes(kb.name);
                return (
                  <button
                    key={kb.id}
                    onClick={() => p.onToggleKB(kb.name)}
                    className={
                      "rounded-full px-3.5 py-1.5 text-[13px] border transition-all " +
                      (active
                        ? "bg-[#FF7A45] text-white border-[#FF7A45]"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700")
                    }
                  >
                    {kb.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-[13px] text-gray-500 mb-1.5">发布机关</label>
            <input
              value={p.publisher}
              onChange={(e) => p.onPublisher(e.target.value)}
              placeholder={REDHEAD_DOC_TYPES.has(p.docType) ? "红头标志（可留空）" : "可留空"}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FF7A45]/10 transition placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-[13px] text-gray-500 mb-1.5">受文 / 解读对象</label>
            <input
              value={p.audience}
              onChange={(e) => p.onAudience(e.target.value)}
              placeholder="自动 / 不指定"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FF7A45]/10 transition placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-[13px] text-gray-500 mb-1.5">行文口径 / 解读形式</label>
            <input
              value={p.style}
              onChange={(e) => p.onStyle(e.target.value)}
              placeholder="自动 / 不指定"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FF7A45]/10 transition placeholder:text-gray-300"
            />
          </div>
        </div>

        {REDHEAD_DOC_TYPES.has(p.docType) && (
          <div>
            <label className="block text-[13px] text-gray-500 mb-1.5">
              发文字号 <span className="text-gray-300">（可留空）</span>
            </label>
            <input
              value={p.docNumber}
              onChange={(e) => p.onDocNumber(e.target.value)}
              placeholder="如：X政发〔2026〕5号"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FF7A45]/10 transition placeholder:text-gray-300"
            />
          </div>
        )}
      </section>

      {/* 其他要求 */}
      <section className="bg-white rounded-2xl border border-black/6 shadow-sm p-6">
        <SectionHeader icon={MessageSquare} title="其他要求" subtitle="如有其他特殊要求，请在此处填写" />
        <textarea
          value={p.requirements}
          onChange={(e) => p.onRequirements(e.target.value)}
          rows={3}
          placeholder="例如：结合本单位实际情况，重点写保障措施部分；文中数据以上年度报表为准…"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FF7A45]/10 transition resize-none placeholder:text-gray-300"
        />
      </section>

      {/* 篇幅设置 */}
      <section className="bg-white rounded-2xl border border-black/6 shadow-sm p-6">
        <SectionHeader icon={Settings2} title="篇幅设置" subtitle="控制生成文档的长度" />
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-[13px] text-gray-500 mb-1.5">篇幅（字，0 = 自动）</label>
            <input
              type="number"
              min={0}
              value={p.lengthWords}
              onChange={(e) => p.onLengthWords(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FF7A45]/10 transition"
            />
          </div>
        </div>
      </section>

      {/* 开始生成 */}
      <div className="flex justify-center pt-2">
        <button
          onClick={p.onStart}
          disabled={!p.canStart}
          className={
            "inline-flex items-center gap-2 rounded-full px-10 py-3.5 text-[16px] font-semibold transition-all active:scale-[0.98] " +
            (p.canStart
              ? "bg-gradient-to-r from-[#FF7A45] to-[#FF5722] text-white shadow-[0_4px_16px_rgba(255,122,69,0.35)] hover:opacity-90"
              : "bg-gray-100 text-gray-300 cursor-not-allowed")
          }
        >
          <Sparkles className="w-5 h-5" strokeWidth={1.75} />
          {p.starting ? "正在准备…" : "开始生成"}
        </button>
      </div>
    </div>
  );
}
