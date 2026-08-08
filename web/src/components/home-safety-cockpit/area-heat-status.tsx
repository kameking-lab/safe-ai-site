"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Droplets,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  ThermometerSun,
} from "lucide-react";
import type { EnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";
import type { WeatherRiskApiResponse } from "@/lib/types/api";
import { parseWeatherRiskApiPayload } from "@/lib/services/weather-risk-service";
import { officialAreaCandidateById } from "@/lib/area/official-area-resolver";
import { trackHomeCockpitEvent } from "@/lib/home-cockpit-telemetry";
import { KyHandoffLink } from "@/components/ky-handoff-link";
import { combineKyWeatherPayloads } from "@/lib/ky/weather-prefill-v2";

type LoadState = "idle" | "loading" | "ready" | "degraded" | "unavailable";

type HeatStatusState = {
  loadState: LoadState;
  weather: WeatherRiskApiResponse | null;
  wbgt: EnvironmentWbgtStatus | null;
  weatherFailed: boolean;
  wbgtFailed: boolean;
};

const INITIAL_STATE: HeatStatusState = {
  loadState: "idle",
  weather: null,
  wbgt: null,
  weatherFailed: false,
  wbgtFailed: false,
};

const WEATHER_STALE_AFTER_MS = 20 * 60 * 1000;

function isEnvironmentWbgtStatus(
  value: unknown,
  expectedAreaId: string,
): value is EnvironmentWbgtStatus {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EnvironmentWbgtStatus>;
  return (
    candidate.areaId === expectedAreaId &&
    candidate.provider === "環境省 熱中症予防情報サイト" &&
    typeof candidate.retrievedAt === "string" &&
    Number.isFinite(Date.parse(candidate.retrievedAt)) &&
    candidate.wbgt !== undefined &&
    (candidate.wbgt.status === "estimated" ||
      candidate.wbgt.status === "unavailable") &&
    Number.isInteger(candidate.wbgt.stationCount) &&
    candidate.wbgt.stationCount >= 0 &&
    Number.isInteger(candidate.wbgt.expectedStationCount) &&
    candidate.wbgt.expectedStationCount >= candidate.wbgt.stationCount &&
    candidate.alerts !== undefined &&
    ["active", "inactive", "candidate", "unavailable"].includes(
      candidate.alerts.heatAlert,
    ) &&
    ["active", "inactive", "candidate", "unavailable"].includes(
      candidate.alerts.specialHeatAlert,
    )
  );
}

function formatJstDateTime(value: string | number | null): string {
  if (value === null) return "確認中";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) return "確認不能";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatOptionalJstDateTime(
  value: string | number | null | undefined,
): string {
  return value === null || value === undefined
    ? "確認不能"
    : formatJstDateTime(value);
}

function alertLabel(
  state: EnvironmentWbgtStatus["alerts"]["heatAlert"] | undefined,
  kind: "heat" | "special",
): string {
  if (state === "active") return "発表中";
  if (state === "candidate")
    return kind === "special" ? "判定段階（発表ではない）" : "確認中";
  if (state === "inactive") return "発表なし（取得時点）";
  return "取得不能";
}

function jmaLabel(
  official: WeatherRiskApiResponse["officialWarning"] | undefined,
): string {
  if (!official) return "取得不能";
  if (official.status === "unresolved") return "地点未解決・公式確認";
  if (official.status === "unavailable") return "取得不能";
  if (official.status === "degraded") return "一部取得・公式確認";
  if (official.warnings.length === 0) return "発表なし（取得時点）";
  if (official.warnings.some((warning) => warning.level === "special")) {
    return "特別警報あり";
  }
  if (official.warnings.some((warning) => warning.level === "warning")) {
    return "警報あり";
  }
  return "注意報あり";
}

function useJstClock(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function buildHeatActions({
  wbgt,
  heatAlert,
  specialHeatAlert,
  unavailable,
}: {
  wbgt: number | null;
  heatAlert: EnvironmentWbgtStatus["alerts"]["heatAlert"] | undefined;
  specialHeatAlert:
    | EnvironmentWbgtStatus["alerts"]["specialHeatAlert"]
    | undefined;
  unavailable: boolean;
}) {
  const highRisk =
    specialHeatAlert === "active" ||
    heatAlert === "active" ||
    (wbgt !== null && wbgt >= 28);
  if (unavailable) {
    return [
      {
        kind: "法令",
        text: "異常時の報告体制と措置手順を、作業前に全員で確認",
        icon: ShieldAlert,
      },
      {
        kind: "現場確認",
        text: "作業地点のWBGTを実測し、未確認のまま安全と判断しない",
        icon: ThermometerSun,
      },
      {
        kind: "行政推奨",
        text: "日陰・冷房のある休憩場所と水分・塩分を確保",
        icon: Droplets,
      },
    ] as const;
  }
  return [
    {
      kind: "法令",
      text: "異常時の報告体制と措置手順を、作業前に全員で確認",
      icon: ShieldAlert,
    },
    highRisk
      ? {
          kind: "行政推奨",
          text: "休憩間隔と作業時間を見直し、単独作業を避ける",
          icon: ClipboardCheck,
        }
      : {
          kind: "行政推奨",
          text: "作業開始前の体調確認と、定期的な水分・塩分補給",
          icon: Droplets,
        },
    {
      kind: "現場確認",
      text: "表示は地域内の推定値。作業地点ではWBGT実測器で確認",
      icon: ThermometerSun,
    },
  ] as const;
}

export function AreaHeatStatus({
  areaId,
  compact = false,
  showDetailLink = true,
  refreshSignal = 0,
  initialWbgt = null,
  locationContextLabel,
  headingLevel = 3,
}: {
  areaId: string | null;
  compact?: boolean;
  showDetailLink?: boolean;
  refreshSignal?: number;
  initialWbgt?: EnvironmentWbgtStatus | null;
  locationContextLabel?: string;
  headingLevel?: 2 | 3;
}) {
  const [state, setState] = useState<HeatStatusState>(() =>
    initialWbgt && initialWbgt.areaId === areaId
      ? {
          loadState: "degraded",
          weather: null,
          wbgt: initialWbgt,
          weatherFailed: true,
          wbgtFailed: false,
        }
      : INITIAL_STATE,
  );
  const [manualRefresh, setManualRefresh] = useState(0);
  const now = useJstClock();
  const area = useMemo(
    () => (areaId ? officialAreaCandidateById(areaId) : null),
    [areaId],
  );
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const ActionHeading = headingLevel === 2 ? "h3" : "h4";

  const refresh = useCallback(() => {
    setManualRefresh((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    if (!areaId || !area) {
      queueMicrotask(() => {
        if (active) setState(INITIAL_STATE);
      });
      return () => {
        active = false;
      };
    }
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!active) return;
      setState((current) =>
        current.wbgt?.areaId === areaId
          ? {
              ...current,
              loadState: "degraded",
              weatherFailed: true,
            }
          : {
              loadState: "loading",
              weather: null,
              wbgt: null,
              weatherFailed: false,
              wbgtFailed: false,
            },
      );
    });

    const requestJson = async (url: string) => {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("upstream_unavailable");
      return (await response.json()) as unknown;
    };

    const reuseInitialWbgt =
      manualRefresh === 0 &&
      refreshSignal === 0 &&
      initialWbgt?.areaId === areaId;
    void Promise.allSettled([
      requestJson(`/api/weather-risk?area=${encodeURIComponent(areaId)}`),
      reuseInitialWbgt
        ? Promise.resolve(initialWbgt)
        : requestJson(`/api/wbgt?area=${encodeURIComponent(areaId)}`),
    ]).then(([weatherResult, wbgtResult]) => {
      if (controller.signal.aborted) return;
      const weather =
        weatherResult.status === "fulfilled"
          ? parseWeatherRiskApiPayload(weatherResult.value)
          : null;
      const fetchedWbgt =
        wbgtResult.status === "fulfilled" &&
        isEnvironmentWbgtStatus(wbgtResult.value, areaId)
          ? wbgtResult.value
          : null;
      setState((current) => {
        const wbgt =
          fetchedWbgt ??
          (current.wbgt?.areaId === areaId ? current.wbgt : null);
        const weatherFailed = !weather;
        const wbgtFailed = !wbgt;
        const degraded =
          weatherFailed ||
          wbgtFailed ||
          wbgt?.degraded === true ||
          !weather?.current ||
          weather?.officialWarning.status !== "live";
        return {
          loadState:
            weatherFailed && wbgtFailed
              ? "unavailable"
              : degraded
                ? "degraded"
                : "ready",
          weather,
          wbgt,
          weatherFailed,
          wbgtFailed,
        };
      });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [area, areaId, initialWbgt, manualRefresh, refreshSignal]);

  if (!areaId || !area) {
    return (
      <div
        className="flex min-h-28 flex-col rounded-2xl border border-dashed border-slate-400 bg-white/90 p-3 text-slate-800 max-[339px]:p-2 sm:p-4 lg:h-full"
        data-heat-status="area-unselected"
        role="status"
      >
        <p className="font-black">地域未選択</p>
        <div className="my-4 hidden flex-1 content-center gap-2 lg:grid lg:grid-cols-3">
          <div className="col-span-3 rounded-xl bg-slate-900 p-4 text-white">
            <p className="text-xs font-black">WBGT / 暑さ指数</p>
            <p className="mt-1 text-4xl font-black">未確認</p>
            <p className="mt-1 text-xs">実測・推定とも未確認</p>
          </div>
          {[
            ["熱中症警戒", "未確認"],
            ["特別警戒", "未確認"],
            ["JMA警報", "未確認"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-300 bg-slate-50 p-3"
            >
              <p className="text-xs font-black">{label}</p>
              <p className="mt-1 text-lg font-black">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs leading-5 max-[339px]:leading-4 lg:text-sm lg:leading-6">
          地域を選択してください。
        </p>
      </div>
    );
  }

  const wbgt = state.wbgt?.wbgt;
  const weather = state.weather;
  const weatherAge =
    now !== null && weather
      ? now - Date.parse(weather.fetchedAt)
      : Number.POSITIVE_INFINITY;
  const weatherStale =
    !Number.isFinite(weatherAge) ||
    weatherAge < -5 * 60 * 1000 ||
    weatherAge > WEATHER_STALE_AFTER_MS;
  const wbgtUsable =
    wbgt?.status === "estimated" &&
    wbgt.valueCelsius !== null &&
    !wbgt.stale;
  const fullyUnavailable = state.loadState === "unavailable";
  const recommendations = buildHeatActions({
    wbgt: wbgtUsable ? (wbgt?.valueCelsius ?? null) : null,
    heatAlert: state.wbgt?.alerts.heatAlert,
    specialHeatAlert: state.wbgt?.alerts.specialHeatAlert,
    unavailable:
      fullyUnavailable ||
      !wbgtUsable ||
      state.wbgt?.alerts.heatAlert === "unavailable" ||
      state.wbgt?.alerts.specialHeatAlert === "unavailable",
  });
  const visibleRecommendations = recommendations.slice(0, 2);
  const detailedRecommendations = recommendations.slice(2);
  const handoffWeather = combineKyWeatherPayloads({
    areaId,
    weather: state.weather,
    wbgt: state.wbgt,
    ...(now === null ? {} : { now: new Date(now) }),
  });

  return (
    <section
      aria-labelledby={`area-heat-status-${areaId}`}
      className={`rounded-2xl border-2 bg-white text-slate-950 shadow-sm lg:h-full ${
        compact ? "p-3" : "p-3 sm:p-4"
      } ${
        fullyUnavailable
          ? "border-rose-500"
          : state.loadState === "degraded" || wbgt?.stale || weatherStale
            ? "border-amber-500"
            : "border-emerald-700"
      }`}
      data-heat-status={state.loadState}
      data-area-id={areaId}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <Heading
            id={`area-heat-status-${areaId}`}
            className="text-lg font-black"
          >
            {area.label}
          </Heading>
          <span
            className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${
              state.loadState === "ready"
                ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                : state.loadState === "loading"
                  ? "border-sky-600 bg-sky-50 text-sky-900"
                  : state.loadState === "degraded"
                    ? "border-amber-600 bg-amber-50 text-amber-950"
                    : "border-rose-700 bg-rose-50 text-rose-950"
            }`}
          >
            {state.loadState === "loading"
              ? "取得中"
              : state.loadState === "ready"
                ? "取得済み"
                : state.loadState === "degraded"
                  ? "一部を確認できません"
                  : "取得できません"}
          </span>
        </div>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">
            {area.resolutionLabel}
          </p>
          {locationContextLabel ? (
            <p className="mt-1 inline-flex rounded-full border border-slate-400 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-800">
              {locationContextLabel}
            </p>
          ) : null}
      </div>

      {state.loadState === "loading" ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 min-h-28 animate-pulse rounded-xl bg-slate-100 p-4 motion-reduce:animate-none"
        >
          WBGT・警戒情報を取得しています。
        </div>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div
              className={`col-span-2 rounded-xl p-2.5 sm:col-span-2 ${
                wbgtUsable
                  ? "bg-orange-950 text-white"
                  : "border border-amber-500 bg-amber-50 text-amber-950"
              }`}
              data-wbgt-kind={wbgt?.status ?? "unavailable"}
            >
              <p className="text-[11px] font-black tracking-wider">
                WBGT / 暑さ指数
              </p>
              <p className="text-3xl font-black tabular-nums">
                {wbgtUsable && wbgt?.valueCelsius !== null
                  ? `${wbgt.valueCelsius.toFixed(1)}℃`
                  : "未確認"}
              </p>
              <p className="text-[11px] font-bold leading-4">
                {wbgt?.stale
                  ? "情報が古いため現在値に使いません"
                  : wbgt?.label ?? "取得できません"}
              </p>
              <p className="text-[10px]">
                実測: 未確認 ／ 推定: {wbgtUsable ? "表示中" : "未確認"}
              </p>
            </div>
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5">
              <p className="text-[11px] font-black text-rose-900">
                熱中症警戒
              </p>
              <p className="mt-0.5 text-xs font-black text-rose-950">
                {alertLabel(state.wbgt?.alerts.heatAlert, "heat")}
              </p>
              <span className="mt-1 inline-block text-[10px] font-bold text-rose-800">
                公式
              </span>
            </div>
            <div className="rounded-xl border border-purple-300 bg-purple-50 p-2.5">
              <p className="text-[11px] font-black text-purple-900">
                特別警戒
              </p>
              <p className="mt-0.5 text-xs font-black text-purple-950">
                {alertLabel(state.wbgt?.alerts.specialHeatAlert, "special")}
              </p>
              <span className="mt-1 inline-block text-[10px] font-bold text-purple-800">
                公式
              </span>
            </div>
          </div>

          {(fullyUnavailable ||
            state.loadState === "degraded" ||
            wbgt?.stale ||
            weatherStale) && (
            <p
              role="alert"
              data-warning-card
              className="mt-2 text-xs font-bold leading-5 text-rose-950"
            >
              {fullyUnavailable
                ? "取得できません。公式情報を確認してください。"
                : wbgt?.stale || weatherStale
                  ? "情報が古いため、公式情報を確認してください。"
                  : "一部を確認できません。公式情報を確認してください。"}
            </p>
          )}

          <section
            aria-labelledby={`heat-actions-${areaId}`}
            className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-2.5"
          >
            <ActionHeading
              id={`heat-actions-${areaId}`}
              className="text-sm font-black text-slate-950"
            >
              今日の注意点
            </ActionHeading>
            <ul className="mt-1 grid gap-1">
              {visibleRecommendations.map(({ kind, text, icon: Icon }) => (
                <li key={`${kind}-${text}`} className="flex items-start gap-2">
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-orange-800"
                    aria-hidden="true"
                  />
                  <p className="text-xs font-bold leading-4 text-slate-800">
                    <span className="mr-1 rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-700">
                      {kind}
                    </span>
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {showDetailLink && (
          <Link
            href={`/risk?area=${encodeURIComponent(areaId)}`}
            prefetch={false}
            onClick={() =>
              trackHomeCockpitEvent("home_wbgt_detail_open", {
                action_type: "area",
                destination_route_template: "/risk",
              })
            }
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-black text-white hover:bg-emerald-900"
            data-wbgt-detail-link=""
          >
            詳細
          </Link>
        )}
        {wbgtUsable ? (
        <KyHandoffLink
          handoff={{
            source: "heat",
            areaId,
            ...(handoffWeather ? { weather: handoffWeather } : {}),
            hazardIds: ["heat-illness"],
          }}
          prefetch={false}
          data-primary-action="true"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-emerald-800 bg-white px-4 py-2 text-sm font-black text-emerald-900"
        >
          この暑さでKYを作る
        </KyHandoffLink>
        ) : null}
      </div>

      <details className="mt-1 text-xs leading-5">
        <summary className="min-h-11 cursor-pointer py-3 font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300">
          詳細な観測情報
        </summary>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-sky-50 p-2.5 text-sky-950">
            <p className="text-[10px] font-black">気温</p>
            <p className="mt-1 text-base font-black tabular-nums">
              {!weatherStale && weather?.current
                ? `${weather.current.temperatureCelsius.toFixed(1)}℃`
                : "未確認"}
            </p>
            <p className="text-[10px]">Open-Meteo推定</p>
          </div>
          <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-950">
            <p className="text-[10px] font-black">湿度</p>
            <p className="mt-1 text-base font-black tabular-nums">
              {!weatherStale && weather?.current
                ? `${weather.current.relativeHumidityPercent}%`
                : "未確認"}
            </p>
            <p className="text-[10px]">Open-Meteo推定</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-2.5 text-slate-950">
            <p className="text-[10px] font-black">JMA警報・注意報</p>
            <p className="mt-1 text-xs font-black">
              {jmaLabel(weather?.officialWarning)}
            </p>
            <p className="text-[10px]">気象庁 公式</p>
          </div>
        </div>
        {detailedRecommendations.length > 0 ? (
          <div className="mb-2 rounded-xl bg-orange-50 p-2 text-orange-950">
            <p className="font-black">追加の注意点</p>
            {detailedRecommendations.map(({ kind, text }) => (
              <p key={`${kind}-${text}`} className="mt-1">
                {kind}：{text}
              </p>
            ))}
          </div>
        ) : null}
        <dl className="grid gap-1 sm:grid-cols-[7rem_1fr]">
          <dt className="font-bold">現在時刻</dt>
          <dd>JST {formatJstDateTime(now)}</dd>
          <dt className="font-bold">WBGT対象時刻</dt>
          <dd>{formatOptionalJstDateTime(wbgt?.targetAt)} JST</dd>
          <dt className="font-bold">WBGT取得時刻</dt>
          <dd>{formatOptionalJstDateTime(state.wbgt?.retrievedAt)} JST</dd>
          <dt className="font-bold">熱中症警戒 対象日</dt>
          <dd>{state.wbgt?.alerts.targetDate ?? "確認不能"}</dd>
          <dt className="font-bold">熱中症警戒 発表時刻</dt>
          <dd>
            {formatOptionalJstDateTime(state.wbgt?.alerts.reportAt)} JST
          </dd>
          <dt className="font-bold">気象対象時刻</dt>
          <dd>{formatOptionalJstDateTime(weather?.current?.targetAt)} JST</dd>
          <dt className="font-bold">気象取得時刻</dt>
          <dd>{formatOptionalJstDateTime(weather?.fetchedAt)} JST</dd>
          <dt className="font-bold">区域・適用範囲</dt>
          <dd>{state.wbgt?.scopeLabel ?? area.scopeLabel}</dd>
          <dt className="font-bold">提供元</dt>
          <dd>
            環境省（WBGT・熱中症警戒情報）／気象庁（警報・注意報）／
            Open-Meteo（気温・湿度の補助推定）
          </dd>
          <dt className="font-bold">状態の説明</dt>
          <dd>
            {state.loadState === "ready"
              ? "更新済み"
              : state.loadState === "loading"
                ? "取得中"
                : state.loadState === "degraded"
                  ? "一部を確認できません"
                  : "取得できません"}
          </dd>
        </dl>
        <div className="mt-2 flex flex-wrap gap-3">
          <a
            href="https://www.wbgt.env.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-bold text-blue-900 underline underline-offset-4"
          >
            環境省の公式情報
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <a
            href="https://www.jma.go.jp/bosai/warning/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-bold text-blue-900 underline underline-offset-4"
          >
            気象庁の公式情報
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={state.loadState === "loading"}
          className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-black text-slate-900 disabled:cursor-wait disabled:opacity-60"
        >
          {state.loadState === "loading" ? (
            <ThermometerSun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
          再取得
        </button>
      </details>
    </section>
  );
}

/**
 * /risk already owns the Open-Meteo/JMA request. This WBGT-only companion
 * avoids fetching those sources a second time on the destination page.
 */
export function OfficialWbgtStatus({
  areaId,
  onStatusChange,
}: {
  areaId: string;
  onStatusChange?: (value: EnvironmentWbgtStatus | null) => void;
}) {
  const [status, setStatus] = useState<
    | { kind: "loading"; data: null }
    | { kind: "ready" | "degraded"; data: EnvironmentWbgtStatus }
    | { kind: "unavailable"; data: null }
  >({ kind: "loading", data: null });
  const [refreshSequence, setRefreshSequence] = useState(0);

  useEffect(() => {
    onStatusChange?.(status.data);
  }, [onStatusChange, status.data]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (active) setStatus({ kind: "loading", data: null });
    });
    void fetch(`/api/wbgt?area=${encodeURIComponent(areaId)}`, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as unknown;
      })
      .then((value) => {
        if (controller.signal.aborted) return;
        if (!isEnvironmentWbgtStatus(value, areaId)) {
          setStatus({ kind: "unavailable", data: null });
          return;
        }
        setStatus({
          kind: value.degraded ? "degraded" : "ready",
          data: value,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus({ kind: "unavailable", data: null });
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [areaId, refreshSequence]);

  const wbgt = status.data?.wbgt;
  const usable =
    wbgt?.status === "estimated" &&
    wbgt.valueCelsius !== null &&
    !wbgt.stale;
  return (
    <section
      aria-labelledby="official-wbgt-status-title"
      className={`rounded-2xl border-2 p-4 ${
        status.kind === "ready"
          ? "border-orange-700 bg-orange-50"
          : status.kind === "loading"
            ? "border-sky-500 bg-sky-50"
            : "border-amber-600 bg-amber-50"
      }`}
      data-risk-wbgt-status={status.kind}
    >
      <div className="flex items-start gap-3">
        <ThermometerSun
          className="mt-0.5 h-6 w-6 shrink-0 text-orange-900"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h3
            id="official-wbgt-status-title"
            className="font-black text-orange-950"
          >
            環境省WBGT・熱中症警戒情報
          </h3>
          {status.kind === "degraded" && (
            <p
              role="alert"
              data-warning-card
              className="mt-2 text-sm font-black text-amber-950"
            >
              一部を確認できません。公式情報を確認してください。
            </p>
          )}
          {status.kind === "loading" ? (
            <p role="status" className="mt-2 text-sm">
              公式提供データを取得しています。
            </p>
          ) : status.data ? (
            <>
              <p
                className="mt-2 text-3xl font-black tabular-nums text-orange-950"
                data-wbgt-kind={wbgt?.status}
              >
                {usable ? `${wbgt.valueCelsius?.toFixed(1)}℃` : "未確認"}
              </p>
              <p className="mt-1 text-sm font-bold text-orange-950">
                {wbgt?.stale
                  ? "情報が古いため現在値に使いません"
                  : wbgt?.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-orange-950">
                実測: 未確認 ／ 推定: {usable ? "表示中" : "未確認"} ／
                熱中症警戒: {alertLabel(status.data.alerts.heatAlert, "heat")} ／
                特別警戒:{" "}
                {alertLabel(status.data.alerts.specialHeatAlert, "special")}
              </p>
              <p className="mt-2 text-xs leading-5 text-orange-900">
                対象時刻 {formatOptionalJstDateTime(wbgt?.targetAt)} JST ／
                取得時刻{" "}
                {formatOptionalJstDateTime(status.data.retrievedAt)} JST
              </p>
              <p className="mt-1 text-xs leading-5 text-orange-900">
                警戒情報の対象日{" "}
                {status.data.alerts.targetDate ?? "確認不能"} ／ 発表時刻{" "}
                {formatOptionalJstDateTime(status.data.alerts.reportAt)} JST
              </p>
              <p className="mt-2 text-xs leading-5 text-orange-900">
                {status.data.scopeLabel}
              </p>
            </>
          ) : (
            <p role="alert" data-warning-card className="mt-2 text-sm font-bold text-amber-950">
              取得できません。公式情報を確認してください。
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRefreshSequence((value) => value + 1)}
              disabled={status.kind === "loading"}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-orange-800 bg-white px-4 py-2 text-sm font-black text-orange-950 disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              再取得
            </button>
            <a
              href="https://www.wbgt.env.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 px-2 py-2 text-sm font-black text-blue-900 underline underline-offset-4"
            >
              環境省で確認
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
