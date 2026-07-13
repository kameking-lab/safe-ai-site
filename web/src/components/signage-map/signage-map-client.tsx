"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Menu } from "lucide-react";
import { EarthquakeAlertModal } from "./earthquake-alert-modal";
import { MapLegend } from "./map-legend";
import { PinManager } from "./pin-manager";
import { useSignagePins } from "./use-signage-pins";
import { useWakeLock } from "@/lib/signage/use-wake-lock";
import { SignageDangerAlert } from "@/components/signage/signage-danger-alert";
import { deriveDangerAlertInput } from "@/lib/signage/danger-alert-source";
import type { SignagePin } from "./signage-map-leaflet";
import type {
  JmaEarthquakesFile,
  JmaIndexFile,
  JmaWarningsFile,
  JmaWeatherFile,
  JmaMapLevel,
  JmaWeatherEntry,
} from "@/lib/jma/jma-data";
import { isSevereIntensity } from "@/lib/jma/jma-data";

const SignageMapLeaflet = dynamic(() => import("./signage-map-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-sm text-slate-400">
      地図を読み込み中…
    </div>
  ),
});

type ApiBundle = {
  fetchedAt: string;
  source: string;
  sourceUrl: string;
  license: string;
  warnings: JmaWarningsFile;
  weather: JmaWeatherFile;
  earthquakes: JmaEarthquakesFile;
} & Pick<JmaIndexFile, "fetchedAt">;

type ViewState = { lat: number; lng: number; zoom: number };
const VIEW_STORAGE_KEY = "signage-map-view";
const SEEN_QUAKE_STORAGE_KEY = "signage-map-seen-quakes";
// 30分: Vercel Edge Requests 削減 (docs/perf/edge-isr-followup-2026-05-19.md)。
// 上流 /api/signage/jma の revalidate=3600 / CDN s-maxage=300 と整合。
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
// 取得失敗時は30分の定期更新を待たず短間隔で再試行し、無人表示の「古いまま放置」を縮める。
const ERROR_RETRY_INTERVAL_MS = 3 * 60 * 1000;
const DEFAULT_VIEW: ViewState = { lat: 36.5, lng: 138.0, zoom: 5 };

function isValidView(v: unknown): v is ViewState {
  if (!v || typeof v !== "object") return false;
  const o = v as ViewState;
  if (typeof o.lat !== "number" || o.lat < 24 || o.lat > 46) return false;
  if (typeof o.lng !== "number" || o.lng < 122 || o.lng > 154) return false;
  if (typeof o.zoom !== "number" || o.zoom < 4 || o.zoom > 18) return false;
  return true;
}

function readPersistedView(): ViewState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (isValidView(parsed)) return parsed;
  } catch {
    // noop
  }
  return null;
}

function readUrlView(): ViewState | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const zoom = Number(params.get("zoom"));
  const candidate = { lat, lng, zoom };
  return isValidView(candidate) ? candidate : null;
}

// 外部ストア化（useSyncExternalStore で SSR/CSR 整合）
let viewStore: ViewState = DEFAULT_VIEW;
let viewInitialized = false;
const viewSubscribers = new Set<() => void>();
function ensureInitialView(): ViewState {
  if (viewInitialized || typeof window === "undefined") return viewStore;
  viewInitialized = true;
  const fromUrl = readUrlView();
  if (fromUrl) {
    viewStore = fromUrl;
    return viewStore;
  }
  const persisted = readPersistedView();
  if (persisted) {
    viewStore = persisted;
  }
  return viewStore;
}
function subscribeView(cb: () => void) {
  viewSubscribers.add(cb);
  return () => {
    viewSubscribers.delete(cb);
  };
}
function setViewExternal(next: ViewState) {
  viewStore = next;
  viewSubscribers.forEach((cb) => cb());
}
function getServerView(): ViewState {
  return DEFAULT_VIEW;
}

