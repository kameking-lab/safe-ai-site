"use client";

import { useId } from "react";
import type { JapanRegionId, MapAlertLevel } from "@/data/mock/japan-weather-map-mock";
import { japanRegionMeta } from "@/data/mock/japan-weather-map-mock";

/** 略式だが弧を連ねた日本列島シルエット（8ブロック）。viewBox 0 0 200 240 */
const REGION_PATHS: Record<JapanRegionId, string> = {
  hokkaido:
    "M 42 4 L 118 2 L 132 8 L 138 22 L 128 38 L 98 42 L 52 36 L 36 24 L 38 12 Z",
  tohoku:
    "M 52 36 L 118 38 L 124 52 L 120 78 L 88 82 L 58 76 L 48 58 Z",
  kanto:
    "M 88 72 L 128 70 L 138 88 L 132 108 L 98 112 L 86 96 Z",
  chubu:
    "M 58 78 L 92 80 L 96 108 L 78 118 L 56 108 L 52 90 Z",
  kinki:
    "M 38 96 L 72 94 L 78 118 L 58 128 L 36 118 Z",
  chugoku:
    "M 14 92 L 44 96 L 42 124 L 18 128 L 8 110 Z",
  shikoku:
    "M 48 122 L 88 118 L 92 138 L 58 144 L 44 134 Z",
  kyushu:
    "M 18 128 L 58 130 L 68 168 L 48 188 L 22 182 L 12 152 Z",
};

const LEVEL_CLASS: Record<MapAlertLevel, string> = {
  warning: "fill-rose-500/50 stroke-rose-300 stroke-[1.5]",
  advisory: "fill-amber-400/40 stroke-amber-200 stroke-[1.5]",
  none: "fill-slate-700/55 stroke-slate-500/80 stroke-[1.5]",
};

type JapanMapSvgProps = {
  levels: Record<JapanRegionId, MapAlertLevel>;
  className?: string;
};

export function JapanMapSvg({ levels, className }: JapanMapSvgProps) {
  const uid = useId();
  const warnPat = `${uid}-warn`;
  const advPat = `${uid}-adv`;

  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      role="img"
      aria-label="日本域の8ブロック別リスク表示"
    >
      <defs>
        <pattern id={warnPat} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgb(251 113 133)" strokeOpacity="0.35" strokeWidth="3" />
        </pattern>
        <pattern id={advPat} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgb(250 204 21)" strokeOpacity="0.3" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="200" height="240" className="fill-slate-950" rx="6" />
      {(Object.keys(REGION_PATHS) as JapanRegionId[]).map((id) => {
        const level = levels[id];
        const meta = japanRegionMeta.find((r) => r.id === id);
        const hatch = level === "warning" ? `url(#${warnPat})` : level === "advisory" ? `url(#${advPat})` : null;
        return (
          <g key={id}>
            <path d={REGION_PATHS[id]} className={LEVEL_CLASS[level]}>
              <title>{`${meta?.label ?? id}: ${level === "warning" ? "警報相当" : level === "advisory" ? "注意報相当" : "なし"}`}</title>
            </path>
            {hatch ? (
              <path d={REGION_PATHS[id]} fill={hatch} className="pointer-events-none stroke-none mix-blend-overlay" />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
