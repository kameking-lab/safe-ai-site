import type { SiteRiskWeather, WeatherAlert } from "@/lib/types/domain";

function riskStyle(level: SiteRiskWeather["riskLevel"]) {
  if (level === "高") {
    return {
      badge: "bg-rose-600 text-white",
      border: "border-rose-300",
      bg: "bg-rose-50/80",
      title: "text-rose-900",
    };
  }
  if (level === "中") {
    return {
      badge: "bg-amber-500 text-white",
      border: "border-amber-300",
      bg: "bg-amber-50/80",
      title: "text-amber-900",
    };
  }
  return {
    badge: "bg-emerald-600 text-white",
    border: "border-emerald-300",
    bg: "bg-emerald-50/80",
    title: "text-emerald-900",
  };
}

function formatAlertList(alerts: WeatherAlert[]) {
  if (alerts.length === 0) {
    return "警報・注意報なし";
  }
  return alerts.map((alert) => alert.type).join(" / ");
}

type WeatherRiskCardProps = {
  data: SiteRiskWeather | null;
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string | null;
};

export function WeatherRiskCard({ data, status, errorMessage }: WeatherRiskCardProps) {
  if (status === "loading") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="今日の現場リスク">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">今日の現場リスク</h2>
        <p className="mt-2 text-sm text-slate-500">天気・警報データを確認中です...</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm sm:p-5" aria-label="今日の現場リスク">
        <h2 className="text-base font-bold text-rose-900 sm:text-lg">今日の現場リスク</h2>
        <p className="mt-2 text-sm text-rose-700">{errorMessage ?? "天気・警報リスクを取得できませんでした。"}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="今日の現場リスク">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">今日の現場リスク</h2>
        <p className="mt-2 text-sm text-slate-500">表示できるデータがありません。</p>
      </section>
    );
  }

  const style = riskStyle(data.riskLevel);

  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${style.border} ${style.bg}`}
      aria-label="今日の現場リスク"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`text-base font-bold sm:text-lg ${style.title}`}>今日の現場リスク</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}>
          リスク {data.riskLevel}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <p>
          <span className="font-semibold">地域:</span> {data.regionName}
        </p>
        <p>
          <span className="font-semibold">日付:</span> {data.date}
        </p>
        <p>
          <span className="font-semibold">天気:</span> {data.overview}
        </p>
        <p className="text-xs text-slate-600">
          気温 {data.temperatureCelsius}℃ / 風 {data.windSpeedMs}m/s / 雨 {data.precipitationMm}mm
        </p>
        <p className="text-xs text-slate-600">
          警報・注意報: {formatAlertList(data.alerts)}
        </p>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-900">主な注意点</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.primaryCautions.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-900">判定根拠</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.riskEvidences.slice(0, 3).map((evidence) => (
            <li key={evidence}>{evidence}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-900">推奨アクション</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.recommendedActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
