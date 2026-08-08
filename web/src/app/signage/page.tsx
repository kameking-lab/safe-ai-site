"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, Coffee, Map as MapIcon, Mic, Monitor, Smartphone, Sunrise, Sunset } from "lucide-react";
import { AutomationConsultCta } from "@/components/automation/automation-consult-cta";
import { AutoRefreshStatus } from "@/components/signage/auto-refresh-status";
import { SignageConclusionStrip } from "@/components/signage/signage-conclusion-strip";
import { SignageDailyValues } from "@/components/signage/signage-daily-values";
import { SignageDangerAlert } from "@/components/signage/signage-danger-alert";
import { SignageHeatSpecial } from "@/components/signage/signage-heat-special";
import { SignageOsNotifier } from "@/components/signage/signage-os-notifier";
import { SignageHeader } from "@/components/signage/signage-header";
import { SignageHourlyStrip } from "@/components/signage/signage-hourly-strip";
import { SignageRiskPrediction } from "@/components/signage/signage-risk-prediction";
import { SignageRotator } from "@/components/signage/signage-rotator";
import { SignageShell } from "@/components/signage/signage-shell";
import { SignagePresentationBoard } from "@/components/signage/signage-presentation-board";
import { SignageSiteSafety, useSignageSiteSafetyData } from "@/components/signage/signage-site-safety";
import { getSignageLocationById, signageLocations } from "@/data/signage-locations";
import { buildSignageConclusion } from "@/lib/signage/signage-conclusion";
import { selectSignageJmaPresentation } from "@/lib/signage/signage-jma-presentation";
import { resolveWeatherWarningPanelState } from "@/lib/signage/weather-warning-panel-state";
import { formatRelativeTimeJa, isDataTimeStale } from "@/lib/signage/relative-time";
import {
  resolveSignageHeatSpecialState,
  type SignageHeatOperationalMode,
} from "@/lib/signage/heat-special-state";
import { levelFromWarningCode } from "@/lib/jma/parse-jma-warning";
import { levelLabel } from "@/lib/jma/jma-data";
import { isHeatIllnessCampaignSeason } from "@/lib/heat-illness/campaign-season";
import { createSignageServices } from "@/lib/services/signage-service-factory";
import type { SignageDataApiResponse } from "@/lib/types/signage-data";
import type { LawRevision, SiteRiskWeather } from "@/lib/types/domain";
import type { ApiMode, ServiceStatus } from "@/lib/types/api";
import { useClientReady } from "@/lib/use-client-ready";

