"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { SeriousCaseFilters } from "@/lib/accident-news/serious-cases";

export type SelectedFilters = {
  industry: string;
  type: string;
  year: string;
  q: string;
};

export function AccidentNewsFilter({
  options,
  selected,
  keyword,
  onKeywordChange,
  onKeywordSearch,
  onClear,
  keywordPending = false,
}: {
  options: SeriousCaseFilters;
  selected: SelectedFilters;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onKeywordSearch: () => void;
  onClear: () => void;
  keywordPending?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pending = isPending || keywordPending;

  const pushWith = useCallback(
    (patch: Partial<SelectedFilters>) => {
      const next = { ...selected, ...patch };
      const params = new URLSearchParams();
      if (next.industry) params.set("industry", next.industry);
      if (next.type) params.set("type", next.type);
      if (next.year) params.set("year", next.year);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `/accident-news?${qs}` : "/accident-news");
      });
    },
    [router, selected],
  );

  return (
    <>
      <form
        action="/accident-news"
        method="get"
        className="flex flex-wrap items-end gap-2 print:hidden"
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          onKeywordSearch();
        }}
      >
      <label className="flex flex-col text-xs font-semibold text-slate-600">
        業種
        <select
          name="industry"
          value={selected.industry}
          onChange={(e) => pushWith({ industry: e.target.value })}
          className="mt-1 min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
        >
          <option value="">すべて</option>
          {options.industries.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value}（{o.count}）
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs font-semibold text-slate-600">
        事故型
        <select
          name="type"
          value={selected.type}
          onChange={(e) => pushWith({ type: e.target.value })}
          className="mt-1 min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
        >
          <option value="">すべて</option>
          {options.types.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value}（{o.count}）
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs font-semibold text-slate-600">
        年
        <select
          name="year"
          value={selected.year}
          onChange={(e) => pushWith({ year: e.target.value })}
          className="mt-1 min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
        >
          <option value="">すべて</option>
          {options.years.map((y) => (
            <option key={y} value={String(y)}>
              {y}年
            </option>
          ))}
        </select>
      </label>
      <label
        className="flex flex-1 flex-col text-xs font-semibold text-slate-600"
        data-accident-news-keyword=""
      >
        キーワード
        <input
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="作業・起因物・事故型など（例: 足場、はさまれ）"
          className="mt-1 min-h-[44px] min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800"
        />
      </label>
      <button
        type="submit"
        data-primary-action="true"
        className="min-h-[44px] rounded-lg bg-emerald-700 px-4 py-1 text-sm font-bold text-white hover:bg-emerald-800"
      >
        {pending ? "検索中" : "検索"}
      </button>
      {(selected.industry || selected.type || selected.year || keyword) && (
        <button
          type="button"
          data-accident-news-js-only=""
          onClick={() => {
            onClear();
            router.push("/accident-news");
          }}
          className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          条件クリア
        </button>
      )}
      </form>
      <noscript>
        <style>{`[data-accident-news-keyword],[data-accident-news-js-only]{display:none!important}`}</style>
        <p className="mt-2 text-xs text-slate-600">
          業種・事故型・年を選び「検索」を押してください。
        </p>
      </noscript>
      {pending && (
        <span
          role="status"
          aria-live="polite"
          className="sr-only"
          data-accident-news-filter-pending
        >
          検索結果を更新しています。更新完了までは前回の結果を表示しています。
        </span>
      )}
    </>
  );
}
