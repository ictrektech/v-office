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
 * 遍历结果按分类缓存，短时间内重复切分类不重复扫盘。
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
  const cacheRef = useRef<
    Record<string, { documents: NasDocument[]; truncated: boolean }>
  >({});

  const scan = useCallback(
    async (category: NasCategory) => {
      const cached = cacheRef.current[category.key];
      if (cached) {
        setDocuments(cached.documents);
        setTruncated(cached.truncated);
        setError("");
        return;
      }
      setScanning(true);
      setError("");
      try {
        const listing = await listSourceDocuments(
          category.sourceId,
          category.path,
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
        cacheRef.current[category.key] = {
          documents: scanned,
          truncated: listing.truncated,
        };
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
    setLoading(true);
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
            kind: root.kind ?? "",
          });
        }
      }
      setCategories(found);
      if (found.length > 0) {
        setActiveCategory(found[0]);
        setDocuments([]);
        setTruncated(false);
        await scan(found[0]);
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

  /** 重新遍历当前分类（丢弃缓存） */
  const rescan = useCallback(() => {
    if (!activeCategory) return;
    delete cacheRef.current[activeCategory.key];
    setDocuments([]);
    setTruncated(false);
    void scan(activeCategory);
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
      delete cacheRef.current[category.key];
      if (activeCategory?.key === category.key) {
        setDocuments([]);
        setTruncated(false);
        void scan(category);
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
