'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  FileText,
  TestTube2,
  BookOpen,
  AlertTriangle,
  Scale,
  BookMarked,
  BookText,
  HelpCircle,
  HardHat,
  Signpost,
  Newspaper,
  LayoutGrid,
  ScrollText,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import {
  buildSearchIndex,
  searchItems,
  countByCategory,
  CATEGORY_META,
  SEARCH_CATEGORIES,
  type SearchItem,
  type SearchCategory,
} from '@/lib/search-index';
import { EGOV_LAW_SEARCH_URL, egovHandoffQuery, egovArticleAnchor } from '@/lib/cross-search';
import { trackEvent } from '@/components/Analytics';

// /search はサイト内検索結果ページ（全件表示）。コマンドパレット(⌘K)が上位10件の
// クイック移動なのに対し、こちらは件数無制限・URL共有可能・カテゴリ別タブを備える。
const RESULT_LIMIT = 300;

function CategoryIcon({ category }: { category: SearchCategory }) {
  const cls = 'h-4 w-4';
  switch (category) {
    case 'law':       return <BookText className={cls} aria-hidden="true" />;
    case 'revision':  return <ScrollText className={cls} aria-hidden="true" />;
    case 'notice':    return <FileText className={cls} aria-hidden="true" />;
    case 'chemical':  return <TestTube2 className={cls} aria-hidden="true" />;
    case 'education': return <BookOpen className={cls} aria-hidden="true" />;
    case 'accident':  return <AlertTriangle className={cls} aria-hidden="true" />;
    case 'precedent': return <Scale className={cls} aria-hidden="true" />;
    case 'glossary':  return <BookMarked className={cls} aria-hidden="true" />;
    case 'faq':       return <HelpCircle className={cls} aria-hidden="true" />;
    case 'equipment': return <HardHat className={cls} aria-hidden="true" />;
    case 'sign':      return <Signpost className={cls} aria-hidden="true" />;
    case 'article':   return <Newspaper className={cls} aria-hidden="true" />;
    case 'feature':   return <LayoutGrid className={cls} aria-hidden="true" />;
  }
}

export function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const urlCat = searchParams.get('cat');
  const activeCategory: 'all' | SearchCategory =
    urlCat && (SEARCH_CATEGORIES as readonly string[]).includes(urlCat) ? (urlCat as SearchCategory) : 'all';

  const [input, setInput] = useState(urlQuery);
  const [index, setIndex] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  // URL の q が（戻る/進む等で）変わったら入力欄を追従させる
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL→入力欄の片方向同期
    setInput(urlQuery);
  }, [urlQuery]);

  // 初回マウントで横断インデックスを構築（モジュールキャッシュで2回目以降は即時）
  useEffect(() => {
    let alive = true;
    buildSearchIndex().then((items) => {
      if (!alive) return;
      setIndex(items);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(
    () => (urlQuery ? searchItems(index, urlQuery, activeCategory, RESULT_LIMIT) : []),
    [index, urlQuery, activeCategory],
  );
  const counts = useMemo(() => countByCategory(index, urlQuery), [index, urlQuery]);

  // 検索結果を URL に確定（共有・履歴・解析のため）。
  useEffect(() => {
    if (urlQuery && !loading) {
      trackEvent('search_results_view', {
        query: urlQuery,
        category: activeCategory,
        result_count: results.length,
      });
    }
    // results.length は urlQuery/activeCategory/loading から導かれるため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery, activeCategory, loading]);

  const pushQuery = useCallback(
    (q: string, cat: 'all' | SearchCategory) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (cat !== 'all') params.set('cat', cat);
      const qs = params.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    },
    [router],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushQuery(input, activeCategory);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">サイト内 横断検索</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        法令条文・判例・通達・化学物質・特別教育・事故事例をまとめて検索します。
      </p>

      {/* 検索ボックス */}
      <form onSubmit={onSubmit} className="mt-4" role="search">
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800">
          <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="キーワードを入力（例: アーク溶接、トルエン、安全配慮義務）"
            aria-label="サイト内を横断検索"
            autoComplete="off"
            className="min-h-[28px] flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                pushQuery('', activeCategory);
              }}
              aria-label="検索語をクリア"
              className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="inline-flex min-h-[40px] items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            検索
          </button>
        </div>
      </form>

      {/* カテゴリタブ（件数バッジ付き）。ヒット0のカテゴリは畳んで表示しない＝
          スマホでタブが多段に折り返すのを防ぎ、押しても空になるタブへの誤タップを断つ
          （ファセット検索の空ファセット非表示の定石）。現在選択中のカテゴリは、クエリ変更で
          0件へ転じても選択状態を見失わせないよう常に残す。「すべて」は常設。 */}
      {urlQuery && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="カテゴリで絞り込み">
          <CategoryTab
            label="すべて"
            count={counts.all}
            active={activeCategory === 'all'}
            onClick={() => pushQuery(urlQuery, 'all')}
          />
          {SEARCH_CATEGORIES.filter((cat) => counts[cat] > 0 || cat === activeCategory).map((cat) => (
            <CategoryTab
              key={cat}
              label={CATEGORY_META[cat].label}
              count={counts[cat]}
              active={activeCategory === cat}
              activeClass={`${CATEGORY_META[cat].bgColor} ${CATEGORY_META[cat].textColor}`}
              onClick={() => pushQuery(urlQuery, cat)}
            />
          ))}
        </div>
      )}

      {/* 結果本体 */}
      <div className="mt-5">
        {loading ? (
          <ul className="space-y-2" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </ul>
        ) : !urlQuery ? (
          <EmptyPrompt />
        ) : results.length === 0 ? (
          <NoResults query={urlQuery} />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
              「{urlQuery}」の検索結果 {results.length}件
              {results.length >= RESULT_LIMIT && '（上位のみ表示）'}
            </p>
            <ul className="space-y-2">
              {results.map((item) => {
                const meta = CATEGORY_META[item.category];
                return (
                  <li key={item.id}>
                    <Link
                      href={item.url}
                      className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/5"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${meta.bgColor} ${meta.textColor}`}
                      >
                        <CategoryIcon category={item.category} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                          {item.subtitle}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.bgColor} ${meta.textColor}`}
                      >
                        {meta.label}
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-emerald-500" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryTab({
  label,
  count,
  active,
  activeClass = 'bg-slate-800 text-white',
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
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
        active ? activeClass : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {label}
      <span className={`text-[10px] font-bold ${active ? 'opacity-80' : 'text-slate-400'}`}>{count}</span>
    </button>
  );
}

function EmptyPrompt() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <Search className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
        キーワードを入力して検索してください
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        法令条文・判例・通達・化学物質・特別教育・事故事例を横断して探せます。
      </p>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  const [copied, setCopied] = useState(false);
  const handoff = egovHandoffQuery(query);
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
          onClick={() => trackEvent('search_zero_result_egov_article', { query })}
          className="mx-auto mt-4 inline-flex min-h-[44px] max-w-xl items-center justify-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          e-Gov で「{anchor.fullName} {anchor.articleLabel}」を開く
        </a>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
        <Link href="/law-search" className={linkCls}>
          法令条文を全文検索
        </Link>
        <a
          href={EGOV_LAW_SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('search_zero_result_egov', { query })}
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
          AIに質問する
        </Link>
      </div>
    </div>
  );
}
