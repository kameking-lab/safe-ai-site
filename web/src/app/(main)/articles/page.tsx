import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticleIndex } from "@/lib/articles";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "労働安全 解説記事一覧",
  description:
    "労働安全衛生に関する法改正・運用ガイド・業種別のSEO記事を労働安全コンサルタント監修で公開。",
  alternates: { canonical: "/articles" },
  openGraph: {
    title: "労働安全 解説記事一覧｜ANZEN AI",
    description: "法改正・運用ガイド・業種別の解説記事をコンサルタント監修で公開。",
    images: [{ url: ogImageUrl("解説記事一覧"), width: 1200, height: 630 }],
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  "law-update": "📋 法改正",
  guide: "📖 運用ガイド",
  industry: "🏗 業種別",
};

export default function ArticlesIndexPage() {
  const articles = getPublishedArticleIndex();

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="労働安全 解説記事一覧" description="労働安全衛生に関する法改正・運用ガイド・業種別のSEO記事を労働安全コンサルタント監修で公開。" path="/articles" />
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          労働安全 解説記事
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          公開済み <strong>{articles.length}</strong> 本。法改正・運用ガイド・業種別の記事を労働安全コンサルタント（登録番号260022）監修で公開しています。
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          公開予定の記事はまだありません。
        </p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li
              key={a.slug}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
                  {CATEGORY_LABELS[a.category] ?? a.category}
                </span>
                <span>{a.publishedAt} 公開</span>
                <span>・最終確認 {a.lastReviewedAt}</span>
              </div>
              <Link
                href={`/articles/${a.slug}`}
                className="mt-1 block text-base font-bold text-slate-900 hover:text-emerald-700"
              >
                {a.title}
              </Link>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                {a.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {a.tags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
