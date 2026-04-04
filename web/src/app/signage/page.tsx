"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AutoRefreshStatus } from "@/components/signage/auto-refresh-status";
import { JapanWeatherMap } from "@/components/signage/japan-weather-map";
import { SignageHeader } from "@/components/signage/signage-header";
import { SignageShell } from "@/components/signage/signage-shell";
import { todayRegionAlerts, weekMaxRegionAlerts } from "@/data/mock/japan-weather-map-mock";
import { newsLaborAccidentsMock } from "@/data/mock/signage-news-accidents";
import { createServices } from "@/lib/services/service-factory";
import type { LawRevision, SiteRiskWeather } from "@/lib/types/domain";
import type { ApiMode, ServiceStatus } from "@/lib/types/api";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

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
  const [mapMode, setMapMode] = useState<"today" | "week">("today");
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
      regionLabel: services.weatherRisk.getAvailableRegions()[0]?.label ?? "地域未選択",
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

  const mapLevels = mapMode === "today" ? todayRegionAlerts : weekMaxRegionAlerts;
  const mapLabel = mapMode === "today" ? "本日" : "今後1週間（最大リスクイメージ）";

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

      const [riskResult, revisionResult] = await Promise.all([
        services.weatherRisk.getTodaySiteRisk(),
        services.revision.getLawRevisions(),
      ]);

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
  }, [services]);

  return (
    <SignageShell>
      <SignageHeader
        regionLabel={state.regionLabel}
        nowText={state.nowText}
        mode={state.mode}
        lastUpdatedText={state.lastUpdatedText}
      />

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMapMode("today")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                mapMode === "today"
                  ? "bg-emerald-500 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-200"
              }`}
            >
              本日の予想
            </button>
            <button
              type="button"
              onClick={() => setMapMode("week")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                mapMode === "week"
                  ? "bg-emerald-500 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-200"
              }`}
            >
              今後1週間の予想
            </button>
          </div>
          <JapanWeatherMap levels={mapLevels} modeLabel={mapLabel} />
          {state.riskStatus === "error" && (
            <p className="text-sm text-amber-200">地域リスクの取得に失敗しましたが、地図モックは表示しています。</p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-slate-600 bg-slate-900/90 p-4">
            <h2 className="text-sm font-bold tracking-wide text-slate-100">報道ベースの労働災害（参考）</h2>
            <p className="mt-1 text-[11px] text-slate-400">クリックで公開情報ページへ（モックURL）。朝礼での注意喚起に。</p>
            <ul className="mt-3 space-y-3">
              {newsLaborAccidentsMock.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-left transition hover:border-emerald-600/80 hover:bg-slate-900"
                  >
                    <p className="text-[11px] text-slate-400">
                      {item.occurredOn} · {item.source}
                    </p>
                    <p className="mt-1 text-base font-semibold leading-snug text-slate-50">{item.title}</p>
                    <p className="mt-2 text-xs font-semibold text-emerald-400">詳細を開く →</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-600 bg-slate-900/90 p-4">
            <h2 className="text-sm font-bold tracking-wide text-slate-100">直近の法改正（5件・要約）</h2>
            {state.lawStatus === "loading" && (
              <div className="mt-4 space-y-2">
                <div className="h-6 w-full animate-pulse rounded bg-slate-700/80" />
                <div className="h-20 w-full animate-pulse rounded bg-slate-700/60" />
              </div>
            )}
            {state.lawStatus === "error" && (
              <p className="mt-3 text-sm text-rose-200">法改正一覧を表示できませんでした。</p>
            )}
            {state.lawStatus === "success" && topLaws.length === 0 && (
              <p className="mt-3 text-sm text-slate-300">表示できる法改正がありません。</p>
            )}
            <ul className="mt-4 space-y-4">
              {topLaws.map((rev) => (
                <li key={rev.id} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-sky-600/90 px-2 py-0.5 font-semibold text-white">{rev.kind}</span>
                    <span>{rev.publishedAt}</span>
                    <span>{rev.issuer}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-50">{rev.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-200">{rev.summary || "要約は未設定です。"}</p>
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
