import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { LadderStatsCard } from "@/components/ladder-stats-card";
import { LastUpdatedBadge } from "@/components/last-updated-badge";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ContextualPpePicks } from "@/components/ContextualPpePicks";
import { ogImageUrl } from "@/lib/og-url";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { JsonLd, newsArticleListSchema } from "@/components/json-ld";
import {
  getAccidentCasesDataset,
  getAccidentProvenanceCounts,
} from "@/data/mock/accident-cases";
import { SITE_STATS } from "@/data/site-stats";

const _title = "労働災害 事故事例データベース";
const _desc = `10年統合${SITE_STATS.accidents10yCount}件の死亡労働災害事例を業種・事故種別で検索し再発防止に活用。厚労省死亡災害DB（${SITE_STATS.mhlwDeathsCount}件）＋厚労省全件DB（${SITE_STATS.accidentDbCount}件）＋curated詳細事例（${SITE_STATS.siteCuratedCaseCount}件）を統合。`;

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
  const accidentSchema = newsArticleListSchema(
    getAccidentCasesDataset().map((c) => ({
      headline: c.title,
      datePublished: c.occurredOn,
      url: `${SITE_URL}/accidents`,
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-600">
                収録 {getAccidentCasesDataset().length} 件（
                <span className="font-semibold text-emerald-700">厚労省 {counts.mhlw}</span>
                ／<span className="font-semibold text-sky-700">curated {counts.curated}</span>
                {counts.preliminary > 0 ? (
                  <>
                    ／
                    <span className="font-semibold text-orange-700">
                      速報 {counts.preliminary}
                    </span>
                  </>
                ) : null}
                {counts.synthetic > 0 ? (
                  <>
                    ／
                    <span className="font-semibold text-amber-700">
                      合成 {counts.synthetic}
                    </span>
                  </>
                ) : null}
                ）
              </span>
            );
          })()}
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          内訳の定義:{" "}
          <a
            href="/about/data-sources"
            className="underline hover:text-slate-700"
          >
            データソース一覧
          </a>{" "}
          を参照。<strong>厚労省</strong> = 職場のあんぜんサイト由来の再収録、
          <strong>curated</strong> = 公開情報・統計を編集部が再構成（固有名詞匿名化）、
          <span className="font-semibold text-orange-700">速報</span>{" "}
          = 厚労省月次速報集計値から導出したパターン事例（個票非公開のため・確定値公開後に更新）、
          <strong>合成</strong> = 教材用カバレッジ補完事例。
        </p>
        {/* 2025-2026 速報注記 */}
        <p className="mt-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[11px] text-orange-800">
          ⚠ <strong>2025〜2026年の事例は速報値を含みます。</strong>
          令和7年速報（全産業死亡684人・2026年3月集計）および令和8年速報（2026年4月集計）に基づく
          代表パターン事例です。確定個票（労働者死傷病報告 R07オープンデータ）は未公開のため、
          <a
            href="https://anzeninfo.mhlw.go.jp/information/sokuhou.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            厚労省速報ページ
          </a>
          で最新集計値をご確認ください。
        </p>
        <div className="mt-4">
          <LadderStatsCard />
        </div>
      </HomeScreen>
      {/* 事故事例 → 主要な労災原因に対応する予防保護具を提示 */}
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <ContextualPpePicks
          context="墜落 転落 足場 ハーネス 保護帽 ヘルメット 安全靴 切創 はさまれ 巻き込まれ 熱中症 化学物質 中毒"
          fallbackCategoryIds={["fall-protection", "head-protection", "hand-foot", "heat-cold"]}
          heading="🛡 主要な労災を防ぐための予防保護具"
          description="本データベースで多発する「墜落・転落・はさまれ・熱中症」など主要原因に直接効く保護具を厳選。"
        />
      </div>

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
