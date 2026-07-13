"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Coffee, Map as MapIcon, Mic, Monitor, Smartphone, Sunrise, Sunset, X } from "lucide-react";
import { AutoRefreshStatus } from "@/components/signage/auto-refresh-status";
import { SignageConclusionStrip } from "@/components/signage/signage-conclusion-strip";
import { SignageDailyValues } from "@/components/signage/signage-daily-values";
import { SignageDangerAlert } from "@/components/signage/signage-danger-alert";
import { SignageOsNotifier } from "@/components/signage/signage-os-notifier";
import { JapanPrefectureWarningMap } from "@/components/signage/japan-prefecture-warning-map";
import { HazardOfTheDay } from "@/components/hazard-slides/hazard-of-the-day";
import { SignageFloorPlanEditor } from "@/components/signage/signage-floor-plan-editor";
import { SignageHeader } from "@/components/signage/signage-header";
import { SignageHourlyStrip } from "@/components/signage/signage-hourly-strip";
import { SignageMorningScript } from "@/components/signage/signage-morning-script";
import { SignageRiskPrediction } from "@/components/signage/signage-risk-prediction";
import { SignageRotator } from "@/components/signage/signage-rotator";
import { SignageShell } from "@/components/signage/signage-shell";
import { SignageSiteSafety, useSignageSiteSafetyData } from "@/components/signage/signage-site-safety";
import { SignageTodayDocuments } from "@/components/signage/signage-today-documents";
import { getSignageLocationById, signageLocations } from "@/data/signage-locations";
import { buildSignageConclusion } from "@/lib/signage/signage-conclusion";
import { resolveWeatherWarningPanelState } from "@/lib/signage/weather-warning-panel-state";
import { formatRelativeTimeJa, isDataTimeStale } from "@/lib/signage/relative-time";
import { levelFromWarningCode } from "@/lib/jma/parse-jma-warning";
import { levelLabel } from "@/lib/jma/jma-data";
import { computeTodayRisks } from "@/lib/utils/risk-search";
import { createServices } from "@/lib/services/service-factory";
import type { SignageDataApiResponse } from "@/lib/types/signage-data";
import type { LawRevision, SiteRiskWeather } from "@/lib/types/domain";
import type { ApiMode, ServiceStatus } from "@/lib/types/api";

/**
 * 気象庁コードの表示ラベル。以前は6件のみの手書き辞書（フォールバックは「コード XX」）で
 * 大雪/大雨等の現象名を決め打ちしていたが、未収録コードとの対応が不正確だった（T3是正）。
 * 現象名を捏造しないよう、コード先頭桁から確定できる区分名（警報/注意報/特別警報）のみ表示する。
 */
function hintForJmaCode(code: string) {
  const level = levelFromWarningCode(code);
  return level && level !== "none" ? levelLabel(level) : `コード ${code}`;
}

// 15分（Fable診断01 T5: 60分では現場の休憩所TVで鮮度が悪すぎるため短縮）。
// 上流 /api/signage-data は CDN s-maxage=300 で応答するため、Edge Requests増は限定的。
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
// 取得失敗時（無人現場のネットワーク断で最も起きる障害）は次の定期更新を待たず短間隔で再試行する。
const RETRY_INTERVAL_MS = 3 * 60 * 1000;
// 常時点灯TVが古いJSバンドルを掴み続けないよう、深夜に1日1回フルリロードして新デプロイを取り込む。
const DAILY_RELOAD_HOUR = 3;
const LOCATION_STORAGE_KEY = "signage-location-id";
const ORIENTATION_STORAGE_KEY = "signage-orientation";

type Orientation = "landscape" | "portrait";
type DisplayMode = "floorplan" | "map" | "workdocs" | "education";

