import type { Metadata } from "next";
import { FeaturesIndexClient } from "./features-index-client";
import { withSiteOpenGraph } from "@/lib/seo-metadata";
import { FEATURES } from "@/data/features-catalog";

import { PageJsonLd } from "@/components/page-json-ld";

// カタログ件数（FEATURES.length）から動的に生成し、収載数の手書き申告が実数と
// ずれる（酷評02章で指摘された数値申告drift）のを防ぐ。
const FEATURES_DESCRIPTION = `安全AIポータルの全${FEATURES.length}機能を1ページで一覧。安衛法チャットボット・KY用紙・化学物質RA・事故DB・Eラーニングなど、業種・用途から探せます。`;

export const metadata: Metadata = {
  alternates: { canonical: "/features" },
  title: "機能紹介",
  description: FEATURES_DESCRIPTION,
  openGraph: withSiteOpenGraph("/features", {
    title: "機能紹介",
    description: FEATURES_DESCRIPTION,
  }),
};

export default function FeaturesPage() {
  return (
    <>
      <PageJsonLd name="機能一覧・ユースケース" description="安全AIポータル が提供する機能の全体像。業種別ユースケース・現場での使い方を一覧表示。" path="/features" />
      <FeaturesIndexClient />
    </>
  );
}
