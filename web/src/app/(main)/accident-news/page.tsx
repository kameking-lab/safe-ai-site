import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { UsageNotesLink } from "@/components/usage-notes-link";
import { ogImageUrl } from "@/lib/og-url";
import {
  filterSeriousCasesPage,
  getSeriousCaseFilters,
  getSeriousCaseById,
  findSimilarSeriousCases,
  type SeriousCase,
  SERIOUS_CASES_META,
} from "@/lib/accident-news/serious-cases";
import { AccidentNewsBrowser } from "./accident-news-browser";
import { AccidentNewsResultsFallback } from "./accident-news-results-fallback";

export const metadata: Metadata = {
  title: "重大災害事例ブラウザ｜業種・起因物・事故型で類型検索（無料）",
  description:
    "厚労省 死亡災害データベースの2019〜2023年分を、業種・事故型・起因物分類・年で検索。出典はデータセット単位で表示し、直接原因等は推測しません。",
  alternates: { canonical: "/accident-news" },
  openGraph: {
    title: "重大災害事例ブラウザ｜業種・起因物・事故型で類型検索",
    description: "厚労省 死亡災害DBの2019〜2023年分を類型検索。出典範囲と個別追跡の限界を表示します。",
    images: [{ url: ogImageUrl("重大災害事例ブラウザ"), width: 1200, height: 630 }],
  },
};

export const revalidate = 86400;
const PAGE_SIZE = 30;

export default async function AccidentNewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const streamProbe = resolvedSearchParams.playwright_stream_probe === "1";
  const results = streamProbe ? (
    <Suspense fallback={<AccidentNewsResultsFallback />}>
      <AccidentNewsResults searchParams={Promise.resolve(resolvedSearchParams)} />
    </Suspense>
  ) : (
    await AccidentNewsResults({
      searchParams: Promise.resolve(resolvedSearchParams),
    })
  );

  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="重大災害事例ブラウザ"
        description="厚労省 死亡災害データベースの2019〜2023年分を業種・事故型・起因物分類・年で類型検索。データセット単位の出典と限界を表示。"
        path="/accident-news"
      />
      <header className="pt-6 sm:pt-9">
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">重大災害事例を検索</h1>
      </header>
      {results}
    </PageContainer>
  );
}

async function AccidentNewsResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const playwrightStreamDelay = Number.parseInt(
    process.env.PLAYWRIGHT_ACCIDENT_NEWS_STREAM_DELAY_MS ?? "",
    10,
  );
  if (
    pick("playwright_stream_probe") === "1" &&
    Number.isFinite(playwrightStreamDelay) &&
    playwrightStreamDelay > 0
  ) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(playwrightStreamDelay, 3_000)),
    );
  }
  const selected = {
    industry: pick("industry"),
    type: pick("type"),
    year: pick("year"),
    q: pick("q"),
  };
  const options = getSeriousCaseFilters();
  const requestedPage = Math.max(1, Number.parseInt(pick("page"), 10) || 1);
  let result = filterSeriousCasesPage({
    industry: selected.industry || undefined,
    type: selected.type || undefined,
    year: selected.year ? Number(selected.year) : undefined,
    q: selected.q || undefined,
    limit: PAGE_SIZE,
    offset: (requestedPage - 1) * PAGE_SIZE,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, pageCount);
  if (currentPage !== requestedPage) {
    result = filterSeriousCasesPage({
      industry: selected.industry || undefined,
      type: selected.type || undefined,
      year: selected.year ? Number(selected.year) : undefined,
      q: selected.q || undefined,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    });
  }
  // P2-2: ?focus=<id> で選択事例＋似た事例（業種・事故型・起因物分類等の類似）を提示
  const focusId = pick("focus");
  const focusCase: SeriousCase | null = focusId ? getSeriousCaseById(focusId) : null;
  const similarCases = focusCase ? findSimilarSeriousCases(focusCase, 6) : [];

  return (
    <div className="mt-4">
      <AccidentNewsBrowser
        options={options}
        selected={selected}
        initialResult={result}
        initialPage={currentPage}
        initialPageCount={pageCount}
        corpusTotal={SERIOUS_CASES_META.total}
        corpusYearRange={SERIOUS_CASES_META.yearRange}
      >
      <nav aria-label="事故データの関連情報" className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
        <a
          href={SERIOUS_CASES_META.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center text-sm font-bold text-sky-800 underline decoration-sky-300 underline-offset-4"
        >
          厚生労働省の公式データ
          <span className="sr-only">（外部サイト）</span>
        </a>
        <UsageNotesLink className="text-sky-800" />
      </nav>

      {/* P2-2: 選択事例＋似た事例（業種・事故型・起因物分類・本文語の類似度） */}
      {focusCase && (
        <section className="mt-3 rounded-xl border-2 border-orange-300 bg-orange-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-orange-900">選択した事例と似た事例</p>
            <Link href="/accident-news" className="text-xs font-semibold text-slate-600 hover:underline">
              × 解除
            </Link>
          </div>
          <p className="mt-1 text-sm text-slate-800">
            <span className="font-bold text-rose-700">{focusCase.type ?? "重大災害"}</span>
            <span className="ml-2 font-semibold text-sky-800">{focusCase.industry ?? ""}</span>
            <span className="ml-2 text-slate-500">{focusCase.year}年</span>
            <br />
            {focusCase.description}
          </p>
          {similarCases.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {similarCases.map((s) => (
                <li key={s.id} className="rounded-lg bg-white/80 p-2 text-[13px]">
                  <span className="font-bold text-rose-700">{s.type ?? "—"}</span>
                  <span className="ml-2 font-semibold text-sky-800">{s.industry ?? ""}</span>
                  <span className="ml-2 text-slate-500">{s.year}年</span>
                  <span className="ml-2 text-slate-700">{s.description}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">類似事例が見つかりませんでした。</p>
          )}
        </section>
      )}
      </AccidentNewsBrowser>

      <p className="mt-6 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
        出典:{" "}
        <a href={SERIOUS_CASES_META.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {SERIOUS_CASES_META.sourceLabel}
        </a>
        （対象 {SERIOUS_CASES_META.yearRange}・収録 {SERIOUS_CASES_META.total.toLocaleString()} 件・生成日時{" "}
        {SERIOUS_CASES_META.generatedAt ? (
          <time dateTime={SERIOUS_CASES_META.generatedAt}>
            {new Intl.DateTimeFormat("ja-JP", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Tokyo",
            }).format(new Date(SERIOUS_CASES_META.generatedAt))} JST
          </time>
        ) : (
          "不明"
        )}）。
      </p>
    </div>
  );
}
