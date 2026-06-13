import { SITE_NAME, SITE_URL } from "@/lib/seo-metadata";

type Schema = Record<string, unknown>;

/** ロゴ画像（180x180）への絶対URL。複数スキーマの logo/ImageObject で共有。 */
const LOGO_URL = `${SITE_URL}/apple-touch-icon.png`;

export function JsonLd({ schema }: { schema: Schema | Schema[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function organizationSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: 180,
      height: 180,
    },
    description:
      "労働安全衛生の現場運用を支援するポータルサービス。法改正情報・事故データベース・KY用紙・Eラーニング・AIチャットボットを提供。",
    knowsAbout: [
      "労働安全衛生",
      "建設業安全管理",
      "製造業安全管理",
      "リスクアセスメント",
      "化学物質管理",
      "AIシステム開発",
    ],
    sameAs: [SITE_URL],
  };
}

export function webSiteSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "労働安全衛生の現場運用ポータル。法改正・リスク管理・KY用紙・Eラーニングをまとめて確認。",
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}/about`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

const PUBLISHER_REF = {
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: LOGO_URL,
  },
} as const;

const DEFAULT_OG_IMAGE = `${SITE_URL}/api/og`;

export function articleListSchema(
  items: { headline: string; datePublished: string; url: string; description?: string; image?: string }[]
): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.slice(0, 10).map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Article",
        headline: item.headline,
        datePublished: item.datePublished,
        url: item.url,
        image: item.image ?? DEFAULT_OG_IMAGE,
        ...(item.description ? { description: item.description } : {}),
        author: PUBLISHER_REF,
        publisher: PUBLISHER_REF,
      },
    })),
  };
}

/**
 * Single NewsArticle schema for individual article pages.
 * Google Discover prefers NewsArticle over Article when content is
 * timely/news-style; safety-law commentary and accident analysis fit
 * that mold. Wider 16:9 image (>=1200px) and inLanguage tagging are
 * required for Top Stories eligibility.
 */
export function newsArticleSchema(input: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
  authorUrl?: string;
  image?: string;
  inLanguage?: string;
  keywords?: string[];
  articleSection?: string;
}): Schema {
  const {
    headline,
    description,
    url,
    datePublished,
    dateModified,
    authorName,
    authorUrl,
    image,
    inLanguage = "ja",
    keywords,
    articleSection,
  } = input;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    description,
    url,
    datePublished,
    dateModified,
    inLanguage,
    ...(image ? { image: [image] } : {}),
    ...(keywords && keywords.length ? { keywords: keywords.join(", ") } : {}),
    ...(articleSection ? { articleSection } : {}),
    author: {
      "@type": "Person",
      name: authorName,
      ...(authorUrl ? { url: authorUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
        width: 180,
        height: 180,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}

export function newsArticleListSchema(
  items: { headline: string; datePublished: string; url: string; description?: string; image?: string }[]
): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.slice(0, 10).map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "NewsArticle",
        headline: item.headline,
        datePublished: item.datePublished,
        url: item.url,
        image: item.image ?? DEFAULT_OG_IMAGE,
        ...(item.description ? { description: item.description } : {}),
        author: PUBLISHER_REF,
        publisher: PUBLISHER_REF,
      },
    })),
  };
}

export function serviceSchema(input: {
  name: string;
  description: string;
  url: string;
  serviceType: string;
  priceFrom?: number;
  priceCurrency?: string;
}): Schema {
  const { name, description, url, serviceType, priceFrom, priceCurrency = "JPY" } = input;
  const provider = {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };
  const offers = priceFrom
    ? {
        offers: {
          "@type": "Offer",
          price: priceFrom,
          priceCurrency,
          priceSpecification: {
            "@type": "PriceSpecification",
            price: priceFrom,
            priceCurrency,
            valueAddedTaxIncluded: false,
          },
          availability: "https://schema.org/InStock",
        },
      }
    : {};
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url,
    serviceType,
    provider,
    areaServed: { "@type": "Country", name: "Japan" },
    ...offers,
  };
}

export function howToSchema(input: {
  name: string;
  description: string;
  url?: string;
  totalTime?: string;
  steps: { name: string; text: string; url?: string }[];
}): Schema {
  const { name, description, url, totalTime, steps } = input;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    ...(url ? { url } : {}),
    ...(totalTime ? { totalTime } : {}),
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : {}),
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function legalDocumentSchema(input: {
  url: string;
  title: string;
  noticeNumber: string | null;
  issuer: string | null;
  issuedDate: string | null;
  description: string;
  legislationApplies?: string;
}): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "LegalDocument",
    name: input.title,
    headline: input.title,
    url: input.url,
    description: input.description,
    ...(input.noticeNumber ? { identifier: input.noticeNumber } : {}),
    ...(input.issuedDate ? { datePublished: input.issuedDate } : {}),
    ...(input.issuer
      ? {
          author: {
            "@type": "Organization",
            name: input.issuer,
          },
          publisher: {
            "@type": "Organization",
            name: input.issuer,
          },
        }
      : {}),
    ...(input.legislationApplies
      ? { legislationApplies: input.legislationApplies }
      : {}),
    inLanguage: "ja",
  };
}

/**
 * 汎用 WebPage スキーマ。トップレベルページ（/services, /pricing 等）に使う。
 * BreadcrumbList と組み合わせて配列で渡す想定。
 */
export function webPageSchema(input: {
  name: string;
  description: string;
  url: string;
  inLanguage?: string;
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
}): Schema {
  const { name, description, url, inLanguage = "ja", datePublished, dateModified, keywords } = input;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
    inLanguage,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(keywords && keywords.length ? { keywords: keywords.join(", ") } : {}),
  };
}

/**
 * FAQPage スキーマ。/qa-knowledge のような Q&A ページで使う。
 */
export function faqPageSchema(
  qa: { question: string; answer: string }[]
): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.slice(0, 20).map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.answer,
      },
    })),
  };
}

/**
 * 商品コレクション ItemList スキーマ。/goods, /equipment-finder で使う。
 */
export function productCollectionSchema(input: {
  name: string;
  url: string;
  products: { name: string; url: string; description?: string; brand?: string; image?: string }[];
}): Schema {
  const { name, url, products } = input;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    itemListElement: products.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        url: p.url,
        ...(p.image ? { image: p.image } : {}),
        ...(p.description ? { description: p.description } : {}),
        ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
      },
    })),
  };
}

export function courseListSchema(
  courses: { name: string; description: string }[]
): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: courses.slice(0, 10).map((course, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: course.name,
        description: course.description,
        provider: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
        },
      },
    })),
  };
}

export function datasetSchema(input: {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
  temporalCoverage?: string;
  license?: string;
  variableMeasured?: string[];
  isBasedOn?: { name: string; url: string }[];
}): Schema {
  const { name, description, url, keywords, temporalCoverage, license, variableMeasured, isBasedOn } = input;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url,
    creator: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: "ja",
    ...(license ? { license } : {}),
    ...(keywords ? { keywords } : {}),
    ...(temporalCoverage ? { temporalCoverage } : {}),
    ...(variableMeasured ? { variableMeasured } : {}),
    ...(isBasedOn
      ? {
          isBasedOn: isBasedOn.map((d) => ({
            "@type": "Dataset",
            name: d.name,
            url: d.url,
          })),
        }
      : {}),
  };
}

export function qaPageSchema(input: {
  name: string;
  description: string;
  url: string;
}): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: "ja",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function definedTermSetSchema(input: {
  name: string;
  url: string;
  description?: string;
  terms: { name: string; description: string }[];
}): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: input.name,
    url: input.url,
    inLanguage: "ja",
    ...(input.description ? { description: input.description } : {}),
    hasDefinedTerm: input.terms.slice(0, 50).map((t) => ({
      "@type": "DefinedTerm",
      name: t.name,
      description: t.description,
      inDefinedTermSet: input.url,
    })),
  };
}

export function quizSchema(input: {
  name: string;
  description: string;
  url: string;
  about?: string;
  questions: {
    text: string;
    choices: string[];
    correct: number;
    explanation?: string;
  }[];
}): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: "ja",
    ...(input.about ? { about: { "@type": "Thing", name: input.about } } : {}),
    educationalUse: "practice",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    hasPart: input.questions.slice(0, 10).map((q) => ({
      "@type": "Question",
      name: q.text,
      suggestedAnswer: q.choices.map((c) => ({
        "@type": "Answer",
        text: c,
      })),
      acceptedAnswer: {
        "@type": "Answer",
        text: q.choices[q.correct],
        ...(q.explanation ? { comment: { "@type": "Comment", text: q.explanation } } : {}),
      },
    })),
  };
}

export function dataCatalogSchema(input: {
  name: string;
  description: string;
  url: string;
  datasets: { name: string; url: string; description?: string }[];
}): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "DataCatalog",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: "ja",
    creator: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    dataset: input.datasets.map((d) => ({
      "@type": "Dataset",
      name: d.name,
      url: d.url,
      ...(d.description ? { description: d.description } : {}),
    })),
  };
}

/**
 * WebApplication schema for a tool/feature page. Used by the 3 Copilot
 * flagship features to:
 *  - declare they are a free, web-based application
 *  - link to each other via `mentions` so search engines see the journey
 *  - expose a SearchAction (chatbot prefill) where applicable
 */
export function webApplicationSchema(input: {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  /** Cross-feature mentions — peer Copilot features */
  mentions?: { name: string; url: string }[];
  /** Optional SearchAction url template (e.g. /chatbot?q={search_term_string}) */
  searchUrlTemplate?: string;
  featureList?: string[];
}): Schema {
  const schema: Schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: "ja",
    applicationCategory: input.applicationCategory ?? "BusinessApplication",
    operatingSystem: "Any (Web Browser)",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
    },
    provider: PUBLISHER_REF,
  };
  if (input.mentions && input.mentions.length > 0) {
    schema.mentions = input.mentions.map((m) => ({
      "@type": "WebApplication",
      name: m.name,
      url: m.url,
    }));
  }
  if (input.searchUrlTemplate) {
    schema.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: input.searchUrlTemplate,
      },
      "query-input": "required name=search_term_string",
    };
  }
  if (input.featureList && input.featureList.length > 0) {
    schema.featureList = input.featureList;
  }
  return schema;
}

/**
 * Single canonical reference object that links the 3 flagship features.
 * Used by webApplicationSchema callers to populate `mentions`.
 */
export const COPILOT_FEATURE_PEERS = {
  chatbot: { name: "安衛法AIチャットボット", url: `${SITE_URL}/chatbot` },
  accidentsReports: {
    name: "業種別 労働災害分析レポート",
    url: `${SITE_URL}/accidents-reports`,
  },
  planGenerator: {
    name: "年次安全衛生計画ジェネレーター",
    url: `${SITE_URL}/strategy/plan-generator`,
  },
} as const;