function readSeenQuakes(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_QUAKE_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function persistSeenQuakes(set: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEEN_QUAKE_STORAGE_KEY, JSON.stringify(Array.from(set)));
}

export function SignageMapClient({ initialFullscreen = false }: { initialFullscreen?: boolean }) {
  const [bundle, setBundle] = useState<ApiBundle | null>(null);
  const [bundleStatus, setBundleStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("起動中…");

  const view = useSyncExternalStore(subscribeView, ensureInitialView, getServerView);
  const setView = useCallback((next: ViewState) => setViewExternal(next), []);

  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [alertedQuake, setAlertedQuake] = useState<JmaEarthquakesFile["items"][number] | null>(null);
  const seenQuakesRef = useRef<Set<string>>(new Set());

  const { pins, addPin, deletePin, limit } = useSignagePins();

  // 無人で1日流しっぱなしのフルスクリーン表示中は画面スリープを抑止する
  // （非対応ブラウザでは無害な no-op）。地図編集モードでは抑止しない。
  useWakeLock(initialFullscreen);

  // 地図表示用フォーカス（ピンクリック時の中心移動）
  const [focusOverride, setFocusOverride] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const effectiveCenter: [number, number] = useMemo(() => {
    if (focusOverride) return [focusOverride.lat, focusOverride.lng];
    return [view.lat, view.lng];
  }, [focusOverride, view.lat, view.lng]);
  const effectiveZoom = focusOverride?.zoom ?? view.zoom;

  // データ取得
  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    async function refresh() {
      setBundleStatus((s) => (s === "idle" ? "loading" : s));
      try {
        const res = await fetch("/api/signage/jma", { cache: "no-store" });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const json = (await res.json()) as ApiBundle;
        if (cancelled) return;
        setBundle(json);
        setBundleStatus("success");
        setLastRefreshedAt(new Intl.DateTimeFormat("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()));

        // 地震速報モーダル：未表示の震度5弱以上を1件選ぶ
        if (seenQuakesRef.current.size === 0) {
          seenQuakesRef.current = readSeenQuakes();
        }
        const next = json.earthquakes.items.find(
          (eq) => eq.eventId && isSevereIntensity(eq.maxIntensity) && !seenQuakesRef.current.has(eq.eventId),
        );
        if (next) {
          setAlertedQuake(next);
        }
      } catch {
        if (!cancelled) {
          setBundleStatus("error");
          // 失敗時は30分の定期更新を待たず短間隔で再試行（無人表示が古いまま放置されるのを防ぐ）
          window.clearTimeout(retryTimer);
          retryTimer = window.setTimeout(() => {
            if (cancelled) return;
            if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
            void refresh();
          }, ERROR_RETRY_INTERVAL_MS);
        }
      }
    }
    void refresh();
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(retryTimer);
    };
  }, []);

  // ビュー変更 → URL & localStorage 同期（debounce）
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (view === DEFAULT_VIEW) return; // 初期は書き込まない
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("lat", view.lat.toFixed(4));
      params.set("lng", view.lng.toFixed(4));
      params.set("zoom", String(view.zoom));
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", url);
      window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(view));
    }, 400);
    return () => window.clearTimeout(t);
  }, [view]);

  function handleViewChange(lat: number, lng: number, zoom: number) {
    const candidate = { lat, lng, zoom };
    if (!isValidView(candidate)) return; // 0,0,0 などは無視（leaflet初期化レース対策）
    setView(candidate);
    if (focusOverride) setFocusOverride(null);
  }

  function handlePinAdd(lat: number, lng: number) {
    setPendingCoords({ lat, lng });
    setSidePanelOpen(true);
  }

  function handlePinFocus(pin: SignagePin) {
    setFocusOverride({ lat: pin.lat, lng: pin.lng, zoom: Math.max(view.zoom, 12) });
  }

  function dismissEarthquakeModal() {
    if (alertedQuake?.eventId) {
      const next = new Set(seenQuakesRef.current);
      next.add(alertedQuake.eventId);
      seenQuakesRef.current = next;
      persistSeenQuakes(next);
    }
    setAlertedQuake(null);
  }

  async function copyShareUrl() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1500);
    } catch {
      // noop
    }
  }

  const warningLevels = useMemo<Record<string, JmaMapLevel>>(() => {
    const out: Record<string, JmaMapLevel> = {};
    if (!bundle) return out;
    for (const [iso, v] of Object.entries(bundle.warnings.byIso)) {
      out[iso] = v.level;
    }
    return out;
  }, [bundle]);

  const weatherEntries = useMemo<Record<string, JmaWeatherEntry>>(() => {
    return bundle?.weather.byIso ?? {};
  }, [bundle]);

  const headlines = useMemo(() => {
    if (!bundle) return [];
    const items: { iso: string; headline: string; level: JmaMapLevel }[] = [];
    for (const [iso, v] of Object.entries(bundle.warnings.byIso)) {
      for (const e of v.entries) {
        if (e.headline) items.push({ iso, headline: e.headline, level: v.level });
      }
    }
    return items.slice(0, 8);
  }, [bundle]);

  // 全画面赤アラートの自動発動入力: 警報・特別警報レベルのみを抽出（注意報の誤発動を防ぐ）
  const dangerAlert = useMemo(() => deriveDangerAlertInput(bundle?.warnings.byIso), [bundle]);

  return (
    <div className={`relative ${initialFullscreen ? "h-screen w-screen" : "min-h-[640px] h-[calc(100vh-80px)] w-full"} bg-slate-900 text-slate-100`}>
      <div className="absolute inset-0 flex">
        <div className="relative flex-1">
          <SignageMapLeaflet
            warningsByIso={warningLevels}
            weatherByIso={weatherEntries}
            earthquakes={bundle?.earthquakes.items ?? []}
            pins={pins}
            initialCenter={effectiveCenter}
            initialZoom={effectiveZoom}
            onPinAdd={handlePinAdd}
            onPinDelete={deletePin}
            onViewChange={handleViewChange}
          />

          {/* 出典明記オーバーレイ（全画面表示） */}
          <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded bg-slate-900/85 px-3 py-1.5 text-[11px] text-slate-100 shadow ring-1 ring-slate-600">
            データ提供：気象庁 ・地図：国土地理院（淡色地図）
          </div>

          {/* 最終更新 */}
          <div className="pointer-events-none absolute right-2 top-2 z-[400] rounded bg-slate-900/85 px-3 py-1.5 text-[11px] text-slate-100 shadow ring-1 ring-slate-600">
            最終更新: {lastRefreshedAt}
            {bundleStatus === "error" ? (
              <span className="ml-2 text-rose-300">取得エラー</span>
            ) : null}
          </div>

          {/* サイドパネル開閉ボタン（パネル閉時に表示） */}
          {!sidePanelOpen ? (
            <button
              type="button"
              onClick={() => setSidePanelOpen(true)}
              className="absolute right-2 top-12 z-[400] inline-flex min-h-[44px] items-center rounded border border-slate-600 bg-slate-900/85 px-3 text-xs font-bold text-slate-100 shadow hover:bg-slate-800"
            >
              <Menu className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />パネルを開く
            </button>
          ) : null}
        </div>

        {/* 右サイドパネル */}
        {sidePanelOpen ? (
          <aside className="z-[450] w-[320px] shrink-0 overflow-y-auto border-l border-slate-700 bg-slate-950/95 p-4 backdrop-blur-sm xl:w-[360px]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-50">サイネージ地図</h2>
              <button
                type="button"
                onClick={() => setSidePanelOpen(false)}
                className="inline-flex min-h-[44px] items-center rounded border border-slate-600 px-3 text-[11px] text-slate-300 hover:bg-slate-800"
              >
                ✕ 閉じる
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">全国の警報・地震・天気を地図で監視（台風・地震時の防災用）</p>
            <Link
              href="/signage"
              className="mt-2 inline-flex min-h-[44px] items-center rounded border border-slate-600 px-2.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              title="気象・本日のリスク・現場の安全状態・ニュース・法改正の常設ダッシュボード"
            >
              ← 朝礼ダッシュボードへ
            </Link>

            <div className="mt-3 space-y-1 text-[11px] text-slate-400">
              <p>取得時刻: {bundle?.fetchedAt ?? "取得中…"}</p>
              <p>
                データ提供:{" "}
                <a href={bundle?.sourceUrl ?? "https://www.jma.go.jp/bosai/"} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                  気象庁
                </a>
              </p>
            </div>

            {/* 共有URL */}
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-[11px] text-slate-300">この地図表示を共有</p>
              <button
                type="button"
                onClick={copyShareUrl}
                className="inline-flex min-h-[44px] items-center justify-center rounded bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-500"
              >
                {shareCopied ? "コピーしました ✓" : "現在のURLをコピー"}
              </button>
              <Link
                href={`/signage/display?fullscreen=true&lat=${view.lat.toFixed(4)}&lng=${view.lng.toFixed(4)}&zoom=${view.zoom}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded border border-emerald-500 px-3 text-center text-xs font-bold text-emerald-300 hover:bg-emerald-950/40"
              >
                フルスクリーン表示 →
              </Link>
            </div>

            {/* 警報ヘッドライン */}
            <section className="mt-4">
              <h3 className="text-sm font-bold text-slate-100">発表中のヘッドライン</h3>
              <ul className="mt-2 space-y-2">
                {headlines.length === 0 ? (
                  <li className="rounded border border-dashed border-slate-700 px-3 py-3 text-center text-[11px] text-slate-500">
                    現在発表中のヘッドラインはありません
                  </li>
                ) : (
                  headlines.map((h, idx) => (
                    <li key={`${h.iso}-${idx}`} className="rounded border border-slate-700 bg-slate-900/60 p-2 text-[11px] leading-snug">
                      <p className="text-amber-200">{h.headline}</p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <div className="mt-4">
              <MapLegend />
            </div>

            <div className="mt-4">
              <PinManager
                pins={pins}
                pendingCoords={pendingCoords}
                onClearPending={() => setPendingCoords(null)}
                onAdd={addPin}
                onDelete={deletePin}
                onFocus={handlePinFocus}
                limit={limit}
              />
            </div>

            <div className="mt-6 border-t border-slate-700 pt-3 text-[10px] text-slate-500">
              <p>30分ごとに自動更新（タブが表示中のときのみ。取得失敗時は3分後に再試行）。</p>
              <p>
                <Link href="/about/data-sources" className="underline hover:text-slate-300">
                  データソースの詳細・出典 →
                </Link>
              </p>
            </div>
          </aside>
        ) : null}
      </div>

      {/* 危険イベント全画面アラート: 高リスク警報(特別警報/暴風/大雨/落雷/地震/津波)を検知すると
          全画面赤表示＋音声で読み上げる。無人運用こそ自動発動が要るためキオスクにも結線する。
          ・サイドパネルの開閉に関わらず常時マウント＝パネルを閉じても監視が止まらない(安全機能の無音化を防ぐ)。
          ・バーは地図左上(ズームコントロールを避け left-14)に絶対配置。z-[1100] は Leaflet コントロール(z~1000)
            より前面＝全画面赤オーバーレイが地図UIを完全に覆う。transform を使わないため
            内部の fixed inset-0 オーバーレイはビューポート全面を覆い1画面フィットを壊さない。
          ・「警報時に自動発動」は localStorage 永続で再読込後も監視を継続。 */}
      <div className="absolute left-14 top-2 z-[1100] max-w-[calc(100%-4rem)]">
        <SignageDangerAlert jmaHeadline={dangerAlert.jmaHeadline} warnings={dangerAlert.warnings} />
      </div>

      <EarthquakeAlertModal earthquake={alertedQuake} onClose={dismissEarthquakeModal} />
    </div>
  );
}
