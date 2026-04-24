import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 画面表示専用（サイネージ）と API ルートは検索エンジンから除外
      disallow: ["/api/", "/signage"],
    },
    sitemap: "https://safe-ai-site.vercel.app/sitemap.xml",
  };
}
