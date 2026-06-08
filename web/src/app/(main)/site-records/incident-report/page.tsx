import type { Metadata } from "next";
import { FileWarning } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { IncidentReportClient } from "./incident-report-client";

const _title = "労働者死傷病報告 作成補助（下書き）｜労災発生時の届出に必要な情報を整理・印刷";
const _desc =
  "労働災害で労働者が死亡・休業したときに必要な「労働者死傷病報告」（安衛則97条・様式23号/24号）の提出に向けて、事業場・被災者・災害発生状況などの情報を整理する下書きを作成。印刷・保存に対応し、電子申請の前準備に使えます。提出様式そのものではありません。登録不要・この端末に保存。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/incident-report" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function IncidentReportPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="労働者死傷病報告 作成補助"
        description={_desc}
        path="/site-records/incident-report"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "現場の安全記録キット", url: "https://www.anzen-ai-portal.jp/site-records" },
          { name: "労働者死傷病報告 作成補助", url: "https://www.anzen-ai-portal.jp/site-records/incident-report" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "労働者死傷病報告 作成補助",
          url: "https://www.anzen-ai-portal.jp/site-records/incident-report",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="労働者死傷病報告 作成補助（下書き）"
          description="労災発生時の届出（安衛則97条・様式23/24号）に必要な情報を整理。印刷・保存で電子申請の前準備に。提出様式そのものではありません。"
          icon={FileWarning}
          iconColor="red"
        />
      </div>
      <div className="mt-6">
        <IncidentReportClient />
      </div>
    </PageContainer>
  );
}
