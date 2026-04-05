import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/signage"],
    },
    sitemap: "https://safe-ai-site.vercel.app/sitemap.xml",
  };
}
