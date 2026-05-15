import type { Metadata } from "next";
import { Suspense } from "react";
import { SafetyGoodsPanel } from "@/components/safety-goods-panel";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter, SITE_URL } from "@/lib/seo-metadata";
import { safetyGoodsCategories } from "@/data/mock/safety-goods";
import { JsonLd, webPageSchema, breadcrumbSchema, productCollectionSchema } from "@/components/json-ld";
const _title = "安全用品・保護具 おすすめ一覧";
const _desc =
  "安全ヘルメット・墜落制止用器具・保護手袋・安全靴など現場で役立つ保護具を分野別に紹介。Amazon・楽天で購入できます。";

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
          productCollectionSchema({
            name: _title,
            url,
            products: safetyGoodsCategories.map((cat) => ({
              name: cat.name,
              url: `${url}?category=${cat.id}`,
              description: cat.description,
            })),
          }),
        ]}
      />
      <SafetyGoodsPanel />
    </Suspense>
  );
}
