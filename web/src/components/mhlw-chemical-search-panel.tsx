"use client";

import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Loader2, Search } from "lucide-react";

type ChemicalEntry = {
  name: string;
  cas: string | null;
  category: "carcinogenic" | "concentration" | "skin" | "label_sds" | "other";
  categoryLabel: string;
  appliedDate: string | null;
  notes: string[];
};

type CompactData = {
  generatedAt: string;
  kept: number;
  categoryCounts: Record<string, number>;
  categoryLabels: Record<string, string>;
  entries: ChemicalEntry[];
};

const PAGE_SIZE = 50;
const CATEGORY_BADGE: Record<string, string> = {
  carcinogenic: "bg-rose-100 text-rose-800",
  concentration: "bg-amber-100 text-amber-800",
  skin: "bg-blue-100 text-blue-800",
  label_sds: "bg-emerald-100 text-emerald-800",
  other: "bg-slate-100 text-slate-700",
};

function normalize(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

export function MhlwChemicalSearchPanel() {
  const [data, setData] = useState<CompactData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mod = await import("@/data/chemicals-mhlw/compact.json");
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

  const filtered = useMemo(() => {
    if (!data) return [] as ChemicalEntry[];
    const n = normalize(query);
    return data.entries.filter((e) => {
      if (category && e.category !== category) return false;
      if (!n) return true;
      const hay = normalize(`${e.name} ${e.cas ?? ""} ${e.notes.join(" ")}`);
      return hay.includes(n);
    });
  }, [data, query, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageEntries = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, category]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        データの読み込みに失敗しました: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        MHLW 化学物質リストを読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <FlaskConical className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              MHLW 化学物質 {data.kept.toLocaleString()} 物質（統合版）
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              厚労省公開の 4 リスト（がん原性・濃度基準値・皮膚等障害・ラベル表示/SDS）
              を横断検索。CAS 番号 / 名称 / 備考から絞り込めます。
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(data.categoryCounts).map(([cat, count]) => (
                <span
                  key={cat}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    CATEGORY_BADGE[cat] ?? CATEGORY_BADGE.other
                  }`}
                >
                  {data.categoryLabels[cat] ?? cat}: {count.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="sr-only">物質名 / CAS で検索</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例: ベンゼン / 71-43-2 / 区分1A"
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="">全カテゴリ</option>
            {Object.entries(data.categoryLabels).map(([k, label]) =>
              data.categoryCounts[k] ? (
                <option key={k} value={k}>
                  {label}
                </option>
              ) : null
            )}
          </select>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          該当 {filtered.length.toLocaleString()} 件 / 全 {data.kept.toLocaleString()} 件
        </p>
      </div>

      <ul className="space-y-2">
        {pageEntries.map((entry, idx) => (
          <li
            key={`${entry.cas ?? "no-cas"}-${entry.name}-${idx}`}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">{entry.name}</h4>
              {entry.cas && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                  CAS {entry.cas}
                </span>
              )}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  CATEGORY_BADGE[entry.category] ?? CATEGORY_BADGE.other
                }`}
              >
                {entry.categoryLabel}
              </span>
              {entry.appliedDate && (
                <span className="text-[10px] text-slate-500">適用: {entry.appliedDate}</span>
              )}
            </div>
            {entry.notes.length > 0 && (
              <p className="mt-1 text-xs text-slate-600">{entry.notes.join(" / ")}</p>
            )}
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          該当する物質が見つかりませんでした。別の語句や区分でお試しください。
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
