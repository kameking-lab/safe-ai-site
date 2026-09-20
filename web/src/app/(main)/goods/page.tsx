import type { Metadata } from "next";
import { Suspense } from "react";
import { SafetyGoodsPanel } from "@/components/safety-goods-panel";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter, SITE_URL } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/components/json-ld";

const _title = "安全用品・保護具の選び方｜作業から購入候補を絞る";
const _desc =
  "呼吸用保護具・墜落制止用器具・化学防護手袋などを、危険・作業・現場条件の順に選んで購入候補へ。公式資料とNETIS安全技術も確認できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/goods" },
  openGraph: withSiteOpenGraph("/goods", {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(_title, _desc)],
  }),
};

export default function GoodsPage() {
  const url = `${SITE_URL}/goods`;
  return (
    <Suspense>
      <JsonLd
        schema={[
          webPageSchema({ name: _title, description: _desc, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "安全用品・保護具", url },
          ]),
        ]}
      />
      <SafetyGoodsPanel />
    </Suspense>
  );
}
