import type { Metadata } from "next";
import { WeatherForecastPanel } from "@/components/weather-forecast-panel";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "気象警報マップ｜現場 作業リスク管理";
const _desc =
  "都道府県別の気象警報・注意報と向こう1週間の天気予報。屋外作業・建設現場の安全管理に。市区町村別詳細も確認できます。";

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

export default function RiskPage() {
  return (
    <>
      <PageJsonLd name="気象リスク予測" description="気象庁データに基づく作業中止判断の参考情報。WBGT・降雨・雷リスクを地点別に表示。" path="/risk" />
      <WeatherForecastPanel />
    </>
  );
}
