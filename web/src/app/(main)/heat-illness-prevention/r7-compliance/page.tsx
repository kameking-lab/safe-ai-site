import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { R7ComplianceClient } from "./r7-compliance-client";

const _title =
  "R7安衛則改正 熱中症対策チェックリスト｜第612条の2 法定2項目と予防用テンプレ";
const _desc =
  "労働安全衛生規則第612条の2（令和7年6月1日施行）の法定2項目と、法的義務とは区別したWBGT測定・暑熱順化・緊急対応・予防教育の社内文書テンプレートを提供。";

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
        description="安衛則第612条の2（令和7年6月1日施行）の法定2項目チェックと、別枠の予防対策用テンプレート。"
        icon={ShieldAlert}
        iconColor="red"
      />
      <div className="mt-6">
        <R7ComplianceClient />
      </div>
    </PageContainer>
  );
}
