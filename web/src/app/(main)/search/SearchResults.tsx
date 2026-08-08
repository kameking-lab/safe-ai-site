'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  TestTube2,
  BookOpen,
  AlertTriangle,
  BookText,
  HardHat,
  LayoutGrid,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  ClipboardCheck,
  FlaskConical,
} from 'lucide-react';
import {
  buildSearchIndexWithStatus,
  searchItems,
  findConservativeSearchSuggestion,
  getSearchMatchDetails,
  getSearchTrustState,
  getSearchDocumentTypeLabel,
  type SearchIndexBuild,
  type SearchItem,
} from '@/lib/search-index';
import { EGOV_LAW_SEARCH_URL, egovHandoffQuery, egovArticleAnchor } from '@/lib/cross-search';
import { useCondexLanding } from '@/lib/laws-fulltext/condex-client';
import { trackEvent } from '@/components/Analytics';
import { MascotGuide } from "@/components/mascot-guide";
import { useClientReady } from "@/lib/use-client-ready";

// 検索順位は既存の評価済みrankerを維持し、UIでは目的別に分けてページングする。
// 300件をDOMへ一括描画せず、機能5件・公式文書20件・その他20件を上限に表示する。
const RESULT_LIMIT = 300;
export const SEARCH_DESTINATION_LIMIT = 5;
export const SEARCH_PAGE_SIZE = 20;

export const SEARCH_MACRO_CATEGORIES = [
  "law",
  "accident",
  "chemical",
  "qualification",
  "education",
  "kyt",
  "tool",
  "automation-sample",
] as const;

export type SearchMacroCategory = (typeof SEARCH_MACRO_CATEGORIES)[number];

const MACRO_META: Record<
  SearchMacroCategory,
  { label: string; className: string }
> = {
  law: { label: "法令", className: "text-semantic-official" },
  accident: { label: "事故", className: "text-semantic-danger" },
  chemical: { label: "化学物質", className: "text-semantic-caution" },
  qualification: { label: "資格", className: "text-semantic-success" },
  education: { label: "教育", className: "text-semantic-success" },
  kyt: { label: "KYT", className: "text-brand-primary" },
  tool: { label: "ツール", className: "text-semantic-info" },
  "automation-sample": {
    label: "自動化サンプル",
    className: "text-semantic-ai",
  },
};

const EMPTY_CATEGORY_QUERIES: Record<SearchMacroCategory, string> = {
  law: "法令",
  accident: "事故",
  chemical: "化学物質",
  qualification: "資格",
  education: "教育",
  kyt: "KYT",
  tool: "ツール",
  "automation-sample": "自動化",
};

function macroCategoryFor(item: SearchItem): SearchMacroCategory {
  const labels = item.keywords ?? [];
  if (labels.includes("自動化サンプル")) return "automation-sample";
  if (labels.includes("資格")) return "qualification";
  if (labels.includes("教育")) return "education";
  if (labels.includes("KYT")) return "kyt";
  if (item.category === "chemical") return "chemical";
  if (item.category === "accident" || item.category === "article") {
    return "accident";
  }
  if (
    item.category === "law" ||
    item.category === "plain" ||
    item.category === "revision" ||
    item.category === "notice" ||
    item.category === "precedent" ||
    item.category === "glossary" ||
    item.category === "faq"
  ) {
    return "law";
  }
  if (item.category === "education") return "education";
  return "tool";
}