type DashboardState = {
  mode: ApiMode;
  regionLabel: string;
  nowText: string;
  nowMs: number;
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
  // 中央メインエリア: 図面 / 地図 / 作業資料 の3モード切替
  const [displayMode, setDisplayMode] = useState<DisplayMode>("floorplan");
  // 縦長/横長の切替: 縦置きTV対応
  const [orientation, setOrientation] = useState<Orientation>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(ORIENTATION_STORAGE_KEY);
      if (stored === "portrait" || stored === "landscape") return stored;
    }
    return "landscape";
  });
  // トレンドニュースの拡大表示
  const [zoomedTrendIndex, setZoomedTrendIndex] = useState<number | null>(null);
  // 朝礼スクリプト（読み上げ）モーダル
  const [showMorningScript, setShowMorningScript] = useState(false);
  // キオスクモード（常掲用）: ?kiosk=1 でナビ・シナリオ操作等の運用UIを隠し、本文の視認性を優先する
  const [isKiosk] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("kiosk") === "1";
  });

  const selectedLocation = useMemo(
    () => getSignageLocationById(selectedLocationId) ?? getSignageLocationById("tokyo-shinjuku")!,
    [selectedLocationId]
  );

  const [state, setState] = useState<DashboardState>(() => ({
    mode: services.mode,
    regionLabel: selectedLocation.label,
    // SSR/client hydration mismatch 対策: 時刻はクライアント側 useEffect でセット
    nowText: "--:--",
    nowMs: 0,
    lastUpdatedText: "起動中…",
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
      const now = new Date();
      setState((prev) => ({
        ...prev,
        nowText: formatter.format(now),
        nowMs: now.getTime(),
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
    let retryTimer: number | undefined;
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

      // ネットワーク断（無人現場で最も起きる障害）でも fetch の reject を握りつぶさず
      // error 状態に確実に落とす。reject のまま放置すると bundleStatus が loading のまま固まり、
      // 警報パネルが永遠に「取得中」表示になって取得失敗を見落とす。
      const dataPromise: Promise<{ ok: true; json: SignageDataApiResponse } | { ok: false }> = fetch(dataUrl, {
        cache: "no-store",
      })
        .then(async (res) => {
          if (!res.ok) return { ok: false as const };
          try {
            return { ok: true as const, json: (await res.json()) as SignageDataApiResponse };
          } catch {
            return { ok: false as const };
          }
        })
        .catch(() => ({ ok: false as const }));

      const [dataResult, riskResult, revisionResult] = await Promise.all([
        dataPromise,
        services.weatherRisk.getTodaySiteRisk({ regionName: loc.regionName }),
        services.revision.getLawRevisions(),
      ]);

      if (cancelled) return;

      if (dataResult.ok) {
        setBundle(dataResult.json);
        setBundleStatus("success");
        window.clearTimeout(retryTimer);
      } else {
        setBundle(null);
        setBundleStatus("error");
        // 通常の15分待たず3分後に再試行（無人表示が古いまま放置されるのを防ぐ）
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(() => {
          if (cancelled) return;
          if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
          void refreshAll();
        }, RETRY_INTERVAL_MS);
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
      window.clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [services, selectedLocationId]);

  // 日次フルリロード（T5）: 常時点灯TVが古いJSバンドルを掴み続けないよう、深夜に1回だけ再読込。
  useEffect(() => {
    if (typeof window === "undefined") return;
    const now = new Date();
    const next = new Date(now);
    next.setHours(DAILY_RELOAD_HOUR, 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    const timer = window.setTimeout(() => {
      window.location.reload();
    }, next.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, []);

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

  const toggleOrientation = () => {
    setOrientation((prev) => {
      const next: Orientation = prev === "landscape" ? "portrait" : "landscape";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ORIENTATION_STORAGE_KEY, next);
      }
      return next;
    });
  };

  const trendItems = bundle?.laborTrend ?? [];
  const zoomedTrend = zoomedTrendIndex !== null ? trendItems[zoomedTrendIndex] ?? null : null;
  // 朝礼の読み上げ用に、ニュース見出し末尾の媒体名（｜/ | 以降）を落として読みやすくする
  const topAccidentTitle = trendItems[0]?.title
    ? trendItems[0].title.split(/[｜|]/)[0].trim()
    : null;

  const prefectureLevels = bundle?.prefectureLevels ?? {};
  const jmaLink = `https://www.jma.go.jp/bosai/warning/#area_type=class20s&area_code=${selectedLocation.jmaCityCode ?? "130000"}`;
  // 取得失敗(error)を「警報なし」と取り違えないよう状態を明示分岐（無人運用の誤った安心を防ぐ）。
  // 判定は県ヘッドラインではなく選択地点(市区町村)の selectedWarnings を主軸にする（T3是正）。
  const warningPanel = resolveWeatherWarningPanelState(bundleStatus, bundle?.selectedWarnings, bundle?.jmaHeadline);
  // データ時刻の人間化＋2h超stale黄帯（S4）: 生ISO文字列のままだと現場は鮮度を判断できない。
  const jmaDataTimeText = bundle?.jmaReportTime ? formatRelativeTimeJa(bundle.jmaReportTime, state.nowMs) : null;
  const jmaDataTimeStale = bundle?.jmaReportTime ? isDataTimeStale(bundle.jmaReportTime, state.nowMs) : false;

  // 結論ストリップ（柱0）: 気象・リスク予測・記録キットの要対応を1本の色帯に集約。
  // リスク予測パネルと同一データを使うため、ここで一度だけ計算して両方へ渡す。
  const siteSafety = useSignageSiteSafetyData();
  const todayRisks = useMemo(
    () =>
      computeTodayRisks({
        date: new Date(),
        temperatureCelsius: state.riskData?.temperatureCelsius,
        precipitationMm: state.riskData?.precipitationMm,
      }),
    [state.riskData],
  );
  const conclusion = buildSignageConclusion({
    warningPanel,
    risks: todayRisks,
    siteSafety: siteSafety?.hasRecords
      ? { overdueCount: siteSafety.overdueCount, alertCount: siteSafety.alertCount }
      : null,
  });

  const isPortrait = orientation === "portrait";

  return (
    <SignageShell>
      <SignageHeader
        compact
        hideNav={isKiosk}
        regionLabel={state.regionLabel}
        nowText={state.nowText}
        lastUpdatedText={state.lastUpdatedText}
      />

      {/* 結論ストリップ（柱0）: 3秒で「いまの状態」が分かるデカ色帯。説明より先に結論 */}
      <SignageConclusionStrip conclusion={conclusion} />

      {/* 常掲価値3項目（Fable診断01 T10）: 無災害日数・今日の一言・WBGT。毎日内容が変わり「見る理由」を作る */}
      <SignageDailyValues
        now={new Date()}
        currentTempC={bundle?.hourly?.[0]?.tempC}
        currentHumidityPct={bundle?.hourly?.[0]?.humidityPct}
      />

      {/* スマホ向け注意バナー */}
      <div className="xl:hidden rounded-lg border border-amber-500/50 bg-amber-950/70 px-3 py-2.5">
        <p className="text-sm font-bold text-amber-100">この画面はPC・大画面TV表示用です</p>
        <p className="mt-1 text-xs text-amber-200">
          スマホでは縦スクロールで全セクションを確認できます。PC/大画面TVで開くと本来のサイネージレイアウトが表示されます。
        </p>
        <p className="mt-1.5 text-xs text-amber-200">
          スマホで記録の作成・確認をするなら{" "}
          <Link href="/site-records" className="font-bold text-amber-100 underline">
            現場の安全記録キット →
          </Link>
        </p>
      </div>

      {/* C-003: scenario presets — set display mode for common use cases。キオスクモードでは運用UIとして隠す */}
      {!isKiosk && (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-700/50 bg-sky-950/40 px-3 py-2 text-xs">
        <span className="text-sky-200/80 font-semibold shrink-0">シナリオ：</span>
        {([
          {
            label: "朝礼前",
            icon: Sunrise,
            title: "朝礼前 — 現場レイアウトを表示し、朝礼の読み上げ原稿を開きます",
            active: displayMode === "floorplan" && showMorningScript,
            onSelect: () => {
              setDisplayMode("floorplan");
              setShowMorningScript(true);
            },
          },
          {
            label: "休憩時間",
            icon: Coffee,
            title: "休憩時間 — 気象マップと最新ニュース確認",
            active: displayMode === "map",
            onSelect: () => {
              setShowMorningScript(false);
              setDisplayMode("map");
            },
          },
          {
            label: "退場時",
            icon: Sunset,
            title: "退場時 — 本日の作業資料と法改正確認",
            active: displayMode === "workdocs",
            onSelect: () => {
              setShowMorningScript(false);
              setDisplayMode("workdocs");
            },
          },
        ] as const).map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={s.onSelect}
            title={s.title}
            className={`rounded border px-2.5 py-1 text-[11px] font-bold transition min-h-[44px] ${
              s.active
                ? "border-sky-400 bg-sky-600 text-white"
                : "border-sky-700 bg-sky-900/60 text-sky-200 hover:bg-sky-800/60"
            }`}
          >
            <s.icon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
            {s.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {/* 色文法（柱0）: 操作ボタンは青＝指示。黄は注意情報専用に取っておく */}
          <button
            type="button"
            onClick={() => setShowMorningScript(true)}
            className="min-h-[44px] rounded border border-sky-400 bg-sky-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-500"
            title="本日の気象・類似事故・法改正から朝礼の読み上げ原稿を生成します"
          >
            <Mic className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />朝礼スクリプト
          </button>
          <button
            type="button"
            onClick={toggleOrientation}
            className="min-h-[44px] rounded border border-slate-500 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-100 hover:bg-slate-700"
            aria-pressed={isPortrait}
          >
            {isPortrait ? (
              <><Smartphone className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />縦長</>
            ) : (
              <><Monitor className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />横長</>
            )}
          </button>
          {/* 旧「🗺️ 地図」「📺 全画面」: 行き先はどちらも同じ防災地図キオスク（mapとdisplayは全画面か否かの差のみ）。
              「全画面」がこのダッシュボードの全画面版と誤解させていたため、1本に統合して役割を明示。 */}
          <Link
            href="/signage/map"
            title="全国の警報・地震を詳細地図で監視（台風・地震時）。TV用の全画面表示は地図内から切替できます"
            className="flex min-h-[44px] items-center rounded border border-sky-400 bg-sky-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-sky-600"
          >
            <MapIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />地図サイネージ（警報・地震）
          </Link>
        </div>
      </div>
      )}

      {/* 危険イベント全画面アラート: 高リスク警報(特別警報/暴風/大雨/落雷/地震/津波)の検知で全画面赤表示＋音声。
          バー自体は薄い1行。オーバーレイは fixed inset-0 のため通常レイアウト(1画面フィット)に影響しない。 */}
      <div className="shrink-0">
        <SignageDangerAlert jmaHeadline={bundle?.jmaHeadline} warnings={bundle?.selectedWarnings} />
      </div>

      <div className={`grid grid-cols-1 gap-2 xl:min-h-0 xl:flex-1 xl:gap-3 xl:overflow-hidden ${isPortrait ? "" : "xl:grid-cols-12"}`}>
        <div className={`flex flex-col gap-2 overflow-x-hidden xl:min-h-0 xl:overflow-y-auto ${isPortrait ? "" : "xl:col-span-7"}`}>
          {!isKiosk && (
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
          )}

          <div className="flex flex-col gap-2 overflow-x-hidden rounded-2xl border border-slate-600 bg-slate-950/60 p-2 sm:p-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100 sm:text-sm lg:text-base xl:text-xl">
                  {displayMode === "floorplan"
                    ? "現場レイアウト"
                    : displayMode === "map"
                      ? "気象庁 注意報・警報（都道府県）"
                      : displayMode === "education"
                        ? "災害の型別 安全教育（本日の型）"
                        : "本日の作業資料"}
                </p>
                <p className="mt-0.5 text-[9px] text-slate-400 sm:text-[10px] xl:text-sm">
                  {displayMode === "floorplan" && (
                    <>図面サンプルを表示中。気象警報は右サイドパネルで確認できます。</>
                  )}
                  {displayMode === "map" && (
                    <>
                      地図は{" "}
                      <a href="https://www.jma.go.jp/bosai/warning/" className="text-emerald-400 underline" target="_blank" rel="noreferrer">
                        気象庁 警報・注意報
                      </a>
                      の公開JSONを約1時間キャッシュして描画しています。
                    </>
                  )}
                  {displayMode === "workdocs" && (
                    <>本日使用する図面・指示書をアップロード表示します。</>
                  )}
                  {displayMode === "education" && (
                    <>厚労省21分類の型が毎日替わります。?slide=fall のように固定も可能です。</>
                  )}
                </p>
              </div>
              {!isKiosk && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDisplayMode("floorplan")}
                  className={`flex items-center rounded-lg border px-2 py-2.5 text-[10px] font-semibold min-h-[44px] ${
                    displayMode === "floorplan"
                      ? "border-emerald-500 bg-emerald-700 text-white"
                      : "border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                  aria-pressed={displayMode === "floorplan"}
                >
                  図面
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode("map")}
                  className={`flex items-center rounded-lg border px-2 py-2.5 text-[10px] font-semibold min-h-[44px] ${
                    displayMode === "map"
                      ? "border-emerald-500 bg-emerald-700 text-white"
                      : "border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                  aria-pressed={displayMode === "map"}
                >
                  地図
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode("workdocs")}
                  className={`flex items-center rounded-lg border px-2 py-2.5 text-[10px] font-semibold min-h-[44px] ${
                    displayMode === "workdocs"
                      ? "border-emerald-500 bg-emerald-700 text-white"
                      : "border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                  aria-pressed={displayMode === "workdocs"}
                >
                  作業資料
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode("education")}
                  className={`flex items-center rounded-lg border px-2 py-2.5 text-[10px] font-semibold min-h-[44px] ${
                    displayMode === "education"
                      ? "border-emerald-500 bg-emerald-700 text-white"
                      : "border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                  aria-pressed={displayMode === "education"}
                >
                  教育
                </button>
                <SignageOsNotifier warnings={bundle?.selectedWarnings} regionLabel={bundle?.locationLabel ?? selectedLocation.label} />
                <a
                  href={jmaLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center rounded-lg border border-sky-600/60 bg-sky-950/50 px-2 py-2.5 text-[9px] font-semibold text-sky-200 hover:bg-sky-900/50 sm:text-[10px] min-h-[44px]"
                >
                  気象庁 →
                </a>
              </div>
              )}
            </div>

            {/* 警報サイドパネル（図面モード時のみ表示）。
                色文法（柱0）: 黄＝警報・注意報の発表中のみ。「警報なし」を黄枠で出すと
                注意色の意味が薄れるため、なし＝緑 / 取得失敗＝赤系 / 取得中＝無彩に分ける。 */}
            {displayMode === "floorplan" && (
              <div
                data-warning-panel-kind={warningPanel.kind}
                className={`shrink-0 rounded-lg border p-2 sm:p-3 ${
                  warningPanel.kind === "error"
                    ? "border-rose-600 bg-rose-950/50"
                    : warningPanel.kind === "special" || warningPanel.kind === "warning"
                      ? "border-rose-600 bg-rose-950/40"
                      : warningPanel.kind === "advisory"
                        ? "border-amber-500/70 bg-amber-950/40"
                        : warningPanel.kind === "none"
                          ? "border-emerald-600/50 bg-emerald-950/40"
                          : "border-slate-600 bg-slate-900/60"
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest sm:text-xs xl:text-lg ${
                    warningPanel.kind === "special" || warningPanel.kind === "warning"
                      ? "text-rose-300"
                      : warningPanel.kind === "advisory"
                        ? "text-amber-300"
                        : warningPanel.kind === "error"
                          ? "text-rose-300"
                          : warningPanel.kind === "none"
                            ? "text-emerald-300"
                            : "text-slate-400"
                  }`}
                >
                  本日の気象警報
                </p>
                {warningPanel.kind === "special" || warningPanel.kind === "warning" ? (
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-rose-100 sm:text-sm xl:text-2xl">
                    {warningPanel.kind === "special" ? "特別警報 発表中" : "警報 発表中"}
                    {warningPanel.headline ? `｜${warningPanel.headline}` : ""}
                  </p>
                ) : warningPanel.kind === "advisory" ? (
                  <p className="mt-1 text-[11px] leading-snug text-amber-100 sm:text-sm xl:text-2xl">
                    注意報 発表中
                    {warningPanel.headline ? `｜${warningPanel.headline}` : ""}
                  </p>
                ) : warningPanel.kind === "error" ? (
                  <p className="mt-1 text-[10px] font-semibold leading-snug text-rose-200 sm:text-xs xl:text-xl">
                    <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />気象データの取得に失敗しました。警報の有無を確認できません。
                    <a href={jmaLink} target="_blank" rel="noreferrer" className="ml-1 text-rose-100 underline">
                      気象庁で確認 →
                    </a>
                  </p>
                ) : warningPanel.kind === "loading" ? (
                  <p className="mt-1 text-[10px] text-slate-300 sm:text-xs xl:text-xl">気象データを取得中…</p>
                ) : (
                  <p className="mt-1 text-[10px] font-semibold text-emerald-200 sm:text-xs xl:text-xl">
                    ✓ 現在、選択地点に発表中の警報はありません。
                  </p>
                )}
                {selectedLocation.jmaCityCode && bundle?.selectedWarnings && bundle.selectedWarnings.length > 0 ? (
                  <ul className="mt-2 space-y-0.5 text-[10px] text-amber-100 sm:text-xs xl:text-lg">
                    {bundle.selectedWarnings.map((w, i) => (
                      <li key={`${w.code}-${i}`}>
                        ・{hintForJmaCode(w.code)}（{w.status}）
                      </li>
                    ))}
                  </ul>
                ) : null}
                {jmaDataTimeText ? (
                  <p
                    className={`mt-2 text-[9px] xl:text-sm ${
                      jmaDataTimeStale
                        ? "inline-block rounded bg-amber-400 px-1.5 py-0.5 font-bold text-amber-950"
                        : "text-amber-300/70"
                    }`}
                  >
                    気象庁データ時刻: {jmaDataTimeText}
                    {jmaDataTimeStale ? "（データが古い可能性）" : ""}
                  </p>
                ) : null}
              </div>
            )}

            {displayMode === "map" && (warningPanel.kind === "special" || warningPanel.kind === "warning") ? (
              <p className="shrink-0 text-[11px] font-semibold leading-snug text-rose-100 sm:text-sm xl:text-2xl">
                {warningPanel.kind === "special" ? "特別警報 発表中" : "警報 発表中"}
                {warningPanel.headline ? `｜${warningPanel.headline}` : ""}
              </p>
            ) : null}
            {displayMode === "map" && warningPanel.kind === "advisory" ? (
              <p className="shrink-0 text-[11px] leading-snug text-amber-100 sm:text-sm xl:text-2xl">
                注意報 発表中
                {warningPanel.headline ? `｜${warningPanel.headline}` : ""}
              </p>
            ) : null}
            {displayMode === "map" && warningPanel.kind === "error" ? (
              <p className="shrink-0 text-[11px] font-semibold leading-snug text-rose-200 sm:text-sm xl:text-xl">
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />気象データの取得に失敗しました。警報の有無を確認できません。
                <a href={jmaLink} target="_blank" rel="noreferrer" className="ml-1 text-rose-100 underline">
                  気象庁で確認 →
                </a>
              </p>
            ) : null}
            {displayMode === "map" && jmaDataTimeText ? (
              <p
                className={`text-[9px] xl:text-sm ${
                  jmaDataTimeStale
                    ? "inline-block rounded bg-amber-400 px-1.5 py-0.5 font-bold text-amber-950"
                    : "text-slate-500"
                }`}
              >
                気象庁データ時刻: {jmaDataTimeText}
                {jmaDataTimeStale ? "（データが古い可能性）" : ""}
              </p>
            ) : null}
            {displayMode === "map" && selectedLocation.jmaCityCode && bundle?.selectedWarnings && bundle.selectedWarnings.length > 0 ? (
              <ul className="shrink-0 space-y-0.5 text-[10px] text-slate-200 xl:text-lg">
                {bundle.selectedWarnings.map((w, i) => (
                  <li key={`${w.code}-${i}`}>
                    {hintForJmaCode(w.code)}（{w.status}）
                  </li>
                ))}
              </ul>
            ) : null}

            {displayMode === "floorplan" && <SignageFloorPlanEditor />}
            {displayMode === "map" && (
              <JapanPrefectureWarningMap levelsByIso={prefectureLevels} highlightIso={selectedLocation.prefectureIso} />
            )}
            {displayMode === "workdocs" && <SignageTodayDocuments />}
            {displayMode === "education" && (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <HazardOfTheDay variant="signage" />
              </div>
            )}

            <SignageHourlyStrip
              hourly={bundle?.hourly ?? []}
              locationLabel={bundle?.locationLabel ?? selectedLocation.label}
              status={bundleStatus}
            />

            {state.riskData?.riskEvidences && state.riskData.riskEvidences.length > 0 && (
              <div className="shrink-0 rounded-lg border border-amber-600/50 bg-amber-950/60 px-2.5 py-2 sm:rounded-xl">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 sm:text-[10px] xl:text-base">
                  本日の現場注意事項
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-amber-100 sm:text-xs xl:text-xl">
                  {state.riskData.riskEvidences[0]}
                </p>
                {state.riskData.riskEvidences[1] && (
                  <p className="mt-0.5 text-[9px] leading-snug text-amber-200/80 sm:text-[10px] xl:text-lg">
                    {state.riskData.riskEvidences[1]}
                  </p>
                )}
              </div>
            )}
          </div>

          {state.riskStatus === "error" && (
            <p className="shrink-0 text-[10px] text-amber-200 sm:text-xs xl:text-lg">地点リスク（日次）の取得に失敗しました。</p>
          )}
        </div>

        <div className={`flex flex-col gap-2 xl:min-h-0 xl:overflow-hidden ${isPortrait ? "" : "xl:col-span-5"}`}>
          {/* 本日のリスク予測: 気象（気温・降水）から熱中症等の当日リスクを自動判定（朝礼前の確認用） */}
          <SignageRiskPrediction weatherData={state.riskData} precomputedRisks={todayRisks} />

          {/* 現場の安全状態: この端末の /site-records 記録キット（未是正指摘・要対策ヒヤリ等）を掲示。記録のない端末では非表示 */}
          <SignageSiteSafety data={siteSafety} />

          <section className="flex flex-col rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3 xl:min-h-0 xl:flex-1 xl:overflow-hidden">
            <h2 className="shrink-0 text-xs font-bold tracking-wide text-slate-100 sm:text-sm lg:text-base xl:text-xl">
              トレンド（労働災害・建設事故）
            </h2>
            <p className="mt-0.5 shrink-0 text-[9px] text-slate-400 sm:text-[10px] xl:text-sm">
              GoogleニュースのRSSから取得（サーバー側で約1時間キャッシュ）。記事元へ直接リンクします。
            </p>
            {bundleStatus === "success" && bundle && bundle.laborTrend.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400 xl:text-lg">現在取得できるニュースがありません。</p>
            ) : null}
            {(bundleStatus === "loading" || bundleStatus === "idle") && trendItems.length === 0 ? (
              <div className="mt-2 h-20 animate-pulse rounded-lg bg-slate-800/80" />
            ) : null}
            {trendItems.length > 0 && (
              // 1件ずつ大きく表示して15〜20秒周期で全件を自動周回（T5: 隠れていたニュース2件目以降を露出）
              <div className="mt-2 min-h-0 flex-1">
                <SignageRotator
                  items={trendItems}
                  ariaLabel="トレンドニュース"
                  getKey={(item, idx) => `${item.link}-${idx}`}
                  renderItem={(item, idx) => (
                    <button
                      type="button"
                      onClick={() => setZoomedTrendIndex(idx)}
                      className="h-full w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-left transition hover:border-emerald-600/80 hover:bg-slate-900 sm:rounded-xl sm:p-3 xl:p-4"
                    >
                      <p className="text-[9px] text-slate-300 sm:text-[10px] xl:text-base">{item.pubDate || "日時不明"}</p>
                      <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-50 sm:text-base lg:text-lg xl:text-3xl">{item.title}</p>
                      <p className="mt-1 text-[10px] font-semibold text-emerald-400 sm:text-xs xl:text-lg">タップで拡大表示 / 記事を開く →</p>
                    </button>
                  )}
                />
              </div>
            )}
          </section>

          <section className="flex flex-col rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3 xl:min-h-0 xl:flex-1 xl:overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold tracking-wide text-slate-100 sm:text-sm lg:text-base xl:text-xl">直近の法改正（5件・要約）</h2>
              <Link
                href="/laws"
                className="flex items-center rounded-lg border border-emerald-600/60 px-2 py-2.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-950/50 min-h-[44px] xl:text-base"
              >
                一覧ページへ
              </Link>
            </div>
            {/* P1-K: lawStatus が "idle" のままだとセクションが空のままだったので、
                loading と同じスケルトンを出して空状態の露出を防ぐ。 */}
            {(state.lawStatus === "loading" || state.lawStatus === "idle") && (
              <div className="mt-2 space-y-2">
                <div className="h-5 w-full animate-pulse rounded bg-slate-700/80" />
                <div className="h-16 w-full animate-pulse rounded bg-slate-700/60" />
              </div>
            )}
            {state.lawStatus === "error" && (
              <p className="mt-2 text-xs text-rose-200 xl:text-lg">法改正一覧を表示できませんでした。</p>
            )}
            {state.lawStatus === "success" && topLaws.length === 0 && (
              <p className="mt-2 text-xs text-slate-300 xl:text-lg">表示できる法改正がありません。</p>
            )}
            {topLaws.length > 0 && (
              // 1件ずつ大きく表示して周回（T5: 隠れていた法改正2件目以降を露出）
              <div className="mt-2 min-h-0 flex-1">
                <SignageRotator
                  items={topLaws}
                  ariaLabel="直近の法改正"
                  getKey={(rev) => rev.id}
                  renderItem={(rev) => (
                    <div className="h-full rounded-lg border border-slate-700 bg-slate-950/50 p-2 sm:rounded-xl sm:p-3 xl:p-4">
                      <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 sm:text-xs xl:text-lg">
                        <span className="rounded-full bg-sky-600/90 px-2 py-0.5 font-semibold text-white">{rev.kind}</span>
                        <span>{rev.publishedAt}</span>
                        <span>{rev.issuer}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-bold text-slate-50 sm:text-base lg:text-lg xl:text-3xl">{rev.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-200 sm:text-sm lg:text-base xl:text-2xl">{rev.summary || "要約は未設定です。"}</p>
                      {rev.source?.url ? (
                        <a
                          href={rev.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 sm:text-xs xl:text-lg"
                        >
                          出典（{rev.source.label ?? rev.issuer}）を開く →
                        </a>
                      ) : null}
                    </div>
                  )}
                />
              </div>
            )}
          </section>

        </div>
      </div>

      <AutoRefreshStatus intervalMinutes={REFRESH_INTERVAL_MS / 60000} lastUpdatedText={state.lastUpdatedText} />

      {/* 朝礼スクリプト（読み上げ）モーダル */}
      {showMorningScript && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="朝礼スクリプト"
          onClick={() => setShowMorningScript(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-emerald-700 bg-slate-950 p-4 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowMorningScript(false)}
              className="absolute right-3 top-3 flex min-h-[44px] items-center rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
              aria-label="閉じる"
            >
              <X className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />閉じる
            </button>
            <div className="mt-8">
              <SignageMorningScript
                jmaHeadline={bundle?.jmaHeadline}
                warnings={bundle?.selectedWarnings}
                topAccidentTitle={topAccidentTitle}
                topLawTitle={topLaws[0]?.title ?? null}
              />
            </div>
          </div>
        </div>
      )}

      {/* トレンドニュース拡大モーダル */}
      {zoomedTrend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomedTrendIndex(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl sm:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedTrendIndex(null)}
              className="absolute right-3 top-3 flex min-h-[44px] items-center rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
              aria-label="閉じる"
            >
              <X className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />閉じる
            </button>
            <p className="text-xs text-slate-400 sm:text-sm">{zoomedTrend.pubDate || "日時不明"}</p>
            <h3 className="mt-2 text-2xl font-bold leading-snug text-slate-50 sm:text-3xl lg:text-4xl">
              {zoomedTrend.title}
            </h3>
            <a
              href={zoomedTrend.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-[44px] items-center rounded-lg border border-emerald-500 bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 sm:text-base"
            >
              記事を開く →
            </a>
          </div>
        </div>
      )}
    </SignageShell>
  );
}
