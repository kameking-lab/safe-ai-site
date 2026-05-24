import type { Metadata } from "next";
import Link from "next/link";
import { HardHat, ArrowRight } from "lucide-react";
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

      {/* P0-017 (usability-audit-day3): 建設業向けランディングをヒーロー直下に
          昇格。Day1 までは FlagshipGrid 下の最下段にあったが、ペルソナA本命
          施策として 3 大 CTA 直下の「最も視線が集まる位置」に移した。
          他業種ユーザーは下の HomeThreePillars / FlagshipGrid から
          一般機能にアクセスできる。 */}
      <section
        aria-label="建設業向けランディングへの誘導"
        className="mx-auto max-w-7xl px-4 pt-6"
      >
        <Link
          href="/for/construction"
          className="group flex flex-col items-stretch gap-4 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-amber-50 to-emerald-50 p-5 transition-colors hover:from-emerald-100 hover:via-amber-100 hover:to-emerald-100 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3 sm:flex-1">
            <div className="rounded-full bg-emerald-600 p-2.5 group-hover:bg-emerald-700">
              <HardHat className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-emerald-900 sm:text-lg">
                建設業の方はこちら
              </p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                職長・元請担当・現場代理人 向けの実務エントリ。
                <strong className="font-semibold">足場・墜落・KY・統括管理</strong>
                を当日から使える機能に集約。
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-emerald-700">
                <span className="rounded-full border border-emerald-300 bg-white/70 px-2 py-0.5">
                  KY 用紙
                </span>
                <span className="rounded-full border border-emerald-300 bg-white/70 px-2 py-0.5">
                  朝礼サイネージ
                </span>
                <span className="rounded-full border border-emerald-300 bg-white/70 px-2 py-0.5">
                  建設業頻出 20 物質
                </span>
                <span className="rounded-full border border-emerald-300 bg-white/70 px-2 py-0.5">
                  墜落事故 Top10
                </span>
                <span className="rounded-full border border-emerald-300 bg-white/70 px-2 py-0.5">
                  年次計画
                </span>
              </div>
            </div>
          </div>
          <ArrowRight className="hidden h-6 w-6 flex-shrink-0 text-emerald-700 group-hover:translate-x-1 sm:block" aria-hidden="true" />
        </Link>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-6">
        <HomeThreePillars />
      </div>
      <div className="px-4 py-8 sm:py-10">
        <FlagshipGrid />
      </div>
    </main>
  );
}
