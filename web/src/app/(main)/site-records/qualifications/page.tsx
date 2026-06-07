import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { QualificationClient } from "./qualification-client";

const _title = "特別教育・資格 受講管理簿｜誰がどの資格・教育を修了したか記録・名簿CSV・印刷";
const _desc =
  "作業者ごとに、フルハーネス・玉掛け・足場・職長教育などの特別教育・技能講習・資格と取得日を記録。名簿CSV・印刷に対応し、有資格者への適正配置と「有資格者に作業させている」証跡づくりに使えます。登録不要・この端末に保存。必要資格の逆引きは資格判定ツールへ。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/qualifications" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function QualificationsPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="特別教育・資格 受講管理簿"
        description={_desc}
        path="/site-records/qualifications"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "現場の安全記録キット", url: "https://www.anzen-ai-portal.jp/site-records" },
          { name: "特別教育・資格 受講管理簿", url: "https://www.anzen-ai-portal.jp/site-records/qualifications" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "特別教育・資格 受講管理簿",
          url: "https://www.anzen-ai-portal.jp/site-records/qualifications",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="特別教育・資格 受講管理簿"
          description="作業者ごとに特別教育・技能講習・資格と取得日を記録。名簿CSV・印刷で、有資格者への適正配置の証跡に。"
          icon={GraduationCap}
          iconColor="emerald"
        />
      </div>
      <div className="mt-6">
        <QualificationClient />
      </div>
    </PageContainer>
  );
}
