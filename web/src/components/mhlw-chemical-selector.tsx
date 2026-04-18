"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, FlaskConical, X } from "lucide-react";
import {
  searchMergedChemicals,
  type MergedChemical,
} from "@/lib/mhlw-chemicals";

/**
 * 厚労省 1,389 物質から CAS / 名称で検索し選択するコンボボックス。
 * 選択結果は onSelect コールバックで通知する。
 */
export function MhlwChemicalSelector({
  value,
  onSelect,
  placeholder = "MHLW 1,389 物質から CAS / 名称で検索",
}: {
  value: MergedChemical | null;
  onSelect: (m: MergedChemical | null) => void;
  placeholder?: string;
}) {
  const [internalQuery, setInternalQuery] = useState(value?.primaryName ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
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

  const showClear = !!value || query.length > 0;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
        <FlaskConical className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value && e.target.value !== value.primaryName) {
              onSelect(null);
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="min-h-[36px] flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {showClear && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onSelect(null);
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
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((m, i) => (
            <li key={`${m.cas ?? "no-cas"}-${m.primaryName}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(m);
                  setQuery(m.primaryName);
                  setOpen(false);
                }}
                className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50"
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
                </span>
                <span className="flex shrink-0 flex-wrap gap-0.5">
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
          該当する物質が見つかりません。物質名を直接入力して AI に問い合わせ可能です。
        </div>
      )}
    </div>
  );
}
