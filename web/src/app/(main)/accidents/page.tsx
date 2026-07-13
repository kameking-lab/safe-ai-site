import type { Metadata } from "next";

import { HomeScreen } from "@/components/home-screen";
import { LadderStatsCard } from "@/components/ladder-stats-card";
import { LastUpdatedBadge } from "@/components/last-updated-badge";
import { NewsFeedSection } from "@/components/news-feed-section";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ContextualPpePicks } from "@/components/ContextualPpePicks";
import {
  AccidentsMetaInfo,
  AccidentsMetaCaption,
  AccidentsPreliminaryBanner,
  AccidentsAnalyticsBanner,
} from "@/components/accidents-meta-info";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { JsonLd, datasetSchema, webPageSchema, breadcrumbSchema } from "@/components/json-ld";
import {
  getAccidentCasesDataset,
  getAccidentProvenanceCounts,
} from "@/data/mock/accident-cases";
import { computeAccidentTypeCounts } from "@/lib/accidents/accident-visual";
import { ACCIDENTS_CSV_FILENAME, accidentsSummaryToCsv, accidentsSummaryToText } from "@/lib/accidents/export";
import { DataExportToolbar } from "@/components/accidents/data-export-toolbar";
import { AccidentTypeGrid } from "@/components/accidents/accident-type-grid";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { SITE_STATS } from "@/data/site-stats";
import { PageContainer } from "@/components/layout/page-container";
import { AccidentAiAnalyzer } from "@/components/accidents/accident-ai-analyzer";
import { QuickAccidentSearch } from "@/components/accidents/quick-accident-search";
import { OfficialRecentLinks } from "@/components/accidents/official-recent-links";
import { AccidentTrendSummary } from "@/components/accidents/accident-trend-summary";
import { SavedAccidents } from "@/components/accidents/saved-accidents";
import { AccidentHubNav } from "@/components/accident-hub-nav";
import { Breadcrumb } from "@/components/breadcrumb";

const _title = "労働災害 事故事例データベース";
const _desc = `墜落・転倒・はさまれなど10年統合${SITE_STATS.accidents10yCount}件の労働災害 事故事例を業種・事故型で検索。厚生労働省データ（${SITE_STATS.mhlwDeathsCount}件死亡＋${SITE_STATS.accidentDbCount}件全件）＋curated詳細事例（${SITE_STATS.siteCuratedCaseCount}件）を統合し再発防止に活用。`;

