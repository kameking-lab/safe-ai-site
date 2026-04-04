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
        <p className="text-[10px] font-bold text-slate-200">時間別の天気</p>
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
        <p className="text-[10px] font-bold text-slate-100 sm:text-xs">1時間ごとの天気（現在の時台〜明日・Open-Meteo）</p>
        <p className="max-w-[55%] truncate text-[9px] text-slate-400">{locationLabel}</p>
      </div>
      <p className="mt-0.5 text-[8px] text-slate-500">先頭が現在の時間帯。幅に応じて折り返し表示（横スクロールなし）。</p>
      <div
        className="mt-2 grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(46px,1fr))]"
        role="list"
        aria-label="1時間ごとの天気予報"
      >
        <div
          className="flex min-h-[4.5rem] min-w-[2.75rem] flex-col items-center justify-center rounded-lg border border-cyan-700/50 bg-cyan-950/40 px-0.5 py-1 text-center"
          role="presentation"
        >
          <span className="text-[8px] font-bold leading-tight text-cyan-200">現在</span>
          <span className="text-[7px] leading-tight text-cyan-400/90">の時台</span>
          <span className="text-[7px] leading-tight text-cyan-500/80">から</span>
        </div>
        {hourly.map((h) => (
          <div
            key={h.time}
            role="listitem"
            className="flex min-h-[4.5rem] min-w-0 flex-col items-center justify-start rounded-lg border border-slate-700/90 bg-slate-900/80 px-0.5 py-1 text-center lg:min-h-[5.5rem]"
          >
            <span className="line-clamp-2 text-[7px] leading-tight text-slate-300 sm:text-[8px] lg:text-[9px]">{h.hourLabel}</span>
            <span className="my-0.5 text-lg leading-none sm:text-xl lg:text-2xl" aria-hidden>
              {weatherIcon(h.weatherCode, h.precipMm)}
            </span>
            <span className="text-[9px] font-semibold tabular-nums text-white sm:text-[10px] lg:text-xs">{h.tempC}°</span>
            {h.precipMm >= 0.1 ? (
              <span className="text-[7px] tabular-nums text-sky-300 sm:text-[8px] lg:text-[9px]">{h.precipMm}mm</span>
            ) : (
              <span className="text-[7px] text-slate-600 sm:text-[8px]">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
