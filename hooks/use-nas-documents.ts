"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listSharedSources,
  listSourceDocuments,
  openSharedDocument,
  type SharedSourceRoot,
} from "@/utils/vos/storage";

/** NAS 数据下的一个分类：公共 / 用户（<用户名>） */
export interface NasCategory {
  key: string;
  label: string;
  sourceId: string;
  path: string;
  readOnly: boolean;
  /** 授权目录类型：public / user / mount */
  kind: string;
}

/** 遍历出来的一个文档 */
export interface NasDocument {
  key: string;
  name: string;
  /** 所在子目录（如 A/B/C），用于区分同名文件 */
  folder: string;
  /** 源内相对路径，打开/下载与保存写回都用它 */
  path: string;
  sourceId: string;
  size: number;
  modified: number;
}

/**
 * 「NAS 数据」页签的数据源。
 *
 * 平台「数据访问授权」挂进来的每个目录解析成一个分类（公共 / 用户），点分类
 * 就**递归遍历**该目录，把它以及所有子目录里可打开的文档平铺出来——盘里的
 * 文档常埋在多级目录（A/B/C/…）里，不让用户一层层点。
 *
 * 遍历结果缓存在**模块级**（而不是组件内）：从列表进编辑器再返回时组件会重新
 * 挂载，组件内缓存会跟着一起消失，用户看到的就是"回来还得再转几秒"。放模块级
 * 就能先立刻把内容铺出来、再后台对齐，手感上是秒开。
 */
interface CachedScan {
  documents: NasDocument[];
  truncated: boolean;
  /** 缓存写入时刻（ms） */
  at: number;
}

const scanCache = new Map<string, CachedScan>();
let categoriesCache: { list: NasCategory[]; activeKey: string } | null = null;
/** 缓存新鲜期：在这之内直接复用，不做任何后台扫描 */
const CACHE_FRESH_MS = 30_000;

function readCacheSeed() {
  const list = categoriesCache?.list ?? [];
  const active =
    list.find((item) => item.key === categoriesCache?.activeKey) ??
    list[0] ??
    null;
  const scanned = active ? scanCache.get(active.key) : undefined;
  return {
    categories: list,
    active,
    documents: scanned?.documents ?? [],
    truncated: scanned?.truncated ?? false,
  };
}

