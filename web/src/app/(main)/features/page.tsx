import type { Metadata } from "next";
import { FeaturesIndexClient } from "./features-index-client";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "機能紹介 | 安全AIポータル",
  description:
    "安全AIポータルの全26機能を1ページで一覧。安衛法チャットボット・KY用紙・化学物質RA・事故DB・Eラーニングなど、業種・用途から探せます。",
  openGraph: {
    title: "機能紹介 | 安全AIポータル",
    description:
      "安全AIポータルの全26機能を1ページで一覧。安衛法チャットボット・KY用紙・化学物質RA・事故DB・Eラーニングなど、業種・用途から探せます。",
  },
};

export default function FeaturesPage() {
  return (
    <>
      <PageJsonLd name="機能一覧・ユースケース" description="安全AIポータル が提供する機能の全体像。業種別ユースケース・現場での使い方を一覧表示。" path="/features" />
      <FeaturesIndexClient />
    </>
  );
}
