import type { Metadata } from "next";
import { Footprints } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { PatrolClient } from "./patrol-client";

const _title = "安全パトロール・職場巡視 記録（安衛法13条対応）｜チェック＋指摘の是正管理・印刷・CSV";
const _desc =
  "安全パトロール・職場巡視を、5大災害＋衛生の標準チェック項目で記録。指摘事項を場所・危険度・担当・期日・是正状況まで管理し、印刷・CSV出力できます。衛生管理者の週1回巡視（安衛法13条・安衛則6条）や月例パトロールの証跡づくりを、登録不要・スマホ対応でこの端末に保存。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/patrol" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function PatrolPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="安全パトロール・職場巡視 記録"
        description={_desc}
        path="/site-records/patrol"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "現場の安全記録キット", url: "https://www.anzen-ai-portal.jp/site-records" },
          { name: "安全パトロール・職場巡視 記録", url: "https://www.anzen-ai-portal.jp/site-records/patrol" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "安全パトロール・職場巡視 記録",
          url: "https://www.anzen-ai-portal.jp/site-records/patrol",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="安全パトロール・職場巡視 記録"
          description="5大災害＋衛生の標準項目でチェックし、指摘事項の是正（担当・期日・完了）まで管理。印刷・CSVに対応。"
          icon={Footprints}
          iconColor="red"
        />
      </div>
      <div className="mt-6">
        <PatrolClient />
      </div>
    </PageContainer>
  );
}
