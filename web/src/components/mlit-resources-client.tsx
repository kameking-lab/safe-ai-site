"use client";

import { useMemo, useState } from "react";
import { Search, ExternalLink, FileText, Building2, Filter, X } from "lucide-react";
import {
  mlitResources,
  MLIT_CATEGORIES,
  type MlitCategory,
  type MlitResource,
} from "@/data/mlit-resources";

const CATEGORY_DESCRIPTIONS: Record<MlitCategory, string> = {
  ドローン: "無人航空機の飛行ガイドライン・通達・事故報告。",
  建設工事: "建設業法令遵守・安全衛生マネジメント・リスクアセスメント。",
  道路: "交通安全計画・ゾーン30プラス・道路安全対策。",
  鉄道: "鉄軌道・索道の輸送安全・事故事例・テロ対策。",
  港湾: "港湾保安・PSカード・サイバーセキュリティ・気候変動適応。",
  航空: "航空運送・空港安全関連の通達。",
  物流: "トラック・倉庫・荷役の安全。",
  災害対応: "TEC-FORCE・タイムライン・地震/水害対応。",
  ICT: "i-Construction・ICT施工・労災防止データベース。",
  環境労働: "メンタルヘルス・化学物質管理・予防安全。",
};

function normalize(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

function matches(r: MlitResource, q: string): boolean {
  if (!q) return true;
  const n = normalize(q);
  const haystack = [
    r.title,
    r.publisher,
    r.bureau,
    r.subcategory,
    ...r.targetAudience,
    ...r.relatedLaws,
    ...r.keywords,
  ]
    .map(normalize)
    .join(" ");
  return haystack.includes(n);
}

export function MlitResourcesClient() {
  const [activeCategory, setActiveCategory] = useState<MlitCategory | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [pdfOnly, setPdfOnly] = useState(false);
  const [bureauFilter, setBureauFilter] = useState<string | "ALL">("ALL");

  const bureaus = useMemo(() => {
    const set = new Set<string>();
    mlitResources.forEach((r) => set.add(r.bureau));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    return mlitResources.filter((r) => {
      if (activeCategory !== "ALL" && r.category !== activeCategory) return false;
      if (pdfOnly && !r.pdfUrl) return false;
      if (bureauFilter !== "ALL" && r.bureau !== bureauFilter) return false;
      if (!matches(r, query)) return false;
      return true;
    });
  }, [activeCategory, pdfOnly, bureauFilter, query]);

  const categoryCounts = useMemo(() => {
    const counts: Record<MlitCategory | "ALL", number> = { ALL: mlitResources.length } as Record<
      MlitCategory | "ALL",
      number
    >;
    for (const c of MLIT_CATEGORIES) counts[c] = 0;
    for (const r of mlitResources) counts[r.category] += 1;
    return counts;
  }, []);

  const hasFilters =
    query !== "" || activeCategory !== "ALL" || pdfOnly || bureauFilter !== "ALL";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:py-10">
      <header className="mb-6 md:mb-8">
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
          <Building2 className="h-3.5 w-3.5" />
          国土交通省・建災防 一次ソース
        </p>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          国交省・建災防 安全資料DB
        </h1>
        <p className="mt-2 text-sm text-slate-600 md:text-base">
          航空・道路・鉄道・港湾・河川（災害対応）・建設業労働災害防止協会の
          ガイドライン／マニュアル／通達 {mlitResources.length} 件を横断検索。
          すべて公式サイト・公式PDFへの直リンクで一次ソース確認可。
        </p>
      </header>

      {/* 検索 + フィルタ */}
      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[2fr_1fr_auto] md:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・キーワード・関連法令で検索"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <select
          value={bureauFilter}
          onChange={(e) => setBureauFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        >
          <option value="ALL">すべての所管</option>
          {bureaus.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
          <input
            type="checkbox"
            checked={pdfOnly}
            onChange={(e) => setPdfOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          PDFのみ
        </label>
      </div>

      {/* カテゴリタブ */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("ALL")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition md:text-sm ${
            activeCategory === "ALL"
              ? "bg-sky-600 text-white shadow"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          すべて
          <span className="ml-1.5 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-normal">
            {categoryCounts.ALL}
          </span>
        </button>
        {MLIT_CATEGORIES.map((c) => {
          const count = categoryCounts[c];
          const active = activeCategory === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              disabled={count === 0}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition md:text-sm ${
                active
                  ? "bg-sky-600 text-white shadow"
                  : count === 0
                    ? "cursor-not-allowed bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {c}
              <span
                className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-normal ${
                  active ? "bg-white/20" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* カテゴリ説明 */}
      {activeCategory !== "ALL" && (
        <div className="mb-4 rounded-lg border border-sky-100 bg-sky-50 px-4 py-2 text-xs text-sky-800 md:text-sm">
          <span className="font-semibold">{activeCategory}：</span>
          {CATEGORY_DESCRIPTIONS[activeCategory]}
        </div>
      )}

      {/* リセット */}
      {hasFilters && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <Filter className="h-4 w-4" />
          <span>{filtered.length} 件ヒット</span>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory("ALL");
              setPdfOnly(false);
              setBureauFilter("ALL");
            }}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            <X className="h-3 w-3" /> リセット
          </button>
        </div>
      )}

      {/* リスト */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          条件に合う資料が見つかりませんでした。検索語やフィルタを変更してください。
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                  {r.category}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {r.subcategory}
                </span>
                {r.pdfUrl && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                    <FileText className="h-3 w-3" />
                    PDF
                  </span>
                )}
              </div>
              <h2 className="mb-1.5 text-sm font-semibold leading-snug text-slate-900 md:text-base">
                {r.title}
              </h2>
              <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 md:text-xs">
                <span>
                  <span className="font-medium text-slate-700">{r.publisher}</span>　{r.bureau}
                </span>
                {r.publishedDate && <span>公開: {r.publishedDate}</span>}
              </div>
              {r.relatedLaws.length > 0 && (
                <div className="mb-2 text-[11px] text-slate-600 md:text-xs">
                  <span className="font-medium">関連法令: </span>
                  {r.relatedLaws.join("・")}
                </div>
              )}
              {r.keywords.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {r.keywords.slice(0, 5).map((k) => (
                    <span
                      key={k}
                      className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200"
                    >
                      #{k}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {r.pdfUrl && (
                  <a
                    href={r.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDFを開く
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <a
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  公式ページ
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <p>
          出典: 国土交通省 公式サイト（航空局・道路局・鉄道局・港湾局・自動車局・水管理国土保全局・総合政策局・不動産建設経済局）／
          建設業労働災害防止協会
        </p>
        <p className="mt-1">
          ※当サイトでは AI による要約や生成は一切行っておらず、各資料は公式サイト・公式PDFへの直リンクのみを提供します。
        </p>
      </footer>
    </main>
  );
}
