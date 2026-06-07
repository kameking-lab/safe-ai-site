import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { CommitteeClient } from "./committee-client";

const _title = "安全衛生委員会 議事録 作成（安衛法17〜19条対応）｜標準議題テンプレ・印刷・CSV";
const _desc =
  "毎月1回以上の開催が義務づけられる安全衛生委員会の議事録を、付議事項（安衛則21・22条）に基づく標準議題テンプレートで簡単に作成。決定事項・担当・期日まで記録し、3年間保存・労働者への周知（掲示・配布）用に印刷、CSV出力できます。登録不要・この端末に保存。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/committee" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function CommitteePage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="安全衛生委員会 議事録 作成"
        description={_desc}
        path="/site-records/committee"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "現場の安全記録キット", url: "https://www.anzen-ai-portal.jp/site-records" },
          { name: "安全衛生委員会 議事録", url: "https://www.anzen-ai-portal.jp/site-records/committee" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "安全衛生委員会 議事録 作成",
          url: "https://www.anzen-ai-portal.jp/site-records/committee",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="安全衛生委員会 議事録"
          description="付議事項に基づく標準議題テンプレートで議事録を作成。決定・担当・期日を記録し、3年保存・周知用に印刷・CSV出力。"
          icon={Users}
          iconColor="blue"
        />
      </div>
      <div className="mt-6">
        <CommitteeClient />
      </div>
    </PageContainer>
  );
}
