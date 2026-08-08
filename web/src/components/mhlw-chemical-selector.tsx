"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, FlaskConical, X } from "lucide-react";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import {
  searchMergedChemicalsSlim as searchMergedChemicals,
  MHLW_MERGED_CHEMICAL_COUNT_SLIM as MHLW_MERGED_CHEMICAL_COUNT,
} from "@/lib/mhlw-chemicals-slim";

/**
 * 厚労省データの全物質から CAS / 名称で検索し選択するコンボボックス。
 * 選択結果は onSelect コールバックで通知する。
 */
export function MhlwChemicalSelector({
  value,
  onSelect,
  placeholder = `MHLW ${MHLW_MERGED_CHEMICAL_COUNT.toLocaleString()} 物質から CAS / 名称で検索`,
  id,
}: {
  value: MergedChemical | null;
  onSelect: (m: MergedChemical | null) => void;
  placeholder?: string;
  id?: string;
}) {
  const [internalQuery, setInternalQuery] = useState(value?.primaryName ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pendingCandidate, setPendingCandidate] =
    useState<MergedChemical | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();
  // value が指定されていればそれを表示、未指定ならユーザー入力を表示する。
  // useEffect で同期しないことで cascading render を回避。
  const query = value ? value.primaryName : internalQuery;
  const setQuery = setInternalQuery;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const results = useMemo(() => {
    if (!open) return [];
    return searchMergedChemicals(query, 20);
  }, [query, open]);

  // 検索結果が変わるたびにキーボードのハイライト位置をリセットする。
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  useEffect(() => {
    if (pendingCandidate) confirmButtonRef.current?.focus();
  }, [pendingCandidate]);

  const requestConfirmation = (m: MergedChemical) => {
    setPendingCandidate(m);
    setQuery(m.primaryName);
    setOpen(false);
  };

  const identityKind = (candidate: MergedChemical) => {
    const identityText = [candidate.primaryName, ...candidate.aliases].join(" ");
    if (candidate.cas === "1330-20-7") return "混合物";
    if (
      new Set(["95-47-6", "108-38-3", "106-42-3"]).has(
        candidate.cas ?? "",
      )
    ) {
      return "異性体";
    }
    if (/混合|mixed|mixture/i.test(identityText)) return "混合物";
    if (
      /異性体|オルト|メタ|パラ|(?:^|[\s（(])[omp][\-‐‑‒–—―ー−]/i.test(
        identityText,
      )
    ) {
      return "異性体";
    }
    return "単一候補";
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (results.length > 0) {
        setActiveIndex((prev) => (prev + 1) % results.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (results.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      }
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        requestConfirmation(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  };

  const showClear = !!value || query.length > 0;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
        <FlaskConical className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
        <input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setPendingCandidate(null);
            if (value && e.target.value !== value.primaryName) {
              onSelect(null);
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="min-h-[36px] flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {showClear && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onSelect(null);
              setPendingCandidate(null);
              setOpen(false);
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="クリア"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="リスト切替"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && results.length > 0 && (
        <ul id={listboxId} role="listbox" className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((m, i) => (
            <li
              key={`${m.cas ?? "no-cas"}-${m.primaryName}-${i}`}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
            >
              <button
                type="button"
                tabIndex={-1}
                onClick={() => requestConfirmation(m)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50 ${
                  i === activeIndex ? "bg-emerald-50" : ""
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-800">
                    {m.primaryName}
                  </span>
                  {m.cas && (
                    <span className="block text-[11px] font-mono text-slate-500">
                      CAS {m.cas}
                    </span>
                  )}
                  <span className="mt-0.5 block text-[11px] text-slate-600">
                    SDS記載名: {m.primaryName}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap gap-0.5">
                  <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold text-slate-700">
                    {identityKind(m)}
                  </span>
                  {m.flags.concentration && (
                    <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700">濃度</span>
                  )}
                  {m.flags.label_sds && (
                    <span className="rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-700">SDS</span>
                  )}
                  {m.flags.skin && (
                    <span className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-bold text-blue-700">皮膚</span>
                  )}
                  {m.flags.carcinogenic && (
                    <span className="rounded bg-rose-100 px-1 py-0.5 text-[10px] font-bold text-rose-700">がん</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && query.trim() && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
          該当する物質を一意に確認できないため判定不能です。製品固有の最新SDSに記載された名称とCAS番号を確認してください。
        </div>
      )}
      {pendingCandidate && !value ? (
        <section
          aria-labelledby={`${listboxId}-confirmation-title`}
          className="mt-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-sm text-slate-900"
        >
          <h3
            id={`${listboxId}-confirmation-title`}
            className="font-bold text-amber-950"
          >
            候補の同一性を確認してください
          </h3>
          <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-[7rem_1fr]">
            <dt className="font-bold">SDS記載名</dt>
            <dd>{pendingCandidate.primaryName}</dd>
            <dt className="font-bold">CAS番号</dt>
            <dd>{pendingCandidate.cas ?? "未確認"}</dd>
            <dt className="font-bold">候補区分</dt>
            <dd>{identityKind(pendingCandidate)}</dd>
          </dl>
          <p className="mt-2 text-xs leading-5 text-amber-950">
            製品固有の最新SDSと名称・CAS番号が一致する場合だけ確定してください。
            一致しない場合やCAS番号がない場合は判定できません。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              ref={confirmButtonRef}
              type="button"
              disabled={!pendingCandidate.cas}
              onClick={() => {
                if (!pendingCandidate.cas) return;
                onSelect(pendingCandidate);
                setPendingCandidate(null);
              }}
              className="min-h-[44px] rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              SDSと一致する候補を確定
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingCandidate(null);
                setOpen(true);
              }}
              className="min-h-[44px] rounded-lg border border-slate-500 bg-white px-4 py-2 text-xs font-bold text-slate-800"
            >
              候補一覧へ戻る
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
