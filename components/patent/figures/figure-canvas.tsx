"use client";

/**
 * 附图画布：把一份产物里的图形真正画出来。
 *
 * 交底书里的附图有三种来源，这里都收：
 * 1. 内联 `<svg>`——结构示意图、件号引出线这类，模型直接给矢量图；
 * 2. ```mermaid``` 围栏——系统框图与流程图，用前端加载的 mermaid 渲染；
 * 3. 图片引用——脚本出的 PNG（CAD 投影、图生图线稿）。
 * 都不是时退回文本，让人至少能看到模型写了什么。
 *
 * 为什么要自己渲染而不是丢给服务端：`mermaid_render.py` 那条路要开 shell 才能跑，
 * 而这里是纯前端，出图不依赖任何脚本权限。
 *
 * SVG 是模型给的、但仍要当不可信输入处理：脚本块与 `on*` 事件属性一律剥掉再插进
 * DOM——`dangerouslySetInnerHTML` 插 SVG 等于给了一���执行入口。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";

export type Drawable =
  | { kind: "svg"; svg: string }
  | { kind: "mermaid"; code: string }
  | { kind: "image"; src: string; alt: string }
  | { kind: "text"; text: string };

/** 剥掉脚本与事件属性：模型给的 SVG 不能带执行入口 */
export function sanitizeSvg(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/** 从产物正文里挑出「能画的那一块」，挑不出就退回全文 */
export function extractDrawable(markdown: string): Drawable {
  const src = markdown || "";

  const svgBlock = src.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgBlock) return { kind: "svg", svg: sanitizeSvg(svgBlock[0]) };

  const fence = src.match(/```(?:svg|xml)\s*\n([\s\S]*?)```/i);
  if (fence?.[1]?.includes("<svg")) {
    return { kind: "svg", svg: sanitizeSvg(fence[1]) };
  }

  const mermaid = src.match(/```mermaid\s*\n([\s\S]*?)```/i);
  if (mermaid?.[1]?.trim()) {
    return { kind: "mermaid", code: mermaid[1].trim() };
  }

  const img = src.match(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/);
  if (img?.[1]) {
    const alt = src.match(/!\[([^\]]*)\]\([^)]*\)/)?.[1] ?? "";
    return { kind: "image", src: img[1], alt };
  }

  return { kind: "text", text: src };
}

/** 只用到这两个方法，够用的类型比 any 更能挡住误用 */
type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

let mermaidPromise: Promise<MermaidApi | null> | null = null;

/** 按需加载 mermaid：2.5MB，只有真的画到围栏图时才拉 */
async function loadMermaid(): Promise<MermaidApi | null> {
  if (typeof window === "undefined") return null;
  if (!mermaidPromise) {
    mermaidPromise = new Promise((resolve, reject) => {
      const w = window as unknown as { mermaid?: MermaidApi };
      if (w.mermaid) {
        resolve(w.mermaid);
        return;
      }
      const script = document.createElement("script");
      script.src = "/patent/mermaid.min.js";
      script.onload = () =>
        w.mermaid
          ? resolve(w.mermaid)
          : reject(new Error("mermaid loaded but not on window"));
      script.onerror = () => reject(new Error("mermaid failed to load"));
      document.head.appendChild(script);
    });
  }
  return mermaidPromise;
}

export function FigureCanvas({
  markdown,
  title,
  className,
}: {
  /** 产物正文（Markdown / SVG / mermaid 围栏） */
  markdown: string;
  title: string;
  className?: string;
}) {
  const t = useExtracted();
  const drawable = useMemo(() => extractDrawable(markdown), [markdown]);
  /**
   * 渲染结果带上「是哪段源码渲染出来的」：切换附图时不用同步清空（那会在effect
   * 里触发级联渲染），只在展示时比对，不匹配就当还没画。
   */
  const [rendered, setRendered] = useState<{ src: string; svg: string } | null>(null);
  const [failed, setFailed] = useState<{ src: string; msg: string } | null>(null);
  const seq = useRef(0);

  const mermaidSrc = drawable.kind === "mermaid" ? drawable.code : "";
  const renderedSvg =
    drawable.kind === "svg"
      ? drawable.svg
      : rendered && rendered.src === mermaidSrc
        ? rendered.svg
        : null;

  useEffect(() => {
    let alive = true;
    if (drawable.kind !== "mermaid") return;

    void (async () => {
      try {
        const mermaid = await loadMermaid();
        if (!mermaid || !alive) return;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        const id = `fig-${Date.now()}-${seq.current++}`;
        const { svg } = await mermaid.render(id, drawable.code);
        if (!alive) return;
        setRendered({ src: drawable.code, svg: sanitizeSvg(svg) });
      } catch (err) {
        if (!alive) return;
        // 画不出来不是失败：把源码原样留着，用户还能自己修
        setFailed({
          src: drawable.code,
          msg: String(err instanceof Error ? err.message : err),
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [drawable]);

  if (renderedSvg) {
    return (
      <div className={cn("flex h-full min-h-0 flex-col", className)}>
        <div
          className="min-h-0 flex-1 overflow-auto bg-white p-6 dark:bg-white"
          // 已 sanitize：剥掉了 script / on* / javascript:
          dangerouslySetInnerHTML={{ __html: renderedSvg }}
        />
        {drawable.kind === "svg" ? (
          <p className="shrink-0 border-t border-black/[0.06] px-4 py-2 text-[12px] text-[#9A9AA0] dark:border-white/10">
            {t({ id: "Figure vector source", message: "Editable vector source (SVG)" })}
          </p>
        ) : null}
      </div>
    );
  }

  if (drawable.kind === "image") {
    return (
      <div className={cn("flex h-full min-h-0 flex-col overflow-auto p-6", className)}>
        {/* 产物里的图是相对路径（工作区里生成的 PNG），走 unoptimized 直出即可 */}
        {/* 产物里的图是工作区生成的相对路径，next/image 拿不到尺寸也优化不了 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={drawable.src}
          alt={drawable.alt || title}
          className="mx-auto max-w-full self-start"
        />
      </div>
    );
  }

  if (drawable.kind === "mermaid") {
    return (
      <div className={cn("h-full overflow-auto p-6", className)}>
        <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-[#5C5C60] dark:text-slate-300">
          {drawable.code}
        </pre>
        {failed && failed.src === mermaidSrc ? (
          <p className="mt-3 rounded-lg bg-[#FFF7ED] px-3 py-2 text-[12.5px] text-[#B45309]">
            {t({
              id: "Figure render failed",
              message: "Could not render the diagram — the source is kept so you can fix it.",
            })}
          </p>
        ) : null}
      </div>
    );
  }

  // 能走到这里说明既没有矢量图也没有围栏：把正文原样摊开，至少让人看到模型写了什么
  return (
    <div className={cn("h-full overflow-auto p-6", className)}>
      <pre className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#5C5C60] dark:text-slate-300">
        {drawable.kind === "text" ? drawable.text : ""}
      </pre>
    </div>
  );
}

export default FigureCanvas;