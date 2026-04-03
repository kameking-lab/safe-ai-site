"use client";

import type { SiteRiskWeather } from "@/lib/types/domain";

type WeatherAlertPanelProps = {
  data: SiteRiskWeather | null;
  status: "idle" | "loading" | "success" | "error";
};

type AlertVisualKind = "none" | "advisory" | "warning";

function classifyAlert(data: SiteRiskWeather | null) {
  if (!data || data.alerts.length === 0) {
    return "none" as const;
  }
  const hasWarning = data.alerts.some((a) => a.level === "warning");
  if (hasWarning) return "warning" as const;
  return "advisory" as const;
}

const ALERT_STYLE: Record<
  AlertVisualKind,
  {
    container: string;
    badge: string;
    label: string;
    subLabel: string;
  }
> = {
  warning: {
    container:
      "bg-[repeating-linear-gradient(135deg,rgba(248,113,113,0.25)_0,rgba(248,113,113,0.25)_6px,transparent_6px,transparent_12px)] border-rose-500/80",
    badge: "bg-rose-600 text-rose-50",
    label: "警報あり",
    subLabel: "作業見直しレベル",
  },
  advisory: {
    container:
      "bg-[repeating-linear-gradient(135deg,rgba(250,204,21,0.22)_0,rgba(250,204,21,0.22)_6px,transparent_6px,transparent_12px)] border-amber-400/80",
    badge: "bg-amber-400 text-slate-900",
    label: "注意報あり",
    subLabel: "注意強化レベル",
  },
  none: {
    container: "bg-slate-900/70 border-slate-700",
    badge: "bg-emerald-400 text-slate-900",
    label: "発表なし",
    subLabel: "通常注意レベル",
  },
};

function alertVisual(kind: AlertVisualKind) {
  return ALERT_STYLE[kind];
}

export function WeatherAlertPanel({ data, status }: WeatherAlertPanelProps) {
  if (status === "loading") {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold tracking-wide text-slate-200">警報・注意報</p>
        <p className="mt-2 h-6 w-32 animate-pulse rounded bg-slate-700/80" />
        <p className="mt-3 h-4 w-4/5 animate-pulse rounded bg-slate-700/60" />
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-rose-500/80 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold tracking-wide text-rose-200">警報・注意報</p>
        <p className="mt-2 text-lg font-bold text-rose-50">自動の警報表示ができません</p>
        <p className="mt-2 text-sm leading-relaxed text-rose-100/90">
          画面はこのままで構いません。気象庁やレーダーなど
          <span className="font-semibold">公式な気象情報を別の端末で確認</span>
          し、暴風・大雨・雷が想定される場合は
          <span className="font-semibold">危険作業を止めて責任者判断を仰いでください。</span>
        </p>
      </section>
    );
  }

  const kind = classifyAlert(data);
  const visual = alertVisual(kind);

  if (!data || kind === "none") {
    return (
      <section className={`flex h-full flex-col rounded-2xl border p-4 ${visual.container}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-wide text-slate-100">警報・注意報</p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${visual.badge}`}>
            {visual.label} / {visual.subLabel}
          </span>
        </div>
        <p className="mt-3 text-lg font-semibold text-slate-50">現在、気象庁の警報・注意報は発表されていません</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-100/90">
          ただし、急な天候変化（突風・雷・局地的豪雨）には注意してください。
          空模様とレーダーを確認し、異常を感じたら
          <span className="font-semibold"> ただちに作業を中止し、退避と連絡を優先</span>
          してください。
        </p>
      </section>
    );
  }

  const warningItems = data.alerts.map((alert) => `${alert.type}`).join(" / ");

  return (
    <section className={`flex h-full flex-col rounded-2xl border p-4 ${visual.container}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-wide text-slate-100">警報・注意報</p>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${visual.badge}`}>
          {visual.label} / {visual.subLabel}
        </span>
      </div>
      <p className="mt-3 text-lg font-bold text-slate-50">
        {kind === "warning" ? "【警報】" : "【注意報】"} {warningItems}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-100/90">
        作業を開始・継続する前に、
        <span className="font-semibold">危険な工程の一時停止・退避ルート・連絡系統</span>
        を必ず確認してください。ハッチングが濃いほど
        <span className="font-semibold">「作業を見直すレベル」</span>
        のサインです。
      </p>
    </section>
  );
}

