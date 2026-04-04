"use client";

import type { SignageHourlyPoint } from "@/lib/types/signage-weather";

type SignageHourlyWeatherProps = {
  hourly: SignageHourlyPoint[];
  regionLabel: string;
  status: "idle" | "loading" | "success" | "error";
};

function tokyoYmd(isoTime: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoTime));
}

function splitByJstDate(hourly: SignageHourlyPoint[]) {
  const todayYmd = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const distinctDays = [...new Set(hourly.map((r) => tokyoYmd(r.time)))].sort();
  const startIdx = distinctDays.indexOf(todayYmd);
  const tomorrowYmd =
    startIdx >= 0 && startIdx + 1 < distinctDays.length ? distinctDays[startIdx + 1]! : null;

  const today: SignageHourlyPoint[] = [];
  const tomorrow: SignageHourlyPoint[] = [];

  for (const row of hourly) {
    const k = tokyoYmd(row.time);
    if (k === todayYmd) today.push(row);
    else if (tomorrowYmd && k === tomorrowYmd) tomorrow.push(row);
  }

  return { today, tomorrow };
}

export function SignageHourlyWeather({ hourly, regionLabel, status }: SignageHourlyWeatherProps) {
  const { today, tomorrow } = splitByJstDate(hourly);

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex h-full min-h-[120px] flex-col rounded-xl border border-slate-600 bg-slate-950/80 p-2">
        <p className="text-[10px] font-bold text-slate-300">1時間ごとの予報（今日・明日）</p>
        <div className="mt-2 flex-1 animate-pulse rounded-lg bg-slate-800/80" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full min-h-[120px] flex-col rounded-xl border border-amber-700/50 bg-slate-950/80 p-2">
        <p className="text-[10px] font-bold text-amber-200">1時間ごとの予報</p>
        <p className="mt-2 text-[10px] text-amber-100/90">取得できませんでした。</p>
      </div>
    );
  }

  const RowSet = ({ rows, label }: { rows: SignageHourlyPoint[]; label: string }) => (
    <div className="min-w-0">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-emerald-300/90">{label}</p>
      <div className="max-h-[28vh] overflow-x-auto overflow-y-auto xl:max-h-[min(32vh,320px)]">
        <table className="w-full min-w-[200px] border-collapse text-[9px] text-slate-200">
          <thead>
            <tr className="border-b border-slate-600 text-left text-slate-400">
              <th className="py-0.5 pr-1 font-medium">時</th>
              <th className="py-0.5 pr-1 font-medium">天気</th>
              <th className="py-0.5 pr-1 font-medium">℃</th>
              <th className="py-0.5 pr-1 font-medium">雨mm</th>
              <th className="py-0.5 font-medium">風m/s</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 24).map((r) => (
              <tr key={r.time} className="border-b border-slate-800/80">
                <td className="py-0.5 pr-1 tabular-nums text-slate-300">{r.hourLabel}</td>
                <td className="py-0.5 pr-1 text-slate-200">{r.weatherLabel}</td>
                <td className="py-0.5 pr-1 tabular-nums">{r.tempC}</td>
                <td className="py-0.5 pr-1 tabular-nums">{r.precipMm}</td>
                <td className="py-0.5 tabular-nums">{r.windMs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-600 bg-slate-950/80 p-2">
      <p className="shrink-0 text-[10px] font-bold text-slate-100">1時間ごとの予報（Open-Meteo）</p>
      <p className="shrink-0 text-[9px] text-slate-400">{regionLabel}</p>
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
        <RowSet rows={today} label="今日" />
        {tomorrow.length > 0 ? (
          <RowSet rows={tomorrow} label="明日" />
        ) : (
          <div className="flex min-h-[80px] items-center rounded-lg border border-dashed border-slate-700/80 p-2 text-[9px] text-slate-500">
            明日分の予報スロットは、APIの先頭時刻に応じて表示されます。
          </div>
        )}
      </div>
    </div>
  );
}
