"use client";

import type { SignageHourlyPoint } from "@/lib/types/signage-weather";

function weatherIcon(code: number, precipMm: number) {
  if (precipMm >= 0.5 && code >= 51) return "☂️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 95) return "⛈️";
  if (code <= 1) return "☀️";
  if (code <= 3) return "☁️";
  if (code >= 51) return "🌧️";
  return "🌤️";
}

type SignageHourlyStripProps = {
  hourly: SignageHourlyPoint[];
  locationLabel: string;
  status: "idle" | "loading" | "success" | "error";
};

export function SignageHourlyStrip({ hourly, locationLabel, status }: SignageHourlyStripProps) {
  if (status === "loading" || status === "idle") {
    return (
      <div className="rounded-xl border border-slate-600 bg-slate-950/90 p-2">
        <p className="text-[10px] font-bold text-slate-200">時間別の天気（横スクロール）</p>
        <div className="mt-2 h-24 animate-pulse rounded-lg bg-slate-800/80" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-amber-700/50 bg-slate-950/90 p-2">
        <p className="text-[10px] text-amber-100">時間別天気を取得できませんでした。</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-600 bg-slate-950/90 p-2">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <p className="text-[10px] font-bold text-slate-100 sm:text-xs">1時間ごとの天気（Open-Meteo・参考）</p>
        <p className="max-w-[55%] truncate text-[9px] text-slate-400">{locationLabel}</p>
      </div>
      <div className="mt-2 flex gap-1 overflow-x-auto pb-1 pt-1 [scrollbar-width:thin]">
        {hourly.map((h) => (
          <div
            key={h.time}
            className="flex w-[52px] shrink-0 flex-col items-center rounded-lg border border-slate-700/90 bg-slate-900/80 px-1 py-1.5 text-center"
          >
            <span className="text-[8px] leading-tight text-slate-400">{h.hourLabel}</span>
            <span className="my-0.5 text-xl leading-none" aria-hidden>
              {weatherIcon(h.weatherCode, h.precipMm)}
            </span>
            <span className="text-[10px] font-semibold tabular-nums text-slate-100">{h.tempC}°</span>
            {h.precipMm >= 0.1 ? (
              <span className="text-[8px] tabular-nums text-sky-300">{h.precipMm}mm</span>
            ) : (
              <span className="text-[8px] text-slate-600">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
