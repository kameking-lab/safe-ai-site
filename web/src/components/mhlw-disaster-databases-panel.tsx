"use client";

import { useMemo, useState } from "react";
import { InputWithVoice } from "@/components/voice-input-field";
import { searchMhlwDisasters, mhlwDeathDisastersMock, mhlwLostTimeDisastersMock } from "@/data/mock/mhlw-disaster-databases";

const PAGE_SIZE = 20;

export function MhlwDisasterDatabasesPanel() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"死亡災害" | "休業災害">("死亡災害");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => searchMhlwDisasters(query), [query]);

  const yearFiltered = useMemo(() => {
    let list = tab === "死亡災害" ? filtered.death : filtered.lostTime;
    if (yearFilter) {
      list = list.filter((r) => r.occurredOn.startsWith(yearFilter));
    }
    return list.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  }, [tab, filtered, yearFilter]);

  const totalCount = tab === "死亡災害" ? mhlwDeathDisastersMock.length : mhlwLostTimeDisastersMock.length;
  const pageItems = yearFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(yearFiltered.length / PAGE_SIZE);

  const years = useMemo(() => {
    const set = new Set<string>();
    for (let y = 2016; y <= 2026; y += 1) set.add(String(y));
    return Array.from(set).sort().reverse();
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">厚生労働省 労働災害データベース（モック）</h2>
      <p className="mt-1 text-xs text-slate-600">
        死亡災害 {mhlwDeathDisastersMock.length}件・休業災害 {mhlwLostTimeDisastersMock.length}件を直近10年相当で収録。キーワード・年・事故種別で検索可能。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["死亡災害", "休業災害"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setPage(0); }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${
              tab === t ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {t}（{t === "死亡災害" ? mhlwDeathDisastersMock.length : mhlwLostTimeDisastersMock.length}件）
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label className="text-xs font-semibold text-slate-700" htmlFor="mhlw-search">キーワード検索</label>
          <InputWithVoice
            id="mhlw-search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="墜落, 感電, 製造, 転倒…"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700" htmlFor="mhlw-year">年</label>
          <select
            id="mhlw-year"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(0); }}
          >
            <option value="">すべての年</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        検索結果: {yearFiltered.length}件 / 全 {totalCount}件（{tab}）
      </p>

      <div className="mt-3 space-y-2">
        {pageItems.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
            該当する災害データがありません。
          </p>
        ) : (
          pageItems.map((r) => (
            <article key={r.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${
                  r.database === "死亡災害" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {r.database}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800">{r.accidentType}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{r.industry}</span>
                <span className="text-xs text-slate-500">{r.occurredOn}</span>
              </div>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">{r.title}</h3>
              <p className="mt-1 text-xs text-slate-700">{r.summary}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.keywords.map((kw) => (
                  <span key={kw} className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">{kw}</span>
                ))}
              </div>
            </article>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            前へ
          </button>
          <span className="text-xs text-slate-600">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}
    </section>
  );
}
