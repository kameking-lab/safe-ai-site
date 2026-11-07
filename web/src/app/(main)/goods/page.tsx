import type { Metadata } from "next";
import { Suspense } from "react";
import { SafetyGoodsPanel } from "@/components/safety-goods-panel";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter, SITE_URL } from "@/lib/seo-metadata";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/components/json-ld";

const _title = "保護具の選び方｜作業の絵から条件を確認";
const _desc =
  "作業の絵から呼吸用保護具・墜落制止用器具・化学防護具の確認条件をひとつずつ整理。情報が足りないときは選定を保留し、確認方法と公式資料を案内します。";

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
