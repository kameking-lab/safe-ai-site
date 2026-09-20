import type { Metadata } from "next";
import { HomeRelaunch } from "@/components/home/home-relaunch";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  JsonLd,
  organizationSchema,
  webSiteSchema,
} from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const _title = "安全AIポータル｜根拠から、現場の行動へ";
const _desc =
  "今日の現場リスク、安衛法AI、化学物質RA、労災事故、法改正、教育・資格、ビジュアルKYTを、出典と更新状態を確認しながら使える労働安全ポータルです。";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: { absolute: _title },
  description: _desc,
  keywords: [
    "安全AIポータル",
    "安全AI",
    "労働安全AI",
    "安全管理AI",
    "安全衛生AI",
  ],
  openGraph: withSiteOpenGraph("/", {
    title: { absolute: _title },
    description: _desc,
    images: [{ url: ogImageUrl("根拠から、現場の行動へ"), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl("根拠から、現場の行動へ")],
  }),
};

export default function HomePage() {
  return (
    <div>
      <JsonLd schema={[organizationSchema(), webSiteSchema()]} />
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/"
        hideVisibleBreadcrumb
      />
      <HomeRelaunch />
    </div>
  );
}