const SignageDialog = dynamic(
  () =>
    import("@/components/signage/signage-dialog").then(
      (module) => module.SignageDialog,
    ),
  { ssr: false },
);
const JapanPrefectureWarningMap = dynamic(
  () =>
    import("@/components/signage/japan-prefecture-warning-map").then(
      (module) => module.JapanPrefectureWarningMap,
    ),
  { ssr: false },
);
const HazardOfTheDay = dynamic(
  () =>
    import("@/components/hazard-slides/hazard-of-the-day").then(
      (module) => module.HazardOfTheDay,
    ),
  { ssr: false },
);
const SignageFloorPlanEditor = dynamic(
  () =>
    import("@/components/signage/signage-floor-plan-editor").then(
      (module) => module.SignageFloorPlanEditor,
    ),
  { ssr: false },
);
const SignageMorningScript = dynamic(
  () =>
    import("@/components/signage/signage-morning-script").then(
      (module) => module.SignageMorningScript,
    ),
  { ssr: false },
);
const SignageTodayDocuments = dynamic(
  () =>
    import("@/components/signage/signage-today-documents").then(
      (module) => module.SignageTodayDocuments,
    ),
  { ssr: false },
);

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
  const isClientReady = useClientReady();
  const services = useMemo(() => createSignageServices(), []);
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
  const [networkStatus, setNetworkStatus] = useState<
    "unknown" | "online" | "offline"
  >("unknown");
  const [heatOperationalMode, setHeatOperationalMode] =
    useState<SignageHeatOperationalMode>("automatic");
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
  const [showPresentationSettings, setShowPresentationSettings] = useState(false);
  const [floorPlanReady, setFloorPlanReady] = useState(false);
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
    const updateNetworkStatus = () => {
      setNetworkStatus(window.navigator.onLine ? "online" : "offline");
    };
    updateNetworkStatus();
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
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

      if (
        riskResult.ok &&
        riskResult.data.dataOrigin === "live" &&
        riskResult.data.officialWarning?.status === "live"
      ) {
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

  const laborRssDegraded = bundle?.degradedSources?.includes("labor-rss") ?? false;
  const openMeteoDegraded = bundle?.degradedSources?.includes("open-meteo") ?? false;
  const partialSourceFailure =
    bundleStatus === "success" && (bundle?.degradedSources?.length ?? 0) > 0;
  const trendItems = laborRssDegraded ? [] : (bundle?.laborTrend ?? []);
  const zoomedTrend = zoomedTrendIndex !== null ? trendItems[zoomedTrendIndex] ?? null : null;
  // 朝礼の読み上げ用に、ニュース見出し末尾の媒体名（｜/ | 以降）を落として読みやすくする
  const topAccidentTitle = trendItems[0]?.title
    ? trendItems[0].title.split(/[｜|]/)[0].trim()
    : null;

  const jmaLink = `https://www.jma.go.jp/bosai/warning/#area_type=class20s&area_code=${selectedLocation.jmaCityCode ?? "130000"}`;
  const jmaPresentation = selectSignageJmaPresentation(bundle, bundleStatus);
  const jmaDegraded = jmaPresentation.datasetDegraded;
  const selectedJmaIsLive = jmaPresentation.selectedRegionLive;
  const prefectureLevels = jmaPresentation.prefectureLevels;
  const jmaBundleStatus = jmaPresentation.warningPanelStatus;
  const trustedJmaHeadline = jmaPresentation.headline;
  const trustedSelectedWarnings = jmaPresentation.selectedWarnings;
  // 取得失敗(error)を「警報なし」と取り違えないよう状態を明示分岐（無人運用の誤った安心を防ぐ）。
  // 判定は県ヘッドラインではなく選択地点(市区町村)の selectedWarnings を主軸にする（T3是正）。
  const warningPanel = resolveWeatherWarningPanelState(jmaBundleStatus, trustedSelectedWarnings, trustedJmaHeadline);
  // データ時刻の人間化＋2h超stale黄帯（S4）: 生ISO文字列のままだと現場は鮮度を判断できない。
  const jmaReportTimeText = bundle?.jmaReportTime ? formatRelativeTimeJa(bundle.jmaReportTime, state.nowMs) : "不明";
  const jmaFetchedTimeText = bundle?.jmaSourceFetchedAt
    ? formatRelativeTimeJa(bundle.jmaSourceFetchedAt, state.nowMs)
    : "不明";
  const jmaDataTimeStale = bundle?.jmaSourceFetchedAt
    ? isDataTimeStale(bundle.jmaSourceFetchedAt, state.nowMs, 0.25)
    : bundleStatus === "success";
  const openMeteoDataTimeStale = bundle?.openMeteoFetchedAt
    ? isDataTimeStale(bundle.openMeteoFetchedAt, state.nowMs)
    : false;
  const openMeteoForecastFromMs = bundle?.openMeteoForecastFrom
    ? Date.parse(bundle.openMeteoForecastFrom)
    : Number.NaN;
  const openMeteoForecastThroughMs = bundle?.openMeteoForecastThrough
    ? Date.parse(bundle.openMeteoForecastThrough)
    : Number.NaN;
  const hasOpenMeteoForecastWindow =
    state.nowMs > 0 &&
    Number.isFinite(openMeteoForecastFromMs) &&
    Number.isFinite(openMeteoForecastThroughMs) &&
    state.nowMs >= openMeteoForecastFromMs &&
    state.nowMs <= openMeteoForecastThroughMs + 60 * 60 * 1000;
  const heatDisplayState = resolveSignageHeatSpecialState({
    operationalMode: heatOperationalMode,
    networkStatus,
    bundleStatus,
    jmaDataTimeStale,
    openMeteoDataTimeStale,
    jmaDegraded,
    openMeteoDegraded,
    hasJmaReportTime: Boolean(bundle?.jmaReportTime),
    hasJmaFetchedAt: Boolean(bundle?.jmaSourceFetchedAt),
    hasOpenMeteoFetchedAt: Boolean(bundle?.openMeteoFetchedAt),
    hasOpenMeteoForecastWindow,
    hasHourlyData: Boolean(bundle?.hourly?.length),
  });
  const isHeatCampaignSeason =
    state.nowMs > 0 && isHeatIllnessCampaignSeason(new Date(state.nowMs));
  const prefectureMapStatus =
    bundleStatus === "idle" || bundleStatus === "loading"
      ? ("loading" as const)
      : bundleStatus === "error" || (bundle?.jmaVerifiedPrefectureCount ?? 0) === 0
        ? ("error" as const)
        : jmaDataTimeStale
          ? ("stale" as const)
          : !jmaDegraded && Object.keys(prefectureLevels).length === 47
            ? ("fresh" as const)
            : ("partial" as const);

  // 独自の事故・WBGT・強風予測は、入力条件と根拠の独立検証が終わるまで停止する。
  // 結論ストリップには公式警報と利用者が保存した現場記録だけを渡す。
  const siteSafety = useSignageSiteSafetyData();
  const conclusion = buildSignageConclusion({
    warningPanel,
    risks: [],
    siteSafety: siteSafety?.hasRecords
      ? { overdueCount: siteSafety.overdueCount, alertCount: siteSafety.alertCount }
      : null,
  });

  const isPortrait = orientation === "portrait";
  const presentationStateTone =
    conclusion.tone === "red"
      ? ("danger" as const)
      : conclusion.tone === "amber"
        ? ("caution" as const)
        : conclusion.tone === "green"
          ? ("confirmed" as const)
          : ("pending" as const);
  const presentationFreshnessLabel =
    bundleStatus === "idle" || bundleStatus === "loading"
      ? "取得中・判定保留"
      : bundleStatus === "error"
        ? "取得できません"
        : partialSourceFailure
          ? "一部を確認できません"
        : jmaDataTimeStale || openMeteoDataTimeStale
          ? "古いデータ・再確認が必要"
          : "取得済み・時刻を確認";
  const presentationFreshnessTone =
    bundleStatus === "idle" || bundleStatus === "loading"
      ? ("pending" as const)
      : bundleStatus === "error" || partialSourceFailure || jmaDataTimeStale || openMeteoDataTimeStale
        ? ("caution" as const)
        : ("confirmed" as const);
  const presentationFreshnessDetail =
    partialSourceFailure && jmaDegraded && selectedJmaIsLive
      ? "一部を確認できません。気象庁で確認してください。"
      : partialSourceFailure
        ? "一部を確認できません。公式情報を確認してください。"
        : `気象庁 取得: ${jmaFetchedTimeText}／発表対象: ${jmaReportTimeText}`;
  const presentationWarningTone =
    warningPanel.kind === "special" || warningPanel.kind === "warning"
      ? ("danger" as const)
      : warningPanel.kind === "advisory" || warningPanel.kind === "error"
        ? ("caution" as const)
        : warningPanel.kind === "none"
          ? ("confirmed" as const)
          : ("pending" as const);
  const presentationWarningLabel =
    warningPanel.kind === "special"
      ? "特別警報 発表中"
      : warningPanel.kind === "warning"
        ? "警報 発表中"
        : warningPanel.kind === "advisory"
          ? "注意報 発表中"
          : warningPanel.kind === "error"
            ? "警報の有無を確認不能"
            : warningPanel.kind === "loading"
              ? "公式データを取得中"
              : "選択地点に発表中なし";
  const presentationWarningDetail =
    warningPanel.headline ??
    (warningPanel.kind === "error"
      ? "取得できません。気象庁で確認してください。"
      : warningPanel.kind === "loading"
        ? "取得中です。"
        : warningPanel.kind === "none"
          ? "取得時点の気象警報状態です。現場の作業可否を示すものではありません。"
          : trustedSelectedWarnings.length > 0
            ? trustedSelectedWarnings.map((warning) => hintForJmaCode(warning.code)).join("・")
            : "気象庁公式の発表内容を確認してください。");
  const presentationMorningPoints = [
    warningPanel.kind === "none"
      ? "気象警報は取得時点で発表中なし。現場実測と変化を継続確認"
      : `${presentationWarningLabel}。中止・退避基準を責任者が確認`,
    topAccidentTitle
      ? `報道労災（未確認見出し）: ${topAccidentTitle}`
      : laborRssDegraded || bundleStatus === "error"
        ? "報道労災を取得できません"
        : "表示できる報道労災見出しなし。事故なしを意味しません",
    topLaws[0]
      ? `法改正: ${topLaws[0].title}（原文・施行日を確認）`
      : state.lawStatus === "error"
        ? "法改正を取得できません"
        : "法改正を確認中。原文確認前に運用へ確定しない",
  ];
  const presentationOfficialLinks = [
    { label: "気象庁 警報・注意報", href: jmaLink },
    { label: "環境省 WBGT", href: "https://www.wbgt.env.go.jp/" },
    ...(topLaws[0]?.source?.url
      ? [{ label: "法改正の一次資料", href: topLaws[0].source.url }]
      : []),
  ];

  return (
    <SignageShell clientReady={isClientReady}>
      <noscript>
        <style>{`[data-signage-live]{display:none!important}`}</style>
        <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center rounded-2xl border-2 border-amber-400 bg-slate-950 p-6 text-white">
          <h1 className="text-3xl font-black">安全サイネージ</h1>
          <p className="mt-4 text-xl font-black text-amber-200" role="status">
            最新情報を取得できません
          </p>
          <p className="mt-2 text-base">気象庁の発表を確認してください。</p>
          <a
            href="https://www.jma.go.jp/bosai/warning/"
            className="mt-5 inline-flex min-h-11 w-fit items-center font-black text-sky-200 underline underline-offset-4"
          >
            気象庁の警報・注意報を確認
          </a>
        </section>
      </noscript>
      <div data-signage-live="" className="contents">
      <SignageHeader
        compact
        hideNav={isKiosk}
        regionLabel={state.regionLabel}
        nowText={state.nowText}
        lastUpdatedText={state.lastUpdatedText}
      />

      <SignagePresentationBoard
        regionLabel={state.regionLabel}
        stateLabel={conclusion.label}
        stateDetail={
          conclusion.sub ??
          "気象警報と端末内記録の状態です。"
        }
        stateTone={presentationStateTone}
        freshnessLabel={presentationFreshnessLabel}
        freshnessDetail={presentationFreshnessDetail}
        freshnessTone={presentationFreshnessTone}
        warningLabel={presentationWarningLabel}
        warningDetail={presentationWarningDetail}
        warningTone={presentationWarningTone}
        morningPoints={presentationMorningPoints}
        officialLinks={presentationOfficialLinks}
        onOpenSettings={
          isKiosk ? undefined : () => setShowPresentationSettings(true)
        }
      />

      <div className="contents min-[1024px]:hidden">

      {!isKiosk ? (
        <section
          aria-label="サイネージの開始と現在状態"
          className="relative shrink-0 overflow-clip rounded-2xl border-2 border-sky-400 bg-[linear-gradient(115deg,#082f49_0%,#020617_46%,#172554_100%)] p-3 shadow-xl"
        >
          <div
            className="pointer-events-none absolute -right-12 -top-24 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl forced-colors:hidden"
            aria-hidden="true"
          />
          <div className="relative grid gap-3 lg:grid-cols-[minmax(170px,.65fr)_minmax(190px,.7fr)_auto] lg:items-center">
            <div>
              <p className="text-[10px] font-black tracking-[.16em] text-cyan-300">
                {state.regionLabel}
              </p>
              <h2 className="mt-1 text-lg font-black leading-tight text-white">
                現在の状態
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2">
                <p className="text-[10px] font-bold text-slate-400">現在の状態</p>
                <p className="mt-0.5 text-xs font-black text-white">{conclusion.label}</p>
              </div>
              <div className="rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2">
                <p className="text-[10px] font-bold text-slate-400">データ鮮度</p>
                <p className="mt-0.5 text-xs font-black text-white">
                  {bundleStatus === "idle" || bundleStatus === "loading"
                    ? "取得中"
                    : bundleStatus === "error"
                      ? "取得できません"
                      : jmaDataTimeStale || openMeteoDataTimeStale
                        ? "情報が古い"
                        : "取得済み"}
                </p>
              </div>
            </div>

            <Link
              href="/signage?kiosk=1"
              data-primary-action="true"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-sky-800 px-5 py-3 text-sm font-black text-white hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 forced-colors:border"
            >
              表示を開始
            </Link>
          </div>
        </section>
      ) : null}

      {/* 結論ストリップ（柱0）: 3秒で「いまの状態」が分かるデカ色帯。説明より先に結論 */}
      <SignageConclusionStrip conclusion={conclusion} />

      {/* 常掲価値3項目（Fable診断01 T10）: 無災害日数・今日の一言・WBGT。毎日内容が変わり「見る理由」を作る */}
      <SignageDailyValues
        now={new Date(state.nowMs)}
        currentTempC={bundle?.hourly?.[0]?.tempC}
        currentHumidityPct={bundle?.hourly?.[0]?.humidityPct}
      />

      <SignageHeatSpecial
        state={heatDisplayState}
        emphasis={isHeatCampaignSeason ? "seasonal" : "standard"}
      />

      {!isKiosk && (
        <fieldset className="rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-xs text-slate-100">
          <legend className="px-2 font-bold">
            熱中症カードの運用状態（手動）
          </legend>
          <p className="mb-2 leading-5 text-slate-300">
            緊急・保守・訓練は自動検知ではありません。運用者が現場手順に基づいて明示的に切り替えます。
          </p>
          <div className="flex flex-wrap gap-2">
            {([
              ["automatic", "自動（取得状態）"],
              ["emergency", "緊急対応中"],
              ["maintenance", "保守中"],
              ["drill", "訓練モード"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={heatOperationalMode === mode}
                onClick={() => setHeatOperationalMode(mode)}
                className={`min-h-[44px] rounded-lg border-2 px-3 py-2 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white ${
                  heatOperationalMode === mode
                    ? mode === "emergency"
                      ? "border-red-200 bg-red-700 text-white"
                      : "border-white bg-slate-100 text-slate-950"
                    : "border-slate-500 bg-slate-900 text-slate-100 hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

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
                ? "border-sky-300 bg-sky-700 text-white"
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
            data-signage-morning-trigger
            className="min-h-[44px] rounded border border-sky-300 bg-sky-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-600"
            title="本日の気象・類似事故・法改正から朝礼の読み上げ原稿を生成します"
          >
            <Mic className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />朝礼スクリプト
          </button>
          <AutomationConsultCta
            position="signage"
            className="min-h-[44px] rounded border border-emerald-400 bg-emerald-800 px-2.5 py-1 text-[11px] text-white hover:bg-emerald-700"
          >
            安全サイネージの導入を相談する
          </AutomationConsultCta>
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
        <SignageDangerAlert jmaHeadline={trustedJmaHeadline} warnings={trustedSelectedWarnings} />
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
                <p className="mt-0.5 text-[9px] text-slate-300 sm:text-[10px] xl:text-sm">
                  {displayMode === "floorplan" && (
                    <>図面サンプルを表示中。気象警報は右サイドパネルで確認できます。</>
                  )}
                  {displayMode === "map" && (
                    <>
                      地図は{" "}
                      <a href="https://www.jma.go.jp/bosai/warning/" className="text-emerald-400 underline" target="_blank" rel="noreferrer">
                        気象庁 警報・注意報
                      </a>
                      の発表を地図で確認できます。
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
              <div
                data-signage-mode-actions=""
                className="grid w-full shrink-0 grid-cols-2 gap-1 sm:flex sm:w-auto sm:flex-wrap sm:items-center"
              >
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
                <SignageOsNotifier warnings={trustedSelectedWarnings} regionLabel={bundle?.locationLabel ?? selectedLocation.label} />
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
                    <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />取得できません。
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
                {selectedLocation.jmaCityCode && trustedSelectedWarnings.length > 0 ? (
                  <ul className="mt-2 space-y-0.5 text-[10px] text-amber-100 sm:text-xs xl:text-lg">
                    {trustedSelectedWarnings.map((w, i) => (
                      <li key={`${w.code}-${i}`}>
                        ・{hintForJmaCode(w.code)}（{w.status}）
                      </li>
                    ))}
                  </ul>
                ) : null}
                {jmaDegraded && selectedJmaIsLive ? (
                  <p className="mt-2 rounded border border-amber-300 bg-amber-950/70 px-2 py-1 text-[10px] font-semibold text-amber-100 sm:text-xs xl:text-lg">
                    一部を確認できません。気象庁で確認してください。
                  </p>
                ) : null}
                {bundleStatus !== "idle" ? (
                  <p
                    className={`mt-2 text-[9px] xl:text-sm ${
                      jmaDataTimeStale
                        ? "inline-block rounded bg-amber-400 px-1.5 py-0.5 font-bold text-amber-950"
                        : "text-amber-300/70"
                    }`}
                  >
                    気象庁（出典）／取得: {jmaFetchedTimeText} ／ 発表対象時刻: {jmaReportTimeText}
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
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />取得できません。
                <a href={jmaLink} target="_blank" rel="noreferrer" className="ml-1 text-rose-100 underline">
                  気象庁で確認 →
                </a>
              </p>
            ) : null}
            {displayMode === "map" && bundleStatus !== "idle" ? (
              <p
                className={`text-[9px] xl:text-sm ${
                  jmaDataTimeStale
                    ? "inline-block rounded bg-amber-400 px-1.5 py-0.5 font-bold text-amber-950"
                    : "text-slate-500"
                }`}
              >
                気象庁（出典）／取得: {jmaFetchedTimeText} ／ 発表対象時刻: {jmaReportTimeText}
                {jmaDataTimeStale ? "（データが古い可能性）" : ""}
              </p>
            ) : null}
            {displayMode === "map" && selectedLocation.jmaCityCode && trustedSelectedWarnings && trustedSelectedWarnings.length > 0 ? (
              <ul className="shrink-0 space-y-0.5 text-[10px] text-slate-200 xl:text-lg">
                {trustedSelectedWarnings.map((w, i) => (
                  <li key={`${w.code}-${i}`}>
                    {hintForJmaCode(w.code)}（{w.status}）
                  </li>
                ))}
              </ul>
            ) : null}

            {displayMode === "floorplan" &&
              (floorPlanReady ? (
                <SignageFloorPlanEditor />
              ) : (
                <div
                  role="status"
                  className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-slate-600 bg-slate-900/70 p-6 text-center text-sm text-slate-200"
                >
                  <p>
                    現場図面は必要なときだけ読み込みます。警報・気象・WBGTは周囲の状態欄で確認してください。
                  </p>
                  <button
                    type="button"
                    onClick={() => setFloorPlanReady(true)}
                    className="min-h-[44px] rounded-lg border border-emerald-500 bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    現場図面を表示する
                  </button>
                </div>
              ))}
            {displayMode === "map" && (
              <JapanPrefectureWarningMap
                levelsByIso={prefectureLevels}
                status={prefectureMapStatus}
                highlightIso={selectedLocation.prefectureIso}
              />
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
              status={
                bundleStatus === "success" && openMeteoDegraded
                  ? "error"
                  : bundleStatus
              }
              fetchedAt={bundle?.openMeteoFetchedAt}
              forecastFrom={bundle?.openMeteoForecastFrom}
              forecastThrough={bundle?.openMeteoForecastThrough}
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
          {/* 未検証の独自予測は停止し、一次情報・現場実測へ案内する。 */}
          <SignageRiskPrediction
            weatherData={state.riskData}
            status={state.riskStatus}
          />

          {/* 現場の安全状態: この端末の /site-records 記録キット（未是正指摘・要対策ヒヤリ等）を掲示。記録のない端末では非表示 */}
          <SignageSiteSafety data={siteSafety} />

          <section className="flex flex-col rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3 xl:min-h-0 xl:flex-1 xl:overflow-hidden xl:p-2">
            <h2 className="shrink-0 text-xs font-bold tracking-wide text-slate-100 sm:text-sm lg:text-base">
              トレンド（労働災害・建設事故）
            </h2>
            <p className="mt-0.5 shrink-0 text-[9px] leading-tight text-slate-300 sm:text-[10px]">
              <span>記事元を確認できます。</span>
            </p>
            {bundleStatus === "success" && laborRssDegraded ? (
              <p className="mt-2 rounded-lg border border-amber-500/60 bg-amber-950/50 p-2 text-xs font-bold text-amber-100 xl:text-lg">
                事故報道を取得できません。「事故報道なし」ではありません。
              </p>
            ) : null}
            {bundleStatus === "success" && bundle && !laborRssDegraded && bundle.laborTrend.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400 xl:text-lg">現在取得できるニュースがありません。</p>
            ) : null}
            {(bundleStatus === "loading" || bundleStatus === "idle") && trendItems.length === 0 ? (
              <div className="mt-2 h-20 animate-pulse rounded-lg bg-slate-800/80" />
            ) : null}
            {trendItems.length > 0 && (
              // 1件ずつ大きく表示して15〜20秒周期で全件を自動周回（T5: 隠れていたニュース2件目以降を露出）
              <div className="mt-2 flex min-h-0 flex-1 overflow-hidden">
                <SignageRotator
                  items={trendItems}
                  ariaLabel="トレンドニュース"
                  compactAtWide
                  getKey={(item, idx) => `${item.link}-${idx}`}
                  renderItem={(item, idx) => (
                    <button
                      type="button"
                      onClick={() => setZoomedTrendIndex(idx)}
                      data-signage-trend-trigger
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

          <section className="flex flex-col rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3 xl:min-h-0 xl:flex-1 xl:overflow-hidden xl:p-2">
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
              <div className="mt-2 flex min-h-0 flex-1 overflow-hidden">
                <SignageRotator
                  items={topLaws}
                  ariaLabel="直近の法改正"
                  compactAtWide
                  getKey={(rev) => rev.id}
                  renderItem={(rev) => (
                    <div className="h-full rounded-lg border border-slate-700 bg-slate-950/50 p-2 sm:rounded-xl sm:p-3 xl:p-4">
                      <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 sm:text-xs xl:text-lg">
                        <span className="rounded-full bg-sky-800 px-2 py-0.5 font-semibold text-white">{rev.kind}</span>
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
      </div>

      {showPresentationSettings && !isKiosk ? (
        <SignageDialog
          labelledBy="presentation-settings-title"
          onClose={() => setShowPresentationSettings(false)}
          panelClassName="ml-auto h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto border-sky-700 p-5 sm:p-6"
          returnFocusSelector="[data-signage-settings-trigger]"
        >
          <h2 id="presentation-settings-title" className="pr-24 text-2xl font-black text-white">
            サイネージ設定・詳細
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            表示中の地点、手動運用状態、全国の警報地図、編集・管理画面をここで確認します。
          </p>
          <label htmlFor="presentation-location" className="mt-6 block text-sm font-black text-white">
            表示地点
          </label>
          <select
            id="presentation-location"
            value={selectedLocationId}
            onChange={(event) => onLocationChange(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-500 bg-slate-900 px-3 text-base text-white focus-visible:ring-4 focus-visible:ring-sky-300"
          >
            {signageLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>

          <fieldset className="mt-6 rounded-xl border border-slate-600 p-4">
            <legend className="px-2 text-sm font-black text-white">熱中症カードの手動運用状態</legend>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              緊急・保守・訓練は自動検知ではありません。現場手順に基づいて明示的に切り替えてください。
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([
                ["automatic", "自動（取得状態）"],
                ["emergency", "緊急対応中"],
                ["maintenance", "保守中"],
                ["drill", "訓練モード"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={heatOperationalMode === mode}
                  onClick={() => setHeatOperationalMode(mode)}
                  className={`min-h-11 rounded-lg border-2 px-3 py-2 text-sm font-black ${
                    heatOperationalMode === mode
                      ? "border-white bg-white text-slate-950"
                      : "border-slate-500 bg-slate-900 text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <section aria-labelledby="presentation-map-title" className="mt-6 rounded-xl border border-slate-600 bg-white p-3 text-slate-950">
            <h3 id="presentation-map-title" className="text-lg font-black">全国の警報・注意報地図</h3>
            <p className="mt-1 text-sm">未確認地域は斜線で表示し、警報なしとは扱いません。</p>
            <div className="mt-3 max-h-[55vh] overflow-y-auto">
              <JapanPrefectureWarningMap
                levelsByIso={prefectureLevels}
                status={prefectureMapStatus}
                highlightIso={selectedLocation.prefectureIso}
              />
            </div>
          </section>

          <nav aria-label="サイネージの編集と管理" className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link href="/signage/map" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-sky-400 bg-sky-900 px-3 text-sm font-black text-white">
              詳細地図を開く
            </Link>
            <Link href="/signage/manage" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-500 bg-slate-800 px-3 text-sm font-black text-white">
              多拠点・端末管理
            </Link>
            <Link href="/about/usage-notes" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-black text-sky-200 underline underline-offset-4">
              注意事項
            </Link>
          </nav>
        </SignageDialog>
      ) : null}

      {/* 朝礼スクリプト（読み上げ）モーダル */}
      {showMorningScript && (
        <SignageDialog
          labelledBy="morning-script-dialog-title"
          onClose={() => setShowMorningScript(false)}
          panelClassName="max-w-2xl border-emerald-700 p-4 sm:p-6"
          returnFocusSelector="[data-signage-morning-trigger]"
        >
          <div className="mt-8">
            <h2 id="morning-script-dialog-title" className="sr-only">
              朝礼スクリプト
            </h2>
            <SignageMorningScript
              jmaHeadline={trustedJmaHeadline}
              warnings={trustedSelectedWarnings}
              topAccidentTitle={topAccidentTitle}
              topLawTitle={topLaws[0]?.title ?? null}
            />
          </div>
        </SignageDialog>
      )}

      {/* トレンドニュース拡大モーダル */}
      {zoomedTrend && (
        <SignageDialog
          labelledBy="trend-dialog-title"
          onClose={() => setZoomedTrendIndex(null)}
          panelClassName="max-w-4xl"
          returnFocusSelector="[data-signage-trend-trigger]"
        >
          <p className="text-xs text-slate-300 sm:text-sm">{zoomedTrend.pubDate || "日時不明"}</p>
          <h2 id="trend-dialog-title" className="mt-2 text-2xl font-bold leading-snug text-slate-50 sm:text-3xl lg:text-4xl">
            {zoomedTrend.title}
          </h2>
          <a
            href={zoomedTrend.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-lg border border-emerald-500 bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 sm:text-base"
          >
            記事を開く →
          </a>
        </SignageDialog>
      )}
      <Link
        href="/about/usage-notes"
        prefetch={false}
        className="mx-auto mb-2 block w-fit text-xs font-bold text-sky-200 underline underline-offset-4"
      >
        注意事項
      </Link>
      </div>
    </SignageShell>
  );
}
