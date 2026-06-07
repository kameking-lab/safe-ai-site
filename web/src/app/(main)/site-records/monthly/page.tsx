import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { MonthlyReportClient } from "./monthly-report-client";

const _title = "月次安全衛生レポート 自動集計｜パトロール・ヒヤリ・点検・教育・委員会を1枚に（印刷）";
const _desc =
  "現場の安全記録キット（安全パトロール・ヒヤリハット・作業開始前点検・受入教育・安全衛生委員会・WBGT記録）の当月分を自動集計し、月次の安全衛生報告書を1枚で作成・印刷。元請提出・社内報告・委員会資料づくりの手間を大幅に削減します。登録不要・この端末のデータから生成。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/monthly" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function MonthlyReportPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="月次安全衛生レポート 自動集計"
        description={_desc}
        path="/site-records/monthly"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "現場の安全記録キット", url: "https://www.anzen-ai-portal.jp/site-records" },
          { name: "月次安全衛生レポート", url: "https://www.anzen-ai-portal.jp/site-records/monthly" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "月次安全衛生レポート 自動集計",
          url: "https://www.anzen-ai-portal.jp/site-records/monthly",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="月次安全衛生レポート（自動集計）"
          description="記録キットの当月分（パトロール・ヒヤリ・点検・教育・委員会・WBGT）を自動集計し、月次報告を1枚で作成・印刷。"
          icon={CalendarRange}
          iconColor="emerald"
        />
      </div>
      <div className="mt-6">
        <MonthlyReportClient />
      </div>
    </PageContainer>
  );
}
