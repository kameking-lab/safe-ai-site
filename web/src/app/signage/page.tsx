"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AutoRefreshStatus } from "@/components/signage/auto-refresh-status";
import { JapanWeatherMap } from "@/components/signage/japan-weather-map";
import { SignageHeader } from "@/components/signage/signage-header";
import { SignageHourlyWeather } from "@/components/signage/signage-hourly-weather";
import { SignageShell } from "@/components/signage/signage-shell";
import type { JapanRegionId, MapAlertLevel } from "@/data/mock/japan-weather-map-mock";
import { todayRegionAlerts, weekMaxRegionAlerts } from "@/data/mock/japan-weather-map-mock";
import { newsLaborAccidentsMock } from "@/data/mock/signage-news-accidents";
import {
  buildSignageNewsUrl,
  getStoredNewsEngine,
  setStoredNewsEngine,
  type SignageNewsEngine,
} from "@/lib/signage-news-url";
import { createServices } from "@/lib/services/service-factory";
import type { LawRevision, SiteRiskWeather } from "@/lib/types/domain";
import type { SignageHourlyPoint, SignageWeatherApiResponse } from "@/lib/types/signage-weather";
import type { ApiMode, ServiceStatus } from "@/lib/types/api";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const REGION_STORAGE_KEY = "signage-weather-region";

type DashboardState = {
  mode: ApiMode;
  regionLabel: string;
  nowText: string;
  lastUpdatedText: string;
  riskStatus: ServiceStatus;
  riskData: SiteRiskWeather | null;
  lawStatus: ServiceStatus;
  lawRevisions: LawRevision[] | null;
};

