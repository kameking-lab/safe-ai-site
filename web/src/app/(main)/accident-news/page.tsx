import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { AccidentHubNav } from "@/components/accident-hub-nav";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { buildLegacyFatalAccidentsRedirect } from "@/lib/accident-news/legacy-route";
import { loadHomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import { ogImageUrl } from "@/lib/og-url";
import { VERIFIED_CASE_NOTES } from "@/lib/accident-news/verified-case-notes";
import { LatestNewsMeta, LatestNewsSection } from "./latest-news-client";

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
          <LatestNewsMeta latestNews={latestNews} />
        </header>

        <LatestNewsSection latestNews={latestNews} />

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
