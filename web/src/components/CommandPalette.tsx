'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  FileText,
  TestTube2,
  BookOpen,
  AlertTriangle,
  ArrowRight,
  Scale,
  BookMarked,
  BookText,
  HelpCircle,
  HardHat,
  Signpost,
  Newspaper,
  LayoutGrid,
  ScrollText,
  MessageSquare,
  MessageCircle,
  ClipboardList,
  Database,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  buildSearchIndexWithStatus,
  findConservativeSearchSuggestion,
  getSearchTrustState,
  searchItems,
  CATEGORY_META,
  SEARCH_CATEGORIES,
  type SearchItem,
  type SearchCategory,
  type SearchIndexStatus,
} from '@/lib/search-index';
import { EGOV_LAW_SEARCH_URL, egovArticleAnchor } from '@/lib/cross-search';
import { useCondexLanding } from '@/lib/laws-fulltext/condex-client';
import { trackEvent } from '@/components/Analytics';

// 空クエリ時に表示する主要ショートカット（UX-007: モバイル検索とPC Ctrl+K の機能を統一）
type Shortcut = {
  id: string;
  label: string;
  description: string;
  url: string;
  icon: typeof Search;
};

const QUICK_SHORTCUTS: Shortcut[] = [
  { id: 'visual-ky', label: '5分ビジュアルKYT', description: '現場イラストから危険を探し、優先対策を学ぶ', url: '/training/visual-ky', icon: Sparkles },
  { id: 'law-search', label: '法令条文検索', description: '安衛法・関連政令・省令の条文を全文検索', url: '/law-search', icon: Scale },
  { id: 'chatbot', label: '安衛法AI', description: '作業条件から法令本文と公式根拠を確認', url: '/chatbot', icon: MessageSquare },
  { id: 'accident-news', label: '重大災害情報', description: '厚労省死亡災害DBの収録範囲と出典限界を確認して検索', url: '/accident-news', icon: Database },
  { id: 'ky-paper', label: 'KY用紙', description: '作業条件を確認してKY記録を作成', url: '/ky/paper', icon: ClipboardList },
];

function CategoryIcon({ category }: { category: SearchCategory }) {
  const cls = 'w-3.5 h-3.5';
  switch (category) {
    case 'law':       return <BookText className={cls} />;
    case 'plain':     return <MessageCircle className={cls} />;
    case 'revision':  return <ScrollText className={cls} />;
    case 'notice':    return <FileText className={cls} />;
    case 'chemical':  return <TestTube2 className={cls} />;
    case 'education': return <BookOpen className={cls} />;
    case 'accident':  return <AlertTriangle className={cls} />;
    case 'precedent': return <Scale className={cls} />;
    case 'glossary':  return <BookMarked className={cls} />;
    case 'faq':       return <HelpCircle className={cls} />;
    case 'equipment': return <HardHat className={cls} />;
    case 'sign':      return <Signpost className={cls} />;
    case 'article':   return <Newspaper className={cls} />;
    case 'feature':   return <LayoutGrid className={cls} />;
  }
}

interface Props {
  onClose: () => void;
}

const subscribeToClientReady = () => () => {};

