import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, ShieldCheck } from "lucide-react";
import { PilotComparisonClient } from "@/components/safety-image-pilot/pilot-comparison-client";
import {
  PILOT_COMPARISON_PATH,
  PILOT_HUB_PATH,
} from "@/data/safety-image-pilot";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const TITLE = "文字の作り方を比較｜保護帽を着用";
const DESCRIPTION =
  "同じ安全イラストで、後付け文字と画像生成内文字を比較できます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PILOT_COMPARISON_PATH },
  robots: { index: false, follow: true },
  openGraph: withSiteOpenGraph(PILOT_COMPARISON_PATH, {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    images: [
      {
        url: "/safety-images/pilot/helmet-required-a-all-branded.webp",
        width: 720,
        height: 1019,
        alt: "保護帽着用を伝える5言語の安全看板比較",
      },
    ],
  }),
  twitter: withSiteTwitter({
    title: TITLE,
    description: DESCRIPTION,
    images: ["/safety-images/pilot/helmet-required-a-all-branded.webp"],
  }),
};

export default function HelmetRequiredPilotComparisonPage() {
  return (
    <div className="pb-16">
      <header className="border-b border-slate-200 bg-white px-4 pb-7 pt-4 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl">
          <Link
            href={PILOT_HUB_PATH}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />安全画像倉庫へ
          </Link>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-950">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />試作比較1点
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">
            文字の作り方を比較
          </h1>
          <p className="mt-3 text-base font-bold leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
            同じ安全イラストで、後付け文字と画像生成内文字を比較できます。
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-7 sm:px-6">
        <PilotComparisonClient />
        <p className="mt-8 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <ShieldCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          安全AIポータル作成／商用利用可／加工可／再配布条件はサイト記載
        </p>
      </div>
    </div>
  );
}
