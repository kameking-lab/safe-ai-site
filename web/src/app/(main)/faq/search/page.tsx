"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ExternalLink, ArrowLeft, Tag } from "lucide-react";
import { searchFAQs, ALL_FAQS } from "@/data/faqs";
import { FAQ_CATEGORY_LABELS, type FAQCategory } from "@/types/faq";
import type { FAQ } from "@/types/faq";

const CATEGORY_BADGE_COLORS: Record<FAQCategory, string> = {
  "law-system": "bg-blue-50 text-blue-700 border-blue-200",
  management: "bg-emerald-50 text-emerald-700 border-emerald-200",
  chemical: "bg-orange-50 text-orange-700 border-orange-200",
  "health-education": "bg-pink-50 text-pink-700 border-pink-200",
};

function SearchResultItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full min-h-[44px] text-left px-4 py-3 flex items-start gap-3"
        aria-expanded={open}
      >
        <span className="shrink-0 mt-0.5 text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">
          Q
        </span>
        <span className="flex-1 text-sm font-medium text-slate-800 leading-snug">
          {faq.question}
        </span>
        <span
          className={`shrink-0 text-xs border rounded-full px-2 py-0.5 font-medium ${CATEGORY_BADGE_COLORS[faq.category]}`}
        >
          {FAQ_CATEGORY_LABELS[faq.category]}
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
          <div className="flex gap-2 mb-2">
            <span className="shrink-0 mt-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
              A
            </span>
            <p className="text-sm text-slate-700 leading-relaxed">{faq.answer}</p>
          </div>
          {faq.relatedLaws && faq.relatedLaws.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {faq.relatedLaws.map((law) => (
                <span key={law} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  📋 {law}
                </span>
              ))}
            </div>
          )}
          {faq.source && (
            <p className="mt-2 text-xs text-slate-400">出典: {faq.source}</p>
          )}
          {faq.relatedPages && faq.relatedPages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {faq.relatedPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700 hover:bg-sky-100 transition-colors"
                >
                  {page.label}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const POPULAR_TAGS = [
  "ストレスチェック",
  "衛生管理者",
  "特別教育",
  "フルハーネス",
  "SDS",
  "リスクアセスメント",
  "健康診断",
  "化学物質",
  "作業主任者",
  "安全衛生委員会",
];

export default function FAQSearchPage() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchFAQs(query);
  }, [query]);

  const handleTagClick = (tag: string) => {
    setQuery(tag);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-slate-500" aria-label="パンくず">
        <Link href="/faq" className="hover:text-sky-600 hover:underline">FAQ</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">検索</span>
      </nav>

      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">FAQを検索する</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          全{ALL_FAQS.length}問の中からキーワードで絞り込めます。
        </p>
      </header>

      {/* Search box */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="例: ストレスチェック、衛生管理者、SDS、特別教育…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="min-h-[44px] w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>

      {/* Popular tags */}
      {!query && (
        <section className="mb-6" aria-label="よく検索されるキーワード">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            よく検索されるキーワード
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      {query && (
        <section aria-label="検索結果">
          <p className="mb-3 text-sm text-slate-500">
            「<strong className="text-slate-800">{query}</strong>」の検索結果：{results.length}件
          </p>
          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((faq) => (
                <SearchResultItem key={faq.id} faq={faq} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
              <p className="text-sm text-slate-500">
                「{query}」に一致するFAQが見つかりませんでした。
              </p>
              <p className="mt-1 text-xs text-slate-400">
                別のキーワードで試すか、
                <Link href="/chatbot" className="text-sky-600 hover:underline">
                  法令チャット
                </Link>
                でご質問ください。
              </p>
            </div>
          )}
        </section>
      )}

      {/* Back */}
      <div className="mt-8">
        <Link
          href="/faq"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-sky-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          FAQ一覧に戻る
        </Link>
      </div>
    </main>
  );
}
