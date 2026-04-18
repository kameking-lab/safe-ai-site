"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertOctagon, Loader2, Search } from "lucide-react";

type DeathEntry = {
  id: string | null;
  year: number;
  month: number | null;
  description: string | null;
  industry: string | null;
  industryMedium: string | null;
  cause: string | null;
  type: string | null;
  workplaceSize: string | null;
  occurrenceTime: string | null;
};

type CompactData = {
  generatedAt: string;
  total: number;
  years: number[];
  byYear: Record<string, number>;
  byType: Record<string, number>;
  byIndustry: Record<string, number>;
  entries: DeathEntry[];
};

const PAGE_SIZE = 50;
const DATA_SOURCE_URL = "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.aspx";

function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

export function MhlwDeathsPanel() {
  const [data, setData] = useState<CompactData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | "">("");
  const [industry, setIndustry] = useState("");
  const [type, setType] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mod = await import("@/data/deaths-mhlw/compact.json");
        if (!active) return;
        setData(mod.default as unknown as CompactData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const industries = useMemo(
    () => (data ? Object.keys(data.byIndustry).sort((a, b) => a.localeCompare(b, "ja")) : []),
    [data]
  );
  const types = useMemo(
    () => (data ? Object.keys(data.byType).sort((a, b) => a.localeCompare(b, "ja")) : []),
    [data]
  );

  const filtered = useMemo(() => {
    if (!data) return [] as DeathEntry[];
    const kw = keyword.trim();
    return data.entries.filter((e) => {
      if (year && e.year !== year) return false;
      if (industry && e.industry !== industry) return false;
      if (type && e.type !== type) return false;
      if (kw && !(e.description ?? "").includes(kw)) return false;
      return true;
    });
  }, [data, year, industry, type, keyword]);

  useEffect(() => {
    setPage(1);
  }, [year, industry, type, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageEntries = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        死亡災害データの読み込みに失敗しました: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        MHLW 死亡災害データを読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
            <AlertOctagon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              MHLW 死亡災害データベース N={data.total.toLocaleString()}件
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              2019〜2023年（5年分）の全件を収録。業種・事故種別・キーワードで絞り込みできます。
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              出典:&nbsp;
              <a
                href={DATA_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-700"
              >
                厚生労働省 職場のあんぜんサイト 死亡災害データベース
              </a>
              　|　最終更新: {formatUpdatedAt(data.generatedAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            年
            <select
              value={year}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">すべて</option>
              {data.years.map((y) => (
                <option key={y} value={y}>
                  {y}（{data.byYear[String(y)]}件）
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            業種
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">すべて</option>
              {industries.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            事故種別
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">すべて</option>
              {types.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            キーワード
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="例: クレーン / 墜落"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800"
              />
            </div>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          該当 <span className="font-semibold text-slate-700">{filtered.length.toLocaleString()}</span> 件 / 全{" "}
          {data.total.toLocaleString()} 件
        </p>
      </div>

      <ul className="space-y-2">
        {pageEntries.map((entry) => (
          <li
            key={entry.id ?? `${entry.year}-${entry.month}-${entry.description?.slice(0, 16)}`}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
              {entry.type && (
                <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-800">
                  {entry.type}
                </span>
              )}
              <span>
                {entry.year}年{entry.month ? `${entry.month}月` : ""}
              </span>
              {entry.industry && <span>業種: {entry.industry}</span>}
              {entry.workplaceSize && <span>規模: {entry.workplaceSize}</span>}
              {entry.cause && <span>起因物: {entry.cause}</span>}
            </div>
            <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
              {entry.description ?? "（概要なし）"}
            </p>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          該当する死亡災害事例が見つかりませんでした。
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            前へ
          </button>
          <span className="text-xs text-slate-500">
            {pageSafe} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe >= totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
