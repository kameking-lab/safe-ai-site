"use client";

import type { SiteRiskWeather } from "@/lib/types/domain";

type RiskHeroCardProps = {
  data: SiteRiskWeather | null;
  status: "idle" | "loading" | "success" | "error";
  workBriefingLines: string[];
};

function riskHeroStyle(level: SiteRiskWeather["riskLevel"] | null) {
  if (level === "高") {
    return {
      badge: "bg-rose-500 text-white",
      bg: "from-rose-900 via-rose-800 to-rose-900",
      ring: "ring-rose-400/70",
    };
  }
  if (level === "中") {
    return {
      badge: "bg-amber-400 text-slate-900",
      bg: "from-amber-900 via-amber-800 to-amber-900",
      ring: "ring-amber-400/70",
    };
  }
  return {
    badge: "bg-emerald-400 text-slate-900",
    bg: "from-emerald-900 via-emerald-800 to-emerald-900",
    ring: "ring-emerald-400/60",
  };
}

export function RiskHeroCard({ data, status, workBriefingLines }: RiskHeroCardProps) {
  if (status === "loading") {
    return (
      <section className="flex flex-1 flex-col rounded-3xl border border-slate-700/80 bg-slate-900/90 p-6 ring-2 ring-slate-600/40">
        <p className="text-base font-semibold tracking-wide text-slate-200">今日の現場リスク</p>
        <div className="mt-4 flex items-center gap-6">
          <div className="h-20 w-20 animate-pulse rounded-full bg-slate-700/80" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700/60" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700/60" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-700/60" />
          </div>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="flex flex-1 flex-col rounded-3xl border border-rose-500/70 bg-gradient-to-br from-rose-950 via-rose-900 to-slate-950 p-6 ring-2 ring-rose-500/70">
        <p className="text-base font-semibold tracking-wide text-rose-200">今日の現場リスク</p>
        <p className="mt-3 text-3xl font-extrabold tracking-wide text-rose-50">自動リスク表示ができません</p>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-rose-50">
          画面はこのままで構いません。朝礼では
          <span className="font-semibold">「天候・足元・仮設設備」を1つずつ声に出して確認</span>
          し、少しでも危険を感じた作業は
          <span className="font-semibold"> いったん止めて責任者と相談</span>してください。
        </p>
      </section>
    );
  }

  if (!data) {
    const style = riskHeroStyle(null);
    return (
      <section
        className={`flex flex-1 flex-col rounded-3xl border border-slate-700/80 bg-gradient-to-br ${style.bg} p-6 ring-2 ${style.ring}`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold tracking-wide text-slate-100">今日の現場リスク</p>
          <span className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide ${style.badge}`}>
            RISK 不明
          </span>
        </div>
        <p className="mt-3 text-3xl font-extrabold tracking-wide text-slate-50">自動リスク情報がありません</p>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-50">
          気象庁やレーダーの公式情報を確認しつつ、
          <span className="font-semibold">「足元・頭上・重機まわり」の3点を現地で必ず確認</span>
          してください。危険を感じたら
          <span className="font-semibold">「止めて声を出す」を合言葉</span>に行動してください。
        </p>
      </section>
    );
  }

  const style = riskHeroStyle(data.riskLevel);

  return (
    <section
      className={`flex flex-1 flex-col rounded-3xl border bg-gradient-to-br ${style.bg} p-6 ring-2 ${style.ring}`}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <p className="text-base font-semibold tracking-wide text-slate-100">今日の現場リスク</p>
          <p className="text-xl font-semibold text-slate-100">
            {data.date} / {data.regionName}
          </p>
          <p className="text-base text-slate-100/90">{data.overview}</p>
          <p className="mt-1 text-sm text-slate-100/80">
            気温 <span className="font-semibold">{data.temperatureCelsius}℃</span>・風{" "}
            <span className="font-semibold">{data.windSpeedMs}m/s</span>・雨{" "}
            <span className="font-semibold">{data.precipitationMm}mm</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-100/80">TODAY RISK</span>
            <span
              className={`flex items-center justify-center rounded-full px-4 py-2 text-3xl font-extrabold tracking-tight ${style.badge}`}
            >
              {data.riskLevel}
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-100/70">
            高 / 中 / 低 の3段階表示
          </p>
        </div>
      </div>

      <div className="mt-5 max-w-3xl">
        <h2 className="text-2xl font-extrabold tracking-wide text-slate-50">朝礼で伝える要点（30秒）</h2>
        <ul className="mt-3 space-y-2.5 text-xl leading-relaxed text-slate-50">
          {workBriefingLines.map((line) => (
            <li key={line} className="flex gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-900">
                ●
              </span>
              <span className="flex-1">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

