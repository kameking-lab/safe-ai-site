import type { Metadata } from "next";
import Link from "next/link";

import { HomeScreen } from "@/components/home-screen";
import { NewsFeedSection } from "@/components/news-feed-section";
import {
  AccidentsMetaInfo,
  AccidentsMetaCaption,
  AccidentsPreliminaryBanner,
} from "@/components/accidents-meta-info";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/components/json-ld";
import {
  getAccidentCasesDataset,
  getAccidentProvenanceCounts,
} from "@/data/mock/accident-cases";
import { computeAccidentTypeCounts } from "@/lib/accidents/accident-visual";
import { ACCIDENTS_CSV_FILENAME, accidentsSummaryToCsv, accidentsSummaryToText } from "@/lib/accidents/export";
import { DataExportToolbar } from "@/components/accidents/data-export-toolbar";
import { AccidentTypeGrid } from "@/components/accidents/accident-type-grid";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { QuickAccidentSearch } from "@/components/accidents/quick-accident-search";
import { OfficialRecentLinks } from "@/components/accidents/official-recent-links";
import { SavedAccidents } from "@/components/accidents/saved-accidents";
import { Breadcrumb } from "@/components/breadcrumb";
import { UsageNotesLink } from "@/components/usage-notes-link";
import { AccidentsNoScriptFallback } from "@/components/accidents/accidents-noscript-fallback";
import { resolveAccidentProvenance } from "@/lib/accident-source";

const _title = "労働災害 事故事例データベース";
const _desc =
  "公表事例、編集再構成、教材用の想定例を区別して検索できます。ページ全体はindex対象にせず、個別詳細は一次資料照合済み事例だけ公開します。";

export const metadata: Metadata = {
  alternates: { canonical: "/accidents" },
  robots: { index: false, follow: true },
  title: _title,
  description: _desc,
  openGraph: withSiteOpenGraph("/accidents", {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(_title, _desc)],
  }),
};

export default function AccidentsPage() {
  const dataset = getAccidentCasesDataset();
  const totalCount = dataset.length;
  const provenanceCounts = getAccidentProvenanceCounts();
  const typeCounts = computeAccidentTypeCounts(dataset);
  const featuredOfficialCase =
    dataset.find((accident) => resolveAccidentProvenance(accident) === "mhlw") ?? null;

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: _title, description: _desc, url: `${SITE_URL}/accidents`, keywords: ["労働災害 事故事例 10年統計 厚生労働省", "墜落防止 対策", "転倒 はさまれ 業種別", "死亡災害 再発防止"] }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "事故データベース", url: `${SITE_URL}/accidents` },
          ]),
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ name: "事故データベース" }]} />
      </div>
      {/* C-1: ここを Suspense で包むと client モジュールの非同期ロードで境界が
          サスペンドし、静的HTMLに「フォールバック先行→$RCスワップ」が焼き込まれて
          下の保護具セクションが初回ペイント後に6,900px押し下げられる（CLS 0.254・
          LCP遅延）。本文は静的シェルに含める（サスペンドし得るものは無い）。 */}
      <HomeScreen
        variant="accidents"
        accidentSupplement={<NewsFeedSection />}
      >
        <header className="pt-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">事故例を探す</h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">キーワード、事故型、業種、期間から収録事例を検索します。</p>
        </header>
        <div
          id="accident-search"
          data-accidents-client-only=""
          className="mt-3 scroll-mt-28"
        >
          <QuickAccidentSearch />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AccidentsMetaInfo
            total={totalCount}
            mhlw={provenanceCounts.mhlw}
            curated={provenanceCounts.curated}
            preliminary={provenanceCounts.preliminary ?? 0}
            synthetic={provenanceCounts.synthetic}
          />
        </div>
        <noscript>
          <AccidentsNoScriptFallback
            totalCount={totalCount}
            featuredCase={featuredOfficialCase}
          />
        </noscript>
      </HomeScreen>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <details
          data-accidents-advanced-actions
          className="mt-6 rounded-xl border border-slate-200 bg-white px-3"
        >
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800">
            詳しい検索・出力
          </summary>
          <div className="border-t border-slate-200 pb-3">
          <SavedAccidents />
          <OfficialRecentLinks />
          <section aria-label="集計データの詳細" className="mt-4">
          <DataExportToolbar
            filename={ACCIDENTS_CSV_FILENAME}
            csv={accidentsSummaryToCsv({
              total: totalCount,
              mhlw: provenanceCounts.mhlw,
              curated: provenanceCounts.curated,
              preliminary: provenanceCounts.preliminary ?? 0,
              synthetic: provenanceCounts.synthetic,
              typeCounts,
            })}
            text={accidentsSummaryToText({
              total: totalCount,
              mhlw: provenanceCounts.mhlw,
              curated: provenanceCounts.curated,
              preliminary: provenanceCounts.preliminary ?? 0,
              synthetic: provenanceCounts.synthetic,
              typeCounts,
            })}
            shareTitle={_title}
            shareUrl={`${SITE_URL}/accidents`}
          />
          <CollapsibleDetail summary="事故型の件数" className="mt-2">
            <div id="accident-categories" className="scroll-mt-28">
              <AccidentTypeGrid counts={typeCounts} />
            </div>
          </CollapsibleDetail>
          <CollapsibleDetail summary="収録データの内訳と速報値の注意" className="mt-2">
            <AccidentsMetaCaption />
            <AccidentsPreliminaryBanner />
          </CollapsibleDetail>
          </section>
          </div>
        </details>
      </div>
      <nav id="accident-next-actions" aria-label="次の操作" className="mx-auto mt-6 flex max-w-7xl flex-wrap gap-x-5 gap-y-1 px-4 sm:px-6 lg:px-8">
        <Link href="/ky/paper" className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">KYを作る</Link>
        <Link href="/law-search" className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">関連法令を見る</Link>
        <UsageNotesLink />
      </nav>
    </>
  );
}
