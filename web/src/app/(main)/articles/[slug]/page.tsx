import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { LanguageButton } from "@/components/language-button";
import {
  getPublishedArticleBySlug,
  getPublishedArticleSlugs,
} from "@/lib/articles";
import type { LanguageCode } from "@/lib/translation-cache";
import multilingualTitles from "@/data/translations/multilingual-titles.json";
import { ogImageUrl } from "@/lib/og-url";

const SITE_BASE = "https://safe-ai-site.vercel.app";

export function generateStaticParams() {
  return getPublishedArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getPublishedArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/articles/${slug}` },
    keywords: article.keywords,
    openGraph: {
      title: `${article.title}｜ANZEN AI`,
      description: article.description,
      images: [{ url: ogImageUrl(article.title), width: 1200, height: 630 }],
      type: "article",
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(article.title)] },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getPublishedArticleBySlug(slug);
  if (!article) notFound();

  const url = `${SITE_BASE}/articles/${slug}`;

  const titleEntry = (multilingualTitles.entries as Array<{
    resourceType: string;
    id: string;
    en: string;
    zh: string;
    vi: string;
    pt: string;
    tl: string;
  }>).find((e) => e.resourceType === "article" && e.id === slug);
  const prebuiltTitles: Partial<Record<LanguageCode, string>> = titleEntry
    ? {
        en: titleEntry.en,
        zh: titleEntry.zh,
        vi: titleEntry.vi,
        pt: titleEntry.pt,
        tl: titleEntry.tl,
      }
    : {};

  const sourceText = [
    article.title,
    article.description,
    ...article.sections.map((s) => `${s.heading}\n${s.body}`),
  ].join("\n\n");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.description,
            url,
            datePublished: article.publishedAt,
            dateModified: article.lastReviewedAt,
            author: {
              "@type": "Person",
              name: article.author.name,
              url: article.author.url,
            },
            publisher: {
              "@type": "Organization",
              name: "ANZEN AI",
              url: SITE_BASE,
            },
            mainEntityOfPage: url,
            inLanguage: "ja",
          },
          breadcrumbSchema([
            { name: "ホーム", url: SITE_BASE },
            { name: "解説記事", url: `${SITE_BASE}/articles` },
            { name: article.title, url },
          ]),
        ]}
      />

      <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
        <Link
          href="/articles"
          className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          記事一覧
        </Link>
      </nav>

      <header className="mb-5">
        <h1 className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
          {article.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{article.publishedAt} 公開</span>
          <span>・最終確認 {article.lastReviewedAt}</span>
          <span>
            ・著者:{" "}
            <Link href={article.author.url} className="text-emerald-700 hover:underline">
              {article.author.name}
            </Link>
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-700">{article.description}</p>
      </header>

      <article className="space-y-5">
        {article.sections.map((s) => (
          <section
            key={s.heading}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-900">{s.heading}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">{s.body}</p>
          </section>
        ))}

        <LanguageButton
          sourceText={sourceText}
          resource="article"
          resourceId={slug}
          prebuiltTitles={prebuiltTitles}
        />

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-bold text-slate-900">出典・参考</h2>
          <ul className="mt-2 space-y-1 text-xs">
            {article.sources.map((src) => (
              <li key={src.url}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                >
                  {src.label} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm font-bold text-emerald-800">{article.ctaSlot.title}</p>
          <p className="mt-1 text-xs text-slate-700">{article.ctaSlot.description}</p>
          <Link
            href={article.ctaSlot.href}
            className="mt-3 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            {article.ctaSlot.label}
          </Link>
        </section>
      </article>
    </main>
  );
}
