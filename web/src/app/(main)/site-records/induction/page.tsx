import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { InductionClient } from "./induction-client";

const _title = "新規入場者 受入教育 実施記録（安衛則35条対応）｜無料で作成・印刷・名簿CSV";
const _desc =
  "新規入場者・雇入れ時の安全衛生教育を、労働安全衛生規則第35条の8項目＋現場ルールのチェックで実施記録に。受講記録の印刷、名簿のCSV出力に対応し、監督指導時の証跡づくりを支援します。登録不要・この端末に保存。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/induction" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function InductionPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="新規入場者 受入教育 実施記録"
        description={_desc}
        path="/site-records/induction"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "現場の安全記録キット", url: "https://www.anzen-ai-portal.jp/site-records" },
          { name: "新規入場者 受入教育 実施記録", url: "https://www.anzen-ai-portal.jp/site-records/induction" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "新規入場者 受入教育 実施記録",
          url: "https://www.anzen-ai-portal.jp/site-records/induction",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="新規入場者 受入教育 実施記録"
          description="安衛法59条・安衛則35条の教育項目＋現場ルールをチェックして実施記録を作成。受講記録の印刷・名簿CSVに対応。"
          icon={UserPlus}
          iconColor="emerald"
        />
      </div>
      <div className="mt-6">
        <InductionClient />
      </div>
    </PageContainer>
  );
}
