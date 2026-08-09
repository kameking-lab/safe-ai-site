"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { InputWithVoice } from "@/components/voice-input-field";
import { TransientChatLink } from "@/components/home-safety-cockpit/transient-chat-link";
import { useLanguage } from "@/contexts/language-context";
import { PageContainer } from "@/components/layout/page-container";
import { Stack } from "@/components/layout/stack";

// 法令コーパス（約1.4MB）を検索UIの本体チャンクから分離。SSRは維持（初期HTMLに結果を残しLCPを落とさない）
const LawSearchResults = dynamic(() =>
  import("@/components/law-search-results").then(
    (m) => m.LawSearchResults
  )
);

export function LawSearchPanel({
  initialQuery = "",
  initialSelectedLaw = "all",
  initialArticleNumQuery = "",
}: {
  initialQuery?: string;
  initialSelectedLaw?: string;
  initialArticleNumQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedLaw, setSelectedLaw] = useState(initialSelectedLaw);
  const [articleNumQuery, setArticleNumQuery] = useState(initialArticleNumQuery);
  const { language } = useLanguage();
  const isEn = language === "en";
  const shouldLoadCorpus = Boolean(
    query.trim() || articleNumQuery.trim() || selectedLaw !== "all",
  );
  const chatQuestion = (() => {
    const keyword = query.trim();
    const article = articleNumQuery.trim();
    if (!keyword && !article) return "";
    if (keyword && !article && selectedLaw === "all") return keyword;
    const scope = [
      selectedLaw !== "all" ? selectedLaw : "",
      article,
    ].filter(Boolean).join(" ");
    return `${keyword || scope}${keyword && scope ? `（${scope}）` : ""}について、安衛法上の要件を教えて`;
  })();

  const keepSearchInMemory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <PageContainer>
      <Stack gap="lg">
      <form
        id="law-search-form"
        onSubmit={keepSearchInMemory}
        className="scroll-mt-28"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
          <InputWithVoice
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? "Free-text search (e.g. fall-arrest equipment, organic solvent)" : "フリーワード検索（例: 墜落制止用器具、有機溶剤）"}
            aria-label={isEn ? "Free-text law search" : "法令フリーワード検索"}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <InputWithVoice
            type="search"
            value={articleNumQuery}
            onChange={(e) => setArticleNumQuery(e.target.value)}
            placeholder={isEn ? "Article number (e.g. Article 21)" : "条番号（例: 第21条）"}
            aria-label={isEn ? "Search by article number" : "条番号で検索"}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button
            type="submit"
            data-primary-action="true"
            className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            {isEn ? "Search" : "検索"}
          </button>
        </div>
      </form>
      <nav aria-label={isEn ? "Search examples" : "検索例"} className="flex flex-wrap gap-2">
        {(isEn
          ? [
              ["Article 61", "Article 61"],
              ["Heat illness", "Heat illness"],
              ["Full harness training", "Full harness training"],
            ]
          : [
              ["安衛法 第61条", "第61条"],
              ["熱中症 安衛則612条の2", "熱中症"],
              ["フルハーネス 特別教育", "フルハーネス 特別教育"],
            ]
        ).map(([label, value]) => (
          <button
            key={label}
            type="button"
            onClick={() => setQuery(value)}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-300"
          >
            {label}
          </button>
        ))}
      </nav>

      {chatQuestion && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>
            {isEn
              ? "You can continue with this search in the legal assistant."
              : "この検索内容を会話で確認できます。"}
          </span>
          <TransientChatLink
            question={chatQuestion}
            data-law-search-chat-handoff=""
            className="inline-flex min-h-11 items-center rounded-full border border-blue-200 bg-white px-3 py-2 font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isEn ? "Ask the legal assistant" : "この内容で安衛法AIに質問"}
          </TransientChatLink>
        </div>
      )}

      {shouldLoadCorpus ? (
        <LawSearchResults
          query={query}
          articleNumQuery={articleNumQuery}
          selectedLaw={selectedLaw}
          setSelectedLaw={setSelectedLaw}
          isEn={isEn}
        />
      ) : (
        <div
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-5 text-sm leading-relaxed text-sky-950"
          data-law-search-idle
        >
          <p className="font-bold">
            {isEn
              ? "Enter a keyword or article number to load the curated index."
              : "キーワードまたは条番号を入力すると、条文索引を読み込みます。"}
          </p>
        </div>
      )}
      </Stack>
    </PageContainer>
  );
}
