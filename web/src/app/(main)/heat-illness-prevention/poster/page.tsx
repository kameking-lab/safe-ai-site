import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { PosterClient } from "./poster-client";

const _title =
  "熱中症 緊急時対応 現場掲示ポスター作成（令和7年改正の周知義務に対応）";
const _desc =
  "現場名と緊急連絡先（119・職長・産業医・最寄り救急・会社）を入力するだけで、発見→通報→搬送→冷却→補水→医療連携の緊急対応フローを大きく色分けした現場掲示用ポスターをA4で印刷できます。令和7年6月施行の改正安衛則で求められる『発症時対応手順の作成・周知（掲示）』に対応。無料・登録不要。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/heat-illness-prevention/poster" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function HeatPosterPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/heat-illness-prevention/poster"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "熱中症対策ハブ",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention",
          },
          {
            name: "緊急時対応 現場掲示ポスター",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/poster",
          },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "熱中症 緊急時対応 現場掲示ポスター作成",
          url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/poster",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="熱中症 緊急時対応 現場掲示ポスター"
          description="現場名と緊急連絡先を入れるだけで、発見→通報→冷却→医療連携の対応フローをA4掲示用に印刷。令和7年改正の『対応手順の周知（掲示）』に対応。"
          icon={Megaphone}
          iconColor="amber"
        />
      </div>
      <div className="mt-6">
        <PosterClient />
      </div>
    </PageContainer>
  );
}
