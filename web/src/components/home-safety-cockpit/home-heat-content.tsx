import type {
  EnvironmentNationalHeatAlertSummary,
  EnvironmentWbgtStatus,
  OfficialAlertState,
} from "@/lib/heat-illness/environment-wbgt";
import { HomeHeatActionsClient } from "./home-heat-actions-client";
import { HomeHeatSlideControls } from "./home-heat-slide-controls";
import type { HomeHeatSlideSummary } from "./home-types";

function alertLabel(state: OfficialAlertState): string {
  if (state === "active") return "発表中";
  if (state === "inactive") return "発表なし";
  if (state === "candidate") return "確認中";
  return "取得できません";
}

function heatActions(status: EnvironmentWbgtStatus): string[] {
  const value = status.wbgt.valueCelsius;
  const highRisk =
    status.alerts.heatAlert === "active" ||
    status.alerts.specialHeatAlert === "active" ||
    (typeof value === "number" && value >= 28);
  return highRisk
    ? ["休憩を増やし、単独作業を避ける", "水分・塩分と体調を互いに確認する"]
    : ["作業前に体調を確認する", "水分・塩分と休憩時刻を決める"];
}

function NationalHeatSummary({
  summary,
}: {
  summary: EnvironmentNationalHeatAlertSummary | null;
}) {
  const live = summary?.status === "live";
  return (
    <section
      aria-labelledby="national-heat-summary"
      className="rounded-2xl border-2 border-rose-600 bg-white p-3 text-slate-950 shadow-sm"
      data-heat-status={live ? "national-live" : "unavailable"}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div>
          <p className="text-xs font-black tracking-wider text-rose-800">
            {summary?.targetDate ?? "日付未確認"} JST
          </p>
          <h2 id="national-heat-summary" className="text-lg font-black">
            全国の状況
          </h2>
        </div>
        <span className="rounded-full border border-rose-700 bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-950">
          {live ? "全国の公式発表" : "取得できません"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="col-span-2 rounded-xl border border-amber-500 bg-amber-50 p-2.5">
          <p className="text-[11px] font-black">WBGT / 暑さ指数</p>
          <p className="text-3xl font-black">地域を選択</p>
        </div>
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5">
          <p className="text-[10px] font-black">熱中症警戒</p>
          <p className="mt-1 text-base font-black">
            {live ? `${summary.heatAlertPrefectureCount}都道府県` : "取得できません"}
          </p>
          <p className="text-[10px]">公式・発表数</p>
        </div>
        <div className="rounded-xl border border-purple-300 bg-purple-50 p-2.5">
          <p className="text-[10px] font-black">特別警戒</p>
          <p className="mt-1 text-base font-black">
            {live
              ? `${summary.specialHeatAlertPrefectureCount}都道府県`
              : "取得できません"}
          </p>
          <p className="text-[10px]">公式・発表数</p>
        </div>
      </div>
      {!live ? (
        <p
          role="alert"
          data-warning-card
          data-warning-trigger="upstream-unavailable"
          className="mt-2 text-xs font-bold text-rose-950"
        >
          取得できません。公式情報を確認してください。
        </p>
      ) : null}
      <a
        href="https://www.wbgt.env.go.jp/alert.php"
        target="_blank"
        rel="noopener noreferrer"
        data-primary-action="true"
        className="mt-1 inline-flex min-h-11 items-center text-xs font-black text-blue-900 underline underline-offset-4"
      >
        環境省の全国警戒状況を開く
      </a>
    </section>
  );
}

export function HomeHeatSnapshot({
  areaId,
  areaLabel,
  initialWbgt,
  nationalSummary,
}: {
  areaId: string | null;
  areaLabel: string | null;
  initialWbgt: EnvironmentWbgtStatus | null;
  nationalSummary: EnvironmentNationalHeatAlertSummary | null;
}) {
  const status =
    areaId && initialWbgt?.areaId === areaId ? initialWbgt : null;
  if (!areaId) return <NationalHeatSummary summary={nationalSummary} />;

  const wbgt = status?.wbgt ?? null;
  const usable =
    wbgt?.status === "estimated" &&
    typeof wbgt.valueCelsius === "number" &&
    !wbgt.stale;
  const stale = wbgt?.stale === true;
  const unavailable = !status || !usable;
  const actions = status
    ? heatActions(status)
    : ["作業場所でWBGTを実測する", "公式情報を確認して作業を判断する"];
  const displayLabel = status?.areaLabel ?? areaLabel ?? "選択した地域";

  return (
    <section
      aria-labelledby={`home-heat-status-${areaId}`}
      className={`rounded-2xl border-2 bg-white p-3 text-slate-950 shadow-sm sm:p-4 ${
        unavailable ? "border-amber-600" : "border-emerald-700"
      }`}
      data-heat-status={unavailable ? "degraded" : "ready"}
      data-area-id={areaId}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id={`home-heat-status-${areaId}`} className="text-lg font-black">
          {displayLabel}
        </h2>
        <span className="shrink-0 rounded-full border border-slate-500 bg-slate-50 px-2 py-1 text-[10px] font-black">
          {stale ? "情報が古い" : usable ? "推定値" : "取得できません"}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div
          className={`col-span-2 rounded-xl p-2.5 ${
            usable
              ? "bg-orange-950 text-white"
              : "border border-amber-500 bg-amber-50 text-amber-950"
          }`}
          data-wbgt-kind={wbgt?.status ?? "unavailable"}
        >
          <p className="text-[11px] font-black tracking-wider">WBGT / 暑さ指数</p>
          <p className="text-3xl font-black tabular-nums">
            {usable ? `${wbgt.valueCelsius!.toFixed(1)}℃` : "未確認"}
          </p>
          <p className="text-[10px] font-bold">
            {stale ? "情報が古いため現在値には使いません" : wbgt?.label ?? "取得できません"}
          </p>
        </div>
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5">
          <p className="text-[10px] font-black">熱中症警戒</p>
          <p className="mt-1 text-sm font-black">
            {status ? alertLabel(status.alerts.heatAlert) : "取得できません"}
          </p>
        </div>
        <div className="rounded-xl border border-purple-300 bg-purple-50 p-2.5">
          <p className="text-[10px] font-black">特別警戒</p>
          <p className="mt-1 text-sm font-black">
            {status ? alertLabel(status.alerts.specialHeatAlert) : "取得できません"}
          </p>
        </div>
      </div>

      {unavailable ? (
        <p
          role="alert"
          data-warning-card
          data-warning-trigger={stale ? "upstream-stale" : "upstream-unavailable"}
          className="mt-2 text-xs font-bold text-rose-950"
        >
          {stale ? "情報が古い。公式情報を確認。" : "取得できません。公式情報を確認。"}
        </p>
      ) : null}

      <section aria-labelledby={`home-heat-actions-${areaId}`} className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-2.5">
        <h3 id={`home-heat-actions-${areaId}`} className="text-sm font-black">
          今日行うこと
        </h3>
        <ul className="mt-1 grid gap-1 text-xs font-bold leading-5 text-slate-800">
          {actions.slice(0, 2).map((action) => (
            <li key={action}>・{action}</li>
          ))}
        </ul>
      </section>

      <div className="mt-2 flex flex-wrap gap-2" data-home-heat-actions="">
        <HomeHeatActionsClient areaId={areaId} wbgt={status} allowKy={usable} />
      </div>
    </section>
  );
}

export function HomeHeatSlideDeck({ slides }: { slides: HomeHeatSlideSummary[] }) {
  if (slides.length === 0) return null;
  return (
    <section
      aria-labelledby="home-heat-slides-title"
      className="rounded-2xl border-2 border-orange-500 bg-slate-950 p-3 text-white shadow-sm"
      data-home-heat-slide-deck=""
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="home-heat-slides-title" className="text-base font-black">
          熱中症スライド
        </h2>
        <span
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
          data-home-heat-slide-live=""
        >
          スライド 1 / {slides.length}: {slides[0]?.title}
        </span>
      </div>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="熱中症を防ぐ現場ブリーフィング"
        tabIndex={0}
        data-home-heat-slide-viewport=""
        className="mt-2 h-28 overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-orange-950 via-slate-950 to-cyan-950 p-2.5 focus-visible:ring-4 focus-visible:ring-orange-300"
      >
        {slides.map((slide, index) => (
          <article
            key={slide.id}
            hidden={index !== 0}
            aria-hidden={index !== 0}
            aria-label={`スライド${index + 1}、${slide.title}`}
            data-home-heat-slide=""
            data-home-heat-slide-title={slide.title}
            data-current-slide={index === 0 ? slide.id : undefined}
          >
            <p className="text-[10px] font-black tracking-widest text-cyan-300">
              {slide.eyebrow}
            </p>
            <h3 className="mt-0.5 text-base font-black leading-tight">{slide.title}</h3>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold leading-4 text-slate-100">
              {slide.lead}
            </p>
            <p className="mt-1 line-clamp-2 rounded-lg bg-white/10 p-1.5 text-[11px] font-bold leading-4">
              今日の確認：{slide.fieldAction}
            </p>
          </article>
        ))}
      </div>
      <div
        role="progressbar"
        aria-label="熱中症スライドの進捗"
        aria-valuemin={1}
        aria-valuemax={slides.length}
        aria-valuenow={1}
        data-home-heat-slide-progress=""
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"
      >
        <span
          data-home-heat-slide-progress-bar=""
          className="block h-full rounded-full bg-orange-400 motion-reduce:transition-none"
          style={{ width: `${100 / slides.length}%` }}
        />
      </div>
      <HomeHeatSlideControls total={slides.length} />
    </section>
  );
}
