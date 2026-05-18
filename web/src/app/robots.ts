import type { MetadataRoute } from "next";

// AI crawlers blocked to prevent aggressive scraping that consumes Vercel bandwidth/function quota
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Claude-Web",
  "ClaudeBot",
  "anthropic-ai",
  "Bytespider",
  "Amazonbot",
  "PerplexityBot",
  "YouBot",
  "CCBot",
  "FacebookBot",
  "ImgProxy",
  "Diffbot",
  "omgili",
  "omgilibot",
  "facebookexternalhit",
];

export default function robots(): MetadataRoute.Robots {
  const aiRules: MetadataRoute.Robots["rules"] = AI_CRAWLERS.map((ua) => ({
    userAgent: ua,
    disallow: "/",
  }));

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Pre-launch features and internal pages: also covered by per-page noindex.
        // /audits/ intentionally NOT disallowed — AI crawlers must be able to fetch audit pages.
        // Per-page metadata.robots noindex still prevents search engine indexing.
        disallow: ["/admin/", "/api/", "/auth/", "/dev/", "/handover", "/lms", "/api-docs", "/dpa"],
      },
      ...aiRules,
    ],
    sitemap: "https://www.anzen-ai-portal.jp/sitemap-index.xml",
  };
}
