import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Pre-launch features and internal pages: also covered by per-page noindex.
      // /audits/ intentionally NOT disallowed — AI crawlers must be able to fetch audit pages.
      // Per-page metadata.robots noindex still prevents search engine indexing.
      disallow: ["/admin/", "/api/", "/auth/", "/dev/", "/handover", "/lms", "/api-docs", "/dpa"],
    },
    sitemap: "https://www.anzen-ai-portal.jp/sitemap-index.xml",
  };
}
