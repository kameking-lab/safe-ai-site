import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccidentHubNav } from "@/components/accident-hub-nav";
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
import { FatalAccidentsBrowser } from "./fatal-accidents-browser";
import { FatalAccidentsResultsFallback } from "./fatal-accidents-results-fallback";

export const metadata: Metadata = {
  title: "死亡事故データベース｜業種・起因物・事故型で検索（無料）",
  description:
    "厚生労働省 死亡災害データベースの2019〜2023年分を、業種・事故型・起因物分類・年で検索。出典範囲を表示し、直接原因等は推測しません。",
  alternates: { canonical: "/fatal-accidents" },
  openGraph: {
    title: "死亡事故データベース｜業種・起因物・事故型で検索",
    description:
      "厚生労働省 死亡災害データベースの2019〜2023年分を類型検索。出典範囲と個別追跡の限界を表示します。",
    images: [{ url: ogImageUrl("死亡事故データベース"), width: 1200, height: 630 }],
  },
};

export const revalidate = 86400;
const PAGE_SIZE = 30;

export default async function FatalAccidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const streamProbe = resolvedSearchParams.playwright_stream_probe === "1";
  const results = streamProbe ? (
    <Suspense fallback={<FatalAccidentsResultsFallback />}>
      <FatalAccidentResults searchParams={Promise.resolve(resolvedSearchParams)} />
    </Suspense>
  ) : (
    await FatalAccidentResults({
      searchParams: Promise.resolve(resolvedSearchParams),
    })
  );

  return (
    <>
      <AccidentHubNav current="fatal-accidents" />
      <PageContainer width="wide">
        <PageJsonLd
          name="死亡事故データベース"
          description="厚生労働省 死亡災害データベースの2019〜2023年分を業種・事故型・起因物分類・年で類型検索。データセット単位の出典と限界を表示。"
          path="/fatal-accidents"
        />
        <header className="pt-6 sm:pt-9">
          <p className="text-xs font-black tracking-[.15em] text-rose-700">厚生労働省 公表データ</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            死亡事故データベース
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            過去の死亡災害を業種・事故型・起因物・年から検索します。直近の報道は
            <Link href="/accident-news" className="mx-1 font-bold text-rose-700 underline underline-offset-4">
              労災事故速報
            </Link>
            で確認できます。
          </p>
        </header>
        {results}
      </PageContainer>
    </>
  );
}

async function FatalAccidentResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const playwrightStreamDelay = Number.parseInt(
    process.env.PLAYWRIGHT_ACCIDENT_NEWS_STREAM_DELAY_MS ?? "",
    10,
  );
  if (
    pick("playwright_stream_probe") === "1" &&
    Number.isFinite(playwrightStreamDelay) &&
    playwrightStreamDelay > 0
  ) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(playwrightStreamDelay, 3_000)));
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

  const focusId = pick("focus");
  const focusCase: SeriousCase | null = focusId ? getSeriousCaseById(focusId) : null;
  const similarCases = focusCase ? findSimilarSeriousCases(focusCase, 6) : [];

  return (
    <div className="mt-4">
      <FatalAccidentsBrowser
        options={options}
        selected={selected}
        initialResult={result}
        initialPage={currentPage}
        initialPageCount={pageCount}
        corpusTotal={SERIOUS_CASES_META.total}
        corpusYearRange={SERIOUS_CASES_META.yearRange}
      >
        <nav aria-label="死亡事故データの関連情報" className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          <a
            href={SERIOUS_CASES_META.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center text-sm font-bold text-sky-800 underline decoration-sky-300 underline-offset-4"
          >
            厚生労働省の公式データ<span className="sr-only">（外部サイト）</span>
          </a>
          <UsageNotesLink className="text-sky-800" />
        </nav>

        {focusCase && (
          <section className="mt-3 rounded-xl border-2 border-orange-300 bg-orange-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-orange-900">選択した事例と似た事例</p>
              <Link href="/fatal-accidents" className="text-xs font-semibold text-slate-600 hover:underline">
                × 解除
              </Link>
            </div>
            <p className="mt-1 text-sm text-slate-800">
              <span className="font-bold text-rose-700">{focusCase.type ?? "死亡災害"}</span>
              <span className="ml-2 font-semibold text-sky-800">{focusCase.industry ?? ""}</span>
              <span className="ml-2 text-slate-500">{focusCase.year}年</span>
              <br />
              {focusCase.description}
            </p>
            {similarCases.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {similarCases.map((similar) => (
                  <li key={similar.id} className="rounded-lg bg-white/80 p-2 text-[13px]">
                    <span className="font-bold text-rose-700">{similar.type ?? "—"}</span>
                    <span className="ml-2 font-semibold text-sky-800">{similar.industry ?? ""}</span>
                    <span className="ml-2 text-slate-500">{similar.year}年</span>
                    <span className="ml-2 text-slate-700">{similar.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">類似事例が見つかりませんでした。</p>
            )}
          </section>
        )}
      </FatalAccidentsBrowser>

      <p className="mt-6 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
        出典: {" "}
        <a href={SERIOUS_CASES_META.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {SERIOUS_CASES_META.sourceLabel}
        </a>
        （対象 {SERIOUS_CASES_META.yearRange}・収録 {SERIOUS_CASES_META.total.toLocaleString()} 件・生成日時 {" "}
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
