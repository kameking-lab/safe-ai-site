import type { Metadata } from "next";
import { CloudSun } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { WeatherForecastPanel } from "@/components/weather-forecast-panel";

export const metadata: Metadata = {
  title: "気象警報マップ",
  description: "都道府県別の気象警報・注意報と向こう1週間の天気予報マップ。地域ブロックをクリックすると市区町村別の詳細を確認できます。",
  openGraph: {
    title: "気象警報マップ｜ANZEN AI",
    description: "都道府県別の気象警報・注意報と向こう1週間の天気予報マップ。地域ブロックをクリックすると市区町村別の詳細を確認できます。",
  },
};

export default function RiskPage() {
  return (
    <>
      <PageHeader
        title="気象警報マップ"
        description="都道府県別の気象警報・注意報と向こう1週間の天気予報を確認"
        icon={CloudSun}
        iconColor="blue"
      />
      <WeatherForecastPanel />
    </>
  );
}
