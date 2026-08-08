import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FEATURE_CATEGORIES,
  categoryColorClasses,
  getCategoryById,
  getFeaturesByCategory,
  type FeatureCategoryId,
} from "@/data/features-catalog";
import { ogImageUrl } from "@/lib/og-url";
import { EmptyCategoryFallback } from "./empty-category-fallback";

export function generateStaticParams() {
  return FEATURE_CATEGORIES.map((category) => ({ category: category.id }));
}

type Params = { category: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category } = await params;
  const current = getCategoryById(category);
  if (!current) return { title: "機能カテゴリ" };

  const features = getFeaturesByCategory(current.id as FeatureCategoryId);
  const title = `${current.title} | 機能紹介`;
  const robots =
    features.length === 0
      ? {
          index: false,
          follow: true,
          googleBot: { index: false, follow: true },
        }
      : undefined;

  return {
    title,
    description: current.description,
    alternates: { canonical: `/features/${current.id}` },
    robots,
    openGraph: {
      title,
      description: current.description,
      type: "website",
      locale: "ja_JP",
      siteName: "安全AIポータル",
      url: `https://www.anzen-ai-portal.jp/features/${current.id}`,
      images: [
        {
          url: ogImageUrl(title, current.description),
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: current.description,
      images: [ogImageUrl(title, current.description)],
    },
  };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { category } = await params;
  const current = getCategoryById(category);
  if (!current) notFound();

  const features = getFeaturesByCategory(current.id as FeatureCategoryId);
  const colors = categoryColorClasses(current.accent);

  return (
    <div className="px-4 py-6 sm:py-10">
      <nav
        aria-label="パンくず"
        className="mx-auto max-w-5xl text-xs text-slate-600"
      >
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/features" className="hover:underline">
              機能紹介
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="font-semibold text-slate-800">
            {current.title}
          </li>
        </ol>
      </nav>

      <header
        className={`mx-auto mt-4 max-w-5xl rounded-2xl border ${colors.border} ${colors.bg} p-6 sm:p-8`}
      >
        <p className={`text-xs font-bold tracking-widest ${colors.text}`}>
          CATEGORY
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
          {current.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
          {current.description}
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-800">
          現在確認済みの公開機能: {features.length}件
        </p>
      </header>

      {features.length === 0 ? (
        <EmptyCategoryFallback />
      ) : (
        <section
          aria-labelledby="available-features"
          className="mx-auto mt-8 max-w-5xl"
        >
          <h2 id="available-features" className="text-xl font-bold text-slate-950">
            確認済みの公開機能
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.slug}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-bold text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {feature.description}
                </p>
                {feature.tags?.length ? (
                  <ul aria-label="分類" className="mt-3 flex flex-wrap gap-1">
                    {feature.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link
                  href={feature.href}
                  className={`mt-4 inline-flex min-h-11 items-center rounded-lg bg-gradient-to-r ${colors.gradient} px-4 py-2 text-sm font-bold text-white`}
                >
                  公開状態を確認して開く
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <nav
        aria-label="機能紹介ナビゲーション"
        className="mx-auto mt-10 flex max-w-5xl flex-wrap gap-2"
      >
        <Link
          href="/features"
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800"
        >
          機能一覧へ戻る
        </Link>
        <Link
          href="/services/automation"
          className="inline-flex min-h-11 items-center rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-950"
        >
          料金・受付状況を見る
        </Link>
      </nav>
    </div>
  );
}
