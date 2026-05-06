import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/signage", "/strategy"],
    },
    sitemap: "https://anzen-ai-portal.jp/sitemap-index.xml",
  };
}
