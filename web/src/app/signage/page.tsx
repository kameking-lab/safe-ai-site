"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AutoRefreshStatus } from "@/components/signage/auto-refresh-status";
import { JapanPrefectureWarningMap } from "@/components/signage/japan-prefecture-warning-map";
import { SignageHeader } from "@/components/signage/signage-header";
import { SignageFeaturedGoods } from "@/components/signage/signage-featured-goods";
import { SignageHourlyStrip } from "@/components/signage/signage-hourly-strip";
import { SignageRiskPrediction } from "@/components/signage/signage-risk-prediction";
import { SignageShell } from "@/components/signage/signage-shell";
import { SignageTodayDocuments } from "@/components/signage/signage-today-documents";
import { getSignageLocationById, signageLocations } from "@/data/signage-locations";
import { createServices } from "@/lib/services/service-factory";
import type { SignageDataApiResponse } from "@/lib/types/signage-data";
import type { LawRevision, SiteRiskWeather } from "@/lib/types/domain";
import type { ApiMode, ServiceStatus } from "@/lib/types/api";

/** 気象庁JSONの code をざっくり表示用に（公式名称はPDF参照） */
const JMA_CODE_HINT: Record<string, string> = {
  "02": "大雪注意報",
  "03": "大雨注意報",
  "05": "強風注意報",
  "12": "雷雨注意報",
  "15": "波浪注意報",
  "16": "波浪注意報",
};