export function useNasDocuments(language: string) {
  const zh = language.toLowerCase().startsWith("zh");
  const seedRef = useRef<ReturnType<typeof readCacheSeed> | null>(null);
  if (seedRef.current === null) seedRef.current = readCacheSeed();
  const seed = seedRef.current;
  const [categories, setCategories] = useState<NasCategory[]>(seed.categories);
  const [activeCategory, setActiveCategory] = useState<NasCategory | null>(
    seed.active,
  );
  const [documents, setDocuments] = useState<NasDocument[]>(seed.documents);
  const [loading, setLoading] = useState(seed.categories.length === 0);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(seed.truncated);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const scan = useCallback(
    async (category: NasCategory, force = false) => {
      const cached = scanCache.get(category.key);
      if (cached && !force) {
        // 有缓存就先出内容：切分类、从编辑器返回列表都是瞬时完成，不等网络
        setDocuments(cached.documents);
        setTruncated(cached.truncated);
        setError("");
        return;
      }
      setScanning(true);
      setError("");
      try {
        // force 时连服务端的列举缓存一起绕过：用户显式刷新 / 我们刚写完共享盘
        const listing = await listSourceDocuments(
          category.sourceId,
          category.path,
          force,
        );
        const scanned: NasDocument[] = listing.documents.map((doc) => ({
          key: `${category.sourceId}:${doc.path}`,
          name: doc.name,
          folder: doc.folder,
          path: doc.path,
          sourceId: category.sourceId,
          size: doc.size,
          modified: doc.modified,
        }));
        scanCache.set(category.key, {
          documents: scanned,
          truncated: listing.truncated,
          at: Date.now(),
        });
        setDocuments(scanned);
        setTruncated(listing.truncated);
      } catch (scanError) {
        console.error("Failed to scan NAS category:", scanError);
        setDocuments([]);
        setTruncated(false);
        setError(
          zh
            ? "无法读取该目录，请检查挂载与权限。"
            : "Cannot read this folder. Check the mount and permissions.",
        );
      } finally {
        setScanning(false);
      }
    },
    [zh],
  );

  /** 列出分类（公共 / 用户）并默认展开第一个 */
  const loadCategories = useCallback(async () => {
    // 有缓存就不转圈：已有内容先留在屏幕上，再后台对齐
    setLoading(categoriesCache === null);
    setError("");
    try {
      const sources = await listSharedSources();
      const found: NasCategory[] = [];
      for (const source of sources) {
        const roots: SharedSourceRoot[] = [...(source.roots ?? [])];
        // NAS 源本身就是挂载根，没有子分类。共享源则相反：它列出的是解析好的
        // 授权目录（公共 / 用户），为空就代表当前没有可用授权——此时不能兜底成
        // "path 空"，否则前端会去遍历 /exposed 整棵树，同一份文件会经真实路径
        // 与 volumes/<别名> 软链各出现一次（列表里每个文档都是两行）。
        if (roots.length === 0 && source.kind === "nas") {
          roots.push({ name: "NAS", path: "" });
        }
        for (const root of roots) {
          found.push({
            key: `${source.id}:${root.path}`,
            label: root.name,
            sourceId: source.id,
            path: root.path,
            readOnly: source.readOnly,
            kind: root.kind ?? "",
          });
        }
      }
      const active =
        found.find((item) => item.key === categoriesCache?.activeKey) ??
        found[0] ??
        null;
      categoriesCache = { list: found, activeKey: active?.key ?? "" };
      setCategories(found);
      if (active) {
        setActiveCategory(active);
        const cached = scanCache.get(active.key);
        if (cached && Date.now() - cached.at < CACHE_FRESH_MS) {
          // 缓存还新鲜：直接复用，一次盘都不用扫（从编辑器返回列表就是这条路）
          setDocuments(cached.documents);
          setTruncated(cached.truncated);
        } else {
          if (!cached) {
            setDocuments([]);
            setTruncated(false);
          }
          await scan(active);
        }
      } else {
        setActiveCategory(null);
        setDocuments([]);
      }
    } catch (sourceError) {
      console.error("NAS documents unavailable:", sourceError);
      setCategories([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [scan]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const selectCategory = useCallback(
    (category: NasCategory) => {
      setActiveCategory(category);
      setDocuments([]);
      setTruncated(false);
      void scan(category);
    },
    [scan],
  );

  /** 重新遍历当前分类（连服务端列举缓存一起绕过） */
  const rescan = useCallback(() => {
    if (!activeCategory) return;
    scanCache.delete(activeCategory.key);
    setDocuments([]);
    setTruncated(false);
    void scan(activeCategory, true);
  }, [activeCategory, scan]);

  const downloadDocument = useCallback(async (doc: NasDocument) => {
    setBusyKey(doc.key);
    try {
      const file = await openSharedDocument(doc.sourceId, doc.path);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } finally {
      setBusyKey(null);
    }
  }, []);

  /**
   * 刷新某个分类的列表（清掉缓存；若是当前分类则立即重扫）。
   *
   * 用于「存入公共目录」之后让 NAS 列表马上能看到新文件。
   */
  const refreshCategory = useCallback(
    (category: NasCategory) => {
      scanCache.delete(category.key);
      if (activeCategory?.key === category.key) {
        // 刚往共享盘写过东西：绕过所有缓存，确保新文件立刻出现在列表里
        void scan(category, true);
      }
    },
    [activeCategory, scan],
  );

  return {
    categories,
    activeCategory,
    selectCategory,
    documents,
    loading,
    scanning,
    error,
    truncated,
    busyKey,
    setBusyKey,
    downloadDocument,
    rescan,
    refreshCategory,
    reload: loadCategories,
  };
}
