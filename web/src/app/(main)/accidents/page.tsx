import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { LadderStatsCard } from "@/components/ladder-stats-card";
import { LastUpdatedBadge } from "@/components/last-updated-badge";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, newsArticleListSchema } from "@/components/json-ld";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { SITE_STATS } from "@/data/site-stats";

const _title = "労働災害 事故事例データベース";
const _desc = `厚労省「職場のあんぜんサイト」${SITE_STATS.accidentDbCount}件の全件検索に加え、死亡災害${SITE_STATS.mhlwDeathsCount}件、サイト収録${SITE_STATS.siteCuratedCaseCount}件の詳細事例を業種・事故種別で検索し再発防止に活用。`;

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
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
        <div className="mt-2">
          <LastUpdatedBadge />
        </div>
        <div className="mt-4">
          <LadderStatsCard />
        </div>
      </HomeScreen>
      <RelatedPageCards
        heading="このデータを活かす"
        pages={[
          {
            href: "/risk-prediction",
            label: "AIリスク予測",
            description: "事故事例と照合しながらAIが潜在リスクを予測。朝礼・KY活動に役立てられます。",
            color: "blue",
            cta: "AIリスク予測を使う",
          },
          {
            href: "/ky",
            label: "KY用紙",
            description: "事故事例を参考に危険予知活動表を作成。音声入力対応で現場から記録できます。",
            color: "emerald",
            cta: "KY用紙を作成する",
          },
        ]}
      />
    </>
  );
}
