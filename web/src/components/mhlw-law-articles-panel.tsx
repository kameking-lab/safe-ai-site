"use client";

import { useMemo, useState } from "react";
import { FileText, Search, ExternalLink } from "lucide-react";
import compact from "@/data/laws-mhlw/compact.json";

type CompactArticle = {
  law: string;
  lawShort: string;
  articleNum: string;
  articleTitle: string;
  text: string;
  keywords: string[];
  sourceFile: string;
  page: number;
};

type CompactPayload = {
  generatedAt: string;
  total: number;
  skipped: number;
  sources: string[];
  articles: CompactArticle[];
};

const payload = compact as unknown as CompactPayload;

const PAGE_SIZE = 20;
const SOURCE_LABEL =
  "厚生労働省 労働安全衛生関係法令 PDF（R4/R5 省令改正・施行通達）";

function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

function mhlwSearchUrl(fileName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(
    `site:mhlw.go.jp ${fileName}`
  )}`;
}

function normalize(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

const LAW_NAMES = Array.from(new Set(payload.articles.map((a) => a.law))).sort();

export function MhlwLawArticlesPanel() {
  const [query, setQuery] = useState("");
  const [selectedLaw, setSelectedLaw] = useState<string>("all");
  const [articleNumQuery, setArticleNumQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const nq = normalize(query);
    const nart = normalize(articleNumQuery);
    return payload.articles.filter((a) => {
      if (selectedLaw !== "all" && a.law !== selectedLaw) return false;
      if (nart && !normalize(a.articleNum).includes(nart)) return false;
      if (!nq) return true;
      const hay = normalize(
        [a.law, a.lawShort, a.articleNum, a.articleTitle, a.text, ...a.keywords].join(" ")
      );
      return hay.includes(nq);
    });
  }, [query, selectedLaw, articleNumQuery]);

  const filterKey = `${query}|${selectedLaw}|${articleNumQuery}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  return (
    <section
      aria-labelledby="mhlw-laws-heading"
      className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4"
    >
      <header className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <FileText className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 id="mhlw-laws-heading" className="text-sm font-bold text-slate-800">
              MHLW公式法令 {payload.total.toLocaleString()} 条文（PDF由来）
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              厚労省 R4/R5 の省令改正・施行通達等 {payload.sources.length} 本の PDF（合計 {(payload.total + payload.skipped).toLocaleString()} チャンク）から条番号が確定した {payload.total.toLocaleString()} 条文を収録。
              縦書き PDF 由来のため一部レイアウトノイズを含みます（フェーズ 3 で再抽出予定）。
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              出典: {SOURCE_LABEL}　|　最終更新: {formatUpdatedAt(payload.generatedAt)}
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="sr-only">MHLW条文を検索</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="条文本文・キーワードで検索（例: 石綿 / 濃度基準値 / SDS）"
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
          <input
            type="search"
            value={articleNumQuery}
            onChange={(e) => setArticleNumQuery(e.target.value)}
            placeholder="条番号（例: 第59条）"
            className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedLaw("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              selectedLaw === "all"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            全法令（{payload.articles.length.toLocaleString()}）
          </button>
          {LAW_NAMES.map((name) => {
            const count = payload.articles.filter((a) => a.law === name).length;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedLaw(name)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedLaw === name
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                title={name}
              >
                {name.length > 24 ? name.slice(0, 24) + "…" : name}（{count}）
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          該当 <span className="font-semibold text-slate-700">{filtered.length.toLocaleString()}</span> 件 /
          全 {payload.articles.length.toLocaleString()} 条文
        </p>
      </div>

      <div className="space-y-3">
        {pageItems.map((a, i) => (
          <article
            key={`${a.sourceFile}-${a.articleNum}-${i}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  {a.lawShort}
                </span>
                <span className="text-[11px] font-semibold text-slate-700">{a.articleNum}</span>
                {a.articleTitle && (
                  <span className="text-[11px] text-slate-500">{a.articleTitle}</span>
                )}
                {/* 出典区別バッジ：MHLW PDFはPDF発行時点の条番号・条文（施行当時版） */}
                <span
                  className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                  title="厚労省PDF由来。PDF発行時点の条番号・条文を採録しています。最新の現行条文は『キュレーション』タブまたはe-Govでご確認ください。"
                >
                  <span aria-hidden>●</span> 施行当時（MHLW PDF）
                </span>
              </div>
              <a
                href={mhlwSearchUrl(a.sourceFile)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                title={`出典PDF: ${a.sourceFile} (p.${a.page})`}
              >
                <ExternalLink className="h-3 w-3" />
                {a.sourceFile}
              </a>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
              {a.text}
            </p>
            {a.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.keywords.slice(0, 8).map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            該当する条文が見つかりませんでした。
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            前へ
          </button>
          <span className="text-xs text-slate-500">
            {pageSafe} / {totalPages}（{PAGE_SIZE}件ずつ）
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
    </section>
  );
}
