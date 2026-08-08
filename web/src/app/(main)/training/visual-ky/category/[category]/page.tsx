import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import {
  PUBLIC_VISUAL_KY_SCENARIOS,
  VISUAL_KY_CATEGORY_DEFINITIONS,
  getVisualKyCategory,
  type VisualKyCategory,
} from "@/data/visual-ky";

const HUB_PATH = "/training/visual-ky";

export function generateStaticParams() {
  return VISUAL_KY_CATEGORY_DEFINITIONS.map((item) => ({
    category: item.id,
  }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: raw } = await params;
  const definition = VISUAL_KY_CATEGORY_DEFINITIONS.find(
    (item) => item.id === raw,
  );
  if (!definition) return {};
  return {
    title: `${definition.label}のKYTイラスト・危険予知問題`,
    description: `${definition.description}無料のビジュアルKYT問題を選び、危険の理由と優先対策を学べます。`,
    alternates: { canonical: HUB_PATH },
    robots: { index: false, follow: true },
  };
}

export default async function VisualKyCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: raw } = await params;
  const category = VISUAL_KY_CATEGORY_DEFINITIONS.find(
    (item) => item.id === raw,
  );
  if (!category) notFound();
  const scenarios = PUBLIC_VISUAL_KY_SCENARIOS.filter((scenario) =>
    scenario.categoryTags.includes(raw as VisualKyCategory),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={HUB_PATH}
        className="inline-flex min-h-11 items-center gap-2 font-bold text-teal-800 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:text-teal-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        15分野の一覧へ
      </Link>
      <header className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <p className="text-xs font-black tracking-[0.16em] text-teal-800 uppercase dark:text-teal-300">
          Visual KYT category
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
          {category.label}のKYT
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-700 dark:text-slate-200">
          {category.description}
          この一覧は分野選択用のためnoindexとし、検索上の正本はビジュアルKYT hubと各reviewed問題です。
        </p>
      </header>
      <section aria-labelledby="category-problems" className="mt-8">
        <h2 id="category-problems" className="text-2xl font-black text-slate-950 dark:text-white">
          {scenarios.length}問から選ぶ
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario, index) => {
            const primary = getVisualKyCategory(scenario.category);
            return (
              <article
                key={scenario.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                <Link
                  href={`${HUB_PATH}/${scenario.slug}`}
                  className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-teal-300"
                >
                  <div className="relative aspect-video">
                    <Image
                      src={scenario.image.src}
                      alt={scenario.image.alt}
                      fill
                      priority={index === 0}
                      loading={index === 0 ? "eager" : "lazy"}
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                    <span
                      className="absolute left-3 top-3 rounded-full px-3 py-2 text-xs font-black text-slate-950"
                      style={{
                        backgroundColor: primary.paleColor,
                        borderColor: primary.color,
                        borderWidth: 1,
                      }}
                    >
                      {primary.label}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {scenario.id} · {scenario.difficulty} · {scenario.estimatedMinutes}分
                    </p>
                    <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                      {scenario.shortTitle}
                    </h2>
                    <span className="mt-4 inline-flex items-center gap-1 font-bold text-teal-800 dark:text-teal-300">
                      問題を始める
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
