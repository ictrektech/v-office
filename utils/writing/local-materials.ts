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
let legacyCleaned = false;

/**
 * 当前用户标识：VOS 登录用户名 / 本地模式 "local"。
 * 页面生命周期内缓存（切换用户必然整页刷新重新登录）。
 */
let userKeyCache: string | null = null;

async function getUserKey(): Promise<string> {
  if (userKeyCache) return userKeyCache;
  const username = await whoAmI().catch(() => null);
  userKeyCache = username ? `u:${username}` : "local";
  return userKeyCache;
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
  // 旧库（无用户后缀）混有其他用户数据：清理一次
  if (!legacyCleaned) {
    legacyCleaned = true;
    void deleteDB(DB_NAME).catch(() => undefined);
  }
  return db;
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
