'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  MessageSquare,
  ListChecks,
  BarChart3,
} from 'lucide-react';
import {
  buildSearchIndex,
  searchItems,
  CATEGORY_META,
  type SearchItem,
  type SearchCategory,
} from '@/lib/search-index';
import { trackEvent } from '@/components/Analytics';

const CATEGORIES: SearchCategory[] = ['law', 'faq', 'precedent', 'notice', 'chemical', 'equipment', 'education', 'accident', 'glossary'];

// 空クエリ時に表示する主要ショートカット（UX-007: モバイル検索とPC Ctrl+K の機能を統一）
type Shortcut = {
  id: string;
  label: string;
  description: string;
  url: string;
  icon: typeof Search;
};

const QUICK_SHORTCUTS: Shortcut[] = [
  { id: 'law-search', label: '法令条文検索', description: '安衛法・関連政令・省令の条文を全文検索', url: '/law-search', icon: Scale },
  { id: 'chatbot', label: '法令チャット (AI)', description: 'AI が条文・通達を引用しながら回答', url: '/chatbot', icon: MessageSquare },
  { id: 'accidents-reports', label: '業種別 事故分析レポート', description: '業種別の死亡事故統計・原因分析', url: '/accidents-reports', icon: BarChart3 },
  { id: 'plan-generator', label: '年次安全衛生計画', description: '13業種テンプレートから年次計画 PDF を生成', url: '/strategy/plan-generator', icon: ListChecks },
];

function CategoryIcon({ category }: { category: SearchCategory }) {
  const cls = 'w-3.5 h-3.5';
  switch (category) {
    case 'law':       return <BookText className={cls} />;
    case 'notice':    return <FileText className={cls} />;
    case 'chemical':  return <TestTube2 className={cls} />;
    case 'education': return <BookOpen className={cls} />;
    case 'accident':  return <AlertTriangle className={cls} />;
    case 'precedent': return <Scale className={cls} />;
    case 'glossary':  return <BookMarked className={cls} />;
    case 'faq':       return <HelpCircle className={cls} />;
    case 'equipment': return <HardHat className={cls} />;
  }
}

interface Props {
  onClose: () => void;
}

export function CommandPalette({ onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | SearchCategory>('all');
  const [index, setIndex] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Load index on first open
  useEffect(() => {
    buildSearchIndex().then((items) => {
      setIndex(items);
      setLoading(false);
    });
  }, []);

  // Autofocus
  useEffect(() => {
    inputRef.current?.focus();
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

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const navigate = useCallback(
    (item: SearchItem) => {
      trackEvent("search_query", { query: debouncedQuery, result_count: results.length });
      router.push(item.url);
      onClose();
    },
    [router, onClose, debouncedQuery, results.length],
  );

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
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

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="横断検索"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
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
              className="p-0.5 rounded text-slate-400 hover:text-slate-600"
              aria-label="クリア"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-slate-100 border border-slate-200 rounded text-slate-500">
            ESC
          </kbd>
        </div>

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
          {CATEGORIES.map((cat) => {
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
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto"
          role="listbox"
          aria-label="検索結果"
        >
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-sm">インデックスを読み込み中…</div>
          ) : !debouncedQuery ? (
            <div className="px-2 py-3">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
              <p className="px-2 pt-3 text-[11px] text-slate-400">
                またはキーワードを入力して、通達・化学物質・問題・教育・事故から横断検索
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              「{debouncedQuery}」の結果が見つかりませんでした
            </div>
          ) : (
            results.map((item, i) => {
              const meta = CATEGORY_META[item.category];
              const active = i === selectedIdx;
              return (
                <button
                  key={item.id}
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
                  </div>
                  <span
                    className={`shrink-0 hidden sm:inline text-xs px-1.5 py-0.5 rounded ${meta.bgColor} ${meta.textColor} font-medium`}
                  >
                    {meta.label}
                  </span>
                  {active && <ArrowRight className="shrink-0 w-3.5 h-3.5 text-slate-400" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-400">
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
                router.push(`/search?q=${encodeURIComponent(debouncedQuery)}`);
                onClose();
              }}
              className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
            >
              すべての結果を見る
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
