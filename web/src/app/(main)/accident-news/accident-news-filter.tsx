"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
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
}: {
  options: SeriousCaseFilters;
  selected: SelectedFilters;
}) {
  const router = useRouter();

  const pushWith = useCallback(
    (patch: Partial<SelectedFilters>) => {
      const next = { ...selected, ...patch };
      const params = new URLSearchParams();
      if (next.industry) params.set("industry", next.industry);
      if (next.type) params.set("type", next.type);
      if (next.year) params.set("year", next.year);
      if (next.q.trim()) params.set("q", next.q.trim());
      const qs = params.toString();
      router.push(qs ? `/accident-news?${qs}` : "/accident-news");
    },
    [router, selected],
  );

  return (
    <form
      className="flex flex-wrap items-end gap-2 print:hidden"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        pushWith({ q: String(fd.get("q") ?? "") });
      }}
    >
      <label className="flex flex-col text-xs font-semibold text-slate-600">
        業種
        <select
          value={selected.industry}
          onChange={(e) => pushWith({ industry: e.target.value })}
          className="mt-1 min-h-[40px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
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
          value={selected.type}
          onChange={(e) => pushWith({ type: e.target.value })}
          className="mt-1 min-h-[40px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
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
          value={selected.year}
          onChange={(e) => pushWith({ year: e.target.value })}
          className="mt-1 min-h-[40px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
        >
          <option value="">すべて</option>
          {options.years.map((y) => (
            <option key={y} value={String(y)}>
              {y}年
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col text-xs font-semibold text-slate-600">
        キーワード
        <input
          name="q"
          defaultValue={selected.q}
          placeholder="作業・原因など（例: 足場、はさまれ）"
          className="mt-1 min-h-[40px] min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800"
        />
      </label>
      <button
        type="submit"
        className="min-h-[40px] rounded-lg bg-emerald-600 px-4 py-1 text-sm font-bold text-white hover:bg-emerald-700"
      >
        検索
      </button>
      {(selected.industry || selected.type || selected.year || selected.q) && (
        <button
          type="button"
          onClick={() => router.push("/accident-news")}
          className="min-h-[40px] rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          条件クリア
        </button>
      )}
    </form>
  );
}
