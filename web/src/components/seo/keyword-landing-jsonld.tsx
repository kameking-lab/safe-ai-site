import { JsonLd, breadcrumbSchema, faqPageSchema, howToSchema } from "@/components/json-ld";
import { SITE_URL } from "@/lib/seo-metadata";
import type { KeywordLanding } from "@/data/seo/keyword-landing";

/**
 * JSON-LD bundle for /guides/<slug>.
 *
 * Stacks five schema types Google supports for information+how-to hybrids:
 *   - Article (with author + publisher + datePublished/dateModified + mentions)
 *   - LearningResource (educationalUse: research)
 *   - HowTo (step-by-step usage instructions)
 *   - FAQPage (long-tail Q&A)
 *   - BreadcrumbList
 *
 * Pages can opt out by passing { skipFaq } etc. if they have a custom FAQ.
 */
export function KeywordLandingJsonLd({ data }: { data: KeywordLanding }) {
  const url = `${SITE_URL}/guides/${data.slug}`;

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: data.description,
    url,
    datePublished: data.datePublished,
    dateModified: data.dateModified,
    inLanguage: "ja",
    keywords: data.keywords.join(", "),
    author: {
      "@type": "Person",
      name: "労働安全衛生コンサルタント（登録番号260022）",
      url: `${SITE_URL}/about`,
      hasOccupation: {
        "@type": "Occupation",
        name: "労働安全衛生コンサルタント",
        occupationLocation: {
          "@type": "Country",
          name: "Japan",
        },
        qualifications: "労働安全衛生コンサルタント（登録番号260022）／1級土木施工管理技士／監理技術者",
      },
      knowsAbout: [
        "労働安全衛生法",
        "労働安全衛生規則",
        "化学物質リスクアセスメント",
        "リスクアセスメント",
        "KY活動",
        "安全衛生計画",
        "建設業安全管理",
        "製造業安全管理",
      ],
      affiliation: {
        "@type": "Organization",
        name: "安全AIポータル（個人運営研究プロジェクト）",
        url: SITE_URL,
      },
    },
    publisher: {
      "@type": "Organization",
      name: "安全AIポータル",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/apple-touch-icon.png`,
        width: 180,
        height: 180,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    citation: data.sources.map((s) => ({
      "@type": "CreativeWork",
      name: s.label,
      url: s.url,
    })),
    mentions: data.related.map((r) => ({
      "@type": "WebPage",
      name: r.label,
      url: `${SITE_URL}${r.href}`,
    })),
  };

  const learningResource = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: data.h1,
    description: data.description,
    url,
    inLanguage: "ja",
    learningResourceType: "Guide",
    educationalUse: "research",
    teaches: data.primaryKeyword,
    author: article.author,
    publisher: article.publisher,
    datePublished: data.datePublished,
    dateModified: data.dateModified,
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "occupational safety practitioner",
    },
    isAccessibleForFree: true,
    competencyRequired: "労働安全衛生法の基本知識",
  };

  const howTo = howToSchema({
    name: `${data.primaryKeyword}の使い方`,
    description: `${data.h1}の最小ステップ`,
    url,
    steps: data.steps.map((s) => ({
      name: s.name,
      text: s.text,
      ...(s.url ? { url: `${SITE_URL}${s.url}` } : {}),
    })),
  });

  const faq = faqPageSchema(
    data.longTail.map((qa) => ({ question: qa.query, answer: qa.answer })),
  );

  const crumbs = breadcrumbSchema([
    { name: "ホーム", url: SITE_URL },
    { name: "ガイド", url: `${SITE_URL}/guides` },
    { name: data.primaryKeyword, url },
  ]);

  return <JsonLd schema={[article, learningResource, howTo, faq, crumbs]} />;
}