function canonicalResultKey(item: SearchItem): string {
  return (item.canonicalUrl || item.url).replace(/[?#].*$/, '').replace(/\/$/, '') || '/';
}

export type SearchResultGroups = {
  destinations: SearchItem[];
  documents: SearchItem[];
  others: SearchItem[];
};

/**
 * rankerの順序を変えず、canonical重複だけを先勝ちで除去して表示用途へ分類する。
 */
export function classifySearchResults(results: SearchItem[]): SearchResultGroups {
  const seen = new Set<string>();
  const groups: SearchResultGroups = {
    destinations: [],
    documents: [],
    others: [],
  };

  for (const item of results) {
    const canonical = canonicalResultKey(item);
    if (seen.has(canonical)) continue;
    seen.add(canonical);

    if (item.informationKind === 'tool' || item.category === 'feature') {
      groups.destinations.push(item);
    } else if (
      item.informationKind === 'primary' ||
      item.informationKind === 'officialAccident' ||
      (item.officialDestinations?.length ?? 0) > 0
    ) {
      groups.documents.push(item);
    } else {
      groups.others.push(item);
    }
  }

  return groups;
}

export function paginateSearchResults(
  items: SearchItem[],
  requestedPage: number,
  pageSize = SEARCH_PAGE_SIZE,
): { items: SearchItem[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageCount };
}

function positivePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function buildSearchPageHref({
  query: _query,
  category,
  documentPage,
  otherPage,
  targetKind,
  targetPage,
}: {
  query: string;
  category: 'all' | SearchMacroCategory;
  documentPage: number;
  otherPage: number;
  targetKind: 'documents' | 'others';
  targetPage: number;
}): string {
  void _query;
  const params = new URLSearchParams();
  const nextDocumentPage =
    targetKind === 'documents' ? Math.max(1, targetPage) : Math.max(1, documentPage);
  const nextOtherPage =
    targetKind === 'others' ? Math.max(1, targetPage) : Math.max(1, otherPage);

  // Search text is deliberately omitted: it can contain personal or site information.
  if (category !== 'all') params.set('cat', category);
  if (nextDocumentPage > 1) params.set('docPage', String(nextDocumentPage));
  if (nextOtherPage > 1) params.set('otherPage', String(nextOtherPage));

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : '/search';
}

function CategoryIcon({ category }: { category: SearchMacroCategory }) {
  const cls = 'h-4 w-4';
  switch (category) {
    case 'law': return <BookText className={cls} aria-hidden="true" />;
    case 'accident': return <AlertTriangle className={cls} aria-hidden="true" />;
    case 'chemical': return <TestTube2 className={cls} aria-hidden="true" />;
    case 'qualification': return <HardHat className={cls} aria-hidden="true" />;
    case 'education': return <BookOpen className={cls} aria-hidden="true" />;
    case 'kyt': return <ClipboardCheck className={cls} aria-hidden="true" />;
    case 'tool': return <LayoutGrid className={cls} aria-hidden="true" />;
    case 'automation-sample': return <FlaskConical className={cls} aria-hidden="true" />;
  }
}

export function SearchResults() {
  const isClientReady = useClientReady();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const urlCat = searchParams.get('cat');
  const initialCategory: 'all' | SearchMacroCategory =
    urlCat && (SEARCH_MACRO_CATEGORIES as readonly string[]).includes(urlCat)
      ? (urlCat as SearchMacroCategory)
      : 'all';

  const [input, setInput] = useState(urlQuery);
  const [submittedQuery, setSubmittedQuery] = useState(urlQuery);
  const [activeCategory, setActiveCategory] = useState<'all' | SearchMacroCategory>(
    initialCategory,
  );
  const [requestedDocumentPage, setRequestedDocumentPage] = useState(() =>
    positivePage(searchParams.get('docPage')),
  );
  const [requestedOtherPage, setRequestedOtherPage] = useState(() =>
    positivePage(searchParams.get('otherPage')),
  );
  const [indexBuild, setIndexBuild] = useState<SearchIndexBuild>({
    items: [],
    status: 'partial',
    failedSources: [],
    builtAt: '',
  });
  const [loading, setLoading] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);

  // 旧URLの q は読取互換だけ維持する。以後の検索本文はこのタブのメモリだけに置く。
  useEffect(() => {
    setInput(urlQuery);
    setSubmittedQuery(urlQuery);
  }, [urlQuery]);

  // 初回マウントで横断インデックスを構築（モジュールキャッシュで2回目以降は即時）
  useEffect(() => {
    let alive = true;
    setLoading(true);
    buildSearchIndexWithStatus()
      .then((build) => {
        if (!alive) return;
        setIndexBuild(build);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setIndexBuild({
          items: [],
          status: 'blocked',
          failedSources: ['search-index'],
          builtAt: new Date().toISOString(),
        });
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadNonce]);

  const index = indexBuild.items;

  const allResults = useMemo(
    () => (submittedQuery ? searchItems(index, submittedQuery, 'all', RESULT_LIMIT) : []),
    [index, submittedQuery],
  );
  const results = useMemo(
    () =>
      activeCategory === 'all'
        ? allResults
        : allResults.filter(
            (item) => macroCategoryFor(item) === activeCategory,
          ),
    [activeCategory, allResults],
  );
  const counts = useMemo(() => {
    const macro = Object.fromEntries(
      SEARCH_MACRO_CATEGORIES.map((category) => [category, 0]),
    ) as Record<SearchMacroCategory, number>;
    for (const item of allResults) {
      macro[macroCategoryFor(item)] += 1;
    }
    return { all: allResults.length, ...macro };
  }, [allResults]);
  const suggestion = useMemo(
    () =>
      submittedQuery && results.length === 0
        ? findConservativeSearchSuggestion(index, submittedQuery)
        : null,
    [index, results.length, submittedQuery],
  );
  const groupedResults = useMemo(() => classifySearchResults(results), [results]);
  const visibleDestinations = groupedResults.destinations.slice(
    0,
    SEARCH_DESTINATION_LIMIT,
  );
  const documentPage = useMemo(
    () => paginateSearchResults(groupedResults.documents, requestedDocumentPage),
    [groupedResults.documents, requestedDocumentPage],
  );
  const otherPage = useMemo(
    () => paginateSearchResults(groupedResults.others, requestedOtherPage),
    [groupedResults.others, requestedOtherPage],
  );
  const dedupedResultCount =
    groupedResults.destinations.length +
    groupedResults.documents.length +
    groupedResults.others.length;

  // 本文は送らず、件数などの非識別情報だけを解析する。
  useEffect(() => {
    if (submittedQuery && !loading) {
      trackEvent('search_results_view', {
        category: activeCategory,
        result_count: results.length,
        query_length: submittedQuery.length,
      });
    }
    // results.length は submittedQuery/activeCategory/loading から導かれるため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedQuery, activeCategory, loading]);

  const runSearch = useCallback(
    (q: string, cat: 'all' | SearchMacroCategory) => {
      setSubmittedQuery(q.trim());
      setActiveCategory(cat);
      setRequestedDocumentPage(1);
      setRequestedOtherPage(1);
    },
    [],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(input, activeCategory);
  };

  return (
    <div data-search-client-ready={String(isClientReady)}>
      {/* 検索ボックス */}
      <form onSubmit={onSubmit} className="mt-4" role="search">
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-portal-border bg-portal-surface px-3 py-2.5 shadow-[var(--shadow-xs)] focus-within:border-brand-primary focus-within:ring-4 focus-within:ring-brand-primary/20">
          <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="キーワードを入力（例: アーク溶接、トルエン、安全配慮義務）"
            aria-label="サイト内を横断検索"
            autoComplete="off"
            disabled={!isClientReady}
            className="min-h-[28px] min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                runSearch('', activeCategory);
              }}
              aria-label="検索語をクリア"
              className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!isClientReady}
            className="portal-button-primary min-h-11 shrink-0 px-4 text-sm"
          >
            検索
          </button>
        </div>
      </form>

      {/* カテゴリタブ（件数バッジ付き）。ヒット0のカテゴリは畳んで表示しない＝
          スマホでタブが多段に折り返すのを防ぎ、押しても空になるタブへの誤タップを断つ
          （ファセット検索の空ファセット非表示の定石）。現在選択中のカテゴリは、クエリ変更で
          0件へ転じても選択状態を見失わせないよう常に残す。「すべて」は常設。 */}
      {submittedQuery && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="カテゴリで絞り込み">
          <CategoryTab
            label="すべて"
            count={counts.all}
            active={activeCategory === 'all'}
            onClick={() => runSearch(submittedQuery, 'all')}
          />
          {SEARCH_MACRO_CATEGORIES.filter(
            (cat) => counts[cat] > 0 || cat === activeCategory,
          ).map((cat) => (
            <CategoryTab
              key={cat}
              label={MACRO_META[cat].label}
              count={counts[cat]}
              active={activeCategory === cat}
              activeClass="border-brand-primary bg-portal-surface-emphasis text-brand-primary"
              onClick={() => runSearch(submittedQuery, cat)}
            />
          ))}
        </div>
      )}

      {/* 結果本体 */}
      <div className="mt-5">
        {!loading && indexBuild.status !== 'complete' && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <p className="font-bold">
              {indexBuild.status === 'blocked'
                ? '高リスク分野を含む検索索引を完全に読み込めませんでした'
                : '検索索引の一部を読み込めませんでした'}
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              この状態の検索結果や0件表示だけで、規定・資格・事故・化学物質情報が存在しないとは判断しないでください。
              読み込み失敗: {indexBuild.failedSources.join('、') || '不明'}
            </p>
            <button
              type="button"
              onClick={() => setReloadNonce((value) => value + 1)}
              className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-amber-500 bg-white px-3 font-semibold"
            >
              索引を再読み込み
            </button>
          </div>
        )}
        {!submittedQuery ? (
          <EmptyPrompt
            onCategory={(query, category) => {
              setInput(query);
              runSearch(query, category);
            }}
          />
        ) : loading ? (
          <ul className="space-y-2" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </ul>
        ) : results.length === 0 ? (
          <NoResults
            query={submittedQuery}
            suggestion={suggestion}
            indexStatus={indexBuild.status}
            onSuggestion={(value) => {
              setInput(value);
              runSearch(value, activeCategory);
            }}
          />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
              「{submittedQuery}」の検索結果 {dedupedResultCount}件
              {dedupedResultCount !== results.length &&
                `（canonical重複 ${results.length - dedupedResultCount}件を統合）`}
              {results.length >= RESULT_LIMIT && '（上位のみ表示）'}
            </p>
            {groupedResults.destinations.length > 0 ? (
              <SearchResultSection
                id="search-destinations"
                heading="目的の機能・ページ"
                description={`上位${SEARCH_DESTINATION_LIMIT}件まで表示`}
                count={groupedResults.destinations.length}
                items={visibleDestinations}
                query={submittedQuery}
              />
            ) : null}
            {groupedResults.documents.length > 0 ? (
              <SearchResultSection
                id="search-official-documents"
                heading="公式一次資料への導線・文書"
                description={`${SEARCH_PAGE_SIZE}件ずつ表示`}
                count={groupedResults.documents.length}
                items={documentPage.items}
                query={submittedQuery}
                page={documentPage.page}
                pageCount={documentPage.pageCount}
                onPrevious={
                  documentPage.page > 1
                    ? () => setRequestedDocumentPage((page) => Math.max(1, page - 1))
                    : undefined
                }
                onNext={
                  documentPage.page < documentPage.pageCount
                    ? () => setRequestedDocumentPage((page) => page + 1)
                    : undefined
                }
              />
            ) : null}
            {groupedResults.others.length > 0 ? (
              <SearchResultSection
                id="search-other-results"
                heading="その他の結果"
                description={`${SEARCH_PAGE_SIZE}件ずつ表示`}
                count={groupedResults.others.length}
                items={otherPage.items}
                query={submittedQuery}
                page={otherPage.page}
                pageCount={otherPage.pageCount}
                onPrevious={
                  otherPage.page > 1
                    ? () => setRequestedOtherPage((page) => Math.max(1, page - 1))
                    : undefined
                }
                onNext={
                  otherPage.page < otherPage.pageCount
                    ? () => setRequestedOtherPage((page) => page + 1)
                    : undefined
                }
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function SearchResultSection({
  id,
  heading,
  description,
  count,
  items,
  query,
  page = 1,
  pageCount = 1,
  onPrevious,
  onNext,
}: {
  id: string;
  heading: string;
  description: string;
  count: number;
  items: SearchItem[];
  query: string;
  page?: number;
  pageCount?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="mt-5" data-search-result-section={id}>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-black text-brand-secondary dark:text-white">
            {heading}
          </h2>
          <p className="text-xs text-portal-muted">{description}・全{count}件</p>
        </div>
        {pageCount > 1 ? (
          <span className="text-xs font-bold text-portal-muted">
            {page} / {pageCount}ページ
          </span>
        ) : null}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <SearchResultRow key={item.id} item={item} query={query} />
        ))}
      </ul>
      {pageCount > 1 ? (
        <nav aria-label={`${heading}のページ`} className="mt-3 flex items-center justify-between gap-3">
          {onPrevious ? (
            <button
              type="button"
              onClick={onPrevious}
              className="inline-flex min-h-11 items-center rounded-lg border border-portal-border bg-portal-surface px-4 text-sm font-bold"
            >
              前の{SEARCH_PAGE_SIZE}件
            </button>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-11 items-center rounded-lg border border-portal-border bg-portal-surface px-4 text-sm font-bold opacity-45"
            >
              前の{SEARCH_PAGE_SIZE}件
            </span>
          )}
          {onNext ? (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex min-h-11 items-center rounded-lg border border-portal-border bg-portal-surface px-4 text-sm font-bold"
            >
              次の{SEARCH_PAGE_SIZE}件
            </button>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-11 items-center rounded-lg border border-portal-border bg-portal-surface px-4 text-sm font-bold opacity-45"
            >
              次の{SEARCH_PAGE_SIZE}件
            </span>
          )}
        </nav>
      ) : null}
    </section>
  );
}

function SearchResultRow({ item, query }: { item: SearchItem; query: string }) {
  const macroCategory = macroCategoryFor(item);
  const macroMeta = MACRO_META[macroCategory];
  const trust = getSearchTrustState(item);
  const documentType = getSearchDocumentTypeLabel(item);
  const match = getSearchMatchDetails(item, query);
  const matchField =
    match.field === 'title'
      ? '名称'
      : match.field === 'heading'
        ? '見出し'
        : match.field === 'keywords'
          ? '正式名・関連語'
          : match.field === 'summary'
            ? '要約'
            : '表記展開';
  const isPrimary =
    item.informationKind === 'primary' ||
    item.informationKind === 'officialAccident';
  const isFlagship = item.keywords?.includes('主力機能') ?? false;
  const isSample =
    macroCategory === 'automation-sample' ||
    (item.keywords?.includes('自動化サンプル') ?? false);

  return (
    <li>
      <Link
        href={item.url}
        className="group flex items-start gap-3 rounded-[var(--radius-md)] border border-portal-border bg-portal-surface px-4 py-3 transition-colors hover:border-brand-primary hover:bg-portal-surface-emphasis"
      >
        <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-portal-surface-emphasis ${macroMeta.className}`}>
          <CategoryIcon category={macroCategory} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-brand-secondary dark:text-white">
            {item.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
            {item.subtitle}
          </span>
          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span>一次資料: {isPrimary ? 'はい' : 'いいえ'}</span>
            <span>法的位置付け: {documentType}</span>
            <span>一致理由: {matchField}</span>
            <span>一致抜粋: 「{match.snippet.slice(0, 64)}」</span>
            <span>更新日・対象時点: {item.asOf || '未登録'}</span>
            <span>施行日: {item.effectiveDate || '個別資料で確認'}</span>
            <span>出典: {item.sourceTitle || '詳細画面で要確認'}</span>
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <span title={trust.description} className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-bold ${trust.className}`}>
              検証状態: {trust.label}
            </span>
            {isPrimary ? <span className="portal-status border-semantic-official text-semantic-official">公式情報</span> : null}
            {isFlagship ? <span className="portal-status border-brand-primary text-brand-primary">主力機能</span> : null}
            {isSample ? <span className="portal-status portal-status-sample">自動化サンプル</span> : null}
          </span>
        </span>
        <span className={`shrink-0 rounded bg-portal-surface-emphasis px-1.5 py-0.5 text-[10px] font-bold ${macroMeta.className}`}>
          種別: {macroMeta.label}
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-portal-muted group-hover:text-brand-primary" aria-hidden="true" />
      </Link>
      {item.officialDestinations?.length ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-x border-b border-portal-border bg-sky-50/60 px-4 py-2 text-xs dark:bg-sky-950/20">
          <span className="font-semibold text-sky-900 dark:text-sky-100">公式一次資料</span>
          {item.officialDestinations.slice(0, 2).map((url, index) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="font-medium text-sky-800 underline underline-offset-2 hover:no-underline dark:text-sky-200">
              {item.officialDestinations!.length === 1 ? '正本を確認' : `正本${index + 1}を確認`}
            </a>
          ))}
        </div>
      ) : null}
    </li>
  );
}

