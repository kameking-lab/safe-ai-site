"use client";

import { useMemo } from "react";
import { computeTodayRisks } from "@/lib/utils/risk-search";
import type { RiskLevel } from "@/lib/utils/risk-search";
import type { SiteRiskWeather } from "@/lib/types/domain";

type Props = {
  weatherData?: SiteRiskWeather | null;
};

function riskBgClass(level: RiskLevel) {
  switch (level) {
    case "高": return "bg-rose-900/80 border-rose-500/60";
    case "中": return "bg-amber-900/70 border-amber-500/60";
    case "低": return "bg-emerald-900/70 border-emerald-600/40";
  }
}

function riskTextClass(level: RiskLevel) {
  switch (level) {
    case "高": return "text-rose-100";
    case "中": return "text-amber-100";
    case "低": return "text-emerald-100";
  }
}

function riskBadgeClass(level: RiskLevel) {
  switch (level) {
    case "高": return "bg-rose-600 text-white";
    case "中": return "bg-amber-500 text-white";
    case "低": return "bg-emerald-600 text-white";
  }
}

export function SignageRiskPrediction({ weatherData }: Props) {
  const risks = useMemo(() => {
    return computeTodayRisks({
      date: new Date(),
      temperatureCelsius: weatherData?.temperatureCelsius,
      precipitationMm: weatherData?.precipitationMm,
    });
  }, [weatherData]);

  const highRisks = risks.filter((r) => r.level === "高");
  const otherRisks = risks.filter((r) => r.level !== "高");

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-xs font-bold tracking-wide text-slate-100 sm:text-sm lg:text-base">
          本日のリスク予測
        </h2>
        <a
          href="/risk-prediction"
          className="rounded-lg border border-blue-600/60 px-2 py-1 text-[9px] font-semibold text-blue-300 hover:bg-blue-950/50 sm:text-[10px]"
          target="_blank"
          rel="noreferrer"
        >
          詳細予測 →
        </a>
      </div>

      <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {highRisks.map((risk) => (
          <div
            key={risk.type}
            className={`rounded-lg border p-2 ${riskBgClass(risk.level)} sm:rounded-xl sm:p-2.5`}
          >
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-base">{risk.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${riskBadgeClass(risk.level)}`}>
                    {risk.level}リスク
                  </span>
                  <span className={`text-[10px] font-bold sm:text-xs ${riskTextClass(risk.level)}`}>
                    {risk.label}
                  </span>
                </div>
                <p className={`mt-0.5 text-[9px] leading-relaxed sm:text-[10px] ${riskTextClass(risk.level)} opacity-80`}>
                  {risk.reason}
                </p>
              </div>
            </div>
          </div>
        ))}

        {otherRisks.map((risk) => (
          <div
            key={risk.type}
            className={`rounded-lg border p-1.5 ${riskBgClass(risk.level)} sm:rounded-xl sm:p-2`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{risk.icon}</span>
              <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${riskBadgeClass(risk.level)}`}>
                {risk.level}
              </span>
              <span className={`text-[9px] font-semibold sm:text-[10px] ${riskTextClass(risk.level)}`}>
                {risk.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
