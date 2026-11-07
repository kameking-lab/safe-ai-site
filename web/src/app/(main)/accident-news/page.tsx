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
import { VERIFIED_CASE_NOTES } from "@/lib/accident-news/verified-case-notes";

const TITLE = "国内の死亡事故速報｜直近の報道を公表日時順に確認";
const DESCRIPTION =
  "直近14日以内に報じられた日本国内の労働中の死亡事故を公表日時順に掲載。媒体名と未確認の状態を明示します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/accident-news" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl("国内の死亡事故速報"), width: 1200, height: 630 }],
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
        <PageJsonLd name="国内の死亡事故速報" description={DESCRIPTION} path="/accident-news" />

        <header className="pt-6 sm:pt-9">
          <p className="text-xs font-black tracking-[.16em] text-rose-700">RECENT REPORTS</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                国内の死亡事故速報
          </h1>
          <a
            href="#latest-report-heading"
            data-primary-action="true"
            className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-xl bg-rose-700 px-4 py-2 text-sm font-black text-white hover:bg-rose-600"
          >
            直近の報道を見る
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <p data-page-description className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            直近14日の日本国内の労働中の死亡事故報道を、新しい順に掲載します。見出しにない原因や法的評価は補いません。
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
              {latestNews.items.length === 0 ? (
                <p className="mt-1 text-xs leading-5 text-slate-600">{latestNews.message}</p>
              ) : null}
            </div>
            <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-700">
              掲載 {latestNews.items.length}記事
            </span>
          </div>

          {latestNews.items.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950">
              <p className="flex items-start gap-2 font-bold">
                <ShieldAlert className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>報道・内容未確認。公表日時は記事の掲載日時であり、事故発生日ではありません。発生経緯・原因・法的評価は一次資料で未確認です。</span>
              </p>
              <p className="mt-1 pl-6">掲載件数は報道記事の数です。同じ事故の続報を含む場合があり、全国の事故発生件数ではありません。</p>
            </div>
          ) : null}

          {latestNews.items.length > 0 ? (
            <ol
              className="mt-4 grid gap-4 md:grid-cols-2"
              data-accident-news-results
              data-result-count={latestNews.items.length}
            >
              {latestNews.items.map((report) => (
                <li
                  key={report.publicId}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  data-accident-origin="reported-unverified"
                >
                  <p className="text-xs font-bold text-slate-600">
                    記事公表 <time dateTime={report.publishedAt}>{dateTimeFormatter.format(new Date(report.publishedAt))}</time> JST
                  </p>
                  <h3 className="mt-3 text-lg font-black leading-7 text-slate-950">
                    <a
                      href={report.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="decoration-slate-300 underline-offset-4 hover:underline"
                    >
                      {report.title}
                      <span className="sr-only">（外部サイト）</span>
                    </a>
                  </h3>
                  <p className="mt-2 text-sm font-bold text-slate-700">報道媒体：{report.publisher}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">{report.industry}</span>
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-800">{report.accidentType}</span>
                  </div>
                  <div className="mt-auto pt-3">
                    <details className="rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950">
                      <summary className="min-h-8 cursor-pointer font-bold">一般的な関連対策</summary>
                      <p className="pb-1">{report.measure}</p>
                    </details>
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

        <section aria-labelledby="verified-case-heading" className="mb-8">
          <h2 id="verified-case-heading" className="text-xl font-black text-slate-950">一次資料で確認した過去事例</h2>
          <p className="mt-2 text-xs leading-6 text-slate-600">直近報道の裏付けや事故件数には使いません。2026年10月11日に厚労省の個票を照合した編集解説です。</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">{VERIFIED_CASE_NOTES.map((item) => (
            <details key={item.id} data-verified-case={item.id} className="rounded-xl border border-slate-300 bg-white px-4">
              <summary className="flex min-h-11 cursor-pointer items-center py-2 text-sm font-bold text-slate-900">{item.title}</summary>
              <dl className="space-y-3 border-t border-slate-200 py-3 text-xs leading-6 text-slate-700">
                <div><dt className="font-bold">確認できた経過</dt><dd>{item.facts}</dd></div>
                <div><dt className="font-bold">この資料では分からないこと</dt><dd>{item.unknown}</dd></div>
                <div><dt className="font-bold">自社で先に確認する条件</dt><dd>{item.check}</dd></div>
              </dl>
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-sky-800 underline">厚労省 個票No.{item.id}で確認</a>
              <div className="border-t border-slate-200 py-3">
                <p className="text-xs font-bold text-slate-700">次に確認する</p>
                <a href={item.nextCheckUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm text-sky-800 underline">
                  {item.nextCheckLabel}<ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </details>
          ))}</div>
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
