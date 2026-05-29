/**
 * P0-1: サイネージの「1画面フィット」（signage-responsive-audit 2026-05-28）
 *
 * 実コンテンツの自然サイズ（transformはレイアウト箱に影響しないので scrollWidth/Height で測定可）と
 * 利用可能領域を比較し、viewport に収まる scale を算出する。動的内容・6言語にも自動追従。
 */
import { useCallback, useEffect, useRef, useState } from "react";

export function computeFitScale(args: {
  contentW: number;
  contentH: number;
  availW: number;
  availH: number;
  min?: number;
  max?: number;
}): number {
  const { contentW, contentH, availW, availH, min = 0.3, max = 2 } = args;
  if (contentW <= 0 || contentH <= 0 || availW <= 0 || availH <= 0) return 1;
  const s = Math.min(availW / contentW, availH / contentH);
  return Math.max(min, Math.min(max, s));
}

/**
 * enabled が true のとき、contentRef を outerRef（利用可能領域）にフィットさせる scale を返す。
 * resize / orientationchange / コンテンツ変化（ResizeObserver）/ deps 変化で再計算。
 * setState は requestAnimationFrame で遅延し、effect内同期setStateのカスケードを避ける。
 */
export function useFitToScreen(opts: { enabled: boolean; deps?: ReadonlyArray<unknown> }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const enabled = opts.enabled;

  const recompute = useCallback(() => {
    requestAnimationFrame(() => {
      if (!enabled) {
        setScale(1);
        return;
      }
      const outer = outerRef.current;
      const content = contentRef.current;
      if (!outer || !content) return;
      setScale(
        computeFitScale({
          contentW: content.scrollWidth,
          contentH: content.scrollHeight,
          availW: outer.clientWidth,
          availH: outer.clientHeight,
        }),
      );
    });
  }, [enabled]);

  // deps（record/lang等）変化時に再計算
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => recompute(), [recompute, ...(opts.deps ?? [])]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => recompute();
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(on) : null;
    if (ro && contentRef.current) ro.observe(contentRef.current);
    if (ro && outerRef.current) ro.observe(outerRef.current);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
      ro?.disconnect();
    };
  }, [recompute]);

  return { outerRef, contentRef, scale };
}
