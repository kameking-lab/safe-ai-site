"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SITE_STATS } from "@/data/site-stats";
import { InputWithVoice } from "@/components/voice-input-field";
import { LastUpdatedBadge } from "@/components/last-updated-badge";
import { useLanguage } from "@/contexts/language-context";
import { PageContainer } from "@/components/layout/page-container";
import { Stack } from "@/components/layout/stack";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";

const MhlwLawArticlesPanel = dynamic(
  () =>
    import("@/components/mhlw-law-articles-panel").then(
      (m) => m.MhlwLawArticlesPanel
    ),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-lg bg-slate-100" /> }
);

// 法令コーパス（約1.4MB）を検索UIの本体チャンクから分離。SSRは維持（初期HTMLに結果を残しLCPを落とさない）
const LawSearchResults = dynamic(() =>
  import("@/components/law-search-results").then(
    (m) => m.LawSearchResults
  )
);

export function LawSearchPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams?.get("q") ?? "");
  const [selectedLaw, setSelectedLaw] = useState<string>(
    () => searchParams?.get("law") ?? "all",
  );
  const [articleNumQuery, setArticleNumQuery] = useState(
    () => searchParams?.get("art") ?? "",
  );
  const [mode, setMode] = useState<"curated" | "mhlw">(
    () => (searchParams?.get("mode") === "mhlw" ? "mhlw" : "curated"),
  );
  const { language } = useLanguage();
  const isEn = language === "en";

  // Sync state -> URL (replace so we don't pollute history)
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedLaw && selectedLaw !== "all") params.set("law", selectedLaw);
    if (articleNumQuery) params.set("art", articleNumQuery);
    if (mode !== "curated") params.set("mode", mode);
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current =
      window.location.pathname + (window.location.search || "");
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [query, selectedLaw, articleNumQuery, mode, pathname, router]);

  return (
    <PageContainer>
      <Stack gap="lg">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">
            {isEn ? "Law full-text search" : "法令全文検索"}
          </h1>
          <LastUpdatedBadge />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {isEn
            ? "Search articles by keyword, article number, or law name. Kanji numbers (第二十一条) and Arabic numbers (第21条) match equivalently."
            : "キーワード・条番号・法令名で条文を検索できます。漢数字（第二十一条）と算用数字（第21条）は同等に検索されます。"}
        </p>
      </div>

      {/* 出典区別の凡例（文字ダイエット: 初期は折りたたみへ格納・内容は不変） */}
      <CollapsibleDetail summary={isEn ? "Source legend (Current / As-enforced)" : "出典の見分け方（現行版／施行当時版）"}>
        <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">
          ● {isEn ? "Current (e-Gov-aligned)" : "現行（e-Gov準拠）"}
        </span>{" "}
        {isEn
          ? "are this site's curated articles (current article numbers and text)."
          : "は本サイトのキュレーション条文（最新の条番号・条文）。"}{" "}
        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
          ● {isEn ? "As enforced (MHLW PDF)" : "施行当時（MHLW PDF）"}
        </span>{" "}
        {isEn
          ? "are article numbers and text as published in the MHLW PDF. Verify on e-Gov when current text is required."
          : "は厚労省PDF発行時点の条番号・条文です。引用時は識別の上、最新版が必要な場合は e-Gov で再確認してください。"}
      </CollapsibleDetail>

      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(
          [
            { id: "curated", label: isEn ? `Curated (${SITE_STATS.lawArticleCount} articles)` : `キュレーション（${SITE_STATS.lawArticleCount}条文）` },
            { id: "mhlw", label: isEn ? "MHLW official law PDFs" : "MHLW公式法令PDF" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              mode === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "mhlw" && <MhlwLawArticlesPanel />}

      {mode === "curated" && (<>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <InputWithVoice
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? "Free-text search (e.g. fall-arrest equipment, organic solvent)" : "フリーワード検索（例: 墜落制止用器具、有機溶剤）"}
            aria-label={isEn ? "Free-text law search" : "法令フリーワード検索"}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full"
          />
        </div>
        <InputWithVoice
          type="search"
          value={articleNumQuery}
          onChange={(e) => setArticleNumQuery(e.target.value)}
          placeholder={isEn ? "Article number (e.g. Article 21)" : "条番号（例: 第21条）"}
          aria-label={isEn ? "Search by article number" : "条番号で検索"}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <LawSearchResults
        query={query}
        articleNumQuery={articleNumQuery}
        selectedLaw={selectedLaw}
        setSelectedLaw={setSelectedLaw}
        isEn={isEn}
      />

      </>)}
      </Stack>
    </PageContainer>
  );
}
