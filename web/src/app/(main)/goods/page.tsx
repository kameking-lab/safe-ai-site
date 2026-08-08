import type { Metadata } from "next";
import { Suspense } from "react";
import { SafetyGoodsPanel } from "@/components/safety-goods-panel";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter, SITE_URL } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/components/json-ld";

const _title = "安全用品・保護具の購入前確認とカテゴリ検索";
const _desc =
  "保護具を購入する前に確認する公式資料と選定条件を案内。特定商品の適合を断定せず、墜落制止用器具・呼吸用保護具・保護手袋等の販売サイト検索へつなぎます。";

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
