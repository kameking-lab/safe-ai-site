import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { ArrowRight, CalendarDays, ExternalLink, ShieldAlert } from "lucide-react";
import { AccidentHubNav } from "@/components/accident-hub-nav";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { buildLegacyFatalAccidentsRedirect } from "@/lib/accident-news/legacy-route";
import { loadHomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import { ogImageUrl } from "@/lib/og-url";

const TITLE = "労災事故速報｜直近の報道を公表日時順に確認";
const DESCRIPTION =
  "直近14日以内の国内労災報道を公表日時順に掲載。媒体名と報道・内容未確認の状態を明示し、死亡事故データベースや事故分析へつなぎます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/accident-news" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl("労災事故速報"), width: 1200, height: 630 }],
  },
};

export const revalidate = 3_600;

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AccidentNewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const legacyRedirect = buildLegacyFatalAccidentsRedirect(await searchParams);
  if (legacyRedirect) permanentRedirect(legacyRedirect);

  const latestNews = await loadHomeLatestAccidentNews();

  return (
    <>
      <AccidentHubNav current="accident-news" />
      <PageContainer width="wide">
        <PageJsonLd name="労災事故速報" description={DESCRIPTION} path="/accident-news" />

        <header className="pt-6 sm:pt-9">
          <p className="text-xs font-black tracking-[.16em] text-rose-700">RECENT REPORTS</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            労災事故速報
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            直近14日以内に公表された国内の労災報道を、掲載日時の新しい順に確認できます。
            見出しから確認できない原因・責任・法的評価は補いません。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-rose-600" aria-hidden="true" />
              取得確認 {dateTimeFormatter.format(new Date(latestNews.checkedAt))} JST
            </span>
            <a
              href={latestNews.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-compact-text="true"
              data-primary-action="true"
              className="inline-flex min-h-11 items-center gap-1 text-sky-800 underline underline-offset-4"
            >
              {latestNews.sourceLabel}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </header>

        <section
          aria-labelledby="latest-report-heading"
          className="mt-7 pb-10"
          data-primary-task
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="latest-report-heading" className="text-xl font-black text-slate-950 sm:text-2xl">
                直近の報道
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">{latestNews.message}</p>
            </div>
            <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-700">
              掲載 {latestNews.items.length}件
            </span>
          </div>

          {latestNews.items.length > 0 ? (
            <ol className="mt-4 grid gap-4 md:grid-cols-2">
              {latestNews.items.map((report, index) => (
                <li
                  key={report.publicId}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  data-accident-origin="reported-unverified"
                >
                  <div className="flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      公表 {dateTimeFormatter.format(new Date(report.publishedAt))} JST
                    </span>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">{report.industry}</span>
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-800">{report.accidentType}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black leading-7 text-slate-950">
                    <a
                      href={report.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-primary-action={index === 0 ? "true" : undefined}
                      className="decoration-slate-300 underline-offset-4 hover:underline"
                    >
                      {report.title}
                      <span className="sr-only">（外部サイト）</span>
                    </a>
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{report.summary}</p>
                  <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-950">
                    一般的な関連対策：{report.measure}
                  </div>
                  <div className="mt-auto pt-4">
                    <p className="inline-flex items-start gap-1.5 text-xs font-bold leading-5 text-amber-800">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      報道・内容未確認 ／ 出典媒体：{report.publisher}
                    </p>
                    <a
                      href={report.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-black text-sky-800 underline underline-offset-4"
                    >
                      元記事で確認する
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div role="status" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              取得できない状態を「事故なし」とは表示していません。時間をおいて再確認するか、下の死亡事故データベース・公式統計を確認してください。
            </div>
          )}
        </section>

        <section aria-labelledby="accident-next-heading" className="mb-10 rounded-2xl bg-slate-950 p-5 text-white sm:p-7">
          <h2 id="accident-next-heading" className="text-xl font-black">速報の次に確認する</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Link href="/fatal-accidents" className="group rounded-xl border border-white/20 bg-white/10 p-4 hover:bg-white/15">
              <span className="block font-black">死亡事故データベース</span>
              <span className="mt-1 block text-sm leading-6 text-slate-300">厚労省公表の死亡災害を、業種・事故型・起因物・年で検索</span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-rose-200">
                過去事例を探す <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
            <Link href="/accidents-analytics" className="group rounded-xl border border-white/20 bg-white/10 p-4 hover:bg-white/15">
              <span className="block font-black">事故分析ダッシュボード</span>
              <span className="mt-1 block text-sm leading-6 text-slate-300">公式統計と収録事例の傾向を分けて多角的に分析</span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-rose-200">
                傾向を分析する <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>
      </PageContainer>
    </>
  );
}