export const metadata: Metadata = {
  alternates: { canonical: "/accidents" },
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

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: _title, description: _desc, url: `${SITE_URL}/accidents`, keywords: ["労働災害 事故事例 10年統計 厚生労働省", "墜落防止 対策", "転倒 はさまれ 業種別", "死亡災害 再発防止"] }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "事故データベース", url: `${SITE_URL}/accidents` },
          ]),
          datasetSchema({
            name: "労働災害 統合事故事例データベース",
            description: _desc,
            url: `${SITE_URL}/accidents`,
            keywords: ["労働災害", "事故事例", "死亡災害", "業種別", "厚生労働省", "再発防止", "墜落防止", "転倒対策", "はさまれ巻き込まれ", "労働災害 事故事例 10年統計"],
            temporalCoverage: "2014/2026",
            license: "https://creativecommons.org/licenses/by/4.0/",
            variableMeasured: [`総収録件数: ${totalCount}件`, "業種", "事故種類", "発生年月", "重傷度"],
            isBasedOn: [
              { name: "厚生労働省 職場のあんぜんサイト 死亡災害DB", url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.aspx" },
              { name: "厚生労働省 労働者死傷病報告オープンデータ", url: "https://anzeninfo.mhlw.go.jp/information/sokuhou.html" },
            ],
          }),
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ name: "事故データベース" }]} />
      </div>
      <AccidentHubNav current="accidents" />
      {/* C-1: ここを Suspense で包むと client モジュールの非同期ロードで境界が
          サスペンドし、静的HTMLに「フォールバック先行→$RCスワップ」が焼き込まれて
          下の保護具セクションが初回ペイント後に6,900px押し下げられる（CLS 0.254・
          LCP遅延）。本文は静的シェルに含める（サスペンドし得るものは無い）。 */}
      <HomeScreen variant="accidents">
        <TranslatedPageHeader
          titleJa="事故データベース"
          titleEn="Accident Database"
          descriptionJa="労働災害の事故事例を検索・閲覧。厚労省データベースへのリンクも掲載"
          descriptionEn="Search and browse workplace accident cases. Links to MHLW database included."
          iconName="Database"
          iconColor="red"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <LastUpdatedBadge />
          <AccidentsMetaInfo
            total={totalCount}
            mhlw={provenanceCounts.mhlw}
            curated={provenanceCounts.curated}
            preliminary={provenanceCounts.preliminary ?? 0}
            synthetic={provenanceCounts.synthetic}
          />
        </div>
        {/* 柱C-7横展開: 収録件数サマリーの出力手段。月例安全会議の資料に持ち出せる（#520の事故統計ダッシュボードと同構え） */}
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
          className="mt-2"
        />
        {/* 柱0: 事故の型ピクトグラム＋件数デカ数字のアイコンファーストナビ（読まずに自分の現場の事故へ） */}
        <AccidentTypeGrid counts={typeCounts} />
        {/* 文字ダイエット: データ内訳の定義と速報値の注意は詳細層へ（内容は不変） */}
        <CollapsibleDetail summary="収録データの内訳と速報値の注意" className="mt-2">
          <AccidentsMetaCaption />
          <AccidentsPreliminaryBanner />
        </CollapsibleDetail>
        <AccidentsAnalyticsBanner totalLabel={SITE_STATS.accidents10yCount} />
        {/* 多忙なコンサル向け: 最上部で1タップ/1検索→収録事例の絞り込み結果へ直行 */}
        <QuickAccidentSearch />
        {/* P0-1: AI事故注意喚起（作業内容→類似事故＋危険ポイント＋対策） */}
        <AccidentAiAnalyzer />
        {/* P1-2: 直近の労働災害（厚労省・公式データ）への出典付きリンク＋鮮度表示 */}
        <OfficialRecentLinks />
        {/* P1-4: 最近の労災トレンドAI要約 */}
        <AccidentTrendSummary />
        {/* P2-4: 保存した事故事例（お気に入り） */}
        <SavedAccidents />
        <div className="mt-4">
          <LadderStatsCard />
        </div>
        <NewsFeedSection />
      </HomeScreen>
      {/* 事故事例 → 主要な労災原因に対応する予防保護具を提示 */}
      <PageContainer paddingY="none">
        <ContextualPpePicks
          context="墜落 転落 足場 ハーネス 保護帽 ヘルメット 安全靴 切創 はさまれ 巻き込まれ 熱中症 化学物質 中毒"
          fallbackCategoryIds={["fall-protection", "head-protection", "hand-foot", "heat-cold"]}
          heading={{
            ja: "主要な労災を防ぐための予防保護具",
            en: "PPE for preventing the most common workplace accidents",
          }}
          description={{
            ja: "本データベースで多発する「墜落・転落・はさまれ・熱中症」など主要原因に直接効く保護具を厳選。",
            en: "Curated PPE that directly addresses the most frequent accident causes in this database — falls, being caught/struck, heat stress, and more.",
          }}
        />
      </PageContainer>

      <RelatedPageCards
        heading={{ ja: "このデータを活かす", en: "Put this data to use" }}
        pages={[
          {
            href: "/risk-prediction",
            label: { ja: "AIリスク予測", en: "AI Risk Prediction" },
            description: {
              ja: "事故事例と照合しながらAIが潜在リスクを予測。朝礼・KY活動に役立てられます。",
              en: "AI cross-references accident cases to predict latent risks — useful for morning briefings and KY activities.",
            },
            color: "blue",
            cta: { ja: "AIリスク予測を使う", en: "Open AI Risk Prediction" },
          },
          {
            href: "/ky",
            label: { ja: "KY用紙", en: "KY Form" },
            description: {
              ja: "事故事例を参考に危険予知活動表を作成。音声入力対応で現場から記録できます。",
              en: "Build a hazard-prediction sheet inspired by real cases. Voice input lets you record from the field.",
            },
            color: "emerald",
            cta: { ja: "KY用紙を作成する", en: "Create a KY form" },
          },
        ]}
      />
    </>
  );
}
