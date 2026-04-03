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
    badge: "bg-emerald-600 text-white",
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

function formatAlertList(alerts: WeatherAlert[]) {
  if (alerts.length === 0) {
    return "警報・注意報なし";
  }
  return alerts.map((alert) => alert.type).join(" / ");
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
  availableRegions: {
    id: string;
    label: string;
    regionName: string;
  }[];
  selectedRegionName: string;
  onRegionChange: (regionName: string) => void;
  workType: WorkType;
  onWorkTypeChange: (workType: WorkType) => void;
};

export function WeatherRiskCard({
  data,
  status,
  errorMessage,
  availableRegions,
  selectedRegionName,
  onRegionChange,
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
          <label htmlFor="region-select-loading" className="block text-xs font-semibold text-slate-600">
            現場の地域を選択
          </label>
          <select
            id="region-select-loading"
            value={selectedRegionName}
            onChange={(event) => onRegionChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900"
          >
            {availableRegions.map((region) => (
              <option key={region.id} value={region.regionName}>
                {region.label}
              </option>
            ))}
          </select>
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
          <label htmlFor="region-select-error" className="block text-xs font-semibold text-rose-700">
            現場の地域を選択
          </label>
          <select
            id="region-select-error"
            value={selectedRegionName}
            onChange={(event) => onRegionChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-rose-300 bg-white px-3 py-3 text-base text-slate-900"
          >
            {availableRegions.map((region) => (
              <option key={region.id} value={region.regionName}>
                {region.label}
              </option>
            ))}
          </select>
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
        <p className="mt-1 text-xs text-slate-600">朝礼・KYで使う今日の注意点を表示します。</p>
        <div className="mt-3 space-y-3">
          <label htmlFor="region-select-empty" className="block text-xs font-semibold text-slate-600">
            現場の地域を選択
          </label>
          <select
            id="region-select-empty"
            value={selectedRegionName}
            onChange={(event) => onRegionChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900"
          >
            {availableRegions.map((region) => (
              <option key={region.id} value={region.regionName}>
                {region.label}
              </option>
            ))}
          </select>
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
        <p className="mt-2 text-sm text-slate-500">表示できるデータがありません。</p>
      </section>
    );
  }

  const style = riskStyle(data.riskLevel);
  const message = riskMessage(data.riskLevel);
  const briefingPoints = buildBriefingPoints(data, workType);

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
          リスク {data.riskLevel}
        </span>
      </div>

      <div
        className={`mt-3 rounded-xl border px-3 py-2.5 ${
          data.riskLevel === "高"
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
          <label htmlFor="region-select" className="block text-xs font-semibold text-slate-600">
            現場の地域
          </label>
          <p className="mt-1 text-xs text-slate-600">
            選んだ地域の天気・警報にもとづいて、注意点と行動指示が変わります。
          </p>
          <select
            id="region-select"
            value={selectedRegionName}
            onChange={(event) => onRegionChange(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none"
          >
            {availableRegions.map((region) => (
              <option key={region.id} value={region.regionName}>
                {region.label}
              </option>
            ))}
          </select>
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
          気温 {data.temperatureCelsius}℃ / 風 {data.windSpeedMs}m/s / 雨 {data.precipitationMm}mm
        </p>
        <p className="text-xs text-slate-600">
          警報・注意報: {formatAlertList(data.alerts)}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3">
        <p className="text-sm font-semibold text-slate-900">主な注意点（何に気をつけるか）</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.primaryCautions.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3">
        <p className="text-sm font-semibold text-slate-900">判定根拠（なぜこのリスクか）</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.riskEvidences.slice(0, 3).map((evidence) => (
            <li key={evidence}>{evidence}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3">
        <p className="text-sm font-semibold text-slate-900">推奨アクション（今すぐやること）</p>
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
