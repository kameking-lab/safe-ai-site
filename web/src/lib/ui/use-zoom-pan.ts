"use client";

/**
 * F1（KY用紙 直接操作UI・方式確立）: ズーム/パンの React フック。
 *
 * 3系統の入力を1つの transform に集約する:
 *  - ピンチ（Pointer Events 2本指。1本指はパン）
 *  - ホイール（Ctrl/⌘+ホイール=カーソル位置アンカーのズーム。トラックパッドのピンチも
 *    ctrlKey 付き wheel として届くので同経路。素のホイールはパン）
 *  - ボタン（zoomIn/zoomOut/fit/setScale。アンカーはビューポート中央）
 *
 * 計算は zoom-pan-math.ts の純関数に委譲（そちらを vitest で固定）。
 * 依存パッケージ追加なし。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampPan,
  fitTransform,
  pointerDistance,
  pointerMidpoint,
  zoomAtPoint,
  zoomToRect,
  type Size,
  type ZoomPanTransform,
} from "@/lib/ui/zoom-pan-math";

export type UseZoomPanOptions = {
  minScale?: number;
  maxScale?: number;
  /** フィット時の余白(px) */
  fitPadding?: number;
  /** ボタンズームの1段の倍率比 */
  stepRatio?: number;
};

export type ZoomPanApi = {
  /** ビューポート要素に付ける ref */
  setViewportEl: (el: HTMLDivElement | null) => void;
  /** コンテンツ（用紙）要素に付ける ref（実寸測定用） */
  setContentEl: (el: HTMLDivElement | null) => void;
  transform: ZoomPanTransform;
  /** 初回フィット計算が済んだか（済むまでコンテンツは不可視にしてガタつきを防ぐ） */
  ready: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  /** 全体フィットへ戻す */
  fit: () => void;
  /** 指定倍率へ（アンカー=ビューポート中央） */
  setScale: (scale: number) => void;
  /** コンテンツ座標の矩形へズーム（セルへズーム用） */
  focusRect: (rect: { x: number; y: number; width: number; height: number }, targetScale?: number) => void;
  /** ビューポートに付けるハンドラ群 */
  handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  };
};

const DEFAULTS = { minScale: 0.15, maxScale: 2.5, fitPadding: 12, stepRatio: 1.2 };