export function CommandPalette({ onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const portalReady = useSyncExternalStore(
    subscribeToClientReady,
    () => true,
    () => false,
  );
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | SearchCategory>('all');
  const [index, setIndex] = useState<SearchItem[]>([]);
  const [indexStatus, setIndexStatus] = useState<SearchIndexStatus>('partial');
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Load index on first open
  useEffect(() => {
    buildSearchIndexWithStatus()
      .then((build) => {
        setIndex(build.items);
        setIndexStatus(build.status);
        setLoading(false);
      })
      .catch(() => {
        setIndex([]);
        setIndexStatus('blocked');
        setLoading(false);
      });
  }, []);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Reset selection when results change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 検索結果が変わったタイミングでハイライト位置をリセット
    setSelectedIdx(0);
  }, [debouncedQuery, activeCategory]);

  const results = useMemo(
    () => (debouncedQuery ? searchItems(index, debouncedQuery, activeCategory) : []),
    [debouncedQuery, index, activeCategory],
  );
  const suggestion = useMemo(
    () =>
      debouncedQuery && results.length === 0
        ? findConservativeSearchSuggestion(index, debouncedQuery)
        : null,
    [debouncedQuery, index, results.length],
  );

  // FT-D4 condex: curated に無い条番号（例「安衛則630条」）でも、全文層に在れば当該の
  // 全文条ページ（/law-navi/…）へ内部着地させる。0 件時にだけ condex を遅延取得して解決する
  // （通常検索の索引・スコアには一切触れない＝0 件救済にのみ効く）。/search NoResults とパリティ。
  const condexLanding = useCondexLanding(debouncedQuery, results.length === 0 && !!debouncedQuery);

  // クエリが「法令名＋条番号」を明示していれば、当該法令の e-Gov 条アンカーへ直リンク
  // （抄録未収載の条番号でも 1 タップで原文へ着地＝/search NoResults の T4 後段パリティ）。
  // 条件を満たさなければ null で従来のポータルトップ導線に委ねる。
  const egovAnchor = useMemo(() => egovArticleAnchor(debouncedQuery), [debouncedQuery]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const navigate = useCallback(
    (item: SearchItem) => {
      // 検索語には氏名・健康情報・現場機密が含まれ得るため、本文は解析へ送らない。
      trackEvent("search_query", {
        query_length: debouncedQuery.length,
        result_count: results.length,
      });
      router.push(item.url);
      onClose();
    },
    [router, onClose, debouncedQuery, results.length],
  );

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        const item = results[selectedIdx];
        if (item) navigate(item);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, results, selectedIdx, navigate]);

  // Focus management, background inertness and scroll restoration.
  useEffect(() => {
    if (!portalReady) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    const inertState = new Map<HTMLElement, boolean>();
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === dialog) continue;
      inertState.set(child, child.inert);
      child.inert = true;
    }
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      for (const [element, wasInert] of inertState) element.inert = wasInert;
      previousFocusRef.current?.focus();
    };
  }, [portalReady]);

  if (!portalReady) return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col">
        <h2 id="command-palette-title" className="sr-only">サイト内横断検索</h2>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="サイト内を横断検索"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            aria-controls={results.length > 0 ? 'command-palette-results' : undefined}
            aria-activedescendant={
              results.length > 0 ? `command-palette-result-${selectedIdx}` : undefined
            }
            className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400 text-sm"
            placeholder="判例・通達・化学物質・教育・事故を横断検索…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="inline-flex h-11 w-11 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-label="クリア"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-slate-100 border border-slate-200 rounded text-slate-500">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            aria-label="横断検索を閉じる"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {loading
            ? '検索索引を読み込んでいます'
            : debouncedQuery
              ? `${results.length}件の検索結果`
              : '検索語を入力してください'}
        </p>

        {/* Category filter */}
        <div className="flex gap-1 px-3 py-2 border-b border-slate-100 overflow-x-auto">
          <button
            className={`shrink-0 px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
              activeCategory === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
            onClick={() => setActiveCategory('all')}
          >
            全て
          </button>
          {SEARCH_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                className={`shrink-0 px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                  active ? `${meta.bgColor} ${meta.textColor}` : 'text-slate-500 hover:bg-slate-100'
                }`}
                onClick={() => setActiveCategory(cat)}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!loading && indexStatus !== 'complete' && (
            <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              索引の一部を確認できません。結果や0件表示だけで「存在しない」と判断しないでください。
            </div>
          )}
          {loading ? (
            <div className="py-10 text-center text-slate-600 text-sm">インデックスを読み込み中…</div>
          ) : !debouncedQuery ? (
            <div className="px-2 py-3">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                よく使うショートカット
              </p>
              <ul className="space-y-0.5">
                {QUICK_SHORTCUTS.map((sc) => {
                  const Icon = sc.icon;
                  return (
                    <li key={sc.id}>
                      <button
                        type="button"
                        onClick={() => {
                          router.push(sc.url);
                          onClose();
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-100"
                      >
                        <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-slate-900 truncate">{sc.label}</span>
                          <span className="block text-xs text-slate-500 truncate">{sc.description}</span>
                        </span>
                        <ArrowRight className="shrink-0 w-3.5 h-3.5 text-slate-300" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="px-2 pt-3 text-[11px] text-slate-600">
                またはキーワードを入力して、通達・化学物質・問題・教育・事故から横断検索
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                「{debouncedQuery}」の結果が見つかりませんでした
              </p>
              <p className="mt-1.5 text-xs text-slate-500">
                表記を変える（カタカナ／漢字）、語を短くしてお試しください。
              </p>
              {suggestion && (
                <button
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-sky-300 bg-sky-50 px-4 text-xs font-semibold text-sky-900"
                >
                  もしかして「{suggestion}」
                </button>
              )}
              {/* 収録範囲の明示：0件を「規定がない」と誤読させない安全ガード（/search の NoResults と同一方針）。 */}
              <p className="mx-auto mt-3 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs leading-relaxed text-amber-900">
                <span className="font-semibold">見つからない＝「規定がない」ではありません。</span>
                本サイトは主要法令の条文（抄録）・通達・判例などを収載しており、未収載の条文もあります。条文の有無・原文は政府公式の e-Gov 法令検索でご確認ください。
              </p>
              {/* FT-D4 condex: curated 未収録でも全文層に在る条番号は内部の全文条ページへ直着地
                  （e-Gov 外部誘導より上に、内部ページの正着地として emerald で目立たせる）。 */}
              {condexLanding && (
                <button
                  type="button"
                  onClick={() => {
                    trackEvent('search_zero_result_fulltext_article', {
                      law: condexLanding.lawShort,
                      article: condexLanding.articleLabel,
                      query_length: debouncedQuery.length,
                    });
                    router.push(condexLanding.path);
                    onClose();
                  }}
                  className="mx-auto mt-3 flex min-h-[44px] max-w-md items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <BookText className="h-3.5 w-3.5" aria-hidden="true" />
                  全文を読む：{condexLanding.lawShort} {condexLanding.articleLabel}
                  {condexLanding.caption ? condexLanding.caption : condexLanding.isDeleted ? '（削除）' : ''}
                </button>
              )}
              {/* 法令名＋条番号が明示されたクエリは e-Gov の該当条へ直リンク（貼り付け不要で原文へ着地）。 */}
              {egovAnchor && (
                <a
                  href={egovAnchor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('search_zero_result_egov_article', { query_length: debouncedQuery.length })}
                  className="mx-auto mt-3 inline-flex min-h-[44px] max-w-md items-center justify-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  e-Gov で「{egovAnchor.fullName} {egovAnchor.articleLabel}」を開く
                </a>
              )}
              <a
                href={EGOV_LAW_SEARCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('search_zero_result_egov', { query_length: debouncedQuery.length })}
                className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                e-Gov法令検索で調べる
              </a>
            </div>
          ) : (
            <div
              ref={listRef}
              id="command-palette-results"
              role="listbox"
              aria-label="検索結果"
            >
            {results.map((item, i) => {
              const meta = CATEGORY_META[item.category];
              const trust = getSearchTrustState(item);
              const active = i === selectedIdx;
              return (
                <button
                  key={item.id}
                  id={`command-palette-result-${i}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    active ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => navigate(item)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  role="option"
                  aria-selected={active}
                >
                  <span
                    className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md ${meta.bgColor} ${meta.textColor}`}
                  >
                    <CategoryIcon category={item.category} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{item.title}</div>
                    <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                    <div className="mt-1 text-[10px] font-semibold text-slate-600">
                      {trust.label} ／ 対象時点: {item.asOf || '未登録'}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 hidden sm:inline text-xs px-1.5 py-0.5 rounded ${meta.bgColor} ${meta.textColor} font-medium`}
                  >
                    {meta.label}
                  </span>
                  {active && <ArrowRight className="shrink-0 w-3.5 h-3.5 text-slate-400" />}
                </button>
              );
            })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-2">
            <span>
              <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">↑↓</kbd>
              {' '}選択
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">↵</kbd>
              {' '}決定
            </span>
          </span>
          {debouncedQuery && (
            <button
              type="button"
              onClick={() => {
                router.push('/search');
                onClose();
              }}
              className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
            >
              検索ページを開く
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
