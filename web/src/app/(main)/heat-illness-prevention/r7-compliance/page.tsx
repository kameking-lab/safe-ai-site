import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { R7ComplianceClient } from "./r7-compliance-client";

const _title =
  "R7安衛則改正 熱中症対策チェックリスト｜第612条の2 改正8項目と社内文書テンプレ";
const _desc =
  "労働安全衛生規則第612条の2（令和7年4月1日改正）に対応した職場の熱中症予防対策チェックリスト8項目と、WBGT測定手順書・暑熱順化計画書・緊急対応フロー・予防教育カリキュラムの社内文書テンプレートを提供。印刷・コピー可能形式。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/heat-illness-prevention/r7-compliance" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function R7CompliancePage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/heat-illness-prevention/r7-compliance"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "熱中症対策ハブ",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention",
          },
          {
            name: "R7改正コンプライアンス",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention/r7-compliance",
          },
        ]}
      />
      <PageHeader
        title="R7安衛則改正 熱中症対策チェックリスト"
        description="安衛則第612条の2 改正（令和7年4月1日適用）の8項目チェックと、4種の社内文書テンプレート。"
        icon={ShieldAlert}
        iconColor="red"
      />
      <div className="mt-6">
        <R7ComplianceClient />
      </div>
    </PageContainer>
  );
}
