import type { Metadata } from "next";
import { NewHomeHero } from "@/components/new-home-hero";
import { FlagshipGrid } from "@/components/flagship-grid";
import { HomeThreePillars } from "@/components/home-three-pillars";
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
      <NewHomeHero />
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <HomeThreePillars />
      </div>
      <div className="px-4 py-8 sm:py-10">
        <FlagshipGrid />
      </div>
    </main>
  );
}
