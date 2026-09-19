import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, History, Smartphone } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageContainer } from "@/components/layout";
import {
  COMING_SOON_CONSTRUCTION_CALCULATORS,
  CONSTRUCTION_CALCULATOR_HUB_PATH,
} from "@/data/construction-calculators/coming-soon";
import { constructionCalculatorRegistry } from "@/data/construction-calculators/formula-registry";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const TITLE = "建設計算ツール｜数量・勾配・座標をスマホで計算";
const DESCRIPTION =
  "コンクリート、土量、砕石、アスファルト、鉄筋、型枠、勾配、排水、縮尺・座標を計算する無料の建設実務ツール12種類。入力値は端末内だけで扱います。";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = await searchParams;
  const hasQuery = Object.keys(query).length > 0;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: CONSTRUCTION_CALCULATOR_HUB_PATH },
    robots: hasQuery ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: withSiteOpenGraph(CONSTRUCTION_CALCULATOR_HUB_PATH, {
      title: TITLE,
      description: DESCRIPTION,
    }),
    twitter: withSiteTwitter({ title: TITLE, description: DESCRIPTION }),
  };
}

export default function ConstructionCalculatorsPage() {
  return (
    <PageContainer width="full" className="pb-20">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
              {
                "@type": "ListItem",
                position: 2,
                name: "建設計算ツール",
                item: `${SITE_URL}${CONSTRUCTION_CALCULATOR_HUB_PATH}`,
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "建設計算ツール",
            description: DESCRIPTION,
            url: `${SITE_URL}${CONSTRUCTION_CALCULATOR_HUB_PATH}`,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
          },
        ]}
      />

      <header className="overflow-hidden rounded-[2rem] border-2 border-slate-900 bg-[#f4efe2] px-5 py-9 text-slate-950 shadow-[8px_8px_0_#047857] sm:px-8 lg:px-12 dark:border-slate-500 dark:bg-slate-900 dark:text-white">
        <p className="text-sm font-black tracking-[.14em] text-emerald-800 dark:text-emerald-300">
          CONSTRUCTION CALCULATORS
        </p>
        <h1 className="mt-2 max-w-4xl text-4xl font-black tracking-[-.04em] sm:text-5xl lg:text-6xl">
          建設計算ツール
        </h1>
        <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-700 dark:text-slate-200 sm:text-lg">
          現場でよく使う数量・勾配・座標を、スマホですぐ計算します。
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm font-black">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-emerald-800 bg-white px-4 dark:bg-slate-950">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />公開中 {constructionCalculatorRegistry.length}件
          </span>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-slate-400 bg-white px-4 dark:bg-slate-950">
            <Smartphone className="h-5 w-5" aria-hidden="true" />スマホ対応
          </span>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-slate-400 bg-white px-4 dark:bg-slate-950">
            <History className="h-5 w-5" aria-hidden="true" />履歴は端末内だけ
          </span>
        </div>
        <p className="mt-5 max-w-4xl rounded-xl border border-amber-500 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          数量等の概算を支援するツールです。構造設計、強度判定、安全可否判定、法令適合判定は行いません。
        </p>
      </header>

      <div>
        <section aria-labelledby="published-calculators" className="mt-12">
          <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">AVAILABLE NOW</p>
          <h2 id="published-calculators" className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
            公開中 {constructionCalculatorRegistry.length}件
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {constructionCalculatorRegistry.map((calculator, index) => (
              <article key={calculator.slug} data-calculator-status="published" className="flex flex-col rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100">
                    {index + 1}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {calculator.category}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-white">{calculator.title}</h3>
                <p className="mt-2 flex-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {calculator.purpose}
                </p>
                <Link href={`${CONSTRUCTION_CALCULATOR_HUB_PATH}/${calculator.slug}`} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300">
                  計算する <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="calculator-coming-soon" className="mt-14">
          <details className="rounded-2xl border-2 border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
            <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-5 py-3 font-black">
              <span id="calculator-coming-soon">Coming Soon {COMING_SOON_CONSTRUCTION_CALCULATORS.length}件</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">候補一覧を開く</span>
            </summary>
            <ol className="columns-1 gap-8 border-t border-slate-200 px-5 py-4 text-sm sm:columns-2 lg:columns-3 dark:border-slate-700">
              {COMING_SOON_CONSTRUCTION_CALCULATORS.map((title) => (
                <li key={title} data-calculator-status="coming-soon" className="mb-2 break-inside-avoid font-bold leading-6">
                  {title} <span className="ml-1 text-xs font-black text-amber-800 dark:text-amber-300">Coming Soon</span>
                </li>
              ))}
            </ol>
          </details>
        </section>

        <section aria-labelledby="calculator-customize" className="mt-14 rounded-[2rem] border-2 border-emerald-700 bg-emerald-50 p-5 sm:p-8 dark:bg-emerald-950/30">
          <h2 id="calculator-customize" className="text-3xl font-black text-slate-950 dark:text-white">御社の計算式・帳票に合わせて作ります</h2>
          <p className="mt-3 max-w-4xl leading-7 text-slate-700 dark:text-slate-200">
            独自の計算式、社内係数、Excel計算書のWeb化、数量計算書、PDF・CSV、承認フロー、施工計画書・KY・API連携へ調整します。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              ["計算ツールをカスタマイズ", "safety-efficiency"],
              ["Excel計算書をWeb化", "automation"],
              ["業務自動化を相談", "ai-utilization"],
            ].map(([label, type]) => (
              <Link key={label} href={`/services/automation?consultationType=${type}#consult-form`} prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-black text-white hover:bg-slate-800 dark:bg-emerald-300 dark:text-slate-950">
                {label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
