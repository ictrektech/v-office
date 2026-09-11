"use client";

/**
 * 写作参考材料的本地「最近使用」存储。
 * 直接把 File 存进 IndexedDB（浏览器原生支持 Blob 存储），
 * 记录按文件名去重、按时间倒序，上限 12 条；
 * 点击列表项可重新加载文件内容作为参考材料。
 * 另存该文件的写作会话 id 与 config：刷新后据此恢复成稿（服务端版本栈）。
 *
 * 用户隔离：IndexedDB 只按浏览器（origin）隔离，同一浏览器切换登录用户
 * 会看到别人的材料。因此库名带上登录用户名（VOS whoAmI），按用户硬隔离；
 * 旧的混合数据库名无后缀，首次访问时直接删除。
 */

import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from "idb";
import type { WritingConfig } from "./client";
import { whoAmI } from "@/utils/vos/storage";
import { isVOSMode } from "@/utils/vos/fastpath";

export type { WritingConfig };

export interface LocalMaterialRecord {
  name: string;
  type: string;
  size: number;
  updatedAt: number;
  /** 最近一次成稿对应的写作会话 id（存在即可恢复成稿） */
  sessionId?: string;
  /** 该次写作的配置（恢复导出所需版式） */
  config?: WritingConfig;
}

interface MaterialsDB extends DBSchema {
  "writing-materials": {
    key: string; // 文件名
    value: {
      file: File;
      updatedAt: number;
      sessionId?: string;
      config?: WritingConfig;
    };
  };
}

const DB_NAME = "writing-materials-db";
const STORE = "writing-materials";
const MAX_ITEMS = 12;

/** 按用户缓存的 DB 实例：key = 用户名（非 VOS 为 "local"） */
const dbCache = new Map<string, IDBPDatabase<MaterialsDB>>();

/**
 * 用户标识解析（页面生命周期内只解析一次，所有读写共用同一 Promise）：
 * - 非 VOS 模式 → "local"；
 * - VOS 模式 → whoAmI 重试直到成功（刚登录/刚刷新时静默授权 + /me 可能
 *   瞬时失败）。此前失败即永久落到 "local" 库，下一次页面加载又切回
 *   用户库，导致「最近使用」重新登录后就"消失"——这里是根因修复。
 * - 重试耗尽（约 20s，VOS 认证彻底不可用）才降级 "local"，且仅本次
 *   页面生命周期生效，刷新后重新解析。
 */
let userKeyPromise: Promise<string> | null = null;

async function resolveUserKey(): Promise<string> {
  if (!(await isVOSMode().catch(() => false))) return "local";
  for (let i = 0; i < 20; i++) {
    const username = await whoAmI().catch(() => null);
    if (username) return `u:${username}`;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return "local";
}

function getUserKey(): Promise<string> {
  if (!userKeyPromise) userKeyPromise = resolveUserKey();
  return userKeyPromise;
}

async function getDB(): Promise<IDBPDatabase<MaterialsDB>> {
  const user = await getUserKey();
  let db = dbCache.get(user);
  if (db) return db;
  db = await openDB<MaterialsDB>(`${DB_NAME}__${encodeURIComponent(user)}`, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    },
  });
  dbCache.set(user, db);
  if (user !== "local") {
    // 用户库就绪后，把历史遗留库（旧混合库 / 认证降级期写入的 local 库）
    // 里的记录抢救进用户库，再删除遗留库（每次页面生命周期执行一次）
    await migrateLegacyDBs(db).catch(() => undefined);
  }
  return db;
}

/** 遗留库迁移：旧混合库 + local 库 → 当前用户库（按文件名去重覆盖） */
let migrated = false;

async function migrateLegacyDBs(userDB: IDBPDatabase<MaterialsDB>): Promise<void> {
  if (migrated) return;
  migrated = true;
  for (const legacyName of [DB_NAME, `${DB_NAME}__local`]) {
    let legacy: IDBPDatabase<MaterialsDB> | null = null;
    try {
      legacy = await openDB<MaterialsDB>(legacyName, 1);
    } catch {
      continue; // 库不存在等
    }
    try {
      const keys = (await legacy.getAllKeys(STORE)) as string[];
      for (const k of keys) {
        const v = await legacy.get(STORE, k);
        if (v?.file) await userDB.put(STORE, v, k);
      }
      if (keys.length > 0 || legacyName === DB_NAME) {
        legacy.close();
        legacy = null;
        await deleteDB(legacyName).catch(() => undefined);
      }
    } finally {
      legacy?.close();
    }
  }
}

/** 保存/更新一份本地上传材料（同名覆盖时间戳，保留已有会话信息） */
export async function saveLocalMaterial(file: File): Promise<void> {
  const db = await getDB();
  const prev = await db.get(STORE, file.name);
  await db.put(
    STORE,
    {
      file,
      updatedAt: Date.now(),
      sessionId: prev?.sessionId,
      config: prev?.config,
    },
    file.name,
  );
  await trimToLimit(db);
}

/** 成稿后记录会话映射（刷新恢复用） */
export async function updateLocalMaterialSession(
  name: string,
  sessionId: string,
  config: WritingConfig,
): Promise<void> {
  const db = await getDB();
  const prev = await db.get(STORE, name);
  if (!prev) return;
  await db.put(STORE, { ...prev, sessionId, config }, name);
}

/** 最近使用列表（不含文件内容，按时间倒序） */
export async function listLocalMaterials(): Promise<LocalMaterialRecord[]> {
  const db = await getDB();
  const all = await db.getAll(STORE);
  return all
    .map((v) => ({
      name: v.file.name,
      type: v.file.type,
      size: v.file.size,
      updatedAt: v.updatedAt,
      sessionId: v.sessionId,
      config: v.config,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 按文件名取回完整记录（含 File 与会话映射） */
export async function loadLocalMaterialRecord(
  name: string,
): Promise<(LocalMaterialRecord & { file: File }) | null> {
  const db = await getDB();
  const v = await db.get(STORE, name);
  if (!v) return null;
  return {
    file: v.file,
    name: v.file.name,
    type: v.file.type,
    size: v.file.size,
    updatedAt: v.updatedAt,
    sessionId: v.sessionId,
    config: v.config,
  };
}

/** 按文件名取回 File（点击历史项时重新作为材料） */
export async function loadLocalMaterial(name: string): Promise<File> {
  const db = await getDB();
  const v = await db.get(STORE, name);
  if (!v) throw new Error("记录不存在");
  return v.file;
}

export async function removeLocalMaterial(name: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, name);
}

/** 重置：清除该文件的写作会话映射（保留材料本体），从 0 开始 */
export async function clearLocalMaterialSession(name: string): Promise<void> {
  const db = await getDB();
  const prev = await db.get(STORE, name);
  if (!prev) return;
  await db.put(
    STORE,
    { file: prev.file, updatedAt: prev.updatedAt },
    name,
  );
}

async function trimToLimit(
  db: IDBPDatabase<MaterialsDB>,
): Promise<void> {
  const keys = (await db.getAllKeys(STORE)) as string[];
  if (keys.length > MAX_ITEMS) {
    const metas = await Promise.all(
      keys.map(async (k) => {
        const v = await db.get(STORE, k);
        return { key: k, updatedAt: v?.updatedAt ?? 0 };
      }),
    );
    metas.sort((a, b) => b.updatedAt - a.updatedAt);
    for (const m of metas.slice(MAX_ITEMS)) await db.delete(STORE, m.key);
  }
}
