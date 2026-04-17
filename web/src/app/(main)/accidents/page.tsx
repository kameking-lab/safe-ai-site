import type { Metadata } from "next";
import { Database } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { LastUpdatedBadge } from "@/components/last-updated-badge";
import { PageHeader } from "@/components/page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, newsArticleListSchema } from "@/components/json-ld";
import { realAccidentCases } from "@/data/mock/real-accident-cases";

const _title = "労働災害 事故事例データベース";
const _desc =
  "厚労省「職場のあんぜんサイト」実事例200件以上を収録。業種・事故種別で検索し再発防止に活用。建設・製造・林業の安全管理に。";

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
    realAccidentCases.map((c) => ({
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
        <PageHeader
          title="事故データベース"
          description="労働災害の事故事例を検索・閲覧。厚労省データベースへのリンクも掲載"
          icon={Database}
          iconColor="red"
        />
        <div className="mt-2">
          <LastUpdatedBadge />
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
