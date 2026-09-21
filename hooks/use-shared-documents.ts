"use client";

import { useCallback, useEffect, useState } from "react";
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
  /** 所属授权目录的展示名：公共目录 / 我的数据 / NAS */
  label: string;
  /** 所属授权目录在源内的相对路径，用于判断"回到上一层"的边界 */
  rootPath: string;
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
  label: string,
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
    label,
    rootPath,
  }));
}

/**
 * 首页「我的文档」列表中的共享目录部分。
 *
 * 平台「数据访问授权」里挂进来的目录由服务端解析成 roots（公共目录 / 我的
 * 数据 / NAS），这里把每个授权目录的一级内容平铺成同一份列表，与用户私有
 * 文档并排显示；进入子目录时只浏览该授权目录内部，返回时回到"全部授权目录"
 * 这一层。不向用户暴露 volumes/<随机 ID> 这类平台内部路径。
 */
export function useSharedDocuments(language: string) {
  const zh = language.toLowerCase().startsWith("zh");
  const [rows, setRows] = useState<SharedDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nav, setNav] = useState<Nav | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  /** 回到"全部授权目录"层：把每个授权目录的一级内容合并成一份列表 */
  const loadRoots = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sources = await listSharedSources();
      const collected: SharedDocumentRow[] = [];
      for (const source of sources) {
        const roots: SharedSourceRoot[] =
          source.roots && source.roots.length > 0
            ? source.roots
            : [{ name: source.kind === "nas" ? "NAS" : source.name, path: "" }];
        for (const root of roots) {
          try {
            const listing = await browseSharedSource(source.id, root.path);
            collected.push(
              ...toRows(source.id, root.name, root.path, listing.entries),
            );
          } catch (rootError) {
            // 单个授权目录读不到（未挂载完 / 无权限）不影响其它目录
            console.error("Failed to browse shared root:", root.path, rootError);
          }
        }
      }
      setNav(null);
      setRows(collected);
    } catch (sourceError) {
      console.error("Shared documents unavailable:", sourceError);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoots();
  }, [loadRoots]);

  const enterFolder = useCallback(
    async (row: SharedDocumentRow) => {
      setLoading(true);
      setError("");
      try {
        const listing = await browseSharedSource(row.sourceId, row.path);
        setRows(toRows(row.sourceId, row.label, row.rootPath, listing.entries));
        setNav({
          sourceId: row.sourceId,
          label: row.label,
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
    [zh],
  );

  const goBack = useCallback(async () => {
    if (!nav) return;
    const parent = nav.path.includes("/")
      ? nav.path.slice(0, nav.path.lastIndexOf("/"))
      : "";
    // 已到授权目录本身再往上就是平台内部路径，直接回到"全部授权目录"层
    if (!parent || parent.length < nav.rootPath.length) {
      await loadRoots();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const listing = await browseSharedSource(nav.sourceId, parent);
      setRows(toRows(nav.sourceId, nav.label, nav.rootPath, listing.entries));
      setNav({ ...nav, path: listing.path });
    } catch (folderError) {
      console.error("Failed to go back:", folderError);
      setError(zh ? "无法读取该目录。" : "Cannot read this folder.");
    } finally {
      setLoading(false);
    }
  }, [nav, loadRoots, zh]);

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
    rows,
    loading,
    error,
    nav,
    crumbs,
    busyKey,
    setBusyKey,
    enterFolder,
    goBack,
    reload: loadRoots,
    downloadFile,
  };
}
