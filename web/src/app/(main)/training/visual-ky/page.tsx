import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  PUBLIC_VISUAL_KY_SCENARIOS,
  VISUAL_KY_CATEGORY_DEFINITIONS,
  getVisualKyCategory,
} from "@/data/visual-ky";
import { VisualKyDailyHero } from "@/components/visual-ky/daily-hero";
import { UsageNotesLink } from "@/components/usage-notes-link";
import {
  SITE_URL,
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";

const HUB_PATH = "/training/visual-ky";
const TITLE = "5分でできる ビジュアルKYT｜危険予知訓練イラスト・問題";
const DESCRIPTION =
  "現場イラストから危険箇所を探し、事故につながる理由、優先対策、作業中止条件を5分で学ぶ無料KYT。個人学習、朝礼、講師進行、KY用紙連携に対応します。";

// 日替わり問題をJST 0:00境界で前日キャッシュなしに切り替える。
export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = await searchParams;
  const hasQuery = Object.keys(query).length > 0;
  const image = `${SITE_URL}/visual-ky/visual-ky-og.webp`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
      "KYT",
      "KYT イラスト",
      "危険予知訓練",
      "危険予知訓練 イラスト",
      "KY 問題",
      "KYT 無料",
      "朝礼 KY",
      "安全教育 イラスト",
      "建設業 KYT",
      "一人KY",
    ],
    alternates: { canonical: HUB_PATH },
    robots: hasQuery
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: withSiteOpenGraph(HUB_PATH, {
      title: TITLE,
      description: DESCRIPTION,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: "日本の建設現場で危険箇所を考えるビジュアルKYT",
        },
      ],
    }),
    twitter: withSiteTwitter({ images: [image] }),
  };
}

export default function VisualKyHubPage() {

  return (
    <>
      <PageJsonLd
        name="5分でできる ビジュアルKYT"
        description={DESCRIPTION}
        path={HUB_PATH}
        keywords={[
          "KYT",
          "危険予知訓練",
          "安全教育",
          "朝礼",
          "KY",
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: "5分でできる ビジュアルKYT",
          description: DESCRIPTION,
          url: `${SITE_URL}${HUB_PATH}`,
          inLanguage: "ja",
          learningResourceType: "危険予知訓練",
          educationalUse: ["個人学習", "朝礼", "安全教育"],
          timeRequired: "PT5M",
          isAccessibleForFree: true,
          dateModified: "2026-07-30",
          provider: {
            "@type": "Organization",
            name: "安全AIポータル",
            url: SITE_URL,
          },
          hasPart: PUBLIC_VISUAL_KY_SCENARIOS.map((scenario) => ({
            "@type": "LearningResource",
            name: scenario.title,
            url: `${SITE_URL}${HUB_PATH}/${scenario.slug}`,
            timeRequired: `PT${scenario.estimatedMinutes}M`,
          })),
        }}
      />

      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8">
        <VisualKyDailyHero initialTimestamp={new Date().toISOString()}/>

        <section id="categories" aria-labelledby="category-heading" className="mt-12 scroll-mt-24">
          <h2 id="category-heading" className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            分野から選ぶ
          </h2>
          <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {VISUAL_KY_CATEGORY_DEFINITIONS.map((item) => {
              const count = PUBLIC_VISUAL_KY_SCENARIOS.filter((scenario) =>
                scenario.categoryTags.includes(item.id),
              ).length;
              return (
                <li key={item.id}>
                  <Link
                    href={`${HUB_PATH}/category/${item.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-200 py-2 text-sm font-bold text-slate-900 underline decoration-teal-600/50 underline-offset-4 hover:text-teal-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-800 dark:text-slate-100 dark:hover:text-teal-200"
                  >
                    <span>{item.label}</span>
                    <span className="shrink-0 text-xs font-normal text-slate-600 dark:text-slate-300">
                      {count}問
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="all-problems-heading" className="mt-12">
          <h2 id="all-problems-heading" className="text-3xl font-black text-slate-950 dark:text-white">
            公開中の15問
          </h2>
          <details
            aria-labelledby="all-problems-summary"
            className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <summary
              id="all-problems-summary"
              className="min-h-11 cursor-pointer py-2 font-black text-teal-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:text-teal-200"
            >
              問題一覧を開く
            </summary>
            <div className="mt-2 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
              {PUBLIC_VISUAL_KY_SCENARIOS.map((scenario) => (
                <ScenarioLink key={scenario.id} scenario={scenario} />
              ))}
            </div>
          </details>
        </section>

        <nav aria-label="ビジュアルKYTの関連情報" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link
            href="/services/automation"
            prefetch={false}
            className="min-h-11 py-3 font-bold text-brand-primary underline underline-offset-4"
          >
            オリジナル教材を相談する
          </Link>
          <UsageNotesLink className="min-h-11 py-3 text-brand-primary" />
        </nav>
      </div>
    </>
  );
}

function ScenarioLink({
  scenario,
}: {
  scenario: (typeof PUBLIC_VISUAL_KY_SCENARIOS)[number];
}) {
  const category = getVisualKyCategory(scenario.category);
  return (
    <article className="border-b border-slate-200 dark:border-slate-800">
      <Link
        href={`${HUB_PATH}/${scenario.slug}`}
        className="group flex min-h-11 items-center justify-between gap-3 py-3 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
      >
        <span className="min-w-0">
          <h3 className="font-black text-slate-950 group-hover:text-teal-900 dark:text-white dark:group-hover:text-teal-200">
            {scenario.shortTitle}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {category.label} ・ {scenario.estimatedMinutes}分
          </p>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-teal-800 dark:text-teal-300" aria-hidden="true" />
      </Link>
    </article>
  );
}
