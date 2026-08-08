"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { LocateFixed, MapPinned, Search } from "lucide-react";
import type {
  EnvironmentNationalHeatAlertSummary,
  EnvironmentWbgtStatus,
} from "@/lib/heat-illness/environment-wbgt";
import {
  officialAreaCandidateById,
  officialAreaCandidateByPrefectureIso,
  resolveOfficialAreaQuery,
  type OfficialAreaCandidate,
} from "@/lib/area/official-area-resolver";
import { resolveBrowserPrefectureIso } from "@/lib/area/browser-prefecture-resolver";
import {
  HOME_COARSE_AREA_COOKIE,
  type HomeLocationSource,
} from "@/lib/area/coarse-location";
import { AreaHeatStatus } from "./area-heat-status";
import {
  ChatQuickAsk,
  ChemicalQuickSearch,
  HeatSlideDeck,
  type HomeHeatSlideSummary,
  type HomeSafetyState,
} from "./home-safety-cockpit-client";

const AREA_STORAGE_KEY = "safe-ai:coarse-area-id:v1";
const DEFAULT_HOME_HEAT_SLIDES: HomeHeatSlideSummary[] = [
  {
    id: "cover",
    eyebrow: "今日のリスク",
    title: "熱中症を防ぐ現場ブリーフィング",
    lead: "測る。変える。声をかける。迷わずつなぐ。",
    fieldAction: "地域のWBGTと警戒情報を確認してから、今日の作業計画へ進む。",
  },
  {
    id: "measure-and-change",
    eyebrow: "作業前・作業中",
    title: "WBGTを測り、作業を変える",
    lead: "値と作業強度に合わせて、時間帯・人数・休憩を調整します。",
    fieldAction: "測定値を共有し、休憩と水分・塩分の時刻を決める。",
  },
  {
    id: "stop-and-connect",
    eyebrow: "異常を感じたら",
    title: "一人にせず、作業を止める",
    lead: "涼しい場所へ移し、衣服を緩めて冷却します。",
    fieldAction: "意識がない、反応がおかしい、自力で飲めない時は119へ連絡する。",
  },
];

const LOCATION_LABELS: Record<HomeLocationSource, string> = {
  previous: "前回選択した地域（粗い区域）",
  "browser-granted": "現在地付近（端末内で都道府県へ変換）",
  "ip-coarse": "粗い地域（接続情報・ずれあり）",
  selected: "選択した地域（公式の粗い区域へ変換）",
  national: "全国の状況（地域は未特定）",
};

function safeStoredAreaId(): string | null {
  try {
    const value = window.localStorage.getItem(AREA_STORAGE_KEY);
    return value && officialAreaCandidateById(value) ? value : null;
  } catch {
    return null;
  }
}

function storeCoarseAreaId(areaId: string): void {
  if (!officialAreaCandidateById(areaId)) return;
  try {
    window.localStorage.setItem(AREA_STORAGE_KEY, areaId);
  } catch {
    // Storage refusal does not prevent the live display.
  }
  try {
    document.cookie = `${HOME_COARSE_AREA_COOKIE}=${encodeURIComponent(areaId)}; Path=/; Max-Age=15552000; SameSite=Lax${
      window.location.protocol === "https:" ? "; Secure" : ""
    }`;
  } catch {
    // Cookie refusal keeps the client-side fallback available.
  }
}