function hintForJmaCode(code: string) {
  return JMA_CODE_HINT[code] ?? `コード ${code}`;
}

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const LOCATION_STORAGE_KEY = "signage-location-id";

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
  const [selectedLocationId, setSelectedLocationId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored && signageLocations.some((l) => l.id === stored)) {
        return stored;
      }
    }
    return "tokyo-shinjuku";
  });
  const [bundle, setBundle] = useState<SignageDataApiResponse | null>(null);
  const [bundleStatus, setBundleStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const selectedLocation = useMemo(
    () => getSignageLocationById(selectedLocationId) ?? getSignageLocationById("tokyo-shinjuku")!,
    [selectedLocationId]
  );

  const [state, setState] = useState<DashboardState>(() => ({
    mode: services.mode,
    regionLabel: selectedLocation.label,
    // SSR/client hydration mismatch 対策: 時刻はクライアント側 useEffect でセット
    nowText: "—",
    lastUpdatedText: "—",
    riskStatus: "idle",
    riskData: null,
    lawStatus: "idle",
    lawRevisions: null,
  }));

  const topLaws = useMemo(() => {
    if (!state.lawRevisions?.length) return [];
    return [...state.lawRevisions].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5);
  }, [state.lawRevisions]);


  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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
    }, 1000);

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
      setBundleStatus((s) => (s === "idle" ? "loading" : s));
      setState((prev) => ({
        ...prev,
        riskStatus: prev.riskStatus === "idle" ? "loading" : prev.riskStatus,
        lawStatus: prev.lawStatus === "idle" ? "loading" : prev.lawStatus,
      }));

      const loc = getSignageLocationById(selectedLocationId) ?? getSignageLocationById("tokyo-shinjuku")!;
      const dataUrl = `/api/signage-data?locationId=${encodeURIComponent(selectedLocationId)}`;

      const [dataRes, riskResult, revisionResult] = await Promise.all([
        fetch(dataUrl, { cache: "no-store" }),
        services.weatherRisk.getTodaySiteRisk({ regionName: loc.regionName }),
        services.revision.getLawRevisions(),
      ]);

      if (cancelled) return;

      if (dataRes.ok) {
        try {
          const json = (await dataRes.json()) as SignageDataApiResponse;
          setBundle(json);
          setBundleStatus("success");
        } catch {
          setBundle(null);
          setBundleStatus("error");
        }
      } else {
        setBundle(null);
        setBundleStatus("error");
      }

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
  }, [services, selectedLocationId]);

  const onLocationChange = (id: string) => {
    setSelectedLocationId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCATION_STORAGE_KEY, id);
    }
    const loc = getSignageLocationById(id);
    if (loc) {
      setState((prev) => ({ ...prev, regionLabel: loc.label }));
    }
  };

  const prefectureLevels = bundle?.prefectureLevels ?? {};
  const jmaLink = `https://www.jma.go.jp/bosai/warning/#area_type=class20s&area_code=${selectedLocation.jmaCityCode ?? "130000"}`;

  return (
    <SignageShell>
      <SignageHeader
        compact
        regionLabel={state.regionLabel}
        nowText={state.nowText}
        lastUpdatedText={state.lastUpdatedText}
      />

      {/* スマホ向け注意バナー */}
      <div className="xl:hidden rounded-lg border border-amber-500/50 bg-amber-950/70 px-3 py-2.5">
        <p className="text-sm font-bold text-amber-100">この画面はPC・大画面TV表示用です</p>
        <p className="mt-1 text-xs text-amber-200">
          スマホでは縦スクロールで全セクションを確認できます。PC/大画面TVで開くと本来のサイネージレイアウトが表示されます。
        </p>
      </div>

      {/* 地図モードへの導線 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-xs">
        <span className="font-semibold text-emerald-200">🗺️ 地図モード（新）</span>
        <span className="text-emerald-100/80">
          全国の警報・天気・地震を地図上に表示。ピン登録・通知・フルスクリーン対応。
        </span>
        <Link
          href="/signage/map"
          className="ml-auto rounded border border-emerald-400 bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-600"
        >
          地図モードを開く →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-12 xl:gap-3 xl:overflow-hidden">
        <div className="flex flex-col gap-2 overflow-x-hidden xl:col-span-7 xl:min-h-0 xl:overflow-y-auto">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <label className="ml-auto flex max-w-full items-center gap-2 text-[10px] text-slate-300 sm:text-xs">
              <span className="shrink-0 whitespace-nowrap">地点</span>
              <select
                className="max-w-[min(100%,280px)] truncate rounded-lg border border-slate-600 bg-slate-950 px-2 py-2.5 text-xs text-slate-100 min-h-[44px]"
                value={selectedLocationId}
                onChange={(e) => onLocationChange(e.target.value)}
              >
                {signageLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2 overflow-x-hidden rounded-2xl border border-slate-600 bg-slate-950/60 p-2 sm:p-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100 sm:text-sm lg:text-base">気象庁 注意報・警報（都道府県）</p>
                <p className="mt-0.5 text-[9px] text-slate-400 sm:text-[10px]">
                  地図は{" "}
                  <a href="https://www.jma.go.jp/bosai/warning/" className="text-emerald-400 underline" target="_blank" rel="noreferrer">
                    気象庁 警報・注意報
                  </a>
                  の公開JSONを約1時間キャッシュして描画しています。
                </p>
              </div>
              <a
                href={jmaLink}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex items-center rounded-lg border border-sky-600/60 bg-sky-950/50 px-2 py-2.5 text-[9px] font-semibold text-sky-200 hover:bg-sky-900/50 sm:text-[10px] min-h-[44px]"
              >
                選択地点の詳細（気象庁）→
              </a>
            </div>
            {bundle?.jmaHeadline ? (
              <p className="shrink-0 text-[11px] leading-snug text-amber-100 sm:text-sm">{bundle.jmaHeadline}</p>
            ) : null}
            {bundle?.jmaReportTime ? (
              <p className="text-[9px] text-slate-500">気象庁データ時刻: {bundle.jmaReportTime}</p>
            ) : null}
            {selectedLocation.jmaCityCode && bundle?.selectedWarnings && bundle.selectedWarnings.length > 0 ? (
              <ul className="shrink-0 space-y-0.5 text-[10px] text-slate-200">
                {bundle.selectedWarnings.map((w, i) => (
                  <li key={`${w.code}-${i}`}>
                    {hintForJmaCode(w.code)}（{w.status}）
                  </li>
                ))}
              </ul>
            ) : null}

            <JapanPrefectureWarningMap levelsByIso={prefectureLevels} highlightIso={selectedLocation.prefectureIso} />

            <SignageHourlyStrip
              hourly={bundle?.hourly ?? []}
              locationLabel={bundle?.locationLabel ?? selectedLocation.label}
              status={bundleStatus}
            />

            {state.riskData?.riskEvidences && state.riskData.riskEvidences.length > 0 && (
              <div className="shrink-0 rounded-lg border border-amber-600/50 bg-amber-950/60 px-2.5 py-2 sm:rounded-xl">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 sm:text-[10px]">
                  本日の現場注意事項
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-amber-100 sm:text-xs">
                  {state.riskData.riskEvidences[0]}
                </p>
                {state.riskData.riskEvidences[1] && (
                  <p className="mt-0.5 text-[9px] leading-snug text-amber-200/80 sm:text-[10px]">
                    {state.riskData.riskEvidences[1]}
                  </p>
                )}
              </div>
            )}
          </div>

          {state.riskStatus === "error" && (
            <p className="shrink-0 text-[10px] text-amber-200 sm:text-xs">地点リスク（日次）の取得に失敗しました。</p>
          )}

          <SignageTodayDocuments />
        </div>

        <div className="flex flex-col gap-2 xl:col-span-5 xl:min-h-0 xl:overflow-hidden">
          <section className="flex flex-col rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3 xl:min-h-0 xl:flex-1 xl:overflow-hidden">
            <h2 className="shrink-0 text-xs font-bold tracking-wide text-slate-100 sm:text-sm lg:text-base">
              トレンド（労働災害・建設事故）
            </h2>
            <p className="mt-0.5 shrink-0 text-[9px] text-slate-400 sm:text-[10px]">
              GoogleニュースのRSSから取得（サーバー側で約1時間キャッシュ）。記事元へ直接リンクします。
            </p>
            <ul className="mt-2 space-y-2 pr-0.5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
              {bundleStatus === "success" && bundle && bundle.laborTrend.length === 0 ? (
                <li className="text-xs text-slate-400">現在取得できるニュースがありません。</li>
              ) : null}
              {(bundle?.laborTrend ?? []).map((item, idx) => (
                <li key={`${item.link}-${idx}`}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-left transition hover:border-emerald-600/80 hover:bg-slate-900 sm:rounded-xl sm:p-3"
                  >
                    <p className="text-[9px] text-slate-300 sm:text-[10px]">{item.pubDate || "日時不明"}</p>
                    <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-50 sm:text-base lg:text-lg">{item.title}</p>
                    <p className="mt-1 text-[10px] font-semibold text-emerald-400 sm:text-xs">記事を開く →</p>
                  </a>
                </li>
              ))}
              {bundleStatus === "loading" || bundleStatus === "idle" ? (
                <li className="h-20 animate-pulse rounded-lg bg-slate-800/80" />
              ) : null}
            </ul>
          </section>

          <section className="flex flex-col rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3 xl:min-h-0 xl:flex-1 xl:overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold tracking-wide text-slate-100 sm:text-sm lg:text-base">直近の法改正（5件・要約）</h2>
              <Link
                href="/laws"
                className="flex items-center rounded-lg border border-emerald-600/60 px-2 py-2.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-950/50 min-h-[44px]"
              >
                一覧ページへ
              </Link>
            </div>
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
            <ul className="mt-2 space-y-2 pr-0.5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
              {topLaws.map((rev) => (
                <li key={rev.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-2 sm:rounded-xl sm:p-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 sm:text-xs">
                    <span className="rounded-full bg-sky-600/90 px-2 py-0.5 font-semibold text-white">{rev.kind}</span>
                    <span>{rev.publishedAt}</span>
                    <span>{rev.issuer}</span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-50 sm:text-base lg:text-lg">{rev.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200 sm:text-sm lg:text-base">{rev.summary || "要約は未設定です。"}</p>
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

          <SignageRiskPrediction weatherData={state.riskData} />

          <SignageFeaturedGoods />
        </div>
      </div>

      <AutoRefreshStatus intervalMinutes={REFRESH_INTERVAL_MS / 60000} lastUpdatedText={state.lastUpdatedText} />
    </SignageShell>
  );
}
