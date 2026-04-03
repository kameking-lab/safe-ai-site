"use client";

import type { SiteRiskWeather } from "@/lib/types/domain";

type WeatherAlertPanelProps = {
  data: SiteRiskWeather | null;
  status: "idle" | "loading" | "success" | "error";
};

function classifyAlert(data: SiteRiskWeather | null) {
  if (!data || data.alerts.length === 0) {
    return "none" as const;
  }
  const hasWarning = data.alerts.some((a) => a.level === "warning");
  if (hasWarning) return "warning" as const;
  return "advisory" as const;
}

function alertBackgroundClass(kind: "none" | "advisory" | "warning") {
  if (kind === "warning") {
    return "bg-[repeating-linear-gradient(135deg,rgba(248,113,113,0.20)_0,rgba(248,113,113,0.20)_6px,transparent_6px,transparent_12px)] border-rose-500/80";
  }
  if (kind === "advisory") {
    return "bg-[repeating-linear-gradient(135deg,rgba(250,204,21,0.18)_0,rgba(250,204,21,0.18)_6px,transparent_6px,transparent_12px)] border-amber-400/80";
  }
  return "bg-slate-900/60 border-slate-700";
}

export function WeatherAlertPanel({ data, status }: WeatherAlertPanelProps) {
  if (status === "loading") {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold text-slate-200">警報・注意報</p>
        <p className="mt-2 h-6 w-32 animate-pulse rounded bg-slate-700/80" />
        <p className="mt-3 h-4 w-4/5 animate-pulse rounded bg-slate-700/60" />
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-rose-500/80 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold text-rose-200">警報・注意報</p>
        <p className="mt-2 text-base font-semibold text-rose-100">警報情報を取得できません</p>
        <p className="mt-2 text-sm text-rose-100/90">
          公式な気象情報を別途確認し、暴風・大雨・雷などの警報発表時は、危険作業を止めて責任者判断を仰いでください。
        </p>
      </section>
    );
  }

  const kind = classifyAlert(data);
  const bg = alertBackgroundClass(kind);

  if (!data || kind === "none") {
    return (
      <section className={`flex h-full flex-col rounded-2xl border p-4 ${bg}`}>
        <p className="text-sm font-semibold text-slate-100">警報・注意報</p>
        <p className="mt-2 text-lg font-semibold text-slate-50">警報・注意報は発表されていません</p>
        <p className="mt-2 text-sm text-slate-100/90">
          ただし、急な天候変化（突風・雷・局地的豪雨）には注意してください。
          空模様とレーダーを確認し、異常を感じたらただちに作業を中止してください。
        </p>
      </section>
    );
  }

  const warningItems = data.alerts.map((alert) => `${alert.type}`).join(" / ");

  return (
    <section className={`flex h-full flex-col rounded-2xl border p-4 ${bg}`}>
      <p className="text-sm font-semibold text-slate-100">警報・注意報</p>
      <p className="mt-2 text-lg font-semibold text-slate-50">
        {kind === "warning" ? "警報発表中" : "注意報発表中"}: {warningItems}
      </p>
      <p className="mt-2 text-sm text-slate-100/90">
        作業を開始・継続する前に、危険な工程の一時停止・退避ルート・連絡系統を必ず確認してください。
        強いハッチングは「作業見直しレベル」のサインです。
      </p>
    </section>
  );
}

