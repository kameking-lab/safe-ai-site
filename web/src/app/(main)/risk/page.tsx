import type { Metadata } from "next";
import { WeatherForecastPanel } from "@/components/weather-forecast-panel";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "気象警報マップ｜現場 作業リスク管理";
const _desc =
  "都道府県別の気象警報・注意報と向こう1週間の天気予報。屋外作業・建設現場の安全管理に。市区町村別詳細も確認できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function RiskPage() {
  return (
    <>
      <PageJsonLd name="気象リスク予測" description="気象庁データに基づく作業中止判断の参考情報。WBGT・降雨・雷リスクを地点別に表示。" path="/risk" />
      <WeatherForecastPanel />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/risk-prediction",
            label: "AIリスク予測",
            description: "作業内容と気象条件からAIが潜在リスクを予測。KY項目作成の出発点に。",
            color: "blue",
            cta: "AIで予測する",
          },
          {
            href: "/accidents",
            label: "気象起因の事故事例",
            description: "豪雨・落雷・突風・熱中症が要因となった労災を業種別に検索。",
            color: "orange",
            cta: "事故から学ぶ",
          },
          {
            href: "/signage",
            label: "現場サイネージ",
            description: "気象警報を朝礼掲示や事務所モニターに30分自動更新で表示。",
            color: "emerald",
            cta: "サイネージを開く",
          },
        ]}
      />
    </>
  );
}
