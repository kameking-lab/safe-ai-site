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
      <section className="flex flex-1 flex-col rounded-3xl border border-slate-700/80 bg-slate-900/80 p-6 ring-2 ring-slate-600/40">
        <p className="text-sm font-semibold text-slate-300">今日の現場リスク</p>
        <div className="mt-3 h-12 w-40 animate-pulse rounded-full bg-slate-700/80" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700/60" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700/60" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-700/60" />
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="flex flex-1 flex-col rounded-3xl border border-rose-500/70 bg-gradient-to-br from-rose-950 via-rose-900 to-slate-950 p-6 ring-2 ring-rose-500/70">
        <p className="text-sm font-semibold text-rose-200">今日の現場リスク</p>
        <p className="mt-3 text-2xl font-bold text-rose-50">リスク情報を取得できません</p>
        <p className="mt-3 max-w-xl text-base text-rose-100">
          ネットワークまたはAPIの一時的な問題です。安全を優先し、現地の天候・足元・仮設設備の状態を確認したうえで、
          危険と感じる作業は無理に開始しないでください。
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
          <p className="text-sm font-semibold text-slate-100">今日の現場リスク</p>
          <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${style.badge}`}>データ未取得</span>
        </div>
        <p className="mt-3 text-2xl font-bold text-slate-50">大きな気象リスク情報はありません</p>
        <p className="mt-3 max-w-xl text-base text-slate-100">
          公式な警報・注意報情報を別途確認しつつ、通常どおり
          KYと相互指差呼称を行ってください。危険を感じたら「止めて声を出す」を合言葉にしてください。
        </p>
      </section>
    );
  }

  const style = riskHeroStyle(data.riskLevel);

  return (
    <section
      className={`flex flex-1 flex-col rounded-3xl border bg-gradient-to-br ${style.bg} p-6 ring-2 ${style.ring}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-100">今日の現場リスク</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">
            {data.date} / {data.regionName} / {data.overview}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide ${style.badge}`}>
            RISK {data.riskLevel}
          </span>
          <p className="text-xs text-slate-100/80">
            気温 {data.temperatureCelsius}℃・風 {data.windSpeedMs}m/s・雨 {data.precipitationMm}mm
          </p>
        </div>
      </div>

      <div className="mt-4 max-w-3xl">
        <h2 className="text-2xl font-bold text-slate-50">朝礼で伝える要点（30秒）</h2>
        <ul className="mt-3 space-y-2 text-lg leading-relaxed text-slate-50">
          {workBriefingLines.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-100" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

