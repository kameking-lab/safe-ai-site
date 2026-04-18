"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  FlaskConical,
  AlertTriangle,
  Hand,
  ShieldAlert,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  chemicalSubstances,
  chemicalCategoryInfo,
  type ChemicalCategory,
  type ChemicalSubstance,
} from "@/data/mock/chemical-substances-db";

const CATEGORY_FILTERS: ChemicalCategory[] = [
  "特化則1類",
  "特化則2類",
  "特化則3類",
  "有機溶剤1種",
  "有機溶剤2種",
  "皮膚等障害化学物質等",
  "リスクアセスメント対象物",
];

function normalize(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

function matches(sub: ChemicalSubstance, q: string): boolean {
  if (!q) return true;
  const n = normalize(q);
  const haystack = [
    sub.name,
    sub.name_en ?? "",
    sub.cas,
    ...(sub.synonyms ?? []),
    sub.uses,
    sub.health_effects,
    ...sub.categories,
    ...sub.related_laws,
  ]
    .map(normalize)
    .join(" ");
  return haystack.includes(n);
}

export function ChemicalDatabaseClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ChemicalCategory | "">("");
  const [skinOnly, setSkinOnly] = useState(false);

  const filtered = useMemo(() => {
    return chemicalSubstances.filter((s) => {
      if (!matches(s, query)) return false;
      if (category && !s.categories.includes(category)) return false;
      if (skinOnly && !s.skin_hazard) return false;
      return true;
    });
  }, [query, category, skinOnly]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          化学物質検索DB β版
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          化学物質 50物質 横断検索
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
          リスクアセスメント対象物質（674物質拡大予定）・特化則・有機則・鉛則・皮膚等障害化学物質等を
          物質名・CAS番号・用途から横断検索。化学物質管理者・自律的管理の実務に。
        </p>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ β版（50物質）。次フェーズで674物質→900物質まで拡大予定。
          最終判断は必ず厚生労働省 <Link href="https://anzeninfo.mhlw.go.jp/" className="font-semibold underline" target="_blank" rel="noopener noreferrer">職場のあんぜんサイト</Link>
          と各SDSをご確認ください。
        </div>
      </header>

      <section aria-labelledby="search-heading" className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 id="search-heading" className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          検索 / 絞り込み
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <span className="sr-only">物質名・CAS番号で検索</span>
            <input
              type="search"
              inputMode="search"
              placeholder="例: ベンゼン / 71-43-2 / 金属脱脂"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ChemicalCategory | "")}
            className="min-h-[48px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            aria-label="規制区分で絞り込み"
          >
            <option value="">全ての規制区分</option>
            {CATEGORY_FILTERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={skinOnly}
              onChange={(e) => setSkinOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
            />
            皮膚等障害のみ
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          該当 {filtered.length} 件 / 全 {chemicalSubstances.length} 件
        </p>
      </section>

      <section aria-labelledby="results-heading">
        <h2 id="results-heading" className="sr-only">
          検索結果
        </h2>
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            該当する物質が見つかりませんでした。別の語句や区分でお試しください。
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {s.name}
                      </h3>
                      {s.name_en && (
                        <span className="text-xs text-slate-500">
                          {s.name_en}
                        </span>
                      )}
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                        CAS {s.cas}
                      </span>
                      {s.skin_hazard && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                          <Hand className="h-3 w-3" aria-hidden="true" />
                          皮膚等障害
                        </span>
                      )}
                    </div>

                    {s.synonyms && s.synonyms.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        別名: {s.synonyms.join(" / ")}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.categories.map((c) => (
                        <span
                          key={c}
                          className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800"
                          title={chemicalCategoryInfo[c]}
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    <dl className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                      {s.oel && (
                        <div>
                          <dt className="font-semibold text-slate-500">管理濃度/OEL</dt>
                          <dd>{s.oel}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="font-semibold text-slate-500">主な用途</dt>
                        <dd>{s.uses}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="flex items-center gap-1 font-semibold text-slate-500">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                          主な健康影響
                        </dt>
                        <dd>{s.health_effects}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="flex items-center gap-1 font-semibold text-slate-500">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                          関連法令
                        </dt>
                        <dd>{s.related_laws.join(" / ")}</dd>
                      </div>
                      {s.ghs && s.ghs.length > 0 && (
                        <div className="sm:col-span-2">
                          <dt className="font-semibold text-slate-500">GHS分類（主要）</dt>
                          <dd>{s.ghs.join(" / ")}</dd>
                        </div>
                      )}
                    </dl>

                    {s.sds_url && (
                      <a
                        href={s.sds_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex min-h-[36px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        厚労省SDS情報を見る
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4 text-slate-500" aria-hidden="true" />
          関連ページ
        </p>
        <ul className="mt-2 flex flex-wrap gap-3 text-xs">
          <li>
            <Link
              href="/chemical-ra"
              className="inline-flex min-h-[36px] items-center rounded-md border border-emerald-300 bg-white px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              化学物質リスクアセスメント
            </Link>
          </li>
          <li>
            <Link
              href="/laws/notices-precedents"
              className="inline-flex min-h-[36px] items-center rounded-md border border-emerald-300 bg-white px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              通達・判例
            </Link>
          </li>
          <li>
            <Link
              href="/glossary"
              className="inline-flex min-h-[36px] items-center rounded-md border border-emerald-300 bg-white px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              安全用語辞書
            </Link>
          </li>
        </ul>
      </aside>
    </div>
  );
}
