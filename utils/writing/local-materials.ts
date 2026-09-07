"use client";

/**
 * 写作参考材料的本地「最近使用」存储。
 * 直接把 File 存进 IndexedDB（浏览器原生支持 Blob 存储），
 * 记录按文件名去重、按时间倒序，上限 12 条；
 * 点击列表项可重新加载文件内容作为参考材料。
 * 另存该文件的写作会话 id 与 config：刷新后据此恢复成稿（服务端版本栈）。
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { WritingConfig } from "./client";

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

let dbInstance: IDBPDatabase<MaterialsDB> | null = null;

async function getDB(): Promise<IDBPDatabase<MaterialsDB>> {
  if (!dbInstance) {
    dbInstance = await openDB<MaterialsDB>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbInstance;
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
