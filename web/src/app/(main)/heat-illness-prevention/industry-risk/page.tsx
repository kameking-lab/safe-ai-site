import type { Metadata } from "next";
import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { IndustryRiskClient } from "./industry-risk-client";

const _title =
  "業種別 熱中症リスク判定｜建設・製造・運輸ほか10業種の暴露作業・対策・関連法令";
const _desc =
  "建設・製造・運輸・農業・林業・清掃・警備・厨房・倉庫・廃棄物処理の10業種について、熱中症の暴露作業・リスク要因・標準対策・R7改正での重点対応・関連法令を一覧化。現場の安全衛生計画策定に活用できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/heat-illness-prevention/industry-risk" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function IndustryRiskPage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/heat-illness-prevention/industry-risk"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "熱中症対策ハブ",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention",
          },
          {
            name: "業種別リスク判定",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/industry-risk",
          },
        ]}
      />
      <PageHeader
        title="業種別 熱中症リスク判定"
        description="MHLW統計上位10業種について、暴露作業・リスク要因・標準対策・関連法令を整理しています。"
        icon={Building2}
        iconColor="amber"
      />
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-slate-500">読み込み中…</p>}>
          <IndustryRiskClient />
        </Suspense>
      </div>
    </PageContainer>
  );
}
