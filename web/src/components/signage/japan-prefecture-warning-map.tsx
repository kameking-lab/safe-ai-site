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

/**
 * コンテナ幅に合わせ、GeoJSON の実バウンディングボックスから高さを算出する。
 * 横長コンテナでも北海道〜沖縄が収まるよう、fitWidth 後の bounds で縦ピクセルを決める。
 */
export function JapanPrefectureWarningMap({ levelsByIso, highlightIso }: JapanPrefectureWarningMapProps) {
  const [fc, setFc] = useState<GeoJSON.FeatureCollection | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);

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
        if (w > 48) setWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { paths, svgW, svgH } = useMemo(() => {
    if (!fc) {
      return { paths: [] as { d: string; iso: string; level: JmaMapLevel; key: string }[], svgW: width, svgH: 400 };
    }
    const pad = 12;
    const w = Math.max(280, Math.floor(width));
    const projection = geoMercator();
    const path = geoPath(projection);
    const geo = fc as unknown as GeoPermissibleObjects;

    projection.fitWidth(w - pad * 2, geo);
    const b = path.bounds(geo);
    const bh = Math.ceil(b[1][1] - b[0][1]);
    let h = Math.max(280, bh + pad * 2);
    const maxH = Math.round(w * 2.15);
    h = Math.min(Math.max(h, Math.round(w * 1.25)), maxH);

    projection.fitExtent(
      [
        [pad, pad],
        [w - pad, h - pad],
      ],
      geo
    );

    const segments = fc.features.map((feature, i) => {
      const iso = (feature.properties as { iso_3166_2?: string } | null)?.iso_3166_2 ?? "";
      const level = levelsByIso[iso] ?? "none";
      const d = path(feature as unknown as GeoPermissibleObjects);
      return { d: d ?? "", iso, level, key: iso || `f-${i}` };
    });

    return { paths: segments, svgW: w, svgH: h };
  }, [fc, levelsByIso, width]);

  return (
    <div ref={wrapperRef} className="w-full shrink-0">
      <div className="flex w-full justify-center">
        <svg
          width={svgW}
          height={svgH}
          className="max-w-full"
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="気象庁の注意報・警報に基づく都道府県別の色分け地図"
        >
          <rect width={svgW} height={svgH} className="fill-slate-950" rx={4} />
          <title>日本地図（都道府県・気象庁データ）</title>
          {paths.map((p) => (
            <path
              key={p.key}
              d={p.d}
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
