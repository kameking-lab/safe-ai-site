import type { Metadata } from "next";
import { HomeQuickAccess } from "@/components/home-quick-access";
import { NewHomeHero } from "@/components/new-home-hero";
import { FlagshipGrid } from "@/components/flagship-grid";
import { HomeThreePillars } from "@/components/home-three-pillars";
import { HomePersonaEntry } from "@/components/home-persona-entry";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const _title = "安全AIポータル｜現場の安全を、AIで変える。";
const _desc =
  "労働安全衛生のAI・DX活用研究プロジェクト。安衛法AIチャット・法令検索・KY活動・労働災害防止・事故事例DB・年次安全衛生計画など、建設・製造・医療福祉向け現場安全管理機能を集約。無料。";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: { absolute: _title },
  description: _desc,
  openGraph: withSiteOpenGraph("/", {
    title: { absolute: _title },
    description:
      "労働安全衛生のAI・DX活用研究プロジェクト。安衛法AIチャット・法令検索・KY活動・事故事例DBなど建設・製造・医療福祉向け現場安全管理機能を集約。無料。",
    images: [{ url: ogImageUrl("現場の安全を、AIで変える。"), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl("現場の安全を、AIで変える。")],
  }),
};

export default function HomePage() {
  return (
    <main>
      <PageJsonLd name={_title} description={_desc} path="/" />
      {/* exp-r8: トップ最上部に主要9機能への直接導線（0スクロール・1タップ）。
          社長の不満「すぐ機能に行かない」の是正。Hero(h1/キャッチ/統計＝SEO)は直下に温存。 */}
      <HomeQuickAccess />
      <NewHomeHero />

      {/* exp-01 (autonomous-loop 2026-05-30): 単独の建設業バナーを 4 ペルソナ
          選択バンドへ拡張。初見の訪問者が「自分の立場」(建設現場/一人親方/
          企業の安全衛生担当者/専門家) から 1 タップで実務エントリに入れる。
          建設業は引き続き先頭カードとして最も目立つ位置を確保。 */}
      <HomePersonaEntry />

      <div className="mx-auto max-w-7xl px-4 pt-6">
        <HomeThreePillars />
      </div>
      <div className="px-4 py-8 sm:py-10">
        <FlagshipGrid />
      </div>
    </main>
  );
}
