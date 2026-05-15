"use client";

import { useEffect, useRef, useState } from "react";

type LazyChartProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  rootMargin?: string;
};

/**
 * Defers chart mount until the placeholder enters (or nears) the viewport.
 * Cuts mobile main-thread scripting time on dashboards with multiple
 * recharts panels — off-screen charts no longer pay React reconciliation
 * cost at first paint.
 */
export function LazyChart({ children, className, style, rootMargin = "200px" }: LazyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className} style={style}>
      {visible ? children : (
        <div className="h-full w-full animate-pulse rounded bg-slate-100" aria-hidden="true" />
      )}
    </div>
  );
}
