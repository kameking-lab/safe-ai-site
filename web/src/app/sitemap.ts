import type { MetadataRoute } from "next";
import { PAID_MODE } from "@/lib/paid-mode";
import { mhlwNotices } from "@/data/mhlw-notices";
import { getPublishedArticleIndex } from "@/lib/articles";
import { getAllEquipment } from "@/lib/equipment-recommendation";
import { FEATURE_CATEGORIES } from "@/data/features-catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.anzen-ai-portal.jp";

  type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  const pages: { url: string; lastModified: string; priority: number; changeFrequency: Freq }[] = [
    { url: "/", lastModified: "2026-04-19", priority: 1.0, changeFrequency: "daily" },
    { url: "/stats", lastModified: "2026-04-28", priority: 0.6, changeFrequency: "weekly" },
    { url: "/leaflet", lastModified: "2026-04-28", priority: 0.5, changeFrequency: "monthly" },
    { url: "/circulars", lastModified: "2026-04-28", priority: 0.8, changeFrequency: "weekly" },
    { url: "/equipment-finder", lastModified: "2026-04-28", priority: 0.7, changeFrequency: "monthly" },
    { url: "/articles", lastModified: "2026-04-28", priority: 0.8, changeFrequency: "daily" },
    { url: "/accidents", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/accidents-analytics", lastModified: "2026-05-14", priority: 0.8, changeFrequency: "weekly" },
    { url: "/accidents-reports", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "weekly" },
    { url: "/accidents-reports/construction", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    { url: "/accidents-reports/manufacturing", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    { url: "/accidents-reports/transport", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    { url: "/accidents-reports/healthcare", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    { url: "/accidents-reports/service", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    { url: "/e-learning", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/exam-quiz", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/laws", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/law-hierarchy", lastModified: "2026-05-14", priority: 0.8, changeFrequency: "monthly" },
    { url: "/laws/notices-precedents", lastModified: "2026-04-19", priority: 0.8, changeFrequency: "monthly" },
    { url: "/ky", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/risk", lastModified: "2026-04-19", priority: 0.8, changeFrequency: "daily" },
    { url: "/chatbot", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/law-search", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/chemical-ra", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/chemical-database", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/risk-prediction", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/pricing", lastModified: "2026-03-01", priority: 0.7, changeFrequency: "monthly" },
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
    { url: "/subsidies", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/diversity", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/diversity/disability", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/sogi", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/foreign-workers", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/diversity/elderly", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/lgbtq", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/non-regular", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/remote", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/women", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/laws/bcp", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/laws/freelance-rosai", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/laws/gig-work", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/mental-health", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/glossary", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/pdf", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/safety-diary", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/notifications", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/goods", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/signage", lastModified: "2026-05-06", priority: 0.5, changeFrequency: "weekly" },
    { url: "/features", lastModified: "2026-05-15", priority: 0.8, changeFrequency: "monthly" },
    { url: "/features/comparison", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/features/quick-tour", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/features/use-cases", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/bcp", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/qa-knowledge", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "weekly" },
    { url: "/resources", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/insurance", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/api-docs", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/lms", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/ky/morning", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/security", lastModified: "2026-05-15", priority: 0.3, changeFrequency: "yearly" },
    { url: "/dpa", lastModified: "2026-05-15", priority: 0.3, changeFrequency: "yearly" },
    { url: "/about", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "yearly" },
    { url: "/contact", lastModified: "2026-04-22", priority: 0.5, changeFrequency: "yearly" },
    { url: "/privacy", lastModified: "2025-10-01", priority: 0.3, changeFrequency: "yearly" },
    { url: "/terms", lastModified: "2025-10-01", priority: 0.3, changeFrequency: "yearly" },
  ];

  // PAID_MODE が無効な研究プロジェクト期間は、課金関連ページをサイトマップから除外
  const PAID_ONLY = new Set(["/pricing"]);
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

  // 保護具DBの個別ページ（月次更新前提）
  const equipmentPages: typeof pages = getAllEquipment().map((it) => ({
    url: `/equipment/${it.id}`,
    lastModified: "2026-04-29",
    priority: 0.4,
    changeFrequency: "monthly",
  }));

  const featureCategoryPages: typeof pages = FEATURE_CATEGORIES.map((c) => ({
    url: `/features/${c.id}`,
    lastModified: "2026-05-15",
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  return [...filtered, ...circularPages, ...articlePages, ...equipmentPages, ...featureCategoryPages].map(
    ({ url, lastModified, priority, changeFrequency }) => {
      const absolute = `${base}${url}`;
      return {
        url: absolute,
        lastModified,
        changeFrequency,
        priority,
        // Client-side i18n switches the language on the same URL, so the ja
        // and en alternates both point at the canonical URL. Emitting them
        // makes the language coverage explicit to Google.
        alternates: {
          languages: {
            ja: absolute,
            en: absolute,
            "x-default": absolute,
          },
        },
      };
    }
  );
}
