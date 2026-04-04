"use client";

import type { JapanRegionId, MapAlertLevel } from "@/data/mock/japan-weather-map-mock";
import { JapanMapSvg } from "@/components/signage/japan-map-svg";

type JapanWeatherMapProps = {
  levels: Record<JapanRegionId, MapAlertLevel>;
  modeLabel: string;
  dataSourceNote?: string;
};

export function JapanWeatherMap({ levels, modeLabel, dataSourceNote }: JapanWeatherMapProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-600 bg-slate-950 p-2 sm:p-3">
      <div className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-100 sm:text-sm">日本域 リスク目安（{modeLabel}）</p>
        <div className="flex flex-wrap gap-2 text-[9px] text-slate-300 sm:text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-5 rounded border border-rose-400 bg-rose-500/50" />
            強め
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-5 rounded border border-amber-300 bg-amber-400/40" />
            注意
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-5 rounded border border-slate-500 bg-slate-700/55" />
            低め
          </span>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <JapanMapSvg className="h-full max-h-[min(52vh,420px)] w-auto max-w-full" levels={levels} />
      </div>
      <p className="mt-1 shrink-0 text-[9px] leading-snug text-slate-400 sm:text-[10px]">
        {dataSourceNote ??
          "地域ブロックは代表地点の予報から強風・降水の目安を着色しています。気象庁の注意報・警報とは一致しません。"}
      </p>
    </div>
  );
}
