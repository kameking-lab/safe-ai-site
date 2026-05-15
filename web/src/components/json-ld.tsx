type Schema = Record<string, unknown>;

export function JsonLd({ schema }: { schema: Schema | Schema[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function personSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/about",
    knowsAbout: [
      "労働安全衛生",
      "建設業安全管理",
      "製造業安全管理",
      "リスクアセスメント",
      "AIシステム開発",
      "業務自動化",
    ],
  };
}

export function organizationSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp",
    logo: "https://www.anzen-ai-portal.jp/apple-touch-icon.png",
    description:
      "労働安全衛生の現場運用を支援するポータルサービス。法改正情報・事故データベース・KY用紙・Eラーニング・AIチャットボットを提供。",
    sameAs: ["https://www.anzen-ai-portal.jp"],
  };
}

export function webSiteSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp",
    description:
      "労働安全衛生の現場運用ポータル。法改正・リスク管理・KY用紙・Eラーニングをまとめて確認。",
    author: {
      "@type": "Organization",
      name: "安全AIポータル",
      url: "https://www.anzen-ai-portal.jp/about",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate:
          "https://www.anzen-ai-portal.jp/law-search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleListSchema(
  items: { headline: string; datePublished: string; url: string; description?: string }[]
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
        ...(item.description ? { description: item.description } : {}),
        publisher: {
          "@type": "Organization",
          name: "安全AIポータル",
          url: "https://www.anzen-ai-portal.jp",
        },
      },
    })),
  };
}

export function newsArticleListSchema(
  items: { headline: string; datePublished: string; url: string; description?: string }[]
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
        ...(item.description ? { description: item.description } : {}),
        publisher: {
          "@type": "Organization",
          name: "安全AIポータル",
          url: "https://www.anzen-ai-portal.jp",
        },
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
    name: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp",
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
}): Schema {
  const { name, description, url, inLanguage = "ja", datePublished, dateModified } = input;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
    inLanguage,
    isPartOf: {
      "@type": "WebSite",
      name: "安全AIポータル",
      url: "https://www.anzen-ai-portal.jp",
    },
    publisher: {
      "@type": "Organization",
      name: "安全AIポータル",
      url: "https://www.anzen-ai-portal.jp",
    },
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
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
  products: { name: string; url: string; description?: string; brand?: string }[];
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
          name: "安全AIポータル",
          url: "https://www.anzen-ai-portal.jp",
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
      name: "安全AIポータル",
      url: "https://www.anzen-ai-portal.jp",
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
      name: "安全AIポータル",
      url: "https://www.anzen-ai-portal.jp",
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
      name: "安全AIポータル",
      url: "https://www.anzen-ai-portal.jp",
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
      name: "安全AIポータル",
      url: "https://www.anzen-ai-portal.jp",
    },
    dataset: input.datasets.map((d) => ({
      "@type": "Dataset",
      name: d.name,
      url: d.url,
      ...(d.description ? { description: d.description } : {}),
    })),
  };
}
