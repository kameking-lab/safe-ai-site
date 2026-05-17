import type { Metadata } from "next";
import { Thermometer } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { WbgtCalculatorClient } from "./wbgt-calculator-client";

const _title =
  "WBGT計算機（JIS Z 8504準拠）｜熱中症リスクと推奨対策を即時算出";
const _desc =
  "気温・湿度・黒球温度・作業強度・暑熱順化状況を入力するとJIS Z 8504式でWBGTを計算し、JSOH/厚労省基準に基づく4段階の熱中症リスクと推奨対策（作業/休憩比・水分補給・冷却・モニタリング）を即時に表示します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/heat-illness-prevention/wbgt-calculator" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function WbgtCalculatorPage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/heat-illness-prevention/wbgt-calculator"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "熱中症対策ハブ",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention",
          },
          {
            name: "WBGT計算機",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/wbgt-calculator",
          },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "WBGT計算機",
          url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/wbgt-calculator",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <PageHeader
        title="WBGT計算機"
        description="JIS Z 8504準拠の暑熱指数を即時計算。リスクレベルと推奨対策まで自動表示します。"
        icon={Thermometer}
        iconColor="amber"
      />
      <div className="mt-6">
        <WbgtCalculatorClient />
      </div>
    </PageContainer>
  );
}
