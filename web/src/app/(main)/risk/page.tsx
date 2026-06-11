import type { Metadata } from "next";
import { WeatherForecastPanel } from "@/components/weather-forecast-panel";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";
import { PageJsonLd } from "@/components/page-json-ld";

const _title = "リスク管理ハブ｜現場リスクアセスメント・気象警報";
const _desc =
  "現場リスクアセスメント、化学物質RA、KY活動、気象警報を一か所に集約。屋外作業・建設現場の安全管理をまとめて支援。";

export const metadata: Metadata = {
  alternates: { canonical: "/risk" },
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
      <PageJsonLd
        name="リスク管理ハブ"
        description="現場リスクアセスメント・化学物質RA・KY活動・気象警報を集約したハブページ。"
        path="/risk"
      />

      {/* C-007: reframe as RA hub so visitors expecting risk assessment find what they need */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">リスク管理ハブ</h1>
          <p className="mt-2 text-sm text-slate-600">
            現場のリスクアセスメント・危険予知・化学物質RA・気象判断を一か所で。
          </p>
        </header>

        {/* 柱0: いまの状態（気象警報の結論カード）を最上部に。ナビカードは状態の後 */}
        <WeatherForecastPanel />

        <div className="mt-8">
          <RelatedPageCards
            heading="リスクアセスメント"
            pages={[
              {
                href: "/risk-prediction",
                label: "リスク予測・判断支援",
                description: "作業計画をもとにリスクを予測し、管理措置の優先順位を整理。",
                color: "rose",
                cta: "リスク予測を開く",
              },
              {
                href: "/ky",
                label: "KY用紙作成",
                description: "4ラウンド法に対応した危険予知活動シート。音声入力・PDF出力対応。",
                color: "emerald",
                cta: "KY用紙を開く",
              },
              {
                href: "/chemical-ra",
                label: "化学物質リスクアセスメント",
                description: "GHS分類に基づく化学物質の健康・爆発リスクを評価。",
                color: "purple",
                cta: "化学物質RAを開く",
              },
            ]}
          />
        </div>

        <RelatedPageCards
          heading="あわせて見る"
          pages={[
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
              color: "blue",
              cta: "サイネージを開く",
            },
          ]}
        />
      </div>
    </>
  );
}
