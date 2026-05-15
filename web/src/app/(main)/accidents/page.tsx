import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { LadderStatsCard } from "@/components/ladder-stats-card";
import { LastUpdatedBadge } from "@/components/last-updated-badge";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ContextualPpePicks } from "@/components/ContextualPpePicks";
import { AccidentsMetaInfo, AccidentsMetaCaption } from "@/components/accidents-meta-info";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, newsArticleListSchema } from "@/components/json-ld";
import {
  getAccidentCasesDataset,
  getAccidentProvenanceCounts,
} from "@/data/mock/accident-cases";
import { SITE_STATS } from "@/data/site-stats";

const _title = "労働災害 事故事例データベース";
const _desc = `10年統合${SITE_STATS.accidents10yCount}件の死亡労働災害事例を業種・事故種別で検索し再発防止に活用。厚労省死亡災害DB（${SITE_STATS.mhlwDeathsCount}件）＋厚労省全件DB（${SITE_STATS.accidentDbCount}件）＋curated詳細事例（${SITE_STATS.siteCuratedCaseCount}件）を統合。`;

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜安全AIポータル`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function AccidentsPage() {
  const accidentSchema = newsArticleListSchema(
    getAccidentCasesDataset().map((c) => ({
      headline: c.title,
      datePublished: c.occurredOn,
      url: "https://safe-ai-site.vercel.app/accidents",
      description: c.summary,
    }))
  );

  return (
    <>
      <JsonLd schema={accidentSchema} />
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
          {(() => {
            const counts = getAccidentProvenanceCounts();
            return (
              <AccidentsMetaInfo
                total={getAccidentCasesDataset().length}
                mhlw={counts.mhlw}
                curated={counts.curated}
                synthetic={counts.synthetic}
              />
            );
          })()}
        </div>
        <AccidentsMetaCaption />
        <div className="mt-4">
          <LadderStatsCard />
        </div>
      </HomeScreen>
      {/* 事故事例 → 主要な労災原因に対応する予防保護具を提示 */}
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <ContextualPpePicks
          context="墜落 転落 足場 ハーネス 保護帽 ヘルメット 安全靴 切創 はさまれ 巻き込まれ 熱中症 化学物質 中毒"
          fallbackCategoryIds={["fall-protection", "head-protection", "hand-foot", "heat-cold"]}
          heading={{
            ja: "🛡 主要な労災を防ぐための予防保護具",
            en: "🛡 PPE for preventing the most common workplace accidents",
          }}
          description={{
            ja: "本データベースで多発する「墜落・転落・はさまれ・熱中症」など主要原因に直接効く保護具を厳選。",
            en: "Curated PPE that directly addresses the most frequent accident causes in this database — falls, being caught/struck, heat stress, and more.",
          }}
        />
      </div>

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
