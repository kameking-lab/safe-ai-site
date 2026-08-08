"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronRight,
  FlaskConical,
  LocateFixed,
  MessageSquareText,
  Presentation,
  Search,
  ThermometerSun,
} from "lucide-react";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import {
  confirmChemicalCatalogSelection,
  searchChemicalCatalog,
} from "@/lib/chemical/search-client";
import { inspectChemicalNavigationQuery } from "@/lib/chemical/query-safety";
import {
  officialAreaCandidateById,
  resolveOfficialAreaQuery,
  type OfficialAreaCandidate,
} from "@/lib/area/official-area-resolver";
import { MascotGuide } from "@/components/mascot-guide";
import { AreaHeatStatus } from "./area-heat-status";
import { useTransientQueryBridge } from "./transient-query-bridge";
import { prefetchCockpitRoute } from "@/lib/home-cockpit-prefetch";
import {
  countBucket,
  elapsedBucket,
  trackHomeCockpitEvent,
} from "@/lib/home-cockpit-telemetry";

export type HomeHeatSlideSummary = {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  fieldAction: string;
};

type MobilePanel = "heat" | "slides" | "chemical" | "chat";
export type HomeSafetyState = "normal" | "emergency";

const AREA_STORAGE_KEY = "safe-ai:coarse-area-id:v1";
const AREA_INPUT_MAX = 80;
const CHEMICAL_INPUT_MAX = 120;
const CHAT_INPUT_MAX = 4_000;

function navigationStartedAt(startedAt: number): number {
  const elapsed = Math.max(0, performance.now() - startedAt);
  performance.mark("home-cockpit-navigation-start");
  document.documentElement.dataset.homeCockpitNavigationMs =
    elapsed.toFixed(1);
  return elapsed;
}

function safeStoredAreaId(): string | null {
  try {
    const value = window.localStorage.getItem(AREA_STORAGE_KEY);
    return value && officialAreaCandidateById(value) ? value : null;
  } catch {
    return null;
  }
}

function storeCoarseAreaId(areaId: string): void {
  try {
    window.localStorage.setItem(AREA_STORAGE_KEY, areaId);
  } catch {
    // Storage refusal does not prevent navigation or live display.
  }
}

