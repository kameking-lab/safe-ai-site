"use client";

import { useEffect, useRef, useState } from "react";

/**
 * サイネージの「動かない掲示板」問題（Fable診断01 T5）を解消する汎用ローテーター。
 * 隠れがちな複数件パネル（ニュース・法改正など）を1件ずつ大きく表示し、一定間隔で自動切替する。
 * ホバー/フォーカス中は一時停止し、prefers-reduced-motion では自動切替を止める（手動ドットのみ）。
 */
const DEFAULT_INTERVAL_MS = 16 * 1000;

type SignageRotatorProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
  ariaLabel: string;
  intervalMs?: number;
};

export function SignageRotator<T>({
  items,
  renderItem,
  getKey,
  ariaLabel,
  intervalMs = DEFAULT_INTERVAL_MS,
}: SignageRotatorProps<T>) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (items.length <= 1 || paused || reducedMotionRef.current) return;
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [items.length, intervalMs, paused]);

  if (items.length === 0) return null;
  // 件数が変わった（フィルタ・再取得後）直後は index が範囲外を指し得るため、都度 modulo で補正する
  const safeIndex = index % items.length;
  const current = items[safeIndex]!;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="min-h-0 flex-1" role="group" aria-label={`${ariaLabel}（${safeIndex + 1}/${items.length}件目）`}>
        {renderItem(current, safeIndex)}
      </div>
      {items.length > 1 && (
        <div
          className="mt-1.5 flex shrink-0 flex-wrap items-center justify-center gap-1"
          role="tablist"
          aria-label={`${ariaLabel}の切替`}
        >
          {items.map((item, i) => (
            <button
              key={getKey(item, i)}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`${i + 1}件目を表示`}
              onClick={() => setIndex(i)}
              className="flex min-h-[24px] min-w-[24px] items-center justify-center"
            >
              <span
                aria-hidden
                className={`block h-2 w-2 rounded-full ${i === safeIndex ? "bg-emerald-400" : "bg-slate-600"}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
