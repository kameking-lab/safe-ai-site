"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import { useTransientQueryBridge } from "./transient-query-bridge";

const CHEMICAL_INPUT_MAX = 120;

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

function normalizeIdentity(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
}

function warmChemicalModules() {
  return Promise.all([
    import("@/lib/chemical/query-safety"),
    import("@/lib/chemical/search-client"),
  ]);
}

export function HomeDirectChemicalClient() {
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
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<MergedChemical[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const blockSensitiveQuery = useCallback(() => {
    abortRef.current?.abort();
    requestSequence.current += 1;
    setCandidates([]);
    setChecked(false);
    setUnavailable(false);
    setLoading(false);
    setOpen(false);
    setActiveIndex(-1);
    setMessage(
      "個人情報・健康情報・会社名・現場名・連絡先を含む可能性があるため検索していません。物質名またはCAS番号だけを入力してください。",
    );
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const runSearch = useCallback(
    async (rawQuery: string): Promise<MergedChemical[] | null> => {
      const normalized = rawQuery
        .normalize("NFKC")
        .trim()
        .slice(0, CHEMICAL_INPUT_MAX);
      const safetySequence = requestSequence.current;
      let inspection;
      try {
        const safety = await import("@/lib/chemical/query-safety");
        inspection = safety.inspectChemicalNavigationQuery(normalized);
      } catch {
        if (safetySequence === requestSequence.current) {
          setUnavailable(true);
          setMessage("安全確認を完了できないため検索していません。");
        }
        return null;
      }
      if (safetySequence !== requestSequence.current) return null;
      if (!inspection.allowed) {
        if (inspection.reason === "empty") {
          setMessage("物質名またはCAS番号を入力してください。");
        } else {
          blockSensitiveQuery();
        }
        return null;
      }
      if (inspection.normalized.length < 2) {
        setCandidates([]);
        setChecked(false);
        setUnavailable(false);
        return [];
      }
      if (lastCompletedSearch.current?.query === inspection.normalized) {
        return lastCompletedSearch.current.items;
      }
      if (inFlightSearch.current?.query === inspection.normalized) {
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
          const { searchChemicalCatalog } = await import(
            "@/lib/chemical/search-client"
          );
          if (controller.signal.aborted || sequence !== requestSequence.current) {
            return null;
          }
          const resultLimit = /^\d{2,7}-\d{2,3}-\d{1,2}$/.test(
            inspection.normalized,
          )
            ? 30
            : 8;
          const items = await searchChemicalCatalog(
            inspection.normalized,
            resultLimit,
            controller.signal,
          );
          if (controller.signal.aborted || sequence !== requestSequence.current) {
            return null;
          }
          lastCompletedSearch.current = {
            query: inspection.normalized,
            items,
          };
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
      inFlightSearch.current = { query: inspection.normalized, promise };
      void promise.finally(() => {
        if (inFlightSearch.current?.promise === promise) {
          inFlightSearch.current = null;
        }
      });
      return promise;
    },
    [blockSensitiveQuery],
  );

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

  const navigateToQuery = useCallback(
    (value: string, confirmedCas: string | null = null) => {
      if (!navigator.onLine) {
        setUnavailable(true);
        setMessage(
          "通信を確認できないため、0件・収載外とは判定しません。通信回復後に再検索してください。",
        );
        inputRef.current?.focus();
        return;
      }
      if (!stageChemicalQuery(value, confirmedCas)) {
        setMessage(
          "このタブ内で受け渡しできません。化学物質RAページを開いて入力してください。",
        );
        inputRef.current?.focus();
        return;
      }
      void import("@/lib/home-cockpit-telemetry")
        .then(({ trackHomeCockpitEvent }) => {
          trackHomeCockpitEvent("home_chemical_result_open", {
            action_type: "chemical",
            destination_route_template: "/chemical-ra",
          });
        })
        .catch(() => undefined);
      router.push("/chemical-ra#chemical-ra-start");
    },
    [router, stageChemicalQuery],
  );

  const chooseCandidate = useCallback(
    async (candidate: MergedChemical) => {
      setMessage(null);
      if (!candidate.cas) {
        navigateToQuery(candidate.primaryName);
        return;
      }
      setLoading(true);
      try {
        const { confirmChemicalCatalogSelection } = await import(
          "@/lib/chemical/search-client"
        );
        const verified = await confirmChemicalCatalogSelection(
          candidate.cas,
          candidate.primaryName,
        );
        const confirmedCas = verified.cas ?? candidate.cas;
        navigateToQuery(confirmedCas, confirmedCas);
      } catch {
        setMessage(
          "名称とCAS番号を照合できません。別候補を選ぶか、通信回復後に再確認してください。",
        );
        inputRef.current?.focus();
      } finally {
        setLoading(false);
      }
    },
    [navigateToQuery],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const normalized = query
      .normalize("NFKC")
      .trim()
      .slice(0, CHEMICAL_INPUT_MAX);
    if (!normalized) {
      setMessage("物質名またはCAS番号を入力してください。");
      inputRef.current?.focus();
      return;
    }

    let inspection;
    try {
      const safety = await import("@/lib/chemical/query-safety");
      inspection = safety.inspectChemicalNavigationQuery(normalized);
    } catch {
      setUnavailable(true);
      setMessage("安全確認を完了できないため検索していません。");
      return;
    }
    if (!inspection.allowed) {
      if (inspection.reason === "empty") {
        setMessage("物質名またはCAS番号を入力してください。");
      } else {
        blockSensitiveQuery();
      }
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
      await chooseCandidate(candidates[activeIndex]);
      return;
    }
    if (completed === null) {
      abortRef.current?.abort();
      requestSequence.current += 1;
      setLoading(false);
      navigateToQuery(inspection.normalized);
      return;
    }
    if (completed.length === 1 && completed[0]) {
      const candidate = completed[0];
      const identityQuery = normalizeIdentity(inspection.normalized);
      const exactIdentity =
        (candidate.cas && normalizeIdentity(candidate.cas) === identityQuery) ||
        normalizeIdentity(candidate.primaryName) === identityQuery ||
        candidate.aliases.some(
          (alias) => normalizeIdentity(alias) === identityQuery,
        );
      if (exactIdentity && candidate.cas) {
        setLoading(true);
        try {
          const { confirmChemicalCatalogSelection } = await import(
            "@/lib/chemical/search-client"
          );
          const verified = await confirmChemicalCatalogSelection(
            candidate.cas,
            candidate.primaryName,
            inspection.normalized,
          );
          const confirmedCas = verified.cas ?? candidate.cas;
          navigateToQuery(confirmedCas, confirmedCas);
        } catch {
          setMessage(
            "名称・CAS番号・入力語を一意に確認できません。候補を選んでください。",
          );
          setOpen(true);
          inputRef.current?.focus();
        } finally {
          setLoading(false);
        }
        return;
      }
    }
    navigateToQuery(inspection.normalized);
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
                router.prefetch("/chemical-ra");
                void warmChemicalModules().catch(() => undefined);
              }}
              onChange={(event) => {
                const next = event.target.value.slice(0, CHEMICAL_INPUT_MAX);
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
              }}
              onKeyDown={(event) => {
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
                  setMessage(null);
                }
              }}
              placeholder="例：トルエン / 108-88-3"
              className="min-h-11 w-full rounded-lg border-2 border-amber-700 bg-white px-3 text-base text-slate-950 placeholder:text-slate-500 focus:ring-4 focus:ring-amber-300"
            />
            {open && candidates.length > 0 ? (
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
                    <span className="block font-black">{candidate.primaryName}</span>
                    <span className="block text-xs text-slate-700">
                      {candidate.cas ? `CAS ${candidate.cas}` : "CASなし"}
                      {" ／ "}
                      {identityLabel(candidate)}
                    </span>
                    <span className="block text-[11px] text-slate-600">
                      SDS記載名候補: {candidate.primaryName}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
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
      <p aria-live="polite" className="mt-1 text-[11px] font-bold">
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
      {message ? (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-amber-700 bg-white px-3 py-2 text-xs font-bold leading-5"
        >
          {message}
        </p>
      ) : null}
      <noscript>
        <style>{`[data-home-chemical-quick-search] form,[data-home-chemical-quick-search] > p[aria-live]{display:none!important}`}</style>
        <p className="mt-2">
          <a href="/chemical-ra" className="font-bold underline">
            化学物質RAを開く
          </a>
        </p>
      </noscript>
    </section>
  );
}
