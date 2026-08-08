"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TransientChatLink } from "@/components/home-safety-cockpit/transient-chat-link";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import type {
  SeriousCase,
  SeriousCaseFilters,
  SeriousCasePage,
} from "@/lib/accident-news/serious-cases";
import {
  AccidentNewsFilter,
  type SelectedFilters,
} from "./accident-news-filter";

const PAGE_SIZE = 30;

type BrowserResult = SeriousCasePage & {
  page: number;
  pageCount: number;
};

export function buildAccidentNewsPageHref(
  selected: Pick<SelectedFilters, "industry" | "type" | "year">,
  page: number,
): string {
  const params = new URLSearchParams();
  if (selected.industry) params.set("industry", selected.industry);
  if (selected.type) params.set("type", selected.type);
  if (selected.year) params.set("year", selected.year);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/accident-news?${query}` : "/accident-news";
}

export function AccidentNewsBrowser({
  children,
  options,
  selected,
  initialResult,
  initialPage,
  initialPageCount,
  corpusTotal,
  corpusYearRange,
}: {
  children?: ReactNode;
  options: SeriousCaseFilters;
  selected: SelectedFilters;
  initialResult: SeriousCasePage;
  initialPage: number;
  initialPageCount: number;
  corpusTotal: number;
  corpusYearRange: string;
}) {
  const [keyword, setKeyword] = useState(selected.q);
  const [result, setResult] = useState<BrowserResult>({
    ...initialResult,
    page: initialPage,
    pageCount: initialPageCount,
  });
  const [isPending, setIsPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fixedFilterKey = `${selected.industry}\u0000${selected.type}\u0000${selected.year}`;
  const previousFixedFilterKey = useRef(fixedFilterKey);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    setResult({
      ...initialResult,
      page: initialPage,
      pageCount: initialPageCount,
    });
  }, [initialPage, initialPageCount, initialResult]);

  const search = useCallback(
    async (page = 1, query = keyword) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsPending(true);
      try {
        const response = await fetch("/api/accident-news/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            industry: selected.industry,
            type: selected.type,
            year: selected.year,
            q: query,
            page,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search_failed");
        const next = (await response.json()) as BrowserResult;
        setResult(next);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResult((current) => current);
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsPending(false);
        }
      }
    },
    [keyword, selected.industry, selected.type, selected.year],
  );

  useEffect(() => {
    if (previousFixedFilterKey.current === fixedFilterKey) return;
    previousFixedFilterKey.current = fixedFilterKey;
    if (keyword.trim()) void search(1);
  }, [fixedFilterKey, keyword, search]);

  const clear = () => {
    setKeyword("");
    void search(1, "");
  };
  const hasFilter = Boolean(
    selected.industry || selected.type || selected.year || keyword.trim(),
  );
  const filterChips = [
    selected.industry,
    selected.type,
    selected.year && `${selected.year}年`,
    keyword.trim() && `「${keyword.trim()}」`,
  ]
    .filter(Boolean)
    .join("・");
  const resultStart = result.total === 0 ? 0 : (result.page - 1) * PAGE_SIZE + 1;
  const resultEnd = Math.min(result.page * PAGE_SIZE, result.total);

  return (
    <>
      {hasFilter ? (
        result.total > 0 ? (
          <ConclusionCard
            tone="info"
            value={result.total}
            unit="件"
            title="該当事例"
            description={`${filterChips} に該当。各カードから対策質問・類似事例・KYへ進めます。`}
          />
        ) : (
          <ConclusionCard
            tone="warning"
            title="該当なし"
            description={`${filterChips} に該当する事例がありません。条件を変えてお試しください。`}
          />
        )
      ) : (
        <ConclusionCard
          tone="info"
          value={corpusTotal.toLocaleString()}
          unit="件"
          title="重大災害事例を収録"
          description={`厚労省の死亡災害データ（${corpusYearRange}・匿名）。業種・事故型・起因物分類・年で類型検索できます。`}
        />
      )}

      <div id="accident-news-search" className="mt-3 scroll-mt-24">
        <AccidentNewsFilter
          options={options}
          selected={selected}
          keyword={keyword}
          onKeywordChange={setKeyword}
          onKeywordSearch={() => void search(1)}
          onClear={clear}
          keywordPending={isPending}
        />
      </div>

      {children}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600" aria-live="polite">
          該当 <span className="font-bold text-sky-800">{result.total}</span> 件
          {result.total > 0 ? `（${resultStart}〜${resultEnd}件目）` : ""}
        </p>
      </div>

      <ul
        className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
        data-accident-news-results
        data-result-count={result.cases.length}
        data-result-total={result.total}
      >
        {result.cases.map((item) => (
          <AccidentNewsCard key={item.id} item={item} />
        ))}
      </ul>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-[44px] items-center text-xs font-bold text-sky-800 underline underline-offset-4"
        >
          <Printer className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
          この結果を印刷
        </button>
      </div>

      {result.pageCount > 1 && (
        <nav
          data-accident-news-client-pagination=""
          aria-label="重大災害事例の検索結果ページ"
          className="mt-4 flex items-center justify-center gap-3"
        >
          <button
            type="button"
            disabled={result.page <= 1 || isPending}
            onClick={() => void search(result.page - 1)}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
          >
            ← 前の{PAGE_SIZE}件
          </button>
          <span className="text-sm font-semibold text-slate-700">
            {result.page} / {result.pageCount} ページ
          </span>
          <button
            type="button"
            disabled={result.page >= result.pageCount || isPending}
            onClick={() => void search(result.page + 1)}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
          >
            次の{PAGE_SIZE}件 →
          </button>
        </nav>
      )}

      <noscript>
        <style>{`[data-accident-news-client-pagination]{display:none!important}`}</style>
        {initialPageCount > 1 ? (
          <nav
            aria-label="重大災害事例の検索結果ページ"
            className="mt-4 flex flex-wrap items-center justify-center gap-3"
          >
            {initialPage > 1 ? (
              <a
                href={buildAccidentNewsPageHref(selected, initialPage - 1)}
                className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
              >
                ← 前の{PAGE_SIZE}件
              </a>
            ) : null}
            <span className="text-sm font-semibold text-slate-700">
              {initialPage} / {initialPageCount} ページ
            </span>
            {initialPage < initialPageCount ? (
              <a
                href={buildAccidentNewsPageHref(selected, initialPage + 1)}
                className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
              >
                次の{PAGE_SIZE}件 →
              </a>
            ) : null}
          </nav>
        ) : null}
      </noscript>

      {result.cases.length === 0 && (
        <p
          className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
          data-accident-news-empty
        >
          該当する事例がありません。条件を変えてお試しください。
        </p>
      )}
    </>
  );
}

function AccidentNewsCard({ item }: { item: SeriousCase }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {item.type && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800">{item.type}</span>
        )}
        {item.industry && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-800">{item.industry}</span>
        )}
        <span className="text-slate-500">{item.year}年{item.month ? `${item.month}月` : ""}</span>
      </div>
      <p className="mt-1 text-sm leading-snug text-slate-800">{item.description}</p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
        {item.cause && <span>起因物分類: {item.cause}</span>}
        {item.workplaceSize && <span>規模: {item.workplaceSize}</span>}
        {item.type && item.sameTypeTotal > 0 && (
          <span className="font-semibold text-rose-700">同種事故 収録{item.sameTypeTotal}件</span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px]">
        <TransientChatLink
          question={`${item.industry ?? ""}の${item.type ?? "災害"}を防ぐための労働安全衛生法上の措置と関連条文は？`}
          className="font-semibold text-blue-700 hover:underline"
        >
          AIに対策を質問 →
        </TransientChatLink>
        <Link href={`/accident-news?focus=${encodeURIComponent(item.id)}`} className="font-semibold text-orange-700 hover:underline">
          似た事例 →
        </Link>
        <Link href="/ky/paper" className="font-semibold text-emerald-700 hover:underline">
          KYを新規作成 →
        </Link>
      </div>
    </li>
  );
}
