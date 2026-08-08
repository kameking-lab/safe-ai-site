"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { HomeLocationSource } from "@/lib/area/coarse-location";
import type { OfficialAreaCandidate } from "@/lib/area/official-area-resolver";

const AREA_STORAGE_KEY = "safe-ai:coarse-area-id:v1";
const HOME_COARSE_AREA_COOKIE = "safe-ai-coarse-area-v1";
const AREA_INPUT_MAX = 80;

const LOCATION_LABELS: Record<HomeLocationSource, string> = {
  previous: "前回選択した地域（粗い区域）",
  "browser-granted": "現在地付近（端末内で都道府県へ変換）",
  "ip-coarse": "粗い地域（接続情報・ずれあり）",
  selected: "選択した地域（公式の粗い区域へ変換）",
  national: "全国の状況（地域は未特定）",
};

let areaResolverPromise:
  | Promise<typeof import("@/lib/area/official-area-resolver")>
  | null = null;

function loadAreaResolver() {
  areaResolverPromise ??= import("@/lib/area/official-area-resolver");
  return areaResolverPromise;
}

function readStoredAreaId(): string | null {
  try {
    return window.localStorage.getItem(AREA_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeCoarseAreaId(areaId: string): void {
  try {
    window.localStorage.setItem(AREA_STORAGE_KEY, areaId);
  } catch {
    // A storage refusal does not block the current tab or server refresh.
  }
  try {
    document.cookie = `${HOME_COARSE_AREA_COOKIE}=${encodeURIComponent(areaId)}; Path=/; Max-Age=15552000; SameSite=Lax${
      window.location.protocol === "https:" ? "; Secure" : ""
    }`;
  } catch {
    // The selected coarse ID remains in component memory for this view.
  }
}

export function HomeAreaPickerClient({
  initialAreaId,
  initialAreaLabel,
  initialLocationSource,
}: {
  initialAreaId: string | null;
  initialAreaLabel: string | null;
  initialLocationSource: HomeLocationSource;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const userEditedRef = useRef(false);
  const listId = useId();
  const [resolver, setResolver] = useState<
    typeof import("@/lib/area/official-area-resolver") | null
  >(null);
  const [areaId, setAreaId] = useState(initialAreaId);
  const [areaLabel, setAreaLabel] = useState(initialAreaLabel ?? "");
  const [source, setSource] = useState<HomeLocationSource>(
    initialLocationSource,
  );
  const [query, setQuery] = useState(initialAreaLabel ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [message, setMessage] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "resolving" | "denied" | "unavailable"
  >("idle");

  const ensureResolver = useCallback(async () => {
    const loaded = await loadAreaResolver();
    setResolver((current) => current ?? loaded);
    return loaded;
  }, []);

  useEffect(() => {
    pickerRef.current?.setAttribute(
      "data-home-area-picker-hydrated",
      "true",
    );
    const typedBeforeHydration =
      inputRef.current?.value.slice(0, AREA_INPUT_MAX) ?? "";
    if (!typedBeforeHydration || typedBeforeHydration === query) return;
    userEditedRef.current = true;
    const timer = window.setTimeout(() => {
      setQuery(typedBeforeHydration);
      setOpen(true);
      setActiveIndex(-1);
      setMessage(null);
      void ensureResolver();
    }, 0);
    return () => window.clearTimeout(timer);
    // `query` is the SSR value captured on mount. Later input uses the
    // controlled handlers below, so this boundary intentionally runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureResolver]);

  useEffect(() => {
    if (userEditedRef.current) return;
    setAreaId(initialAreaId);
    if (initialAreaLabel) {
      setAreaLabel(initialAreaLabel);
      setQuery((current) => current || initialAreaLabel);
      if (inputRef.current && !inputRef.current.value) {
        inputRef.current.value = initialAreaLabel;
      }
    }
  }, [initialAreaId, initialAreaLabel]);

  const choose = useCallback(
    (candidate: OfficialAreaCandidate, nextSource: HomeLocationSource) => {
      storeCoarseAreaId(candidate.id);
      setAreaId(candidate.id);
      setAreaLabel(candidate.label);
      setQuery(candidate.label);
      if (inputRef.current) inputRef.current.value = candidate.label;
      setSource(nextSource);
      setOpen(false);
      setActiveIndex(-1);
      setMessage(candidate.resolutionLabel);
      setLocationState("idle");
      router.refresh();
    },
    [router],
  );

  const updateFromDevice = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      setMessage("現在地を確認できません。地域名から変更できます。");
      return;
    }
    setLocationState("resolving");
    setMessage("現在地を確認しています。");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        void Promise.all([
          import("@/lib/area/browser-prefecture-resolver"),
          ensureResolver(),
        ])
          .then(([browserResolver, areaResolver]) =>
            browserResolver
              .resolveBrowserPrefectureIso(longitude, latitude)
              .then((prefectureIso) => ({ areaResolver, prefectureIso })),
          )
          .then(({ areaResolver, prefectureIso }) => {
            const candidate = prefectureIso
              ? areaResolver.officialAreaCandidateByPrefectureIso(prefectureIso)
              : null;
            if (!candidate) {
              setLocationState("unavailable");
              setMessage("都道府県へ変換できません。地域名から変更できます。");
              return;
            }
            choose(candidate, "browser-granted");
            setMessage(`${candidate.label}へ変更しました。`);
          })
          .catch(() => {
            setLocationState("unavailable");
            setMessage("現在地を確認できません。地域名から変更できます。");
          });
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        setLocationState(denied ? "denied" : "unavailable");
        setMessage(
          denied
            ? "位置情報は許可されていません。地域名から変更できます。"
            : "現在地を確認できません。地域名から変更できます。",
        );
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30 * 60 * 1000,
        timeout: 8_000,
      },
    );
  }, [choose, ensureResolver]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = readStoredAreaId();
      if (stored) {
        try {
          const loaded = await ensureResolver();
          const candidate = loaded.officialAreaCandidateById(stored);
          if (!active || userEditedRef.current) return;
          if (candidate) {
            if (candidate.id !== initialAreaId) choose(candidate, "previous");
            else setSource("previous");
            return;
          }
        } catch {
          // Invalid or unavailable stored data never becomes an area choice.
        }
      }
      if (userEditedRef.current) return;
      if (!navigator.permissions?.query) return;
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        if (
          active &&
          !userEditedRef.current &&
          permission.state === "granted"
        ) {
          updateFromDevice();
        }
      } catch {
        // A missing Permissions API must not trigger a permission prompt.
      }
    })();
    return () => {
      active = false;
    };
  }, [choose, ensureResolver, initialAreaId, updateFromDevice]);

  const resolution = useMemo(
    () => (resolver ? resolver.resolveOfficialAreaQuery(query) : null),
    [query, resolver],
  );
  const candidates = resolution?.candidates ?? [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    userEditedRef.current = true;
    const loaded = await ensureResolver();
    const current = loaded.resolveOfficialAreaQuery(query);
    if (activeIndex >= 0 && current.candidates[activeIndex]) {
      choose(current.candidates[activeIndex], "selected");
      return;
    }
    if (current.exact && current.unique) {
      choose(current.unique, "selected");
      return;
    }
    setOpen(true);
    setActiveIndex(-1);
    setMessage(
      current.candidates.length > 1
        ? "候補が複数あります。1件選んでください。"
        : current.candidates.length === 1
          ? "候補を選んでください。"
          : "対応する地域を確認できません。都道府県名または主要都市名で入力してください。",
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
    <details
      ref={pickerRef}
      suppressHydrationWarning
      className="group mt-2 rounded-xl border border-slate-400 bg-white px-3 text-slate-950"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          userEditedRef.current = true;
          void ensureResolver();
        }
      }}
      data-home-area-picker=""
      data-home-area-picker-hydrated="false"
      data-selected-area-id={areaId ?? ""}
    >
      <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 py-2 text-sm font-black focus-visible:ring-4 focus-visible:ring-orange-300">
        地域・観測情報
      </summary>
      <div className="border-t border-slate-300 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="inline-flex rounded-full border border-slate-400 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-800">
            {LOCATION_LABELS[source]}
          </p>
          {areaId ? (
            <a
              href={`/risk?area=${encodeURIComponent(areaId)}`}
              className="inline-flex min-h-11 items-center text-xs font-black text-blue-900 underline underline-offset-4"
            >
              詳しい観測情報
            </a>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            userEditedRef.current = true;
            updateFromDevice();
          }}
          disabled={locationState === "resolving"}
          className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-700 bg-white px-4 text-sm font-black text-slate-950 disabled:cursor-wait disabled:opacity-60"
        >
          {locationState === "resolving" ? "都道府県へ変換中" : "現在地を更新"}
        </button>
        <form onSubmit={(event) => void submit(event)} noValidate className="mt-3">
          <label htmlFor="home-area-change" className="text-sm font-black">
            都道府県・市区町村・主要都市
          </label>
          <div className="relative mt-2 flex gap-2">
            <div className="relative min-w-0 flex-1">
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
                value={query}
                onFocus={() => {
                  userEditedRef.current = true;
                  void ensureResolver();
                  setOpen(Boolean(query));
                }}
                onChange={(event) => {
                  userEditedRef.current = true;
                  const next = event.target.value.slice(0, AREA_INPUT_MAX);
                  setQuery(next);
                  setOpen(Boolean(next));
                  setActiveIndex(-1);
                  setMessage(null);
                  void ensureResolver();
                }}
                onKeyDown={(event) => {
                  userEditedRef.current = true;
                  handleKeyDown(event);
                }}
                placeholder="例：東京、新宿、とうきょう、大阪"
                className="min-h-12 w-full rounded-xl border-2 border-slate-600 bg-white px-3 text-base text-slate-950 placeholder:text-slate-500 focus:ring-4 focus:ring-orange-300"
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
                      onClick={() => choose(candidate, "selected")}
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
        </form>
        <noscript>
          <style>{`[data-home-area-picker] button,[data-home-area-picker] form{display:none!important}`}</style>
          <p className="mt-2">
            <a href="/risk" className="inline-flex min-h-11 items-center font-black underline">
              地域を選んで確認する
            </a>
          </p>
        </noscript>
        {message ? (
          <p
            className={`mt-2 text-xs font-bold leading-5 ${
              locationState === "denied" || locationState === "unavailable"
                ? "text-amber-950"
                : "text-slate-700"
            }`}
            role={locationState === "denied" ? "alert" : "status"}
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
        <span className="sr-only">現在の選択: {areaLabel || "未選択"}</span>
      </div>
    </details>
  );
}