function CategoryTab({
  label,
  count,
  active,
  activeClass = 'border-brand-primary bg-portal-surface-emphasis text-brand-primary',
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  activeClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 text-xs font-semibold transition-colors ${
        active
          ? activeClass
          : 'border-portal-border bg-portal-surface text-portal-muted hover:bg-portal-surface-emphasis'
      }`}
    >
      {label}
      <span className={`text-[10px] font-bold ${active ? 'opacity-80' : 'text-slate-400'}`}>{count}</span>
    </button>
  );
}

function EmptyPrompt({
  onCategory,
}: {
  onCategory: (query: string, category: SearchMacroCategory) => void;
}) {
  return (
    <div className="portal-surface p-4 sm:p-6">
      <MascotGuide
        variant="search"
        title="キーワードを入力してください"
        message="例：アーク溶接、トルエン、フルハーネス、墜落"
        imageVariant="binoculars"
        compact
      />
      <nav aria-label="検索カテゴリ" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SEARCH_MACRO_CATEGORIES.map((category) => {
          const meta = MACRO_META[category];
          const query = EMPTY_CATEGORY_QUERIES[category];
          return (
            <button
              type="button"
              key={category}
              onClick={() => onCategory(query, category)}
              className="flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-portal-border bg-portal-surface-emphasis px-3 py-2 text-sm font-bold text-brand-secondary hover:border-brand-primary hover:text-brand-primary dark:text-white"
            >
              <span className={meta.className}>
                <CategoryIcon category={category} />
              </span>
              {meta.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function NoResults({
  query,
  suggestion,
  indexStatus,
  onSuggestion,
}: {
  query: string;
  suggestion: string | null;
  indexStatus: SearchIndexBuild['status'];
  onSuggestion: (value: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const handoff = egovHandoffQuery(query);
  // FT-D4 condex: curated に無い条番号（例「安衛則630条」）でも、全文層に在れば当該の
  // 全文条ページ（/law-navi/…）へ内部着地させる。0 件時にだけ condex を遅延取得して解決する
  // （通常検索の索引・スコアには一切触れない＝0 件救済にのみ効く）。e-Gov 誘導より優先表示。
  const condexLanding = useCondexLanding(query, true);
  // クエリが「法令名＋条番号」を明示していれば、当該法令の e-Gov 条アンカーへ直リンクする
  // （抄録未収載の条番号でも 1 タップで原文へ着地＝T4 後段）。条件を満たさなければ null で
  // 従来のポータルトップ導線に委ねる。
  const anchor = egovArticleAnchor(query);

  // クエリを e-Gov の検索ボックスへ貼り付けてもらうためクリップボードへ引き継ぐ
  // （e-Gov 新 UI はキーワードのディープリンク URL が非公開のため、リンクは常に到達可能な
  //   ポータルトップに固定し、クエリ本文はコピーで渡す＝幽霊リンク 0）。
  const copyQuery = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(handoff);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不許可環境は黙って無視（e-Gov リンク自体は機能する）
    }
  }, [handoff]);

  const linkCls =
    'inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        「{query}」に一致する結果が見つかりませんでした
      </p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        表記を変える（カタカナ／漢字）、語を短くする、別のキーワードでお試しください。
      </p>
      {suggestion && (
        <button
          type="button"
          onClick={() => onSuggestion(suggestion)}
          className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-900"
        >
          もしかして「{suggestion}」
        </button>
      )}
      {indexStatus !== 'complete' && (
        <p role="alert" className="mx-auto mt-3 max-w-xl rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-left text-xs font-semibold text-rose-950">
          索引が完全ではないため、この0件結果は確定できません。公式検索または専門窓口でも確認してください。
        </p>
      )}

      {/* FT-D4 condex: curated 未収録でも全文層に在る条番号は、内部の全文条ページへ直着地。
          e-Gov 外部誘導より上に、内部ページの正着地として目立たせる（emerald）。 */}
      {condexLanding && (
        <Link
          href={condexLanding.path}
          onClick={() =>
            trackEvent('search_zero_result_fulltext_article', {
              law: condexLanding.lawShort,
              article: condexLanding.articleLabel,
              query_length: query.length,
            })
          }
          className="mx-auto mt-4 flex min-h-[44px] max-w-xl items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          <BookText className="h-3.5 w-3.5" aria-hidden="true" />
          全文を読む：{condexLanding.lawShort} {condexLanding.articleLabel}
          {condexLanding.caption ? condexLanding.caption : condexLanding.isDeleted ? '（削除）' : ''}
        </Link>
      )}

      {/* 収録範囲の明示：0件を「規定がない」と誤読させない（安全上の誤読防止）。 */}
      <p className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <span className="font-semibold">見つからない＝「規定がない」ではありません。</span>
        本サイトは主要法令の条文（抄録）・通達・判例などを収載しており、未収載の条文もあります。
        条文の有無・原文は政府公式の <span className="font-semibold">e-Gov 法令検索</span> でご確認ください。
      </p>

      {/* 法令名＋条番号が明示されたクエリは e-Gov の該当条へ直リンク（貼り付け不要で原文へ着地）。 */}
      {anchor && (
        <a
          href={anchor.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('search_zero_result_egov_article', { query_length: query.length })}
          className="mx-auto mt-4 inline-flex min-h-[44px] max-w-xl items-center justify-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          e-Gov で「{anchor.fullName} {anchor.articleLabel}」を開く
        </a>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
        <Link href="/law-search" className={linkCls}>
          AIを使わず法令条文を全文検索
        </Link>
        <a
          href={EGOV_LAW_SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('search_zero_result_egov', { query_length: query.length })}
          className={linkCls}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          e-Gov法令検索で調べる
        </a>
        {handoff && (
          <button type="button" onClick={copyQuery} className={linkCls} aria-live="polite">
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? 'コピーしました' : '検索語をコピー'}
          </button>
        )}
        <Link href="/chatbot" className={linkCls}>
          条件を整理してAIに質問する
        </Link>
        <Link
          href="/contact"
          className={linkCls}
        >
          専門窓口へ確認する
        </Link>
      </div>
      <p className="mx-auto mt-4 max-w-xl text-left text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        AIへ進む前に、業種、作業内容、機械・化学物質、人数、資格上の立場、対象日を整理してください。
        条件不足時は結論を出さず、所轄労働局・労働基準監督署や資格を持つ専門家へ確認してください。
      </p>
    </div>
  );
}
