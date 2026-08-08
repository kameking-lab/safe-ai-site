"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { signageLocations } from "@/data/signage-locations";
import { createApiWeatherRiskService } from "@/lib/services/weather-risk-service";
import type {
  OfficialWeatherWarningState,
  SiteRiskWeather,
} from "@/lib/types/domain";

const STALE_AFTER_MS = 15 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

type LoadState = "loading" | "success" | "error";

function isFreshTimestamp(value: string | null | undefined, now: number) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    timestamp <= now + FUTURE_TOLERANCE_MS &&
    now - timestamp <= STALE_AFTER_MS
  );
}

export function isHomeHeatWeatherStale(
  data: SiteRiskWeather | null,
  now = Date.now(),
) {
  if (
    !data ||
    data.dataOrigin !== "live" ||
    !isFreshTimestamp(data.forecastFetchedAt, now)
  ) {
    return true;
  }
  const todayJst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
  if (data.date !== todayJst) return true;
  if (
    data.officialWarning?.status === "live" &&
    !isFreshTimestamp(data.officialWarning.fetchedAt, now)
  ) {
    return true;
  }
  return false;
}

function formatFetchedAt(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "確認不能";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function warningLabel(
  warning: OfficialWeatherWarningState | null | undefined,
  stale: boolean,
) {
  if (stale) return "データが古いため確認不能";
  if (!warning || warning.status !== "live") return "取得不能・要公式確認";
  if (warning.warnings.length === 0) return "発表なし（取得済み）";
  const strongest = warning.warnings.some((item) => item.level === "special")
    ? "特別警報"
    : warning.warnings.some((item) => item.level === "warning")
      ? "警報"
      : "注意報";
  return `${strongest}の発表あり`;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
) {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? 5_000,
  );
  const { timeoutMs: _timeoutMs, ...requestInit } = init;
  try {
    return await fetch(input, {
      ...requestInit,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export function HomeHeatRiskStatus({
  todayJstLabel,
}: {
  todayJstLabel: string;
}) {
  const [regionName, setRegionName] = useState(
    signageLocations[0]?.regionName ?? "東京都 新宿区",
  );
  const [status, setStatus] = useState<LoadState>("loading");
  const [data, setData] = useState<SiteRiskWeather | null>(null);
  const [partialWarning, setPartialWarning] =
    useState<OfficialWeatherWarningState | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const service = useMemo(
    () => createApiWeatherRiskService(fetchWithTimeout),
    [],
  );

  const retry = useCallback(() => {
    setStatus("loading");
    setData(null);
    setPartialWarning(null);
    setCheckedAt(null);
    setRequestKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    void service.getTodaySiteRisk({ regionName }).then((result) => {
      if (!active) return;
      setCheckedAt(Date.now());
      if (!result.ok) {
        setPartialWarning(result.officialWarning ?? null);
        setStatus("error");
        return;
      }
      setData(result.data);
      setStatus("success");
    });
    return () => {
      active = false;
    };
  }, [regionName, requestKey, service]);

  const warning = data?.officialWarning ?? partialWarning;

  useEffect(() => {
    if (status !== "success" && warning?.status !== "live") return;
    const timer = window.setInterval(() => {
      setCheckedAt(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [status, warning]);

  const weatherStale =
    status === "success" &&
    (checkedAt === null || isHomeHeatWeatherStale(data, checkedAt));
  const partialWarningStale =
    status === "error" &&
    warning?.status === "live" &&
    (checkedAt === null ||
      !isFreshTimestamp(warning.fetchedAt, checkedAt));
  const stale = weatherStale || partialWarningStale;
  const warningUnavailable =
    status === "success" && (!warning || warning.status !== "live");
  const unavailable = status === "error" || stale || warningUnavailable;
  const statusLabel =
    status === "loading"
      ? "取得中・判定保留"
      : unavailable
        ? "確認不能・判定保留"
        : "WBGT未確認・要現場確認";

  return (
    <section
      aria-label="今日の暑熱データ状態"
      className="min-w-0 rounded-2xl border border-orange-300 bg-white/95 p-4 text-slate-950 shadow-sm [overflow-wrap:anywhere] dark:border-orange-800 dark:bg-slate-950/90 dark:text-white"
    >
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
          対象地域
          <select
            value={regionName}
            onChange={(event) => {
              setStatus("loading");
              setData(null);
              setPartialWarning(null);
              setCheckedAt(null);
              setRegionName(event.target.value);
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-sm font-bold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {signageLocations.map((location) => (
              <option key={location.id} value={location.regionName}>
                {location.label}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl bg-orange-50 px-3 py-2 dark:bg-orange-950/40">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            今日（JST）
          </p>
          <p className="mt-1 font-black [overflow-wrap:anywhere]">
            {todayJstLabel}
          </p>
        </div>
      </div>

      <dl
        aria-live="polite"
        className="mt-3 grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <dt className="text-xs font-bold text-slate-600 dark:text-slate-300">
            WBGT区分
          </dt>
          <dd className="mt-1 font-black [overflow-wrap:anywhere]">
            実測・推定とも未確認
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <dt className="text-xs font-bold text-slate-600 dark:text-slate-300">
            リスク状態
          </dt>
          <dd className="mt-1 font-black [overflow-wrap:anywhere]">
            {statusLabel}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <dt className="text-xs font-bold text-slate-600 dark:text-slate-300">
            JMA警報・注意報
          </dt>
          <dd className="mt-1 font-black [overflow-wrap:anywhere]">
            {status === "loading"
              ? "確認中"
              : warningLabel(warning, stale)}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <dt className="text-xs font-bold text-slate-600 dark:text-slate-300">
            データ取得時刻
          </dt>
          <dd className="mt-1 font-black [overflow-wrap:anywhere]">
            {status === "loading"
              ? "取得中"
              : formatFetchedAt(data?.forecastFetchedAt)}
          </dd>
        </div>
      </dl>

      {data && !unavailable ? (
        <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          <span>{`気温予報：${data.temperatureCelsius}℃`}</span>
          <span>{`／${data.overview}`}</span>
          <span className="ml-2 text-xs font-normal">
            ※気温予報はWBGTではありません
          </span>
        </p>
      ) : null}

      {unavailable ? (
        <div
          role="alert"
          data-warning-card="true"
          className="mt-3 flex items-start gap-2 rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm font-bold text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          取得できません。公式情報と現場の測定値を確認してください。
        </div>
      ) : null}

      <button
        type="button"
        onClick={retry}
        disabled={status === "loading"}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {status === "loading" ? "取得中" : "データを再取得"}
      </button>
    </section>
  );
}
