import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Pre-launch features and internal pages: also covered by per-page noindex.
      // Audit reference: harsh-third-party-2026-05-16 F-001/F-002/F-003/G-002.
      disallow: ["/admin/", "/api/", "/auth/", "/dev/", "/audits/", "/handover", "/lms", "/api-docs", "/dpa"],
    },
    sitemap: "https://www.anzen-ai-portal.jp/sitemap-index.xml",
  };
}
