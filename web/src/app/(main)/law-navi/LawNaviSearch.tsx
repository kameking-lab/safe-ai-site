'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { LAW_NAVI_TOPICS } from '@/data/law-navi/topics';
import { useClientReady } from '@/lib/use-client-ready';

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
    .replace(/[\s・／/]+/g, '')
    .replace(/[壱一]/g, '1')
    .replace(/[弐二]/g, '2')
    .replace(/[参三]/g, '3');
}

export function LawNaviSearch() {
  const isClientReady = useClientReady();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const normalizedQuery = normalize(query);
  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return LAW_NAVI_TOPICS.filter((topic) => {
      const searchable = [
        topic.name,
        topic.fieldGroup,
        ...topic.aliases,
        ...topic.articles.flatMap((article) => [
          article.lawShort,
          article.articleNum,
          article.role,
          `${article.lawShort}${article.articleNum}`,
        ]),
      ];
      return searchable.some((value) => normalize(value).includes(normalizedQuery));
    }).slice(0, 5);
  }, [normalizedQuery]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(input.trim());
  }

  return (
    <div className="mb-8" data-law-navi-ready={String(isClientReady)}>
      <form
        action="/law-search"
        method="get"
        onSubmit={onSubmit}
        role="search"
        aria-label="法令ナビ内を検索"
      >
        <div className="flex gap-2">
          <input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            required
            autoComplete="off"
            disabled={!isClientReady}
            aria-label="法令ナビの検索語"
            placeholder="例: フォークリフト ／ 35条 ／ 別表第3"
            className="min-h-[48px] w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button
            type="submit"
            disabled={!isClientReady}
            className="inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            検索
          </button>
        </div>
      </form>

      {query ? (
        <div className="mt-3" aria-live="polite">
          {results.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.map((topic) => (
                <li key={topic.id}>
                  <Link
                    href={`/law-navi/topics/${topic.id}`}
                    className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-emerald-300"
                  >
                    {topic.name}
                    <ArrowRight className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">
              該当する分野が見つかりません。
              <Link href="/law-search" className="ml-1 font-semibold text-emerald-700 underline">
                条文検索を開く
              </Link>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
