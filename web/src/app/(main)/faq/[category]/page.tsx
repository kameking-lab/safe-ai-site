"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp, HelpCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { getFAQsByCategory } from "@/data/faqs";
import {
  FAQ_CATEGORY_LABELS,
  FAQ_CATEGORY_DESCRIPTIONS,
  FAQ_SLUG_TO_CATEGORY,
  type FAQCategory,
} from "@/types/faq";
import type { FAQ } from "@/types/faq";

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 py-4 text-left"
        aria-expanded={open}
      >
        <span className="shrink-0 mt-0.5 text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">
          Q
        </span>
        <span className="flex-1 text-sm font-medium text-slate-800 leading-snug">
          {faq.question}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="pb-4 pl-8 pr-2">
          <div className="flex gap-2 mb-2">
            <span className="shrink-0 mt-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
              A
            </span>
            <p className="text-sm text-slate-700 leading-relaxed">{faq.answer}</p>
          </div>
          {/* Related laws */}
          {faq.relatedLaws && faq.relatedLaws.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {faq.relatedLaws.map((law) => (
                <span
                  key={law}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  📋 {law}
                </span>
              ))}
            </div>
          )}
          {/* Source */}
          {faq.source && (
            <p className="mt-2 text-xs text-slate-400">出典: {faq.source}</p>
          )}
          {/* Related pages */}
          {faq.relatedPages && faq.relatedPages.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {faq.relatedPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700 hover:bg-sky-100 transition-colors"
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

export default function FAQCategoryPage() {
  const params = useParams<{ category: string }>();
  const slug = params.category;
  const category = FAQ_SLUG_TO_CATEGORY[slug] as FAQCategory | undefined;
  const [searchQuery, setSearchQuery] = useState("");

  if (!category) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-center">
        <p className="text-slate-500">カテゴリが見つかりません。</p>
        <Link href="/faq" className="mt-4 inline-block text-sky-600 hover:underline text-sm">
          ← FAQ一覧に戻る
        </Link>
      </main>
    );
  }

  const allFaqs = getFAQsByCategory(category);
  const filtered = searchQuery
    ? allFaqs.filter(
        (f) =>
          f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allFaqs;

  const title = `${FAQ_CATEGORY_LABELS[category]} FAQ ${allFaqs.length}問`;
  const description = FAQ_CATEGORY_DESCRIPTIONS[category];

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-slate-500" aria-label="パンくず">
        <Link href="/faq" className="hover:text-sky-600 hover:underline">FAQ</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{FAQ_CATEGORY_LABELS[category]}</span>
      </nav>

      {/* Header */}
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-200">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          よくある質問
        </p>
        <h1 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{description}</p>
      </header>

      {/* Search filter */}
      <div className="mb-5">
        <input
          type="search"
          placeholder="このカテゴリ内で絞り込み…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
        {searchQuery && (
          <p className="mt-1.5 text-xs text-slate-500">
            {filtered.length}件 / {allFaqs.length}件
          </p>
        )}
      </div>

      {/* FAQ list */}
      <section className="rounded-xl border border-slate-200 bg-white px-4 shadow-sm" aria-label="FAQ一覧">
        {filtered.length > 0 ? (
          filtered.map((faq) => <FAQItem key={faq.id} faq={faq} />)
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">
            「{searchQuery}」に一致するFAQが見つかりませんでした。
          </p>
        )}
      </section>

      {/* Back link */}
      <div className="mt-6 flex items-center gap-4">
        <Link
          href="/faq"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-sky-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          FAQ一覧に戻る
        </Link>
        <Link
          href="/faq/search"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-sky-600 hover:underline"
        >
          全カテゴリを横断検索 →
        </Link>
      </div>
    </main>
  );
}
