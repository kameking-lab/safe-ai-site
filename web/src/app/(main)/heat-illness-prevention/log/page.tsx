import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { HeatLogClient } from "./heat-log-client";

const _title =
  "WBGT日次記録簿（令和7年改正対応）｜熱中症対策の実施記録を作成・印刷・CSV保存";
const _desc =
  "現場ごとに作業前・日中のWBGT測定値と実施した熱中症対策を時刻別に記録。最高WBGT・最悪リスクを自動集計し、提出用の帳票として印刷、CSVで保存できます。令和7年6月施行の安衛則改正（第612条の2）で求められる日次の運用・証跡づくりを、登録不要でこの端末に保存しながら行えます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/heat-illness-prevention/log" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function HeatLogPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/heat-illness-prevention/log"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "熱中症対策ハブ",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention",
          },
          {
            name: "WBGT日次記録簿",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/log",
          },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "WBGT日次記録簿",
          url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/log",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="WBGT日次記録簿"
          description="現場の作業前・日中のWBGTと実施した対策を時刻別に記録。提出用に印刷・CSV保存できます（令和7年改正対応）。"
          icon={ClipboardCheck}
          iconColor="amber"
        />
      </div>
      <div className="mt-6">
        <HeatLogClient />
      </div>
    </PageContainer>
  );
}
