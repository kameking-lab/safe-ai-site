import type { Metadata } from "next";
import { ListOrdered } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { ProcedureClient } from "./procedure-client";

const _title = "作業手順書 作成｜手順×危険（急所）×対策を1枚に・印刷・CSV（無料）";
const _desc =
  "作業を安全に進めるための作業手順書を、手順・危険（急所）・対策の3列で作成。使用する機械・工具、必要な資格・特別教育も記載し、印刷・CSV出力できます。雇入れ時教育・新規入場者教育・KYの土台となる現場の基本文書を、登録不要・この端末に保存して作れます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/procedure" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function ProcedurePage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="作業手順書 作成"
        description={_desc}
        path="/site-records/procedure"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "現場の安全記録キット", url: "https://www.anzen-ai-portal.jp/site-records" },
          { name: "作業手順書 作成", url: "https://www.anzen-ai-portal.jp/site-records/procedure" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "作業手順書 作成",
          url: "https://www.anzen-ai-portal.jp/site-records/procedure",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="作業手順書 作成"
          description="手順×危険（急所）×対策の3列で作業手順書を作成。使用機械・必要資格も記載し、印刷・CSV。KY・受入教育の土台に。"
          icon={ListOrdered}
          iconColor="blue"
        />
      </div>
      <div className="mt-6">
        <ProcedureClient />
      </div>
    </PageContainer>
  );
}
