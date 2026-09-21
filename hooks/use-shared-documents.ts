"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  browseSharedSource,
  listSharedSources,
  openSharedDocument,
  type SharedEntry,
  type SharedSourceRoot,
} from "@/utils/vos/storage";

export interface SharedDocumentRow {
  /** 唯一键：源 + 源内路径 */
  key: string;
  name: string;
  isDir: boolean;
  size: number;
  modified: number;
  /** 源内相对路径，直接用于打开/下载 */
  path: string;
  sourceId: string;
  /** 所属授权目录在源内的相对路径，用于判断"回到上一层"的边界 */
  rootPath: string;
}

/** 一个授权目录 = 首页里的一个页签（如 media_video / NAS） */
export interface SharedRootTab {
  key: string;
  label: string;
  sourceId: string;
  path: string;
}

export interface SharedCrumb {
  name: string;
  path: string;
}

interface Nav {
  sourceId: string;
  label: string;
  rootPath: string;
  path: string;
}

function toRows(
  sourceId: string,
  rootPath: string,
  entries: SharedEntry[],
): SharedDocumentRow[] {
  return entries.map((entry) => ({
    key: `${sourceId}:${entry.path}`,
    name: entry.name,
    isDir: entry.isDir,
    size: entry.size,
    modified: entry.modified,
    path: entry.path,
    sourceId,
    rootPath,
  }));
}

/**
 * 首页「我的文档」区块里的授权目录页签。
 *
 * 平台「数据访问授权」挂进来的每个目录解析成一个页签（名字就是用户自己的
 * 目录名，如 media_video），点页签显示该目录的内容：目录可逐层进入，文档
 * 点开即编辑、保存写回共享盘原文件。不向用户暴露 volumes/<随机 ID> 这类
 * 平台内部路径；完全空的授权目录不占页签。
 */
export function useSharedDocuments(language: string) {
  const zh = language.toLowerCase().startsWith("zh");
  const [tabs, setTabs] = useState<SharedRootTab[]>([]);
  const [activeTab, setActiveTab] = useState<SharedRootTab | null>(null);
  const [rows, setRows] = useState<SharedDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nav, setNav] = useState<Nav | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // 每个授权目录的一级内容：切页签时直接命中缓存，不重复请求
  const listingsRef = useRef<Record<string, SharedEntry[]>>({});

  /** 列出授权目录并生成页签（不预载内容以外的额外请求） */
  const loadTabs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sources = await listSharedSources();
      const found: SharedRootTab[] = [];
      const cache: Record<string, SharedEntry[]> = {};
      for (const source of sources) {
        const roots: SharedSourceRoot[] =
          source.roots && source.roots.length > 0
            ? source.roots
            : [{ name: source.kind === "nas" ? "NAS" : source.name, path: "" }];
        for (const root of roots) {
          const key = `${source.id}:${root.path}`;
          try {
            const listing = await browseSharedSource(source.id, root.path);
            // 空目录不占页签，避免空的「我的数据」这类壳干扰
            if (listing.entries.length === 0) continue;
            cache[key] = listing.entries;
            found.push({
              key,
              label: root.name,
              sourceId: source.id,
              path: root.path,
            });
          } catch (rootError) {
            console.error("Failed to browse shared root:", root.path, rootError);
          }
        }
      }
      listingsRef.current = cache;
      setTabs(found);
      setActiveTab(null);
      setNav(null);
      setRows([]);
    } catch (sourceError) {
      console.error("Shared documents unavailable:", sourceError);
      setTabs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTabs();
  }, [loadTabs]);

  /** 切页签：null = 我的文档（私有目录） */
  const selectTab = useCallback(
    (tab: SharedRootTab | null) => {
      setActiveTab(tab);
      setNav(null);
      setError("");
      if (!tab) {
        setRows([]);
        return;
      }
      const cached = listingsRef.current[tab.key];
      if (cached) {
        setRows(toRows(tab.sourceId, tab.path, cached));
        return;
      }
      setLoading(true);
      browseSharedSource(tab.sourceId, tab.path)
        .then((listing) => {
          setRows(toRows(tab.sourceId, tab.path, listing.entries));
        })
        .catch((tabError) => {
          console.error("Failed to load shared folder:", tabError);
          setRows([]);
          setError(zh ? "无法读取该目录。" : "Cannot read this folder.");
        })
        .finally(() => setLoading(false));
    },
    [zh],
  );

  const enterFolder = useCallback(
    async (row: SharedDocumentRow) => {
      setLoading(true);
      setError("");
      try {
        const listing = await browseSharedSource(row.sourceId, row.path);
        setRows(toRows(row.sourceId, row.rootPath, listing.entries));
        setNav({
          sourceId: row.sourceId,
          label: activeTab?.label ?? "",
          rootPath: row.rootPath,
          path: listing.path,
        });
      } catch (folderError) {
        console.error("Failed to open shared folder:", folderError);
        setError(zh ? "无法读取该目录。" : "Cannot read this folder.");
      } finally {
        setLoading(false);
      }
    },
    [activeTab, zh],
  );

  const goBack = useCallback(async () => {
    if (!nav) return;
    const parent = nav.path.includes("/")
      ? nav.path.slice(0, nav.path.lastIndexOf("/"))
      : "";
    // 已到授权目录本身：回到该页签的一级内容
    if (!parent || parent.length < nav.rootPath.length) {
      setNav(null);
      setError("");
      const cached = listingsRef.current[`${nav.sourceId}:${nav.rootPath}`];
      if (cached) {
        setRows(toRows(nav.sourceId, nav.rootPath, cached));
        return;
      }
      setLoading(true);
      try {
        const listing = await browseSharedSource(nav.sourceId, nav.rootPath);
        setRows(toRows(nav.sourceId, nav.rootPath, listing.entries));
      } catch (backError) {
        console.error("Failed to go back:", backError);
        setError(zh ? "无法读取该目录。" : "Cannot read this folder.");
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError("");
    try {
      const listing = await browseSharedSource(nav.sourceId, parent);
      setRows(toRows(nav.sourceId, nav.rootPath, listing.entries));
      setNav({ ...nav, path: listing.path });
    } catch (backError) {
      console.error("Failed to go back:", backError);
      setError(zh ? "无法读取该目录。" : "Cannot read this folder.");
    } finally {
      setLoading(false);
    }
  }, [nav, zh]);

  /** 当前所在授权目录内的层级（用于面包屑） */
  const crumbs: SharedCrumb[] = [];
  if (nav) {
    crumbs.push({ name: nav.label, path: nav.rootPath });
    const inner = nav.path.slice(nav.rootPath.length).replace(/^\//, "");
    let acc = nav.rootPath;
    for (const part of inner.split("/").filter(Boolean)) {
      acc = acc ? `${acc}/${part}` : part;
      crumbs.push({ name: part, path: acc });
    }
  }

  const downloadFile = useCallback(async (row: SharedDocumentRow) => {
    setBusyKey(row.key);
    try {
      const file = await openSharedDocument(row.sourceId, row.path);
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
    tabs,
    activeTab,
    selectTab,
    rows,
    loading,
    error,
    nav,
    crumbs,
    busyKey,
    setBusyKey,
    enterFolder,
    goBack,
    reload: loadTabs,
    downloadFile,
  };
}
