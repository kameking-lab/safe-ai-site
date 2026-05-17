import type { Metadata } from "next";
import { MlitResourcesClient } from "@/components/mlit-resources-client";
import { mlitResources } from "@/data/mlit-resources";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";

const SITE = "https://www.anzen-ai-portal.jp";
const TITLE = "国交省・建災防 安全資料DB";
const DESCRIPTION = `国土交通省（航空・道路・鉄道・港湾・河川）と建設業労働災害防止協会の安全関連ガイドライン・マニュアル・通達を ${mlitResources.length} 件横断検索。一次ソース（PDF・公式ページ）への直リンク付き。`;

export const metadata: Metadata = {
  alternates: { canonical: "/resources/mlit" },
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/resources/mlit",
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

export default function MlitResourcesPage() {
  return (
    <>
      <PageJsonLd
        name={TITLE}
        description={DESCRIPTION}
        path="/resources/mlit"
        breadcrumbs={[
          { name: "ホーム", url: SITE },
          { name: "厚労省一次資料DB", url: `${SITE}/resources` },
          { name: "国交省・建災防 安全資料DB", url: `${SITE}/resources/mlit` },
        ]}
      />
      <MlitResourcesClient />
    </>
  );
}
