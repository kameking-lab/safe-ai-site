"use client";

import { OfficialAreaCombobox } from "@/components/official-area-combobox";
import type { SiteRiskWeather, WeatherAlert } from "@/lib/types/domain";

type WorkType = "高所作業" | "電気作業" | "足場作業" | "一般作業";

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
    badge: "bg-emerald-800 text-white",
    border: "border-emerald-300",
    bg: "bg-emerald-50/80",
    title: "text-emerald-900",
  };
}

function riskMessage(level: SiteRiskWeather["riskLevel"]) {
  if (level === "高") {
    return {
      title: "本日は高リスク日です",
      description: "危険工程は開始前に中止基準を確認してください。",
    };
  }
  if (level === "中") {
    return {
      title: "本日は注意が必要です",
      description: "手順の再確認と重点監視を強めてください。",
    };
  }
  return {
    title: "本日は通常確認を継続",
    description: "通常のKYを行い、変化時はすぐ共有してください。",
  };
}

function formatForecastSignalList(alerts: WeatherAlert[]) {
  if (alerts.length === 0) {
    return "独自目安の該当なし（気象庁の警報・注意報なしを意味しません）";
  }
  return alerts.map((alert) => alert.type).join(" / ");
}

function formatOfficialWarning(data: SiteRiskWeather) {
  const official = data.officialWarning;
  if (!official || official.status === "unavailable") {
    return "確認不能（取得失敗または応答不明）";
  }
  if (official.status === "degraded") {
    return "確認不能（取得データが古い、または一部取得失敗）";
  }
  if (official.status === "unresolved") {
    return "地点単位の確認未対応。気象庁公式ページで地域を選択してください";
  }
  if (official.warnings.length === 0) {
    return "取得成功・選択地域に発表中の警報等なし";
  }
  return official.warnings
    .map((warning) => `気象庁コード${warning.code}（${warning.status}）`)
    .join(" / ");
}

function buildBriefingPoints(
  data: SiteRiskWeather,
  workType: WorkType
): string[] {
  const baseAttention = data.primaryCautions[0] ?? "通常の安全確認を継続";
  const baseAction = data.recommendedActions[0] ?? "作業前ミーティングを実施";

  const header =
    data.riskLevel === "高"
      ? "本日は気象条件から高リスクです。危険工程は無理に進めず、中止・延期も含めて判断してください。"
      : data.riskLevel === "中"
        ? "本日は注意が必要なコンディションです。重点箇所を決めて監視を強めてください。"
        : "大きな気象リスクは低めですが、いつもどおり変化に気づける体制を保ってください。";

  if (workType === "高所作業") {
    return [
      header,
      `注意点: ${baseAttention}／特に墜落・飛来落下に注意し、足場・親綱・フルハーネスを再点検してください。`,
      `指示: ${baseAction}／高所作業は「中止基準」と「風速・雨量の限度」を朝礼で具体的に共有してください。`,
    ];
  }

  if (workType === "電気作業") {
    return [
      header,
      `注意点: ${baseAttention}／濡れた手・濡れた床での作業を避け、仮設分電盤やコードの損傷を重点確認してください。`,
      `指示: ${baseAction}／停電時の手順と感電時の対応（送電停止・救助要領）を30秒で全員に復唱させてください。`,
    ];
  }

  if (workType === "足場作業") {
    return [
      header,
      `注意点: ${baseAttention}／足場の揺れ・沈み・緩み、シートのはためきに着目して確認してください。`,
      `指示: ${baseAction}／足場使用前に「責任者立会いで一周点検」を行い、異常があれば使用を止めて報告させてください。`,
    ];
  }

  // 一般作業
  return [
    header,
    `注意点: ${baseAttention}／移動・運搬・工具の取り扱いで転倒・挟まれが起きやすいポイントを共有してください。`,
    `指示: ${baseAction}／「おかしい」と感じたらすぐに作業を止めて声を出すことを、今日の合言葉として決めてください。`,
  ];
}

type WeatherRiskCardProps = {
  data: SiteRiskWeather | null;
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string | null;
  selectedAreaId: string | null;
  onAreaChange: (areaId: string) => void;
  workType: WorkType;
  onWorkTypeChange: (workType: WorkType) => void;
};

