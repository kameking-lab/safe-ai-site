import type { Metadata } from "next";
import { LawsPageClient } from "@/components/laws-page-client";
import Link from "next/link";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { JsonLd, articleListSchema } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";
import { SITE_URL } from "@/lib/seo-metadata";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import { HOME_FEATURED_LAW_REFORM } from "@/lib/home/effect-first-data";
import { UsageNotesLink } from "@/components/usage-notes-link";

const _title = "労働安全衛生関係法令の改正情報";
const _desc =
  "法改正名、施行日、対象者、今やることを、公式原文へのリンクとともに確認できます。";

export const metadata: Metadata = {
  alternates: { canonical: "/laws" },
  title: _title,
  description: _desc,
  openGraph: withSiteOpenGraph("/laws", {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(_title, _desc)],
  }),
};

// ISR: 施行カウントダウン（結論カードの残日数）を日次で再計算
export const revalidate = 86400;

export default function LawsPage() {
  const lawSchema = articleListSchema(
    [
      {
        headline: HOME_FEATURED_LAW_REFORM.officialTitle,
        datePublished: HOME_FEATURED_LAW_REFORM.promulgatedAt,
        url: HOME_FEATURED_LAW_REFORM.sourceUrl,
        description: `${HOME_FEATURED_LAW_REFORM.change} ${HOME_FEATURED_LAW_REFORM.action}`,
      },
      ...lawRevisionCores.map((r) => ({
        headline: r.title,
        datePublished: r.publishedAt,
        url: r.source_url ?? `${SITE_URL}/laws`,
        description: r.summary,
      })),
    ]
  );

  return (
    <>
      <PageJsonLd name={_title} description={_desc} path="/laws" />
      <JsonLd schema={lawSchema} />
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-black tracking-[.14em] text-violet-800">法改正・公式情報</p>
          <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
            {HOME_FEATURED_LAW_REFORM.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">施行日、対象者、今やることを確認できます。</p>
        </header>
      </div>
      {/* C-1: 一覧の初期データは server で確定して渡す（クライアントの
          データ静的importを排除しつつ SSR HTML に全件を含める）。
          Suspense で包むと client モジュールの非同期ロードで境界がサスペンドし、
          静的HTMLに「フォールバック先行→$RCスワップ」が焼き込まれて LCP が
          スワップ完了まで遅延するため、本文は静的シェルに含める。 */}
      <div
        id="law-revisions"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-6 sm:px-6 lg:px-8"
      >
        <article
          id={HOME_FEATURED_LAW_REFORM.id}
          data-primary-result="true"
          className="scroll-mt-24 rounded-3xl border-2 border-violet-900 bg-violet-50 p-5 shadow-[6px_6px_0_#4c1d95] sm:p-7"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span data-status-badge className="rounded-full bg-amber-300 px-3 py-1 text-slate-950">
              {HOME_FEATURED_LAW_REFORM.status}
            </span>
          </div>
          <h2 className="sr-only">最新改正の施行情報</h2>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <dt className="text-xs font-black text-violet-800">施行日</dt>
              <dd className="mt-1 font-black">
                {HOME_FEATURED_LAW_REFORM.effectiveAt}
              </dd>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <dt className="text-xs font-black text-violet-800">対象者</dt>
              <dd className="mt-1 font-black">
                {HOME_FEATURED_LAW_REFORM.target}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-4">
              <h3 className="text-xs font-black text-slate-800">今やること</h3>
              <p className="mt-2 text-sm font-black leading-6 text-slate-950">
                {HOME_FEATURED_LAW_REFORM.action}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <a
              href={HOME_FEATURED_LAW_REFORM.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-primary-action="true"
              className="inline-flex min-h-11 items-center rounded-xl bg-violet-900 px-4 font-black text-white"
            >
              公式原文
            </a>
            <span className="text-xs font-bold text-slate-600">
              一次資料確認日 {HOME_FEATURED_LAW_REFORM.checkedAt} JST
            </span>
          </div>
        </article>
      </div>
      <div>
        <LawsPageClient initialRevisions={lawRevisionCores} showHeader={false} />
      </div>
      <nav aria-label="法改正の関連操作" className="mx-auto flex max-w-7xl flex-wrap gap-x-5 gap-y-1 px-4 pb-8 sm:px-6 lg:px-8">
        <Link href="/law-search" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">条文を検索</Link>
        <Link href="/chatbot" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">法令について質問</Link>
        <UsageNotesLink className="text-brand-primary" />
      </nav>
    </>
  );
}
