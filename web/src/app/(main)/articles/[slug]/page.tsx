import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { LanguageButton } from "@/components/language-button";
import { RelatedContent, type RelatedContentGroup } from "@/components/RelatedContent";
import {
  getPublishedArticleBySlug,
  getPublishedArticleSlugs,
} from "@/lib/articles";
import { mhlwNotices } from "@/data/mhlw-notices";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { getAllEquipment } from "@/lib/equipment-recommendation";
import type { LanguageCode } from "@/lib/translation-cache";
import multilingualTitles from "@/data/translations/multilingual-titles.json";
import { ogImageUrl } from "@/lib/og-url";

function tokenizeJa(text: string): string[] {
  return (text.match(/[一-龥ぁ-んァ-ヶa-zA-Z0-9]{2,}/g) ?? []).filter((t) => t.length >= 2);
}

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

  // 関連コンテンツ: 記事本文・タグ・キーワードから内部リンク候補を抽出
  const articleTokens = new Set<string>([
    ...tokenizeJa(article.title),
    ...tokenizeJa(article.description),
    ...(article.tags ?? []).flatMap(tokenizeJa),
    ...(article.keywords ?? []).flatMap(tokenizeJa),
  ]);
  const matchScore = (haystack: string) => {
    let s = 0;
    articleTokens.forEach((t) => {
      if (haystack.includes(t)) s += 1;
    });
    return s;
  };
  const relatedNotices = mhlwNotices
    .map((n) => ({ n, s: matchScore(`${n.title} ${n.category} ${n.lawRef ?? ""}`) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6);
  const relatedAccidents = getAccidentCasesDataset()
    .map((c) => ({
      c,
      s: matchScore(`${c.title} ${c.summary} ${c.workCategory} ${c.type}`),
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6);
  const relatedEquipment = getAllEquipment()
    .map((it) => ({
      it,
      s: matchScore(`${it.name} ${it.spec} ${it.recommendReason ?? ""}`),
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6);

  const relatedGroups: RelatedContentGroup[] = [
    {
      heading: "📜 関連する厚労省 通達・告示",
      accent: "sky",
      moreHref: "/circulars",
      moreLabel: "通達一覧",
      items: relatedNotices.map(({ n }) => ({
        href: `/circulars/${n.id}`,
        category: `${n.docType}・${n.category}`,
        title: n.title,
        description: `${n.noticeNumber ?? ""} ${n.issuer ?? ""} ${n.issuedDateRaw ?? ""}`.trim(),
        kind: "notice" as const,
        badge:
          n.bindingLevel === "binding"
            ? "拘束力あり"
            : n.bindingLevel === "indirect"
              ? "間接的拘束"
              : "参考",
      })),
    },
    {
      heading: "⚠️ 関連する事故事例",
      accent: "amber",
      moreHref: "/accidents",
      moreLabel: "事故DB",
      items: relatedAccidents.map(({ c }) => ({
        href: `/accidents`,
        category: c.workCategory,
        title: c.title,
        description: c.summary,
        kind: "accident" as const,
        badge: c.severity,
      })),
    },
    {
      heading: "🛡 推奨保護具",
      accent: "emerald",
      moreHref: "/equipment-finder",
      moreLabel: "保護具AI",
      items: relatedEquipment.map(({ it }) => ({
        href: `/equipment/${it.id}`,
        category: `${it.categoryIcon} ${it.categoryName}`,
        title: it.name,
        description: it.recommendReason ?? it.spec,
        kind: "equipment" as const,
        badge: it.priceLabel,
      })),
    },
  ];

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

      <RelatedContent
        title="関連コンテンツ — 通達・事故・保護具で深掘り"
        groups={relatedGroups}
      />
    </main>
  );
}
