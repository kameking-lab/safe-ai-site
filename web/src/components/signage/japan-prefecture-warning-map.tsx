"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { JmaMapLevel } from "@/lib/jma/parse-jma-warning";

const FILL: Record<JmaMapLevel, string> = {
  none: "#64748bb8",
  advisory: "#facc15d0",
  warning: "#ef4444e0",
  special: "#7f1d1df0",
};

type JapanPrefectureWarningMapProps = {
  levelsByIso: Record<string, JmaMapLevel>;
  highlightIso?: string;
};

export function JapanPrefectureWarningMap({ levelsByIso, highlightIso }: JapanPrefectureWarningMapProps) {
  const [fc, setFc] = useState<GeoJSON.FeatureCollection | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 560, h: 600 });

  useEffect(() => {
    void fetch("/geo/japan-prefectures-ne10m.json")
      .then((r) => r.json())
      .then(setFc);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width;
        if (w > 48) setSize({ w, h: Math.max(300, w * 1.12) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paths = useMemo(() => {
    if (!fc) return [];
    const projection = geoMercator();
    const path = geoPath(projection);
    projection.fitExtent(
      [[6, 6], [size.w - 6, size.h - 6]],
      fc as unknown as GeoPermissibleObjects
    );
    return fc.features.map((feature, i) => {
      const iso = (feature.properties as { iso_3166_2?: string } | null)?.iso_3166_2 ?? "";
      const level = levelsByIso[iso] ?? "none";
      const d = path(feature as unknown as GeoPermissibleObjects);
      return { d, iso, level, key: iso || `f-${i}` };
    });
  }, [fc, levelsByIso, size.w, size.h]);

  return (
    <div ref={wrapperRef} className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <svg
          width={size.w}
          height={size.h}
          className="max-h-[min(58vh,560px)] max-w-full"
          role="img"
          aria-label="気象庁の注意報・警報に基づく都道府県別の色分け地図"
        >
          <rect width={size.w} height={size.h} className="fill-slate-950" rx={4} />
          <title>日本地図（都道府県・気象庁データ）</title>
          {paths.map((p) => (
            <path
              key={p.key}
              d={p.d ?? ""}
              fill={FILL[p.level]}
              stroke={p.iso === highlightIso ? "#4ade80" : "#0f172a"}
              strokeWidth={p.iso === highlightIso ? 2.4 : 0.55}
            />
          ))}
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-300 sm:text-[10px]">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-4 rounded-sm border border-slate-600" style={{ background: FILL.none }} />
          発表なし〜弱
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: FILL.advisory }} />
          注意報
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: FILL.warning }} />
          警報
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: FILL.special }} />
          特別警報
        </span>
      </div>
    </div>
  );
}
