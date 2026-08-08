import type { Metadata } from "next";
import {
  JsonLd,
  breadcrumbSchema,
  webApplicationSchema,
  webPageSchema,
} from "@/components/json-ld";
import {
  SITE_URL,
  withSiteAlternates,
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";
import { ogImageUrl } from "@/lib/og-url";

const title = "安全サイネージ｜工事現場・朝礼のデジタル安全掲示板";
const description =
  "工事現場や工場の朝礼・常時表示向け安全サイネージ。気象警報、現場リスク、事故要点、法改正を、取得日時・対象日時・提供元・鮮度状態とともに表示します。";
const path = "/signage";
const url = `${SITE_URL}${path}`;

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "安全サイネージ",
    "工事現場 サイネージ",
    "安全掲示板 デジタル",
    "朝礼 サイネージ",
    "建設現場 デジタルサイネージ",
  ],
  alternates: withSiteAlternates(path),
  openGraph: withSiteOpenGraph(path, {
    title,
    description,
    images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    title,
    description,
    images: [ogImageUrl(title, description)],
  }),
};

export default function SignageLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: title,
            description,
            url,
            dateModified: "2026-07-24",
            keywords: [
              "安全サイネージ",
              "工事現場 サイネージ",
              "朝礼 サイネージ",
            ],
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "安全サイネージ", url },
          ]),
          webApplicationSchema({
            name: "安全AIポータル 安全サイネージ",
            description,
            url,
            applicationCategory: "BusinessApplication",
            featureList: [
              "気象・警報の取得日時、対象日時、提供元、鮮度状態を表示",
              "確認中・正常・情報が古い・取得不能・一部取得・緊急・保守・訓練の区別",
              "事故要点・法改正・現場記録・朝礼スクリプトの表示",
              "16:9横長・縦長・キオスク表示",
            ],
          }),
        ]}
      />
      {children}
    </>
  );
}