function AreaChangeForm({
  selectedAreaId,
  onSelect,
}: {
  selectedAreaId: string | null;
  onSelect: (candidate: OfficialAreaCandidate) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = selectedAreaId
    ? officialAreaCandidateById(selectedAreaId)
    : null;
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [message, setMessage] = useState<string | null>(null);
  const resolution = useMemo(() => resolveOfficialAreaQuery(query), [query]);
  const candidates = resolution.candidates;

  useEffect(() => {
    const typedBeforeHydration = inputRef.current?.value.slice(0, AREA_INPUT_MAX) ?? "";
    if (!selectedAreaId) {
      if (typedBeforeHydration) {
        const timer = window.setTimeout(() => {
          setQuery(typedBeforeHydration);
          setOpen(true);
        }, 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }
    const next = selectedAreaId
      ? officialAreaCandidateById(selectedAreaId)?.label
      : null;
    if (!next) return;
    const timer = window.setTimeout(() => {
      setQuery(next);
      if (inputRef.current) inputRef.current.value = next;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedAreaId]);

  const choose = (candidate: OfficialAreaCandidate) => {
    storeCoarseAreaId(candidate.id);
    setQuery(candidate.label);
    if (inputRef.current) inputRef.current.value = candidate.label;
    setOpen(false);
    setActiveIndex(-1);
    setMessage(candidate.resolutionLabel);
    onSelect(candidate);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (activeIndex >= 0 && candidates[activeIndex]) {
      choose(candidates[activeIndex]);
      return;
    }
    if (resolution.exact && resolution.unique) {
      choose(resolution.unique);
      return;
    }
    setOpen(true);
    setActiveIndex(-1);
    setMessage(
      candidates.length > 1
        ? "候補が複数あります。都道府県と変換先を確認して1件選んでください。"
        : candidates.length === 1
          ? "候補を選ぶと、ホームの表示地域を更新します。"
          : "対応する公式区域を確認できません。都道府県名または主要都市名で入力してください。",
    );
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && candidates.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        index < candidates.length - 1 ? index + 1 : 0,
      );
    } else if (event.key === "ArrowUp" && candidates.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        index > 0 ? index - 1 : candidates.length - 1,
      );
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="home-area-change" className="text-sm font-black">
        都道府県・市区町村・主要都市
      </label>
      <div className="relative mt-2 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id="home-area-change"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && candidates.length > 0}
            aria-controls={listId}
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            autoComplete="off"
            maxLength={AREA_INPUT_MAX}
            defaultValue={query}
            suppressHydrationWarning
            onChange={(event) => {
              setQuery(event.target.value.slice(0, AREA_INPUT_MAX));
              setOpen(Boolean(event.target.value));
              setActiveIndex(-1);
              setMessage(null);
            }}
            onFocus={() =>
              setOpen(Boolean(inputRef.current?.value ?? query))
            }
            onKeyDown={handleKeyDown}
            placeholder="例：東京、新宿、とうきょう、大阪"
            className="min-h-12 w-full rounded-xl border-2 border-slate-600 bg-white py-2 pl-10 pr-3 text-base text-slate-950 placeholder:text-slate-500 focus:ring-4 focus:ring-orange-300"
          />
          {open && candidates.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="地域候補"
              className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border-2 border-slate-500 bg-white p-1 text-slate-950 shadow-xl"
            >
              {candidates.map((candidate, index) => (
                <li
                  id={`${listId}-option-${index}`}
                  key={candidate.id}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(candidate)}
                  className={`min-h-11 cursor-pointer rounded-lg px-3 py-2 text-sm ${
                    activeIndex === index
                      ? "bg-orange-100 outline outline-2 outline-orange-700"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-black">{candidate.label}</span>
                  <span className="block text-xs text-slate-600">
                    {candidate.resolutionLabel}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="submit"
          className="min-h-12 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-black text-white focus-visible:ring-4 focus-visible:ring-orange-300"
        >
          変更
        </button>
      </div>
      {message ? (
        <p className="mt-2 text-xs leading-5 text-slate-600" aria-live="polite">
          {message}
        </p>
      ) : null}
    </form>
  );
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
        <p role="alert" data-warning-card className="mt-2 text-xs font-bold text-rose-950">
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

export function HomeHeatExperienceClient({
  initialAreaId,
  initialLocationSource,
  initialWbgt,
  nationalSummary,
  slides = DEFAULT_HOME_HEAT_SLIDES,
}: {
  initialAreaId: string | null;
  initialLocationSource: HomeLocationSource;
  initialWbgt: EnvironmentWbgtStatus | null;
  nationalSummary: EnvironmentNationalHeatAlertSummary | null;
  slides?: HomeHeatSlideSummary[];
}) {
  const [areaId, setAreaId] = useState(initialAreaId);
  const [source, setSource] = useState<HomeLocationSource>(
    initialLocationSource,
  );
  const [locationState, setLocationState] = useState<
    "idle" | "resolving" | "denied" | "unavailable"
  >("idle");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const updateFromDevice = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      setLocationMessage(
        "このブラウザでは位置情報を利用できません。地域名から変更してください。",
      );
      return;
    }
    setLocationState("resolving");
    setLocationMessage("現在地を確認しています。");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        void resolveBrowserPrefectureIso(longitude, latitude)
          .then((prefectureIso) => {
            const candidate = prefectureIso
              ? officialAreaCandidateByPrefectureIso(prefectureIso)
              : null;
            if (!candidate) {
              setLocationState("unavailable");
              setLocationMessage(
                "現在地を対応する都道府県へ照合できませんでした。地域名から変更してください。",
              );
              return;
            }
            storeCoarseAreaId(candidate.id);
            setAreaId(candidate.id);
            setSource("browser-granted");
            setLocationState("idle");
            setLocationMessage(`${candidate.label}に変更しました。`);
          })
          .catch(() => {
            setLocationState("unavailable");
            setLocationMessage(
              "都道府県境界データを確認できませんでした。地域名から変更してください。",
            );
          });
      },
      (error) => {
        setLocationState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "位置情報は許可されていません。地域名から変更できます。"
            : "現在地を確認できませんでした。地域名から変更してください。",
        );
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30 * 60 * 1000,
        timeout: 8_000,
      },
    );
  }, []);

  useEffect(() => {
    const stored = safeStoredAreaId();
    if (stored) {
      storeCoarseAreaId(stored);
      queueMicrotask(() => {
        setAreaId(stored);
        setSource("previous");
      });
      return;
    }
    if (!navigator.permissions?.query) return;
    let active = true;
    void navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (active && permission.state === "granted") updateFromDevice();
      })
      .catch(() => {
        // A missing Permissions API does not trigger a permission prompt.
      });
    return () => {
      active = false;
    };
  }, [updateFromDevice]);

  return (
      <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
      <div className="min-w-0">
        {areaId ? (
          <AreaHeatStatus
            areaId={areaId}
            initialWbgt={initialWbgt}
            locationContextLabel={LOCATION_LABELS[source]}
            headingLevel={2}
          />
        ) : (
          <NationalHeatSummary summary={nationalSummary} />
        )}

        <details
          suppressHydrationWarning
          className="group mt-2 rounded-xl border border-slate-400 bg-white px-3 text-slate-950"
        >
          <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 py-2 text-sm font-black focus-visible:ring-4 focus-visible:ring-orange-300">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            地域・観測情報を変更
          </summary>
          <div className="border-t border-slate-300 py-3">
            <button
              type="button"
              onClick={updateFromDevice}
              disabled={locationState === "resolving"}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-700 bg-white px-4 text-sm font-black text-slate-950 disabled:cursor-wait disabled:opacity-60"
            >
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
              {locationState === "resolving" ? "都道府県へ変換中" : "現在地を更新"}
            </button>
            <div className="mt-2 rounded-xl bg-slate-50 p-3">
              <AreaChangeForm
                selectedAreaId={areaId}
                onSelect={(candidate) => {
                  setAreaId(candidate.id);
                  setSource("selected");
                  setLocationState("idle");
                  setLocationMessage(candidate.resolutionLabel);
                }}
              />
            </div>
            {locationMessage ? (
              <p
                className={`mt-2 rounded-xl border px-3 py-2 text-xs font-bold leading-5 ${
                  locationState === "denied" || locationState === "unavailable"
                    ? "border-amber-600 bg-amber-50 text-amber-950"
                    : "border-sky-300 bg-sky-50 text-sky-950"
                }`}
                role={locationState === "denied" ? "alert" : "status"}
              >
                {locationMessage}
              </p>
            ) : null}
          </div>
        </details>
      </div>

      <div className="min-w-0">
        <HeatSlideDeck slides={slides} />
      </div>
    </div>
  );
}

export function HomeDirectChemicalClient() {
  return <ChemicalQuickSearch />;
}

export function HomeDirectChatClient() {
  const [safetyState, setSafetyState] =
    useState<HomeSafetyState>("normal");
  return (
    <div data-home-chat-safety-state={safetyState}>
      <ChatQuickAsk onSafetyStateChange={setSafetyState} />
    </div>
  );
}
const AREA_INPUT_MAX = 80;
