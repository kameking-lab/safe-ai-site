import type { Metadata } from "next";
import { Suspense } from "react";
import { SafetyGoodsPanel } from "@/components/safety-goods-panel";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd, productCollectionSchema } from "@/components/json-ld";
import { safetyGoodsItems } from "@/data/mock/safety-goods";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安全用品・保護具 おすすめ一覧";
const _desc =
  "安全ヘルメット・墜落制止用器具・保護手袋・安全靴など現場で役立つ保護具を分野別に紹介。Amazon・楽天で購入できます。";
const SITE_BASE = "https://www.anzen-ai-portal.jp";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/goods" },
  openGraph: {
    title: `${_title}｜安全AIポータル`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function GoodsPage() {
  const productList = productCollectionSchema({
    name: _title,
    url: `${SITE_BASE}/goods`,
    products: safetyGoodsItems.map((item) => ({
      name: item.name,
      url: `${SITE_BASE}/goods?item=${encodeURIComponent(item.id)}`,
      description: item.description,
      ...(item.imageUrl ? { image: item.imageUrl } : {}),
    })),
  });
  return (
    <Suspense>
      {/* SEO: WebPage + BreadcrumbList + Product ItemList */}
      <PageJsonLd name={_title} description={_desc} path="/goods" />
      <JsonLd schema={productList} />
      <SafetyGoodsPanel />
    </Suspense>
  );
}
