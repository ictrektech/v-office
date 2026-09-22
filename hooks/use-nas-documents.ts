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

interface NasScan {
  documents: NasDocument[];
  truncated: boolean;
}

/**
 * 会话内快照：从编辑器返回首页时先用它秒开，再在后台重新校验。
 *
 * 遍历挂载盘（尤其大目录）要几百毫秒到几秒，每次进首页都同步扫一遍会表现为
 * "返回主页一直在加载"。这里做成 stale-while-revalidate：有快照就直接渲染，
 * 后台静默重扫并更新；用户需要立即刷新时点「重新扫描」。
 */
let nasSnapshot: {
  categories: NasCategory[];
  scans: Record<string, NasScan>;
  activeKey: string | null;
} | null = null;

/**
 * 「NAS 数据」页签的数据源。
 *
 * 平台「数据访问授权」挂进来的每个目录解析成一个分类（公共 / 用户），点分类
 * 就**递归遍历**该目录，把它以及所有子目录里可打开的文档平铺出来。
 */
export function useNasDocuments(language: string) {
  const zh = language.toLowerCase().startsWith("zh");
  const [categories, setCategories] = useState<NasCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<NasCategory | null>(null);
  const [documents, setDocuments] = useState<NasDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, NasScan>>({});
  const activeKeyRef = useRef<string | null>(null);

  const persist = useCallback(
    (nextCategories: NasCategory[], activeKey: string | null) => {
      nasSnapshot = {
        categories: nextCategories,
        scans: { ...cacheRef.current },
        activeKey,
      };
    },
    [],
  );

  const applyScan = useCallback((category: NasCategory, scan: NasScan) => {
    cacheRef.current[category.key] = scan;
    setDocuments(scan.documents);
    setTruncated(scan.truncated);
  }, []);

  const scan = useCallback(
    async (category: NasCategory, silent = false) => {
      if (!silent && cacheRef.current[category.key]) {
        applyScan(category, cacheRef.current[category.key]);
        setError("");
        return;
      }
      if (!silent) setScanning(true);
      setError("");
      try {
        const listing = await listSourceDocuments(
          category.sourceId,
          category.path,
        );
        const scanned: NasScan = {
          documents: listing.documents.map((doc) => ({
            key: `${category.sourceId}:${doc.path}`,
            name: doc.name,
            folder: doc.folder,
            path: doc.path,
            sourceId: category.sourceId,
            size: doc.size,
            modified: doc.modified,
          })),
          truncated: listing.truncated,
        };
        applyScan(category, scanned);
        persist(
          nasSnapshot?.categories ?? categories,
          activeKeyRef.current,
        );
      } catch (scanError) {
        console.error("Failed to scan NAS category:", scanError);
        if (!silent) {
          setDocuments([]);
          setTruncated(false);
          setError(
            zh
              ? "无法读取该目录，请检查挂载与权限。"
              : "Cannot read this folder. Check the mount and permissions.",
          );
        }
      } finally {
        if (!silent) setScanning(false);
      }
    },
    [applyScan, categories, persist, zh],
  );

  /** 列出分类（公共 / 用户），有快照时先渲染再后台校验 */
  const loadCategories = useCallback(async () => {
    const cached = nasSnapshot;
    if (cached) {
      cacheRef.current = { ...cached.scans };
      const active =
        cached.categories.find((item) => item.key === cached.activeKey) ??
        cached.categories[0] ??
        null;
      setCategories(cached.categories);
      setActiveCategory(active);
      activeKeyRef.current = active?.key ?? null;
      setDocuments(active ? cacheRef.current[active.key]?.documents ?? [] : []);
      setTruncated(
        active ? cacheRef.current[active.key]?.truncated ?? false : false,
      );
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const sources = await listSharedSources();
      const found: NasCategory[] = [];
      for (const source of sources) {
        const roots: SharedSourceRoot[] =
          source.roots && source.roots.length > 0
            ? source.roots
            : [{ name: source.kind === "nas" ? "NAS" : source.name, path: "" }];
        for (const root of roots) {
          found.push({
            key: `${source.id}:${root.path}`,
            label: root.name,
            sourceId: source.id,
            path: root.path,
            readOnly: source.readOnly,
          });
        }
      }
      setCategories(found);
      const active =
        found.find((item) => item.key === activeKeyRef.current) ??
        found[0] ??
        null;
      setActiveCategory(active);
      activeKeyRef.current = active?.key ?? null;
      if (active) {
        // 有快照时静默重扫：界面先显示旧结果，避免"返回首页又转圈"
        await scan(active, Boolean(cached));
      } else {
        setDocuments([]);
        setTruncated(false);
      }
      persist(found, active?.key ?? null);
    } catch (sourceError) {
      console.error("NAS documents unavailable:", sourceError);
      if (!cached) {
        setCategories([]);
        setDocuments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [persist, scan]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const selectCategory = useCallback(
    (category: NasCategory) => {
      setActiveCategory(category);
      activeKeyRef.current = category.key;
      const cached = cacheRef.current[category.key];
      setDocuments(cached?.documents ?? []);
      setTruncated(cached?.truncated ?? false);
      persist(nasSnapshot?.categories ?? categories, category.key);
      void scan(category);
    },
    [categories, persist, scan],
  );

  /** 重新遍历当前分类（丢弃缓存），用户手动触发 */
  const rescan = useCallback(() => {
    const category = activeCategory;
    if (!category) return;
    delete cacheRef.current[category.key];
    setDocuments([]);
    setTruncated(false);
    void scan(category);
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
    reload: loadCategories,
  };
}