export default function SignagePage() {
  const services = useMemo(() => createServices(), []);
  const regions = useMemo(() => services.weatherRisk.getAvailableRegions(), [services]);

  const [mapMode, setMapMode] = useState<"today" | "week">("today");
  const [selectedRegionName, setSelectedRegionName] = useState(() => regions[0]?.regionName ?? "東京都 新宿区");
  const [mapLevels, setMapLevels] = useState<Record<JapanRegionId, MapAlertLevel> | null>(null);
  const [hourly, setHourly] = useState<SignageHourlyPoint[]>([]);
  const [signageWeatherStatus, setSignageWeatherStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [newsEngine, setNewsEngine] = useState<SignageNewsEngine>("google");

  const [state, setState] = useState<DashboardState>(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const nowText = formatter.format(now);
    return {
      mode: services.mode,
      regionLabel: regions[0]?.label ?? "地域未選択",
      nowText,
      lastUpdatedText: nowText,
      riskStatus: "idle",
      riskData: null,
      lawStatus: "idle",
      lawRevisions: null,
    };
  });

  const topLaws = useMemo(() => {
    if (!state.lawRevisions?.length) return [];
    return [...state.lawRevisions].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5);
  }, [state.lawRevisions]);

  const fallbackLevels = mapMode === "today" ? todayRegionAlerts : weekMaxRegionAlerts;
  const displayLevels = mapLevels ?? fallbackLevels;
  const mapLabel = mapMode === "today" ? "本日（1時間予報ベース）" : "今後1週間（日次最大イメージ）";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(REGION_STORAGE_KEY);
    if (stored && regions.some((r) => r.regionName === stored)) {
      setSelectedRegionName(stored);
    }
    setNewsEngine(getStoredNewsEngine());
  }, [regions]);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updateNow = () => {
      setState((prev) => ({
        ...prev,
        nowText: formatter.format(new Date()),
      }));
    };

    updateNow();
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      updateNow();
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    async function refreshAll() {
      setState((prev) => ({
        ...prev,
        riskStatus: prev.riskStatus === "idle" ? "loading" : prev.riskStatus,
        lawStatus: prev.lawStatus === "idle" ? "loading" : prev.lawStatus,
      }));

      setSignageWeatherStatus((s) => (s === "idle" ? "loading" : s));
      const params = new URLSearchParams();
      params.set("mapMode", mapMode);
      params.set("regionName", selectedRegionName);
      const signagePromise = fetch(`/api/signage-weather?${params.toString()}`, { cache: "no-store" });

      const [riskResult, revisionResult, swRes] = await Promise.all([
        services.weatherRisk.getTodaySiteRisk({ regionName: selectedRegionName }),
        services.revision.getLawRevisions(),
        signagePromise,
      ]);

      if (cancelled) return;

      if (swRes.ok) {
        try {
          const data = (await swRes.json()) as SignageWeatherApiResponse;
          setMapLevels(data.mapLevels);
          setHourly(data.hourly);
          setSignageWeatherStatus("success");
        } catch {
          setSignageWeatherStatus("error");
          setMapLevels(null);
          setHourly([]);
        }
      } else {
        setSignageWeatherStatus("error");
        setMapLevels(null);
        setHourly([]);
      }

      if (cancelled) return;

      setState((prev) => {
        const next: DashboardState = { ...prev };
        const nowText = formatter.format(new Date());
        next.lastUpdatedText = nowText;

        if (riskResult.ok) {
          next.riskStatus = "success";
          next.riskData = riskResult.data;
          next.regionLabel = riskResult.data.regionName;
        } else {
          next.riskStatus = "error";
          next.riskData = null;
        }

        if (revisionResult.ok) {
          next.lawStatus = "success";
          next.lawRevisions = revisionResult.data;
        } else {
          next.lawStatus = "error";
          next.lawRevisions = null;
        }

        return next;
      });
    }

    void refreshAll();

    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void refreshAll();
    }, REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        void refreshAll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [services, selectedRegionName, mapMode]);

  const onRegionChange = (name: string) => {
    setSelectedRegionName(name);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REGION_STORAGE_KEY, name);
    }
    const opt = regions.find((r) => r.regionName === name);
    if (opt) {
      setState((prev) => ({ ...prev, regionLabel: opt.label }));
    }
  };

  const onNewsEngineChange = (engine: SignageNewsEngine) => {
    setNewsEngine(engine);
    setStoredNewsEngine(engine);
  };

  return (
    <SignageShell>
      <SignageHeader
        compact
        regionLabel={state.regionLabel}
        nowText={state.nowText}
        mode={state.mode}
        lastUpdatedText={state.lastUpdatedText}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden xl:grid-cols-12 xl:gap-3">
        <div className="flex min-h-0 flex-col gap-2 overflow-hidden xl:col-span-7">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMapMode("today")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm ${
                mapMode === "today"
                  ? "bg-emerald-500 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-200"
              }`}
            >
              本日
            </button>
            <button
              type="button"
              onClick={() => setMapMode("week")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm ${
                mapMode === "week"
                  ? "bg-emerald-500 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-200"
              }`}
            >
              1週間
            </button>
            <label className="ml-auto flex items-center gap-2 text-[10px] text-slate-300 sm:text-xs">
              <span className="whitespace-nowrap">地点</span>
              <select
                className="max-w-[200px] rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                value={selectedRegionName}
                onChange={(e) => onRegionChange(e.target.value)}
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.regionName}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]">
            <JapanWeatherMap
              levels={displayLevels}
              modeLabel={mapLabel}
              dataSourceNote={
                signageWeatherStatus === "success"
                  ? "地図の色は代表都市の Open-Meteo 予報から算出した目安です（気象庁の警報・注意報ではありません）。"
                  : signageWeatherStatus === "error"
                    ? "地図はフォールバック表示です。通信・API を確認してください。"
                    : undefined
              }
            />
            <SignageHourlyWeather
              hourly={hourly}
              regionLabel={selectedRegionName}
              status={signageWeatherStatus}
            />
          </div>
          {state.riskStatus === "error" && (
            <p className="shrink-0 text-[10px] text-amber-200 sm:text-xs">地点リスクの取得に失敗しました。</p>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-2 overflow-hidden xl:col-span-5 xl:min-h-0">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3">
            <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
              <h2 className="text-xs font-bold tracking-wide text-slate-100 sm:text-sm">労働災害関連ニュース（検索）</h2>
              <label className="flex items-center gap-1 text-[10px] text-slate-400">
                出典
                <select
                  className="rounded border border-slate-600 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-100"
                  value={newsEngine}
                  onChange={(e) => onNewsEngineChange(e.target.value as SignageNewsEngine)}
                >
                  <option value="google">Googleニュース</option>
                  <option value="yahoo">Yahoo!ニュース</option>
                  <option value="duckduckgo">DuckDuckGo</option>
                </select>
              </label>
            </div>
            <p className="mt-0.5 shrink-0 text-[9px] text-slate-400 sm:text-[10px]">
              見出しに基づくニュース検索へ遷移します（特定記事の捏造はしていません）。
            </p>
            <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
              {newsLaborAccidentsMock.map((item) => (
                <li key={item.id}>
                  <a
                    href={buildSignageNewsUrl(newsEngine, item.title, item.searchKeyword)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-left transition hover:border-emerald-600/80 hover:bg-slate-900 sm:rounded-xl sm:p-3"
                  >
                    <p className="text-[9px] text-slate-400 sm:text-[10px]">
                      {item.occurredOn} · {item.source}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-50 sm:text-base">{item.title}</p>
                    <p className="mt-1 text-[10px] font-semibold text-emerald-400 sm:text-xs">ニュースを検索 →</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3">
            <h2 className="shrink-0 text-xs font-bold tracking-wide text-slate-100 sm:text-sm">直近の法改正（5件・要約）</h2>
            {state.lawStatus === "loading" && (
              <div className="mt-2 space-y-2">
                <div className="h-5 w-full animate-pulse rounded bg-slate-700/80" />
                <div className="h-16 w-full animate-pulse rounded bg-slate-700/60" />
              </div>
            )}
            {state.lawStatus === "error" && (
              <p className="mt-2 text-xs text-rose-200">法改正一覧を表示できませんでした。</p>
            )}
            {state.lawStatus === "success" && topLaws.length === 0 && (
              <p className="mt-2 text-xs text-slate-300">表示できる法改正がありません。</p>
            )}
            <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
              {topLaws.map((rev) => (
                <li key={rev.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-2 sm:rounded-xl sm:p-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 sm:text-xs">
                    <span className="rounded-full bg-sky-600/90 px-2 py-0.5 font-semibold text-white">{rev.kind}</span>
                    <span>{rev.publishedAt}</span>
                    <span>{rev.issuer}</span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-50 sm:text-base">{rev.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200 sm:text-sm">{rev.summary || "要約は未設定です。"}</p>
                  {rev.source?.url ? (
                    <a
                      href={rev.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 sm:text-xs"
                    >
                      出典（{rev.source.label ?? rev.issuer}）を開く →
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <AutoRefreshStatus intervalMinutes={REFRESH_INTERVAL_MS / 60000} lastUpdatedText={state.lastUpdatedText} />
    </SignageShell>
  );
}
