import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { InspectionClient } from "./inspection-client";

const _title = "作業開始前点検 記録（安衛則170条ほか対応）｜機種別チェック・使用可否・印刷・CSV";
const _desc =
  "車両系建設機械・移動式クレーン・フォークリフト・高所作業車・電動工具の作業開始前点検を、機種別の標準項目で記録。点検結果・使用可否・異常時の措置を残し、印刷・CSV出力できます。義務づけられた始業前点検の証跡づくりを、登録不要・この端末に保存。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/inspection" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function InspectionPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="作業開始前点検 記録"
        description={_desc}
        path="/site-records/inspection"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "現場の安全記録キット", url: "https://www.anzen-ai-portal.jp/site-records" },
          { name: "作業開始前点検 記録", url: "https://www.anzen-ai-portal.jp/site-records/inspection" },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "作業開始前点検 記録",
          url: "https://www.anzen-ai-portal.jp/site-records/inspection",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: _desc,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          isAccessibleForFree: true,
        }}
      />
      <div className="print:hidden">
        <PageHeader
          title="作業開始前点検 記録"
          description="建設機械・クレーン・フォークリフト・高所作業車・電動工具の始業前点検を機種別項目で記録。使用可否・異常措置・印刷・CSV。"
          icon={Wrench}
          iconColor="blue"
        />
      </div>
      <div className="mt-6">
        <InspectionClient />
      </div>
    </PageContainer>
  );
}
