"use client";

import { Toaster } from "sonner";

/**
 * 全局 toast 容器：挂在根 layout，首页（引擎切换提示）与编辑器页共用。
 * 编辑器页不再单独渲染 Toaster，否则同一条 toast 会显示两次。
 */
export function AppToaster() {
  return (
    <Toaster
      richColors
      position="top-center"
      theme={
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")
          ? "dark"
          : "light"
      }
    />
  );
}
