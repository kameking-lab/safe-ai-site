import type { Metadata } from "next";
import { NewHomeHero } from "@/components/new-home-hero";
import { FlagshipGrid } from "@/components/flagship-grid";
import { MorningDigest } from "@/components/morning-digest";
import { ogImageUrl } from "@/lib/og-url";

export const metadata: Metadata = {
  title: { absolute: "ANZEN AI｜現場の安全を、AIで変える。" },
  description:
    "労働安全衛生のAI・DX活用研究プロジェクト。安全衛生日誌・KY簡易作成・化学物質RA・サイネージ・法改正・安衛法AIチャット・重大事故ニュースの7つの主要機能で現場運用を支援します。",
  openGraph: {
    title: "ANZEN AI｜現場の安全を、AIで変える。",
    description:
      "労働安全衛生のAI・DX活用研究プロジェクト。7つの主要機能で建設・製造・運輸・医療福祉・林業の現場運用を支援します。",
    images: [{ url: ogImageUrl("現場の安全を、AIで変える。"), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl("現場の安全を、AIで変える。")],
  },
};

export default function HomePage() {
  return (
    <main>
      <NewHomeHero />
      <div className="px-4 py-8 sm:py-10">
        <FlagshipGrid />
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-10">
        <MorningDigest />
      </div>
    </main>
  );
}
