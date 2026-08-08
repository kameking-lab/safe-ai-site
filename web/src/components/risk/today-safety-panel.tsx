"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { ClipboardCheck, RefreshCw, ThermometerSun } from "lucide-react";
import {
  getSignageLocationById,
} from "@/data/signage-locations";
import { EvidenceCard } from "@/components/evidence/evidence-card";
import { WeatherRiskCard } from "@/components/weather-risk-card";
import { createApiWeatherRiskService } from "@/lib/services/weather-risk-service";
import type {
  OfficialWeatherWarningState,
  SiteRiskWeather,
} from "@/lib/types/domain";
import type { EvidenceRecord } from "@/lib/evidence/types";
import { OfficialWbgtStatus } from "@/components/home-safety-cockpit/area-heat-status";
import { KyHandoffLink } from "@/components/ky-handoff-link";
import { officialAreaCandidateById } from "@/lib/area/official-area-resolver";
import type { EnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";
import type { KyWeatherSnapshot } from "@/lib/ky/zero-friction-types";
import { formatJmaWarning, jmaWarningName } from "@/lib/jma/warning-label";
import { UsageNotesLink } from "@/components/usage-notes-link";

const WEATHER_STALE_AFTER_MS = 15 * 60 * 1000;
const FUTURE_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;

type WorkType = "高所作業" | "電気作業" | "足場作業" | "一般作業";
type LoadState = "idle" | "loading" | "success" | "error";

export function riskUrlWithArea(currentUrl: string, areaId: string): string {
  const url = new URL(currentUrl, "https://www.anzen-ai-portal.jp");
  url.searchParams.set("area", areaId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildWeatherEvidenceRecord({
  data,
  status,
  stale,
  regionName,
}: {
  data: SiteRiskWeather | null;
  status: LoadState;
  stale: boolean;
  regionName: string;
}): EvidenceRecord {
  const unavailable = status === "error";
  const freshness: EvidenceRecord["freshness"] = unavailable
    ? "unavailable"
    : stale
      ? "stale"
      : status === "success"
        ? "current"
        : "unknown";

  return {
    id: "today-weather-evidence",
    informationKind: "estimate",
    primarySources: [
      {
        registryId: "jma-warning",
        title: "気象庁 防災情報（警報・注意報）",
        publisher: "気象庁",
        url:
          data?.officialWarning?.sourceUrl ??
          "https://www.jma.go.jp/bosai/warning/",
        role: "公式警報・注意報の正本。最終判断は気象庁の最新表示で確認します。",
      },
    ],
    secondarySources: [
      {
        registryId: "open-meteo",
        title: "Open-Meteo Weather API",
        publisher: "Open-Meteo",
        url: "https://open-meteo.com/",
        role: "気温・風・降水の補助予報。気象庁警報や現場実測の代替ではありません。",
      },
    ],
    legalPosition:
      "気象情報と補助予報です。法令の適用判断、作業可否、現場実測を置き換えません。",
    asOf: data?.date ?? null,
    promulgatedAt: null,
    effectiveAt: null,
    retrievedAt: data?.forecastFetchedAt ?? null,
    humanReviewedAt: null,
    dataVersion:
      data?.forecastProvider === "open-meteo"
        ? "Open-Meteo取得応答（版番号なし）"
        : null,
    scope: regionName
      ? `${regionName}として利用者が選択した地域の表示`
      : "地域未選択のため表示保留",
    exclusions: [
      "地点固有のWBGT・風速・路面・作業環境の実測",
      "作業条件を踏まえた責任者の作業可否判断",
      "警報取得不能時の『警報なし』判定",
    ],
    aiGenerated: false,
    humanReviewRequired: true,
    freshness,
    verification: unavailable ? "unverified" : "sourceLocated",
    supersededBy: null,
    corrections: [],
  };
}

export function isWeatherRiskStale(
  data: SiteRiskWeather | null,
  nowMs: number,
): boolean {
  if (!data || data.dataOrigin !== "live" || !data.forecastFetchedAt) return true;
  const targetMs = Date.parse(`${data.date}T00:00:00+09:00`);
  const normalizedTarget = Number.isFinite(targetMs)
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(targetMs))
    : "";
  const todayJst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
  if (normalizedTarget !== data.date || data.date !== todayJst) return true;
  const forecastMs = Date.parse(data.forecastFetchedAt);
  if (
    !Number.isFinite(forecastMs) ||
    forecastMs > nowMs + FUTURE_CLOCK_TOLERANCE_MS ||
    nowMs - forecastMs > WEATHER_STALE_AFTER_MS
  ) {
    return true;
  }

  if (data.officialWarning?.status === "live") {
    const officialMs = Date.parse(data.officialWarning.fetchedAt ?? "");
    if (
      !Number.isFinite(officialMs) ||
      officialMs > nowMs + FUTURE_CLOCK_TOLERANCE_MS ||
      nowMs - officialMs > WEATHER_STALE_AFTER_MS
    ) {
      return true;
    }
  }
  return false;
}

export function shouldShowRiskResultActions(
  selectedAreaId: string | null,
  status: LoadState,
  data: SiteRiskWeather | null,
): boolean {
  return Boolean(selectedAreaId && status === "success" && data);
}

export function shouldShowRiskKyHandoff(
  selectedAreaId: string | null,
  status: LoadState,
  data: SiteRiskWeather | null,
  stale: boolean,
): boolean {
  return !stale && shouldShowRiskResultActions(selectedAreaId, status, data);
}

export function isRiskKyWeatherHandoffReady(
  snapshot: KyWeatherSnapshot | null,
): boolean {
  return Boolean(
    snapshot &&
      snapshot.availability === "estimated" &&
      !snapshot.stale &&
      !snapshot.degraded,
  );
}

export function buildRiskKyWeatherSnapshot(input: {
  areaId: string;
  data: SiteRiskWeather | null;
  wbgt: EnvironmentWbgtStatus | null;
  stale: boolean;
}): KyWeatherSnapshot | null {
  const area = officialAreaCandidateById(input.areaId);
  const data = input.data;
  if (
    !area ||
    !data ||
    data.dataOrigin !== "live" ||
    !data.forecastFetchedAt ||
    !Number.isFinite(Date.parse(data.forecastFetchedAt))
  ) {
    return null;
  }
  const wbgtValue = input.wbgt?.wbgt;
  const hasWbgt =
    wbgtValue?.status === "estimated" &&
    typeof wbgtValue.valueCelsius === "number";
  const wbgtStale = wbgtValue?.stale === true;
  const warningStatus = data.officialWarning?.status ?? "unavailable";
  const degraded =
    !hasWbgt ||
    input.wbgt?.degraded === true ||
    warningStatus !== "live";
  const stale = input.stale || wbgtStale;
  return {
    areaId: area.id,
    areaLabel: area.label,
    resolutionLabel: area.resolutionLabel,
    weather: data.overview || null,
    temperatureCelsius:
      data.currentTemperatureCelsius ?? data.temperatureCelsius,
    relativeHumidityPercent: data.relativeHumidityPercent ?? null,
    windSpeedMs: data.windSpeedMs,
    precipitationMm: data.precipitationMm,
    wbgtCelsius: hasWbgt ? wbgtValue.valueCelsius : null,
    wbgtKind: hasWbgt ? "estimated" : "unavailable",
    heatAlert: input.wbgt?.alerts.heatAlert ?? "unavailable",
    specialHeatAlert:
      input.wbgt?.alerts.specialHeatAlert ?? "unavailable",
    warningStatus,
    warnings: (data.officialWarning?.warnings ?? []).map((warning) => ({
      ...warning,
      name: jmaWarningName(warning.code),
    })),
    targetAt: data.weatherTargetAt ?? null,
    targetDate: data.weatherTargetAt ? null : data.date,
    fetchedAt: data.forecastFetchedAt,
    wbgtTargetAt: wbgtValue?.targetAt ?? null,
    wbgtRetrievedAt: input.wbgt?.retrievedAt ?? null,
    providers: [
      "Open-Meteo（気象グリッド推定）",
      ...(input.wbgt ? [input.wbgt.provider] : []),
      ...(data.officialWarning ? ["気象庁 防災情報"] : []),
    ],
    availability: stale ? "stale" : degraded ? "degraded" : "estimated",
    stale,
    degraded,
    manuallyEditedFields: [],
  };
}

function formatJstDateTime(now: Date | null) {
  if (!now) return "読み込み後に表示";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

function subscribeClock(onStoreChange: () => void) {
  const timer = window.setInterval(onStoreChange, CLOCK_TICK_MS);
  return () => window.clearInterval(timer);
}

function getClockSnapshot() {
  // 分表示のため分境界で固定し、同一render中にsnapshotが変動しないようにする。
  return Math.floor(Date.now() / 60_000) * 60_000;
}

function getServerClockSnapshot(): number | null {
  // サーバー時刻をHTMLへ焼き込むとhydration時にずれるため、初期HTMLは明示的な保留表示。
  return null;
}

export function WbgtMeasurementStatus() {
  return (
    <section
      aria-labelledby="wbgt-measurement-status-title"
      className="rounded-2xl border border-orange-400 bg-orange-50 p-4"
    >
      <div className="flex items-start gap-3">
        <ThermometerSun
          className="mt-0.5 h-6 w-6 shrink-0 text-orange-800"
          aria-hidden="true"
        />
        <div>
          <h3
            id="wbgt-measurement-status-title"
            className="font-bold text-orange-950"
          >
            WBGTは実測・推定とも未確認
          </h3>
          <p className="mt-1 text-sm leading-6 text-orange-950">公式情報と現場の測定値を確認してください。</p>
          <a
            href="https://www.wbgt.env.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-orange-700 bg-white px-4 py-2 text-sm font-bold text-orange-950 underline underline-offset-4 hover:bg-orange-100"
          >
            環境省 熱中症予防情報サイトで地域の暑さ指数を確認
          </a>
        </div>
      </div>
    </section>
  );
}

async function fetchWithClientTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
) {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? 8_000;
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const relayAbort = () => controller.abort();
  init.signal?.addEventListener("abort", relayAbort, { once: true });
  const { timeoutMs: _timeoutMs, ...requestInit } = init;

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    window.clearTimeout(timer);
    init.signal?.removeEventListener("abort", relayAbort);
  }
}

export function TodaySafetyPanel({
  initialAreaId,
}: {
  initialAreaId?: string | null;
} = {}) {
  const initialLocation =
    initialAreaId ? getSignageLocationById(initialAreaId) : undefined;
  const [selectedAreaId, setSelectedAreaId] = useState(
    initialLocation?.id ?? null,
  );
  const [selectedRegionName, setSelectedRegionName] = useState(
    initialLocation?.regionName ?? "",
  );
  const [workType, setWorkType] = useState<WorkType>("一般作業");
  const [data, setData] = useState<SiteRiskWeather | null>(null);
  const [wbgtHandoff, setWbgtHandoff] =
    useState<EnvironmentWbgtStatus | null>(null);
  const [partialOfficialWarning, setPartialOfficialWarning] =
    useState<OfficialWeatherWarningState | null>(null);
  const [status, setStatus] = useState<LoadState>(
    initialLocation ? "loading" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const nowMs = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getServerClockSnapshot,
  );

  const service = useMemo(
    () => createApiWeatherRiskService(fetchWithClientTimeout),
    [],
  );
  const selectedResolution = useMemo(
    () =>
      selectedAreaId
        ? officialAreaCandidateById(selectedAreaId)
        : null,
    [selectedAreaId],
  );
  const onWbgtStatusChange = useCallback(
    (value: EnvironmentWbgtStatus | null) => {
      setWbgtHandoff(value?.areaId === selectedAreaId ? value : null);
    },
    [selectedAreaId],
  );

  const refresh = useCallback(() => {
    if (!selectedAreaId) {
      setStatus("idle");
      setErrorMessage("地域を選択してください。");
      return;
    }
    setStatus("loading");
    setErrorMessage(null);
    setPartialOfficialWarning(null);
    setRefreshSequence((value) => value + 1);
  }, [selectedAreaId]);

  const changeArea = useCallback((areaId: string) => {
    const location = getSignageLocationById(areaId);
    setData(null);
    setWbgtHandoff(null);
    setErrorMessage(null);
    setPartialOfficialWarning(null);
    if (location) {
      setStatus("loading");
      setSelectedAreaId(location.id);
      setSelectedRegionName(location.regionName);
      window.history.replaceState(
        window.history.state,
        "",
        riskUrlWithArea(window.location.href, location.id),
      );
    } else {
      setSelectedAreaId(null);
      setSelectedRegionName("");
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    const refreshTimer = window.setInterval(refresh, 5 * 60_000);
    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!selectedAreaId || !selectedRegionName) {
      return;
    }
    let active = true;

    void service.getTodaySiteRisk({ areaId: selectedAreaId }).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setData(null);
        setStatus("error");
        setErrorMessage(result.error.message);
        setPartialOfficialWarning(result.officialWarning ?? null);
        return;
      }
      setData(result.data);
      setPartialOfficialWarning(null);
      setStatus("success");
    });

    return () => {
      active = false;
    };
  }, [refreshSequence, selectedAreaId, selectedRegionName, service]);

  const stale =
    status === "success" &&
    isWeatherRiskStale(data, nowMs ?? getClockSnapshot());
  const displayData = useMemo(() => {
    if (!data || !stale) return data;
    return {
      ...data,
      officialWarning: data.officialWarning
        ? { ...data.officialWarning, status: "degraded" as const }
        : undefined,
    };
  }, [data, stale]);

  const handoffHazardIds = [
    ...(workType === "高所作業" || workType === "足場作業"
      ? ["fall-scaffold"]
      : []),
    ...(workType === "電気作業" ? ["electric-shock"] : []),
    ...((data?.temperatureCelsius ?? 0) >= 30 ? ["heat-illness"] : []),
    ...((data?.windSpeedMs ?? 0) >= 10 ? ["wind-panel"] : []),
    ...((data?.precipitationMm ?? 0) > 0 ? ["slip-wet"] : []),
  ];
  const handoffWeather = selectedAreaId
    ? buildRiskKyWeatherSnapshot({
        areaId: selectedAreaId,
        data: displayData,
        wbgt: wbgtHandoff,
        stale,
      })
    : null;
  const resultReady = shouldShowRiskResultActions(
    selectedAreaId,
    status,
    displayData,
  );
  const handoffReady =
    shouldShowRiskKyHandoff(
      selectedAreaId,
      status,
      displayData,
      stale,
    ) && isRiskKyWeatherHandoffReady(handoffWeather);

  return (
    <section aria-labelledby="today-safety-title" className="space-y-4">
      <div>
        <h2 id="today-safety-title" className="sr-only">今日の安全を確認</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">
              {formatJstDateTime(nowMs === null ? null : new Date(nowMs))} JST
            </p>
          </div>
        {selectedAreaId ? (
          <button
            type="button"
            onClick={refresh}
            disabled={status === "loading"}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {status === "loading" ? "再取得中" : "気象・警報を再取得"}
          </button>
        ) : null}
        </div>
        {stale ? (
          <p
            className="mt-2 text-sm font-bold text-rose-900"
            role="alert"
            data-warning-card=""
            aria-live="polite"
          >
            情報が古いため、公式情報を確認してください。
          </p>
        ) : null}
        {selectedResolution && (
          <p
            className="mt-2 text-sm font-bold text-sky-950"
            data-risk-area-resolution=""
          >
            {selectedResolution.resolutionLabel}
          </p>
        )}
      </div>

      {status === "error" &&
      partialOfficialWarning?.warnings &&
      partialOfficialWarning.warnings.length > 0 ? (
        <section
          aria-labelledby="partial-jma-warning-title"
          role="alert"
          className="rounded-2xl border-2 border-rose-500 bg-rose-50 p-4 text-rose-950 shadow-sm sm:p-5"
        >
          <h3 id="partial-jma-warning-title" className="text-base font-bold sm:text-lg">
            気象庁の警報は取得できています
          </h3>
          <p className="mt-1 text-sm leading-6">
            予報を取得できません。最新状態は気象庁で確認してください。
          </p>
          <ul className="mt-3 space-y-1 text-sm font-semibold">
            {partialOfficialWarning.warnings.map((warning) => (
              <li key={`${warning.code}-${warning.status}`}>
                {formatJmaWarning(warning)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-5">
            取得時刻: {partialOfficialWarning.fetchedAt ?? "確認不能"} ／
            発表対象時刻: {partialOfficialWarning.reportAt ?? "確認不能"}
          </p>
          <a
            href={partialOfficialWarning.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center font-bold underline underline-offset-2"
          >
            気象庁の警報・注意報を確認する
          </a>
        </section>
      ) : null}

      <WeatherRiskCard
        data={displayData}
        status={status}
        errorMessage={errorMessage}
        selectedAreaId={selectedAreaId}
        onAreaChange={changeArea}
        workType={workType}
        onWorkTypeChange={setWorkType}
      />

      {selectedAreaId && status !== "idle" && status !== "loading" ? (
        <details className="rounded-xl border border-slate-200 bg-white px-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">出典と取得時刻</summary>
          <div className="pb-3">
            <EvidenceCard
              evidence={buildWeatherEvidenceRecord({
                data,
                status,
                stale,
                regionName: selectedRegionName,
              })}
              heading="気象・警報データの根拠と状態"
            />
          </div>
        </details>
      ) : null}

      {resultReady && selectedAreaId ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <OfficialWbgtStatus
            areaId={selectedAreaId}
            onStatusChange={onWbgtStatusChange}
          />

          {handoffReady ? (
          <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <ClipboardCheck
                className="mt-0.5 h-6 w-6 shrink-0 text-emerald-800"
                aria-hidden="true"
              />
              <div>
                <h3 className="font-bold text-emerald-950">確認結果をKYへ引き継ぐ</h3>
                <p className="mt-1 text-sm leading-6 text-emerald-950">
                  選択した地域と作業を入力済みの状態で始めます。
                </p>
                <KyHandoffLink
                  handoff={{
                    source: "risk",
                    areaId: selectedAreaId,
                    ...(handoffWeather ? { weather: handoffWeather } : {}),
                    workCategory:
                      workType === "高所作業" || workType === "足場作業"
                        ? "construction"
                        : "unknown",
                    hazardIds: handoffHazardIds,
                    workDraft: workType,
                  }}
                  className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-900"
                >
                  この条件でKYを作る
                </KyHandoffLink>
              </div>
            </div>
          </section>
          ) : null}
        </div>
      ) : null}

      <UsageNotesLink className="text-brand-primary" />
    </section>
  );
}
