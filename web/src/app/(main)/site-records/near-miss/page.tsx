import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { NearMissClient } from "./near-miss-client";

const _title = "ヒヤリハット報告・集計｜事故の型別に傾向分析・是正管理・印刷・CSV（無料）";
const _desc =
  "現場のヒヤリハットを記録・蓄積し、事故の型別に件数を自動集計して傾向を可視化。要因・対策・是正状況まで管理し、印刷・CSVで月次集計・共有できます。重大災害を未然に防ぐ予防活動を、登録不要・この端末に保存して継続できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/near-miss" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function NearMissPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="ヒヤリハット報告・集計"
        description={_desc}
        path="/site-records/near-miss"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "現場の安全記録キット", url: "https://www.anzen-ai-portal.jp/site-records" },
          { name: "ヒヤリハット報告・集計", url: "https://www.anzen-ai-portal.jp/site-records/near-miss" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "ヒヤリハット報告・集計",
          url: "https://www.anzen-ai-portal.jp/site-records/near-miss",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="ヒヤリハット報告・集計"
          description="現場のヒヤリハットを蓄積し、事故の型別に傾向を集計。要因・対策・是正状況を管理し、印刷・CSVで月次集計に。"
          icon={AlertTriangle}
          iconColor="amber"
        />
      </div>
      <div className="mt-6">
        <NearMissClient />
      </div>
    </PageContainer>
  );
}