export function WeatherRiskCard({
  data,
  status,
  errorMessage,
  selectedAreaId,
  onAreaChange,
  workType,
  onWorkTypeChange,
}: WeatherRiskCardProps) {
  if (status === "loading") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="今日の現場リスク">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">今日の現場リスク</h2>
            <p className="mt-1 text-xs text-slate-600">
              朝礼前に地域と作業内容を選んで、今日の注意点を確認してください。
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            切替中
          </span>
        </div>
        <div className="mt-3 space-y-3">
          <OfficialAreaCombobox
            id="region-search-loading"
            label="現場の地域を検索"
            selectedAreaId={selectedAreaId}
            onSelect={(candidate) => onAreaChange(candidate.id)}
          />
        </div>
        <div>
          <label htmlFor="worktype-select-loading" className="block text-xs font-semibold text-slate-600">
            今日の主な作業
          </label>
          <select
            id="worktype-select-loading"
            value={workType}
            onChange={(event) => onWorkTypeChange(event.target.value as WorkType)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="高所作業">高所作業</option>
            <option value="電気作業">電気作業</option>
            <option value="足場作業">足場作業</option>
            <option value="一般作業">一般作業</option>
          </select>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          地域と作業内容にあわせて、最新のリスクと朝礼要点を読み込み中です。
        </p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm sm:p-5" aria-label="今日の現場リスク">
        <h2 className="text-base font-bold text-rose-900 sm:text-lg">今日の現場リスク</h2>
        <p className="mt-1 text-xs text-rose-800">地域を変えると再取得されます。</p>
        <div className="mt-3 space-y-3">
          <OfficialAreaCombobox
            id="region-search-error"
            label="現場の地域を検索"
            selectedAreaId={selectedAreaId}
            onSelect={(candidate) => onAreaChange(candidate.id)}
          />
        </div>
        <div>
          <label htmlFor="worktype-select-error" className="block text-xs font-semibold text-rose-700">
            今日の主な作業
          </label>
          <select
            id="worktype-select-error"
            value={workType}
            onChange={(event) => onWorkTypeChange(event.target.value as WorkType)}
            className="mt-1 w-full rounded-lg border border-rose-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="高所作業">高所作業</option>
            <option value="電気作業">電気作業</option>
            <option value="足場作業">足場作業</option>
            <option value="一般作業">一般作業</option>
          </select>
        </div>
        <p className="mt-2 text-sm text-rose-700">{errorMessage ?? "天気・警報リスクを取得できませんでした。"}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="今日の現場リスク">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">今日の現場リスク</h2>
        <div className="mt-3 space-y-3">
          <OfficialAreaCombobox
            id="region-search-empty"
            label="現場の地域を検索"
            selectedAreaId={selectedAreaId}
            onSelect={(candidate) => onAreaChange(candidate.id)}
          />
        </div>
        <div>
          <label htmlFor="worktype-select-empty" className="block text-xs font-semibold text-slate-600">
            今日の主な作業
          </label>
          <select
            id="worktype-select-empty"
            value={workType}
            onChange={(event) => onWorkTypeChange(event.target.value as WorkType)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="高所作業">高所作業</option>
            <option value="電気作業">電気作業</option>
            <option value="足場作業">足場作業</option>
            <option value="一般作業">一般作業</option>
          </select>
        </div>
      </section>
    );
  }

  const decisionReady =
    data.dataOrigin === "live" && data.officialWarning?.status === "live";
  const style = decisionReady
    ? riskStyle(data.riskLevel)
    : {
        badge: "bg-slate-700 text-white",
        border: "border-amber-400",
        bg: "bg-amber-50/80",
        title: "text-amber-950",
      };
  const message = decisionReady
    ? riskMessage(data.riskLevel)
    : {
        title: "公式情報を確認してください",
        description:
          data.dataOrigin === "synthetic"
            ? "開発用の架空データです。"
            : "一部を確認できません。",
      };
  const briefingPoints = decisionReady
    ? buildBriefingPoints(data, workType)
    : [
        "気象庁の公式情報を確認",
        "現場の測定値を確認",
      ];

  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${style.border} ${style.bg}`}
      aria-label="今日の現場リスク"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className={`text-base font-bold sm:text-lg ${style.title}`}>今日の現場リスク</h2>
          <p className="mt-1 text-xs text-slate-700">法改正チェック前に、まず現場の当日リスクを確認できます。</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${style.badge}`}>
          {decisionReady ? `リスク ${data.riskLevel}` : "一部を確認できません"}
        </span>
      </div>

      <div
        className={`mt-3 rounded-xl border px-3 py-2.5 ${
          !decisionReady
            ? "border-amber-400 bg-amber-100/80"
            : data.riskLevel === "高"
            ? "border-rose-300 bg-rose-100/80"
            : data.riskLevel === "中"
              ? "border-amber-300 bg-amber-100/80"
              : "border-emerald-300 bg-emerald-100/80"
        }`}
      >
        <p className="text-sm font-bold text-slate-900">{message.title}</p>
        <p className="mt-0.5 text-xs text-slate-700">{message.description}</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <OfficialAreaCombobox
            id="region-search"
            label="現場の地域を検索"
            selectedAreaId={selectedAreaId}
            onSelect={(candidate) => onAreaChange(candidate.id)}
            helpText="選んだ地域の天気・警報にもとづいて、注意点と行動指示が変わります。"
          />
        </div>
        <div>
          <label htmlFor="worktype-select" className="block text-xs font-semibold text-slate-600">
            今日の主な作業
          </label>
          <p className="mt-1 text-xs text-slate-600">
            作業内容にあわせて、「朝礼で伝える要点」が自動で切り替わります。
          </p>
          <select
            id="worktype-select"
            value={workType}
            onChange={(event) => onWorkTypeChange(event.target.value as WorkType)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="高所作業">高所作業</option>
            <option value="電気作業">電気作業</option>
            <option value="足場作業">足場作業</option>
            <option value="一般作業">一般作業</option>
          </select>
        </div>
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
          本日の予想最高気温 {data.temperatureCelsius}℃ / 予想最大風速 {data.windSpeedMs}m/s /
          予想降水量合計 {data.precipitationMm}mm
        </p>
        <p className="text-xs text-slate-600">
          Open-Meteo予報からの独自目安: {formatForecastSignalList(data.alerts)}
        </p>
        <div className="mt-2 rounded-lg border border-sky-300 bg-sky-50 p-2.5 text-xs leading-5 text-slate-800">
          <p>
            <span className="font-bold">気象庁の公式警報:</span>{" "}
            {formatOfficialWarning(data)}
          </p>
          <p className="mt-1 text-slate-600">
            公式取得: {data.officialWarning?.fetchedAt ?? "未取得"} ／
            対象発表: {data.officialWarning?.reportAt ?? "未確認"}
          </p>
          <a
            href={
              data.officialWarning?.sourceUrl ??
              "https://www.jma.go.jp/bosai/warning/"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center font-bold text-sky-900 underline"
          >
            気象庁で最新の警報・注意報を確認
          </a>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          予報提供元: {data.forecastProvider === "open-meteo" ? "Open-Meteo" : "架空サンプル"}
          {" ／ "}取得: {data.forecastFetchedAt ?? "未取得"}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3">
        <p className="text-sm font-semibold text-slate-900">
          {decisionReady ? "主な注意点（何に気をつけるか）" : "予報からの参考注意点（公式警報確認前）"}
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.primaryCautions.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3">
        <p className="text-sm font-semibold text-slate-900">
          {decisionReady ? "判定根拠（なぜこのリスクか）" : "独自予報の参考情報"}
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.riskEvidences.slice(0, 3).map((evidence) => (
            <li key={evidence}>{evidence}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3">
        <p className="text-sm font-semibold text-slate-900">
          {decisionReady ? "推奨アクション（今すぐやること）" : "公式確認までに行うこと"}
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.recommendedActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>

      <div
        className={`mt-3 rounded-xl border p-3 ${
          data.riskLevel === "高"
            ? "border-rose-400 bg-rose-50/90"
            : "border-sky-200 bg-sky-50/80"
        }`}
      >
        <p className="text-sm font-semibold text-sky-900">朝礼で伝える要点（30秒）</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-sky-900">
          {briefingPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