export function useZoomPan(options?: UseZoomPanOptions): ZoomPanApi {
  const opts = { ...DEFAULTS, ...options };
  const [transform, setTransform] = useState<ZoomPanTransform>({ x: 0, y: 0, scale: 1 });
  const [ready, setReady] = useState(false);
  // ステージが条件付きマウント（canvasモード切替）でも effect が要素を掴めるよう、
  // callback ref は state にも要素を積む（ref だけだと effect が再実行されない）。
  const [vpEl, setVpEl] = useState<HTMLDivElement | null>(null);
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);

  const viewportElRef = useRef<HTMLDivElement | null>(null);
  const contentElRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const viewportSizeRef = useRef<Size>({ width: 1, height: 1 });
  const contentSizeRef = useRef<Size>({ width: 1, height: 1 });
  const readyRef = useRef(false);
  /** ユーザーが一度でも操作したら、リサイズ時の自動再フィットをやめる */
  const interactedRef = useRef(false);
  /** アクティブポインタ（1本=パン, 2本=ピンチ） */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null);
  const boundsRef = useRef({ minScale: opts.minScale, maxScale: opts.maxScale });
  boundsRef.current = { minScale: opts.minScale, maxScale: opts.maxScale };

  const doFit = useCallback(() => {
    const t = fitTransform(viewportSizeRef.current, contentSizeRef.current, {
      padding: opts.fitPadding,
      maxScale: 1,
    });
    setTransform(t);
  }, [opts.fitPadding]);

  const measure = useCallback(() => {
    const vp = viewportElRef.current;
    const content = contentElRef.current;
    if (!vp || !content) return;
    const vpRect = vp.getBoundingClientRect();
    viewportSizeRef.current = { width: vpRect.width, height: vpRect.height };
    // transform の影響を受けない実寸（offsetWidth/Height は scale 前の値）
    contentSizeRef.current = {
      width: content.offsetWidth || 1,
      height: content.offsetHeight || 1,
    };
  }, []);

  // 初回: 測定→フィット→表示（ResizeObserverで用紙の実寸確定を待つ）
  useEffect(() => {
    const vp = vpEl;
    const content = contentEl;
    if (!vp || !content) return;
    readyRef.current = false;
    setReady(false);
    const ro = new ResizeObserver(() => {
      measure();
      if (!readyRef.current) {
        if (contentSizeRef.current.height > 1 && viewportSizeRef.current.height > 1) {
          doFit();
          readyRef.current = true;
          setReady(true);
        }
      } else if (!interactedRef.current) {
        // 未操作の間（初期俯瞰のまま）は画面回転/リサイズに追従して再フィット
        doFit();
      }
    });
    ro.observe(vp);
    ro.observe(content);
    return () => ro.disconnect();
  }, [vpEl, contentEl, measure, doFit]);

  // ホイール（native・non-passive で preventDefault を効かせる）
  useEffect(() => {
    const vp = vpEl;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      interactedRef.current = true;
      const rect = vp.getBoundingClientRect();
      setTransform((prev) => {
        if (e.ctrlKey || e.metaKey) {
          const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          const ratio = Math.exp(-e.deltaY * 0.002);
          const next = zoomAtPoint(prev, prev.scale * ratio, anchor, boundsRef.current);
          return clampPan(next, viewportSizeRef.current, contentSizeRef.current);
        }
        return clampPan(
          { ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY },
          viewportSizeRef.current,
          contentSizeRef.current
        );
      });
    };
    // iOS Safari のページピンチと衝突させない（ステージ内限定）
    const onGesture = (e: Event) => e.preventDefault();
    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("gesturestart", onGesture);
    return () => {
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("gesturestart", onGesture);
    };
  }, [vpEl]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // セル(role=button)上のタップは編集操作なのでパン/ピンチを奪わない（2本目以降はピンチ優先）
    const el = e.target as HTMLElement;
    if (pointersRef.current.size === 0 && el.closest('[data-zoompan-skip="1"]')) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* 合成イベント（テスト）ではpointerIdが実在しないことがある */
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchStartRef.current = { distance: pointerDistance(a, b), scale: transformRef.current.scale };
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const prevPoint = pointersRef.current.get(e.pointerId);
    if (!prevPoint) return;
    const nextPoint = { x: e.clientX, y: e.clientY };
    pointersRef.current.set(e.pointerId, nextPoint);
    interactedRef.current = true;

    if (pointersRef.current.size >= 2 && pinchStartRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const start = pinchStartRef.current;
      const dist = pointerDistance(a, b);
      if (start.distance > 0 && start.scale > 0) {
        const vp = viewportElRef.current;
        const rect = vp?.getBoundingClientRect();
        const mid = pointerMidpoint(a, b);
        const anchor = rect ? { x: mid.x - rect.left, y: mid.y - rect.top } : mid;
        setTransform((prev) => {
          const next = zoomAtPoint(prev, start.scale * (dist / start.distance), anchor, boundsRef.current);
          return clampPan(next, viewportSizeRef.current, contentSizeRef.current);
        });
      }
      return;
    }

    // 1本指/マウスドラッグ = パン
    const dx = nextPoint.x - prevPoint.x;
    const dy = nextPoint.y - prevPoint.y;
    setTransform((prev) =>
      clampPan({ ...prev, x: prev.x + dx, y: prev.y + dy }, viewportSizeRef.current, contentSizeRef.current)
    );
  }, []);

  const releasePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
  }, []);

  const zoomStep = useCallback(
    (direction: 1 | -1) => {
      interactedRef.current = true;
      const vp = viewportSizeRef.current;
      const anchor = { x: vp.width / 2, y: vp.height / 2 };
      setTransform((prev) => {
        const ratio = direction === 1 ? opts.stepRatio : 1 / opts.stepRatio;
        const next = zoomAtPoint(prev, prev.scale * ratio, anchor, boundsRef.current);
        return clampPan(next, viewportSizeRef.current, contentSizeRef.current);
      });
    },
    [opts.stepRatio]
  );

  const setScale = useCallback((scale: number) => {
    interactedRef.current = true;
    const vp = viewportSizeRef.current;
    const anchor = { x: vp.width / 2, y: vp.height / 2 };
    setTransform((prev) =>
      clampPan(zoomAtPoint(prev, scale, anchor, boundsRef.current), viewportSizeRef.current, contentSizeRef.current)
    );
  }, []);

  const fit = useCallback(() => {
    interactedRef.current = true;
    measure();
    doFit();
  }, [measure, doFit]);

  const focusRect = useCallback(
    (rect: { x: number; y: number; width: number; height: number }, targetScale = 1.2) => {
      interactedRef.current = true;
      measure();
      setTransform(
        clampPan(
          zoomToRect(rect, viewportSizeRef.current, targetScale, boundsRef.current),
          viewportSizeRef.current,
          contentSizeRef.current
        )
      );
    },
    [measure]
  );

  const setViewportElCb = useCallback((el: HTMLDivElement | null) => {
    viewportElRef.current = el;
    setVpEl(el);
  }, []);
  const setContentElCb = useCallback((el: HTMLDivElement | null) => {
    contentElRef.current = el;
    setContentEl(el);
  }, []);

  return useMemo(
    () => ({
      setViewportEl: setViewportElCb,
      setContentEl: setContentElCb,
      transform,
      ready,
      zoomIn: () => zoomStep(1),
      zoomOut: () => zoomStep(-1),
      fit,
      setScale,
      focusRect,
      handlers: {
        onPointerDown,
        onPointerMove,
        onPointerUp: releasePointer,
        onPointerCancel: releasePointer,
      },
    }),
    [setViewportElCb, setContentElCb, transform, ready, zoomStep, fit, setScale, focusRect, onPointerDown, onPointerMove, releasePointer]
  );
}
