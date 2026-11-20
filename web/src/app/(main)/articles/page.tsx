import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardList, HardHat, type LucideIcon } from "lucide-react";
import { getPublishedArticleIndex } from "@/lib/articles";
import { ogImageUrl } from "@/lib/og-url";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { SafetyGuideLinks } from "@/components/safety-guide-links";

const _title = "労働安全 解説記事一覧";
const _desc = "労働安全衛生の解説記事と現場の安全ガイド。KY用紙の記入例、化学物質RAの進め方、サイネージの使い方を確認できます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/articles" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/articles",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

const CATEGORY_LABELS: Record<string, { icon: LucideIcon; label: string }> = {
  "law-update": { icon: ClipboardList, label: "法改正" },
  guide: { icon: BookOpen, label: "運用ガイド" },
  industry: { icon: HardHat, label: "業種別" },
};

export default function ArticlesIndexPage() {
  const articles = getPublishedArticleIndex();

  return (
    <PageContainer width="prose">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name={_title} description={_desc} path="/articles" />
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          労働安全 解説記事
        </h1>
      </header>
      <SafetyGuideLinks />

      {articles.length > 0 ? (
        <ul className="space-y-3">
          {articles.map((a) => {
            const cat = CATEGORY_LABELS[a.category];
            return (
            <li
              key={a.slug}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
                  {cat ? (
                    <>
                      <cat.icon className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
                      {cat.label}
                    </>
                  ) : (
                    a.category
                  )}
                </span>
                <span>{a.publishedAt} 公開</span>
                <span>・編集更新 {a.lastReviewedAt}</span>
                {a.sourceRetrievedAt ? (
                  <span>・公式URL取得確認 {a.sourceRetrievedAt}</span>
                ) : null}
                {a.humanReviewedAt ? (
                  <span>・人手内容確認 {a.humanReviewedAt}</span>
                ) : null}
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
            );
          })}
        </ul>
      ) : null}
    </PageContainer>
  );
}
