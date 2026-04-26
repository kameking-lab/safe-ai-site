'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  FileText,
  TestTube2,
  HelpCircle,
  BookOpen,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  buildSearchIndex,
  searchItems,
  CATEGORY_META,
  type SearchItem,
  type SearchCategory,
} from '@/lib/search-index';

const CATEGORIES: SearchCategory[] = ['notice', 'chemical', 'quiz', 'education', 'accident'];

function CategoryIcon({ category }: { category: SearchCategory }) {
  const cls = 'w-3.5 h-3.5';
  switch (category) {
    case 'notice':    return <FileText className={cls} />;
    case 'chemical':  return <TestTube2 className={cls} />;
    case 'quiz':      return <HelpCircle className={cls} />;
    case 'education': return <BookOpen className={cls} />;
    case 'accident':  return <AlertTriangle className={cls} />;
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
    setSelectedIdx(0);
  }, [debouncedQuery, activeCategory]);

  const results = debouncedQuery ? searchItems(index, debouncedQuery, activeCategory) : [];

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const navigate = useCallback(
    (item: SearchItem) => {
      router.push(item.url);
      onClose();
    },
    [router, onClose],
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
            placeholder="通達・化学物質・問題・教育・事故を検索…"
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
            <div className="py-10 text-center text-slate-400 text-sm">キーワードを入力してください</div>
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
        <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
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
          {results.length > 0 && (
            <span>{results.length}件</span>
          )}
        </div>
      </div>
    </div>
  );
}
