import type { MetadataRoute } from "next";
import { PAID_MODE } from "@/lib/paid-mode";
import { mhlwNotices } from "@/data/mhlw-notices";
import { getPublishedArticleIndex } from "@/lib/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://safe-ai-site.vercel.app";

  type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  const pages: { url: string; lastModified: string; priority: number; changeFrequency: Freq }[] = [
    { url: "/", lastModified: "2026-04-19", priority: 1.0, changeFrequency: "daily" },
    { url: "/stats", lastModified: "2026-04-28", priority: 0.6, changeFrequency: "weekly" },
    { url: "/leaflet", lastModified: "2026-04-28", priority: 0.5, changeFrequency: "monthly" },
    { url: "/circulars", lastModified: "2026-04-28", priority: 0.8, changeFrequency: "weekly" },
    { url: "/equipment-finder", lastModified: "2026-04-28", priority: 0.7, changeFrequency: "monthly" },
    { url: "/articles", lastModified: "2026-04-28", priority: 0.8, changeFrequency: "daily" },
    { url: "/accidents", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/e-learning", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/exam-quiz", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/laws", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/laws/notices-precedents", lastModified: "2026-04-19", priority: 0.8, changeFrequency: "monthly" },
    { url: "/ky", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/risk", lastModified: "2026-04-19", priority: 0.8, changeFrequency: "daily" },
    { url: "/chatbot", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/law-search", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/chemical-ra", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/chemical-database", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/risk-prediction", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/pricing", lastModified: "2026-03-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/services", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "monthly" },
    { url: "/education", lastModified: "2026-04-25", priority: 0.9, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/kensaku-toishi", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/teiatsu-denki", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/ashiba", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/fullharness", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/tamakake", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/sankesu", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/hoteikyoiku/shokucho", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/hoteikyoiku/chemical-ra", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/roudoueisei/youtsu-yobou", lastModified: "2026-04-24", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/roudoueisei/necchu", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/roudoueisei/shindou", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/roudoueisei/souon", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/consulting", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "monthly" },
    { url: "/subsidies", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/diversity", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/diversity/disability", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/sogi", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/foreign-workers", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/laws/bcp", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/laws/freelance-rosai", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/laws/gig-work", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/mental-health", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/glossary", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/pdf", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/safety-diary", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/bear-map", lastModified: "2026-04-19", priority: 0.6, changeFrequency: "daily" },
    { url: "/notifications", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/goods", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/about", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "yearly" },
    { url: "/contact", lastModified: "2026-04-22", priority: 0.5, changeFrequency: "yearly" },
    { url: "/privacy", lastModified: "2025-10-01", priority: 0.3, changeFrequency: "yearly" },
    { url: "/terms", lastModified: "2025-10-01", priority: 0.3, changeFrequency: "yearly" },
  ];

  // PAID_MODE が無効な研究プロジェクト期間は、課金関連ページをサイトマップから除外
  const PAID_ONLY = new Set(["/pricing", "/services", "/consulting"]);
  const filtered = PAID_MODE ? pages : pages.filter((p) => !PAID_ONLY.has(p.url));

  const circularPages: typeof pages = mhlwNotices.map((n) => ({
    url: `/circulars/${n.id}`,
    lastModified: n.issuedDate ?? "2026-04-28",
    priority: 0.5,
    changeFrequency: "yearly",
  }));

  // 時限公開: publishedAt > now() の記事は sitemap に含めない
  const articlePages: typeof pages = getPublishedArticleIndex().map((a) => ({
    url: `/articles/${a.slug}`,
    lastModified: a.lastReviewedAt,
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  return [...filtered, ...circularPages, ...articlePages].map(
    ({ url, lastModified, priority, changeFrequency }) => ({
      url: `${base}${url}`,
      lastModified,
      changeFrequency,
      priority,
    })
  );
}
