type Schema = Record<string, unknown>;

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
    name: "ANZEN AI",
    url: "https://safe-ai-site.vercel.app",
    logo: "https://safe-ai-site.vercel.app/apple-touch-icon.png",
    description:
      "労働安全衛生の現場運用を支援するポータルサービス。法改正情報・事故データベース・KY用紙・Eラーニング・AIチャットボットを提供。",
    sameAs: ["https://safe-ai-site.vercel.app"],
  };
}

export function webSiteSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ANZEN AI",
    url: "https://safe-ai-site.vercel.app",
    description:
      "労働安全衛生の現場運用ポータル。法改正・リスク管理・KY用紙・Eラーニングをまとめて確認。",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate:
          "https://safe-ai-site.vercel.app/law-search?q={search_term_string}",
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
          name: "ANZEN AI",
          url: "https://safe-ai-site.vercel.app",
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
          name: "ANZEN AI",
          url: "https://safe-ai-site.vercel.app",
        },
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
          name: "ANZEN AI",
          url: "https://safe-ai-site.vercel.app",
        },
      },
    })),
  };
}