function identityLabel(candidate: MergedChemical): string {
  if (candidate.cas === "95-47-6") return "o-キシレン（異性体）";
  if (candidate.cas === "106-42-3") return "p-キシレン（異性体）";
  if (candidate.cas === "108-38-3") return "m-キシレン（異性体）";
  if (candidate.cas === "1330-20-7") return "キシレン（異性体混合物）";
  if (!candidate.cas) return "混合物・群指定名（CASなし）";
  return "CASで識別する候補";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function AreaQuickSearch({
  selectedAreaId,
}: {
  selectedAreaId: string | null;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [message, setMessage] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "error"
  >("idle");

  const resolution = useMemo(
    () => resolveOfficialAreaQuery(query),
    [query],
  );
  const candidates = resolution.candidates;

  useEffect(() => {
    if (!selectedAreaId || query) return;
    const selected = officialAreaCandidateById(selectedAreaId);
    if (!selected) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setQuery(selected.label);
    });
    return () => {
      cancelled = true;
    };
  }, [query, selectedAreaId]);

  const navigate = useCallback(
    (candidate: OfficialAreaCandidate, startedAt = performance.now()) => {
      storeCoarseAreaId(candidate.id);
      setQuery(candidate.label);
      setOpen(false);
      setMessage(candidate.resolutionLabel);
      trackHomeCockpitEvent("home_area_resolved", {
        action_type: "area",
        area_resolution_level: candidate.resolutionLevel,
        destination_route_template: "/risk",
        elapsed_bucket: elapsedBucket(navigationStartedAt(startedAt)),
      });
      router.push(`/risk?area=${encodeURIComponent(candidate.id)}`);
    },
    [router],
  );

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const startedAt = performance.now();
    if (activeIndex >= 0 && candidates[activeIndex]) {
      navigate(candidates[activeIndex], startedAt);
      return;
    }
    if (resolution.exact && resolution.unique) {
      navigate(resolution.unique, startedAt);
      return;
    }
    setOpen(true);
    setActiveIndex(-1);
    if (resolution.exact && candidates.length > 1) {
      setMessage(
        "同名の地域が複数あります。都道府県と区域表示を確認して候補を選んでください。",
      );
      trackHomeCockpitEvent("home_area_resolved", {
        action_type: "area",
        area_resolution_level: "ambiguous",
        count_bucket: countBucket(candidates.length),
      });
    } else if (candidates.length > 0) {
      setMessage("候補を1件選ぶと、追加操作なしで詳細へ進みます。");
    } else {
      setMessage(
        "対応する公式区域を一意に確認できません。都道府県名または主要都市名で入力してください。",
      );
    }
    inputRef.current?.focus();
  };

  const locate = () => {
    // Representative-point proximity can cross a prefectural or national
    // boundary. Until a verified point-in-official-polygon resolver is
    // available, fail closed without requesting precise coordinates.
    setLocationState("error");
    setMessage(
      "現在地を公式区域へ安全に照合できないため、位置情報は要求していません。都道府県名または対応する都市名を入力してください。",
    );
    inputRef.current?.focus();
  };

  return (
    <div
      className="flex h-full flex-col gap-3 max-[339px]:gap-2"
      data-area-quick-search=""
    >
      <form onSubmit={submit} noValidate>
        <label
          htmlFor="home-area-search"
          className="block text-sm font-black text-slate-950"
        >
          地域を入力してWBGT・熱中症警戒情報を見る
        </label>
        <div className="relative mt-2 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="home-area-search"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && candidates.length > 0}
              aria-controls={listId}
              aria-activedescendant={
                activeIndex >= 0
                  ? `${listId}-option-${activeIndex}`
                  : undefined
              }
              autoComplete="off"
              inputMode="search"
              maxLength={AREA_INPUT_MAX}
              value={query}
              onFocus={() => {
                setOpen(Boolean(query));
                prefetchCockpitRoute(router, "/risk");
              }}
              onChange={(event) => {
                const next = event.target.value.slice(0, AREA_INPUT_MAX);
                setQuery(next);
                setOpen(Boolean(next));
                setActiveIndex(-1);
                setMessage(null);
                setLocationState("idle");
                if (next && !startedRef.current) {
                  startedRef.current = true;
                  trackHomeCockpitEvent("home_area_search_start", {
                    action_type: "area",
                  });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && candidates.length > 0) {
                  event.preventDefault();
                  setOpen(true);
                  setActiveIndex((index) =>
                    index < candidates.length - 1 ? index + 1 : 0,
                  );
                } else if (
                  event.key === "ArrowUp" &&
                  candidates.length > 0
                ) {
                  event.preventDefault();
                  setOpen(true);
                  setActiveIndex((index) =>
                    index > 0 ? index - 1 : candidates.length - 1,
                  );
                } else if (event.key === "Escape") {
                  setOpen(false);
                  setActiveIndex(-1);
                  setMessage(null);
                }
              }}
              placeholder="例：東京、新宿、とうきょう、大阪、札幌"
              className="min-h-12 w-full rounded-xl border-2 border-emerald-700 bg-white py-2 pl-10 pr-3 text-base text-slate-950 shadow-sm placeholder:text-slate-500 focus:ring-4 focus:ring-emerald-300 forced-colors:border-[CanvasText]"
            />
            {open && candidates.length > 0 && (
              <ul
                id={listId}
                role="listbox"
                aria-label="地域候補"
                className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border-2 border-slate-300 bg-white p-1 shadow-xl"
              >
                {candidates.map((candidate, index) => (
                  <li
                    id={`${listId}-option-${index}`}
                    key={candidate.id}
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => navigate(candidate)}
                    className={`min-h-11 cursor-pointer rounded-lg px-3 py-2 text-left text-sm focus-visible:ring-4 focus-visible:ring-emerald-300 ${
                      activeIndex === index
                        ? "bg-emerald-100 text-emerald-950"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-black">{candidate.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      {candidate.resolutionLabel}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            data-primary-action=""
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-black text-white hover:bg-emerald-900 focus-visible:ring-4 focus-visible:ring-emerald-300"
          >
            確認
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p
            className="text-xs text-slate-600 max-[339px]:sr-only"
            aria-live="polite"
            aria-atomic="true"
          >
            {query && open
              ? `${candidates.length}件の候補。${
                  resolution.exact && resolution.unique
                    ? "Enterで詳細へ進めます。"
                    : candidates.length > 1
                      ? "候補を選択してください。"
                      : ""
                }`
              : "都道府県・県庁所在地・対応する主要都市・東京23区・かな表記に対応"}
          </p>
          <button
            type="button"
            onClick={locate}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-black text-slate-900 disabled:cursor-wait disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            現在地の扱いを確認
          </button>
        </div>
        {message && (
          <p
            role={
              resolution.exact && resolution.unique ? "status" : "alert"
            }
            className={`mt-2 rounded-lg border px-3 py-2 text-xs font-bold leading-5 ${
              locationState === "error" ||
              (resolution.exact && candidates.length > 1)
                ? "border-amber-500 bg-amber-50 text-amber-950"
                : "border-sky-300 bg-sky-50 text-sky-950"
            }`}
          >
            {message}
          </p>
        )}
      </form>
      <div className="min-h-0 flex-1">
        <AreaHeatStatus areaId={selectedAreaId} compact />
      </div>
    </div>
  );
}

export function HeatSlideDeck({ slides }: { slides: HomeHeatSlideSummary[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const current = slides[index] ?? slides[0];
  const total = slides.length;

  const goTo = useCallback(
    (next: number) => {
      const bounded = Math.max(0, Math.min(total - 1, next));
      setIndex(bounded);
    },
    [total],
  );

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    trackHomeCockpitEvent("home_heat_slide_view", {
      action_type: "slide",
      count_bucket: countBucket(index + 1),
    });
  }, [index, visible]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(total - 1);
    }
  };

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || Math.abs(end - start) < 45) {
      return;
    }
    goTo(end < start ? index + 1 : index - 1);
  };

  if (!current) return null;
  return (
    <section
      ref={sectionRef}
      aria-labelledby="home-heat-slides-title"
      className="rounded-2xl border-2 border-orange-500 bg-slate-950 p-2.5 text-white shadow-sm"
      data-home-heat-slide-deck=""
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black tracking-wider text-orange-300">
            内容確認中・自動再生なし
          </p>
          <h2 id="home-heat-slides-title" className="text-base font-black">
            熱中症スライド
          </h2>
        </div>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          スライド {index + 1} / {total}: {current.title}
        </span>
      </div>

      <div
        ref={deckRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="熱中症を防ぐ現場ブリーフィング"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="mt-2 h-24 overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-orange-950 via-slate-950 to-cyan-950 p-2.5 focus-visible:ring-4 focus-visible:ring-orange-300 motion-reduce:scroll-auto"
      >
        <article
          key={current.id}
          aria-label={`スライド${index + 1}、${current.title}`}
          data-current-slide={current.id}
          className="motion-safe:animate-[fade-in_.18s_ease-out] motion-reduce:animate-none"
        >
          <p className="text-[10px] font-black tracking-widest text-cyan-300">
            {current.eyebrow}
          </p>
          <h3 className="mt-0.5 text-base font-black leading-tight">
            {current.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs font-semibold leading-4 text-slate-100">
            {current.lead}
          </p>
          <p className="mt-1 line-clamp-2 rounded-lg bg-white/10 p-1.5 text-[11px] font-bold leading-4">
            今日の確認：{current.fieldAction}
          </p>
        </article>
      </div>

      <div
        role="progressbar"
        aria-label="熱中症スライドの進捗"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"
      >
        <span
          className="block h-full rounded-full bg-orange-400 motion-reduce:transition-none"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="前のスライド"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/50 bg-white/10 disabled:opacity-40"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="min-w-0 flex-1 text-center text-xs font-black tabular-nums">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === total - 1}
          aria-label="次のスライド"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/50 bg-white/10 disabled:opacity-40"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function ChemicalQuickSearch() {
  const router = useRouter();
  const { stageChemicalQuery } = useTransientQueryBridge();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const requestSequence = useRef(0);
  const lastCompletedSearch = useRef<{
    query: string;
    items: MergedChemical[];
  } | null>(null);
  const inFlightSearch = useRef<{
    query: string;
    promise: Promise<MergedChemical[] | null>;
  } | null>(null);
  const startedRef = useRef(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<MergedChemical[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runSearch = useCallback(async (
    rawQuery: string,
  ): Promise<MergedChemical[] | null> => {
    const normalized = rawQuery.normalize("NFKC").trim().slice(0, CHEMICAL_INPUT_MAX);
    const safetySequence = requestSequence.current;
    if (safetySequence !== requestSequence.current) return null;
    const inspection = inspectChemicalNavigationQuery(normalized);
    if (!inspection.allowed) {
      abortRef.current?.abort();
      setCandidates([]);
      setChecked(false);
      setUnavailable(false);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      setMessage(
        inspection.reason === "empty"
          ? "物質名またはCAS番号を入力してください。"
          : "個人情報・健康情報・会社名・現場名・連絡先を含む可能性があるため検索していません。物質名またはCAS番号だけを入力してください。",
      );
      requestAnimationFrame(() => inputRef.current?.focus());
      return null;
    }
    if (normalized.length < 2) {
      setCandidates([]);
      setChecked(false);
      setUnavailable(false);
      return Promise.resolve([]);
    }
    if (lastCompletedSearch.current?.query === normalized) {
      return Promise.resolve(lastCompletedSearch.current.items);
    }
    if (inFlightSearch.current?.query === normalized) {
      return inFlightSearch.current.promise;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setUnavailable(false);
    const promise = (async () => {
      try {
        const resultLimit = /^\d{2,7}-\d{2,3}-\d{1,2}$/.test(normalized)
          ? 30
          : 8;
        const items = await searchChemicalCatalog(
          normalized,
          resultLimit,
          controller.signal,
        );
        if (controller.signal.aborted || sequence !== requestSequence.current) {
          return null;
        }
        lastCompletedSearch.current = { query: normalized, items };
        setCandidates(items);
        setChecked(true);
        setOpen(true);
        return items;
      } catch (error) {
        if (isAbortError(error)) return null;
        if (sequence === requestSequence.current) {
          setCandidates([]);
          setChecked(false);
          setUnavailable(true);
          setMessage(
            "通信を確認できないため、0件・収載外とは判定しません。通信回復後に再検索してください。",
          );
        }
        return null;
      } finally {
        if (sequence === requestSequence.current) setLoading(false);
      }
    })();
    inFlightSearch.current = { query: normalized, promise };
    void promise.then(
      () => {
        if (inFlightSearch.current?.promise === promise) {
          inFlightSearch.current = null;
        }
      },
      () => {
        if (inFlightSearch.current?.promise === promise) {
          inFlightSearch.current = null;
        }
      },
    );
    return promise;
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (query.trim().length < 2) {
      abortRef.current?.abort();
      setCandidates([]);
      setChecked(false);
      setUnavailable(false);
      setLoading(false);
      return;
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void runSearch(query);
    }, 220);
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [query, runSearch]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    },
    [],
  );

  const navigateToQuery = (
    value: string,
    startedAt: number,
    count: number | null,
    confirmedCas: string | null = null,
  ) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setUnavailable(true);
      setMessage(
        "通信を確認できないため、0件・収載外とは判定しません。通信回復後に再検索してください。",
      );
      inputRef.current?.focus();
      return;
    }
    trackHomeCockpitEvent("home_chemical_result_open", {
      action_type: "chemical",
      ...(count === null ? {} : { count_bucket: countBucket(count) }),
      destination_route_template: "/chemical-ra",
      elapsed_bucket: elapsedBucket(navigationStartedAt(startedAt)),
    });
    const pending = stageChemicalQuery(value, confirmedCas);
    if (!pending) {
      setMessage(
        "このタブ内の安全な受け渡しを開始できません。化学物質RAページを開いて入力してください。",
      );
      inputRef.current?.focus();
      return;
    }
    router.push("/chemical-ra#chemical-ra-start");
  };

  const chooseCandidate = async (
    candidate: MergedChemical,
    startedAt = performance.now(),
  ) => {
    setMessage(null);
    if (!candidate.cas) {
      navigateToQuery(candidate.primaryName, startedAt, candidates.length);
      return;
    }
    setLoading(true);
    try {
      const verified = await confirmChemicalCatalogSelection(
        candidate.cas,
        candidate.primaryName,
      );
      const confirmedCas = verified.cas ?? candidate.cas;
      navigateToQuery(
        confirmedCas,
        startedAt,
        candidates.length,
        confirmedCas,
      );
    } catch {
      setMessage(
        "名称とCAS番号のサーバー側照合を完了できません。別候補を選ぶか、通信回復後に再確認してください。",
      );
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const startedAt = performance.now();
    const normalized = query.normalize("NFKC").trim().slice(0, CHEMICAL_INPUT_MAX);
    if (!normalized) {
      setMessage("物質名またはCAS番号を入力してください。");
      inputRef.current?.focus();
      return;
    }
    const inspection = inspectChemicalNavigationQuery(normalized);
    if (!inspection.allowed) {
      setMessage(
        inspection.reason === "empty"
          ? "物質名またはCAS番号を入力してください。"
          : "個人情報・健康情報・会社名・現場名・連絡先を含む可能性があるため検索していません。物質名またはCAS番号だけを入力してください。",
      );
      inputRef.current?.focus();
      return;
    }
    const completed =
      lastCompletedSearch.current?.query === inspection.normalized
        ? lastCompletedSearch.current.items
        : null;
    if (
      completed &&
      activeIndex >= 0 &&
      candidates[activeIndex] &&
      completed.includes(candidates[activeIndex])
    ) {
      await chooseCandidate(candidates[activeIndex], startedAt);
      return;
    }
    if (completed === null) {
      const transfersPendingRequest =
        inFlightSearch.current?.query === inspection.normalized;
      if (transfersPendingRequest) {
        // The destination uses the shared runtime search promise. Detach the
        // home component's abort handle so an SPA transition does not turn one
        // logical search into two POST requests.
        abortRef.current = null;
      } else {
        abortRef.current?.abort();
      }
      requestSequence.current += 1;
      setLoading(false);
      navigateToQuery(inspection.normalized, startedAt, null);
      return;
    }
    const items = completed;
    if (items.length === 1 && items[0]) {
      const candidate = items[0];
      const normalizeIdentity = (value: string) =>
        value.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
      const identityQuery = normalizeIdentity(normalized);
      const exactIdentity =
        (candidate.cas &&
          normalizeIdentity(candidate.cas) === identityQuery) ||
        normalizeIdentity(candidate.primaryName) === identityQuery ||
        candidate.aliases.some(
          (alias) => normalizeIdentity(alias) === identityQuery,
        );
      if (exactIdentity && candidate.cas) {
        setLoading(true);
        try {
          const verified = await confirmChemicalCatalogSelection(
            candidate.cas,
            candidate.primaryName,
            normalized,
          );
          const confirmedCas = verified.cas ?? candidate.cas;
          navigateToQuery(
            confirmedCas,
            startedAt,
            items.length,
            confirmedCas,
          );
        } catch {
          setMessage(
            "名称・CAS番号・入力語の一意性をサーバーで確認できないため自動確定していません。候補を明示的に選ぶか、通信回復後に再確認してください。",
          );
          setOpen(true);
          inputRef.current?.focus();
        } finally {
          setLoading(false);
        }
        return;
      }
      navigateToQuery(normalized, startedAt, items.length);
      return;
    }
    if (items.length > 1) {
      // Enter opens the destination's candidate list without assigning a CAS.
      // The user must still choose an identity there before risk assessment.
      navigateToQuery(normalized, startedAt, items.length);
      return;
    }
    navigateToQuery(normalized, startedAt, 0);
  };

  return (
    <section
      aria-label="化学物質を検索"
      className="min-w-0 text-amber-950"
      data-home-chemical-quick-search=""
    >
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="home-chemical-query" className="sr-only">
          化学物質を検索
        </label>
        <div className="relative flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              id="home-chemical-query"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && candidates.length > 0}
              aria-controls={listId}
              aria-activedescendant={
                activeIndex >= 0
                  ? `${listId}-chemical-${activeIndex}`
                  : undefined
              }
              type="search"
              autoComplete="off"
              maxLength={CHEMICAL_INPUT_MAX}
              value={query}
              onFocus={() => {
                setOpen(Boolean(query));
                prefetchCockpitRoute(router, "/chemical-ra");
              }}
              onChange={(event) => {
                const next = event.target.value.slice(0, CHEMICAL_INPUT_MAX);
                if (debounceTimerRef.current !== null) {
                  window.clearTimeout(debounceTimerRef.current);
                  debounceTimerRef.current = null;
                }
                abortRef.current?.abort();
                requestSequence.current += 1;
                lastCompletedSearch.current = null;
                inFlightSearch.current = null;
                setQuery(next);
                setCandidates([]);
                setChecked(false);
                setUnavailable(false);
                setLoading(false);
                setOpen(Boolean(next));
                setActiveIndex(-1);
                setMessage(null);
                if (next && !startedRef.current) {
                  startedRef.current = true;
                  trackHomeCockpitEvent("home_chemical_search_start", {
                    action_type: "chemical",
                  });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && candidates.length > 0) {
                  event.preventDefault();
                  setOpen(true);
                  setActiveIndex((index) =>
                    index < candidates.length - 1 ? index + 1 : 0,
                  );
                } else if (
                  event.key === "ArrowUp" &&
                  candidates.length > 0
                ) {
                  event.preventDefault();
                  setOpen(true);
                  setActiveIndex((index) =>
                    index > 0 ? index - 1 : candidates.length - 1,
                  );
                } else if (event.key === "Escape") {
                  setOpen(false);
                  setActiveIndex(-1);
                  setMessage(null);
                }
              }}
              placeholder="例：トルエン / 108-88-3"
              className="min-h-11 w-full rounded-lg border-2 border-amber-700 bg-white px-3 text-base text-slate-950 placeholder:text-slate-500 focus:ring-4 focus:ring-amber-300"
            />
            {open && candidates.length > 0 && (
              <ul
                id={listId}
                role="listbox"
                aria-label="化学物質候補"
                className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border-2 border-amber-700 bg-white p-1 text-slate-950 shadow-xl"
              >
                {candidates.map((candidate, index) => (
                  <li
                    id={`${listId}-chemical-${index}`}
                    key={`${candidate.cas ?? candidate.primaryName}-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void chooseCandidate(candidate)}
                    className={`min-h-11 cursor-pointer rounded-lg px-3 py-2 text-left text-sm ${
                      activeIndex === index
                        ? "bg-amber-100 outline outline-2 outline-amber-700"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-black">
                      {candidate.primaryName}
                    </span>
                    <span className="block text-xs text-slate-700">
                      {candidate.cas
                        ? `CAS ${candidate.cas}`
                        : "CASなし（混合物・群指定名）"}
                      {" ／ "}
                      {identityLabel(candidate)}
                    </span>
                    <span className="block text-[11px] text-slate-600">
                      SDS記載名候補: {candidate.primaryName} ／
                      検証状態:{" "}
                      {candidate.cas ? "サーバー照合前" : "SDS確認必須"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-amber-800 px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "確認中" : "検索"}
          </button>
        </div>
      </form>
      <p
        aria-live="polite"
        className="mt-1 text-[11px] font-bold"
      >
        {loading
          ? "候補を検索中"
          : unavailable
            ? "通信状態を確認できません"
            : checked
              ? candidates.length > 1
                ? "複数候補があります。選んでください。"
                : `${candidates.length}件`
              : ""}
      </p>
      {message && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-amber-700 bg-white px-3 py-2 text-xs font-bold leading-5"
        >
          {message}
        </p>
      )}
      <noscript>
        <p className="mt-2">
          <a href="/chemical-ra" className="font-bold underline">
            JavaScriptなしで化学物質RAを開く
          </a>
        </p>
      </noscript>
    </section>
  );
}

export function ChatQuickAsk({
  onSafetyStateChange,
}: {
  onSafetyStateChange: (state: HomeSafetyState) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { stageChatQuestion } = useTransientQueryBridge();
  const [question, setQuestion] = useState("");
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "emergency" | "privacy" | "error";
    message: string;
  } | null>(null);

  const prefetchSafety = () => {
    prefetchCockpitRoute(router, "/chatbot");
    void import("@/lib/ai-outbound-safety").catch(() => {
      // Submission performs the same import inside a fail-closed try/catch.
    });
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const startedAt = performance.now();
    const normalized = question
      .normalize("NFKC")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      .trim()
      .slice(0, CHAT_INPUT_MAX);
    if (!normalized) {
      setNotice({ kind: "error", message: "質問を入力してください。" });
      inputRef.current?.focus();
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setNotice({
        kind: "error",
        message:
          "安全確認を完了できないため送信していません。通信回復後に再試行するか、法令検索・e-Gov公式資料を利用してください。",
      });
      inputRef.current?.focus();
      return;
    }
    setChecking(true);
    setNotice(null);
    try {
      const { inspectAiOutbound } = await import("@/lib/ai-outbound-safety");
      const decision = inspectAiOutbound({
        purpose: "home-chat-quick-ask",
        texts: [normalized],
        consent: true,
        maxChars: CHAT_INPUT_MAX,
        contextPolicy: "approved-server-corpus",
      });
      if (!decision.allowed) {
        if (decision.reason === "emergency") {
          setQuestion("");
          setNotice({ kind: "emergency", message: decision.message });
          onSafetyStateChange("emergency");
        } else {
          setNotice({ kind: "privacy", message: decision.message });
          onSafetyStateChange("normal");
          requestAnimationFrame(() => inputRef.current?.focus());
        }
        return;
      }
      const pending = stageChatQuestion(normalized);
      if (!pending) {
        setNotice({
          kind: "error",
          message:
            "このタブ内の安全な受け渡しを開始できません。チャットページを開いて質問してください。",
        });
        return;
      }
      onSafetyStateChange("normal");
      trackHomeCockpitEvent("home_chat_start", {
        action_type: "chat",
        destination_route_template: "/chatbot",
        elapsed_bucket: elapsedBucket(navigationStartedAt(startedAt)),
      });
      router.push("/chatbot");
    } catch {
      setNotice({
        kind: "error",
        message:
          "安全確認を完了できないため送信していません。法令検索またはe-Gov公式資料を利用してください。",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section
      aria-label="安衛法AIへ質問"
      className="min-w-0 text-sky-950"
      data-home-chat-quick-ask=""
    >
      <form
        onSubmit={(event) => void submit(event)}
      >
        <label htmlFor="home-chat-question" className="sr-only">
          安衛法AIへの質問
        </label>
        <textarea
          ref={inputRef}
          id="home-chat-question"
          rows={2}
          maxLength={CHAT_INPUT_MAX}
          value={question}
          onFocus={prefetchSafety}
          onChange={(event) => {
            setQuestion(event.target.value.slice(0, CHAT_INPUT_MAX));
            setNotice(null);
            onSafetyStateChange("normal");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="例：フルハーネスの特別教育は必要？（個人情報は入力しない）"
          className="min-h-[4.5rem] w-full resize-none rounded-lg border-2 border-sky-700 bg-white px-3 py-2 text-base text-slate-950 placeholder:text-slate-500 focus:ring-4 focus:ring-sky-300"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold">法令本文検索</span>
          <button
            type="submit"
            disabled={checking || !question.trim()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg bg-sky-800 px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
          >
            <Bot className="h-4 w-4" aria-hidden="true" />
            {checking ? "安全確認中" : "質問する"}
          </button>
        </div>
        <p className="mt-1 text-[10px] leading-4">個人情報は入力しない。</p>
      </form>
      {notice?.kind === "emergency" && (
        <div
          role="alert"
          className="mt-2 rounded-xl border-2 border-rose-700 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-950"
          data-home-chat-emergency=""
        >
          <p>{notice.message}</p>
          <p className="mt-2">
            大量出血時は、可能なら手袋等を使い、清潔な布やガーゼを傷口へ当てて直接圧迫止血を続け、救急隊の指示に従ってください。
          </p>
        </div>
      )}
      {notice?.kind === "privacy" && (
        <div
          role="alert"
          className="mt-2 rounded-xl border-2 border-amber-700 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-950"
          data-home-chat-privacy=""
        >
          <p>{notice.message}</p>
          <p className="mt-1">
            匿名化例：「山田太郎さん」→「作業者A」、「○○病の診断」→「配慮が必要な体調条件」。
          </p>
        </div>
      )}
      {notice?.kind === "error" && (
        <div
          role="alert"
          className="mt-2 rounded-xl border border-slate-500 bg-white p-3 text-xs font-bold leading-5"
        >
          <p>{notice.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/law-search" className="underline">
              法令検索
            </Link>
            <a
              href="https://laws.e-gov.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              e-Gov公式資料
            </a>
          </div>
        </div>
      )}
      <noscript>
        <p className="mt-2">
          入力内容は送信・保存しません。{" "}
          <a href="/chatbot" className="font-bold underline">
            チャットページを開く
          </a>
        </p>
      </noscript>
    </section>
  );
}

const MOBILE_TABS: Array<{
  id: MobilePanel;
  label: string;
  icon: typeof ThermometerSun;
}> = [
  { id: "heat", label: "暑さ", icon: ThermometerSun },
  { id: "slides", label: "スライド", icon: Presentation },
  { id: "chemical", label: "化学物質", icon: FlaskConical },
  { id: "chat", label: "法令AI", icon: MessageSquareText },
];

export function HomeSafetyCockpitClient({
  slides,
}: {
  slides: HomeHeatSlideSummary[];
}) {
  const router = useRouter();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("heat");
  const [safetyState, setSafetyState] =
    useState<HomeSafetyState>("normal");

  useEffect(() => {
    const stored = safeStoredAreaId();
    let cancelled = false;
    if (stored) {
      queueMicrotask(() => {
        if (!cancelled) setSelectedAreaId(stored);
      });
    }
    trackHomeCockpitEvent("home_cockpit_view");
    const idle = window.requestIdleCallback?.(
      () => {
        prefetchCockpitRoute(router, "/risk");
        prefetchCockpitRoute(router, "/heat-illness-prevention/slides");
      },
      { timeout: 1_500 },
    );
    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
    };
  }, [router]);

  const selectTab = (nextIndex: number) => {
    const bounded = (nextIndex + MOBILE_TABS.length) % MOBILE_TABS.length;
    const next = MOBILE_TABS[bounded];
    if (!next) return;
    setMobilePanel(next.id);
    requestAnimationFrame(() => tabRefs.current[bounded]?.focus());
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectTab(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectTab(MOBILE_TABS.length - 1);
    }
  };

  return (
    <section
      aria-labelledby="home-safety-cockpit-title"
      className="mx-auto max-w-7xl px-3 pb-5 pt-3 sm:px-4 lg:pb-8 lg:pt-4"
      data-home-safety-cockpit=""
    >
      <div className="overflow-hidden rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white shadow-xl">
        <header className="grid gap-3 border-b border-white/20 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,.55fr)] lg:items-center">
          <div>
            <h1
              id="home-safety-cockpit-title"
              className="text-2xl font-black tracking-tight sm:text-3xl"
            >
              今日の安全コックピット
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              暑さ・化学物質・法令を、ここからすぐ確認できます。
            </p>
            {safetyState === "emergency" ? (
              <p className="mt-2 inline-flex min-h-8 items-center rounded-lg border border-rose-300 bg-rose-950/70 px-3 text-xs font-black text-white">
                緊急時は119
              </p>
            ) : null}
          </div>
          <MascotGuide
            variant={safetyState === "emergency" ? "emergency" : "heat"}
            imageVariant="pointing"
            compact
            micro
            eager
            title={
              safetyState === "emergency"
                ? (
                    <>
                      <span className="max-[339px]:hidden">
                        チャットを止めて、119番と救命対応を優先してね。
                      </span>
                      <span className="hidden max-[339px]:inline">
                        119番と救命対応を優先してね。
                      </span>
                    </>
                  )
                : (
                    <>
                      <span className="max-[339px]:hidden">
                        地域や物質名を入れると、すぐ確認できるよ。
                      </span>
                      <span className="hidden max-[339px]:inline">
                        地域・物質名からすぐ確認できるよ。
                      </span>
                    </>
                  )
            }
            className="border-white/30 bg-white text-slate-950"
          />
        </header>

        <div className="grid min-w-0 gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.16fr)_minmax(0,.84fr)]">
          <div className="min-w-0 rounded-2xl bg-emerald-50 p-3 text-slate-950 max-[339px]:p-2 lg:row-span-2">
            <AreaQuickSearch
              selectedAreaId={selectedAreaId}
            />
          </div>

          <div
            role="tablist"
            aria-label="コックピット機能"
            className="grid grid-cols-4 gap-1 rounded-xl border border-white/30 bg-slate-950/70 p-1 lg:hidden"
          >
            {MOBILE_TABS.map(({ id, label, icon: Icon }, index) => (
              <button
                key={id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                id={`cockpit-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={mobilePanel === id}
                aria-controls={`cockpit-panel-${id}`}
                tabIndex={mobilePanel === id ? 0 : -1}
                onClick={() => setMobilePanel(id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className="flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg px-1 text-[10px] font-black data-[selected=true]:bg-white data-[selected=true]:text-slate-950 focus-visible:ring-4 focus-visible:ring-orange-300"
                data-selected={mobilePanel === id}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="mt-0.5 whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>

          <div
            id="cockpit-panel-heat"
            role="tabpanel"
            aria-labelledby="cockpit-tab-heat"
            className={mobilePanel === "heat" ? "lg:hidden" : "hidden"}
          >
            <Link
              href={
                selectedAreaId
                  ? `/risk?area=${encodeURIComponent(selectedAreaId)}`
                  : "/risk"
              }
              className="flex min-h-11 items-center justify-between rounded-xl border border-white/40 bg-white/10 px-3 text-sm font-black"
            >
              暑さ・警報の詳細を開く
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>

          <div
            id="cockpit-panel-slides"
            role="tabpanel"
            aria-labelledby="cockpit-tab-slides"
            className={
              mobilePanel === "slides"
                ? "min-w-0"
                : "hidden min-w-0 lg:block"
            }
          >
            <HeatSlideDeck slides={slides} />
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <div
              id="cockpit-panel-chemical"
              role="tabpanel"
              aria-labelledby="cockpit-tab-chemical"
              className={
                mobilePanel === "chemical"
                  ? "min-w-0"
                  : "hidden min-w-0 lg:block"
              }
            >
              <ChemicalQuickSearch />
            </div>
            <div
              id="cockpit-panel-chat"
              role="tabpanel"
              aria-labelledby="cockpit-tab-chat"
              className={
                mobilePanel === "chat"
                  ? "min-w-0"
                  : "hidden min-w-0 lg:block"
              }
            >
              <ChatQuickAsk onSafetyStateChange={setSafetyState} />
            </div>
          </div>
        </div>

        <Link
          href="/about/usage-notes"
          className="mx-3 mb-3 inline-flex min-h-11 items-center text-xs font-bold underline underline-offset-4 sm:mx-4 sm:mb-4"
        >
          注意事項
        </Link>

        <noscript>
          <nav
            aria-label="JavaScriptなしで利用できる機能"
            className="m-3 grid gap-2 rounded-xl border border-white/40 p-3 text-sm font-bold sm:grid-cols-2"
          >
            <a href="/risk" className="min-h-11 underline">
              WBGT・現場リスク
            </a>
            <a
              href="/heat-illness-prevention/slides"
              className="min-h-11 underline"
            >
              熱中症スライド
            </a>
            <a href="/chemical-ra" className="min-h-11 underline">
              化学物質RA
            </a>
            <a href="/chatbot" className="min-h-11 underline">
              安衛法AI
            </a>
          </nav>
        </noscript>
      </div>
    </section>
  );
}
