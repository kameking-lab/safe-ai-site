import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { AcclimatizationClient } from "./acclimatization-client";

const _title =
  "暑熱順化 計画・進捗管理（令和7年改正対応）｜新規入場者・復帰者の7日間プログラムを作成・記録";
const _desc =
  "新規入場者や長期休み明けの作業者向けに、7日間以上かけて作業負荷を漸増させる暑熱順化（暑熱馴化）計画を自動作成し、日々の実施・体調を記録。厚生労働省が求める計画的な暑熱順化を、印刷・CSV保存できる形で管理します。登録不要・この端末に保存。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/heat-illness-prevention/acclimatization" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function AcclimatizationPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/heat-illness-prevention/acclimatization"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "熱中症対策ハブ",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention",
          },
          {
            name: "暑熱順化 計画・進捗管理",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/acclimatization",
          },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "暑熱順化 計画・進捗管理",
          url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/acclimatization",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="暑熱順化 計画・進捗管理"
          description="新規入場者・復帰者の7日間以上の暑熱順化プログラムを作成し、日々の実施・体調を記録。印刷・CSV保存できます（令和7年改正対応）。"
          icon={CalendarCheck}
          iconColor="amber"
        />
      </div>
      <div className="mt-6">
        <AcclimatizationClient />
      </div>
    </PageContainer>
  );
}
