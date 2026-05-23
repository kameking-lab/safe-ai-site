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
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <HomeThreePillars />
      </div>
      <div className="px-4 py-8 sm:py-10">
        <FlagshipGrid />
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-10">
        <Link
          href="/for/construction"
          className="group flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-white to-emerald-50/40 p-5 transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:from-amber-950/30 dark:via-slate-950 dark:to-emerald-950/30"
        >
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
              aria-hidden="true"
            >
              <HardHat className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">
                For Construction
              </p>
              <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                建設業の方はこちら — 職長・元請・現場代理人の役職別エントリ
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                当日（KY・朝礼ネタ）／月次（協議会議題・パトロール）／年次（計画書）の運用ツールと、墜落・足場・クレーン・石綿・熱中症の法令早見を1ページに集約しました。
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 self-end rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition group-hover:bg-amber-700 sm:self-auto">
            開く <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </main>
  );
}
