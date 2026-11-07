"use client";

import { useState, useRef, useCallback } from "react";
import { BookMarked, Search, ExternalLink } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { JsonLd, definedTermSetSchema } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";
import { LawHubNav } from "@/components/law-hub-nav";
import { EXTRA_TERMS } from "@/data/glossary";
// Metadata cannot be exported from client component – define it in a separate layout or use a wrapper.
// For now, the page itself handles SEO via next/head alternative approach.

import type { GlossaryTerm as Term } from "@/data/glossary";
import { BASE_TERMS } from "@/data/glossary/base-terms";


const TERMS: Term[] = [...BASE_TERMS, ...EXTRA_TERMS];

const KANA_ROWS = ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"];

const KANA_RANGE: Record<string, string[]> = {
  あ: ["あ", "い", "う", "え", "お"],
  か: ["か", "き", "く", "け", "こ", "が", "ぎ", "ぐ", "げ", "ご"],
  さ: ["さ", "し", "す", "せ", "そ", "ざ", "じ", "ず", "ぜ", "ぞ"],
  た: ["た", "ち", "つ", "て", "と", "だ", "ぢ", "づ", "で", "ど"],
  な: ["な", "に", "ぬ", "ね", "の"],
  は: ["は", "ひ", "ふ", "へ", "ほ", "ば", "び", "ぶ", "べ", "ぼ", "ぱ", "ぴ", "ぷ", "ぺ", "ぽ"],
  ま: ["ま", "み", "む", "め", "も"],
  や: ["や", "ゆ", "よ"],
  ら: ["ら", "り", "る", "れ", "ろ"],
  わ: ["わ", "を", "ん"],
};

function getRow(reading: string): string {
  const first = reading[0];
  if (!first) return "わ";
  for (const [row, chars] of Object.entries(KANA_RANGE)) {
    if (chars.includes(first)) return row;
  }
  return "わ";
}

export default function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const filtered = TERMS.filter((t) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return t.term.includes(q) || t.reading.includes(q) || t.definition.includes(q);
  });

  const grouped = KANA_ROWS.map((row) => ({
    row,
    terms: filtered
      .filter((t) => getRow(t.reading) === row)
      .sort((a, b) => a.reading.localeCompare(b.reading)),
  })).filter((g) => g.terms.length > 0);

  const scrollToRow = useCallback((row: string) => {
    setActiveRow(row);
    const el = sectionRefs.current[row];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
    <LawHubNav current="glossary" />
    <PageContainer>
      <PageJsonLd name="労働安全用語集" description="労働安全衛生に関する専門用語をわかりやすく解説。条文・通達・現場用語を一覧から検索。" path="/glossary" />
      {/* SEO: DefinedTermSet */}
      <JsonLd
        schema={definedTermSetSchema({
          name: "労働安全用語集",
          url: "https://www.anzen-ai-portal.jp/glossary",
          description: "労働安全衛生に関する専門用語をわかりやすく解説。条文・通達・現場用語を一覧から検索。",
          terms: TERMS.map((t) => ({ name: t.term, description: t.definition })),
        })}
      />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <BookMarked className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">安全用語辞書</h1>
            <p className="text-sm text-slate-500">労働安全衛生の主要用語 全{TERMS.length}語 を五十音順で収録</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="用語・読み・説明を検索..."
          className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>

      {/* Kana index */}
      {!search && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {KANA_ROWS.map((row) => {
            const hasTerms = grouped.some((g) => g.row === row);
            return (
              <button
                key={row}
                type="button"
                disabled={!hasTerms}
                onClick={() => scrollToRow(row)}
                className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  activeRow === row
                    ? "bg-indigo-600 text-white"
                    : hasTerms
                    ? "bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                    : "cursor-not-allowed bg-slate-50 text-slate-300"
                }`}
              >
                {row}行
              </button>
            );
          })}
        </div>
      )}

      {/* Term count */}
      <p className="mb-4 text-xs text-slate-500">
        {filtered.length}件表示
      </p>

      {/* Term list */}
      <div className="space-y-8">
        {grouped.map(({ row, terms }) => (
          <section
            key={row}
            ref={(el) => { sectionRefs.current[row] = el; }}
          >
            {!search && (
              <h2 className="mb-3 border-b border-indigo-100 pb-1 text-lg font-bold text-indigo-700">
                {row}行
              </h2>
            )}
            <div className="space-y-3">
              {terms.map((t) => (
                <div
                  key={t.term}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-base font-bold text-slate-900">{t.term}</h3>
                    <span className="text-xs text-slate-400">（{t.reading}）</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{t.definition}</p>
                  {t.relatedPages && t.relatedPages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.relatedPages.map((p) => (
                        <Link
                          key={p.href}
                          href={p.href}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {p.label}
                        </Link>
                      ))}
                    </div>
                  )}
                  {t.source && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      出典:{" "}
                      <a
                        href={t.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline hover:text-blue-900"
                      >
                        {t.source.label} ↗
                      </a>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            「{search}」に一致する用語が見つかりませんでした。
          </div>
        )}
      </div>
    </PageContainer>
    </>
  );
}
