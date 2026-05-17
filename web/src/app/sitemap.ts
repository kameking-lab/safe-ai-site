import type { MetadataRoute } from "next";
import { PAID_MODE } from "@/lib/paid-mode";
import { mhlwNotices } from "@/data/mhlw-notices";
import { getPublishedArticleIndex } from "@/lib/articles";
import { getAllEquipment } from "@/lib/equipment-recommendation";
import { FEATURE_CATEGORIES } from "@/data/features-catalog";
import { SAFETY_SIGNS, SIGN_CATEGORIES } from "@/data/safety-signs";
import { INDUSTRIES } from "@/data/safety-signs/industry-usage";
import { ILLNESS_CATEGORIES } from "@/data/illness-considerations";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.anzen-ai-portal.jp";

  type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  const pages: { url: string; lastModified: string; priority: number; changeFrequency: Freq }[] = [
    { url: "/", lastModified: "2026-04-19", priority: 1.0, changeFrequency: "daily" },
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
    { url: "/accidents-reports/compare", lastModified: "2026-05-17", priority: 0.75, changeFrequency: "weekly" },
    { url: "/accidents-reports/compare?industries=construction,manufacturing", lastModified: "2026-05-17", priority: 0.7, changeFrequency: "weekly" },
    { url: "/accidents-reports/compare?industries=construction,manufacturing,transport", lastModified: "2026-05-17", priority: 0.65, changeFrequency: "weekly" },
    { url: "/accidents-reports/compare?industries=healthcare,service", lastModified: "2026-05-17", priority: 0.65, changeFrequency: "weekly" },
    { url: "/accidents-reports/compare?industries=construction,healthcare,manufacturing,service,transport", lastModified: "2026-05-17", priority: 0.65, changeFrequency: "weekly" },
    { url: "/industries", lastModified: "2026-05-17", priority: 0.85, changeFrequency: "monthly" },
    { url: "/industries/construction", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/manufacturing", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/transport", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/healthcare", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/service", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/retail", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/food", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/wholesale", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/warehouse", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/office", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/e-learning", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/exam-quiz", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/laws", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/law-hierarchy", lastModified: "2026-05-14", priority: 0.8, changeFrequency: "monthly" },
    { url: "/laws/notices-precedents", lastModified: "2026-04-19", priority: 0.8, changeFrequency: "monthly" },
    { url: "/ky", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/ky-examples", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/risk", lastModified: "2026-04-19", priority: 0.8, changeFrequency: "daily" },
    { url: "/chatbot", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/law-search", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/chemical-ra", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/chemical-database", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/risk-prediction", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/pricing", lastModified: "2026-03-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/strategy/plan-generator", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/health-checkup-scheduler", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention/wbgt-calculator", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention/industry-risk", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention/r7-compliance", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/asbestos-management", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/asbestos-management/investigation-checker", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/asbestos-management/notification-builder", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/asbestos-management/work-plan-template", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/asbestos-management/qualifications", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/foreign-workers/safety-training", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/technical-intern-1", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/technical-intern-2", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/technical-intern-3", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/specified-skilled-1", lastModified: "2026-05-16", priority: 0.75, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/specified-skilled-2", lastModified: "2026-05-16", priority: 0.75, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/engineer-humanities-intl", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/skilled-labor", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/permanent-resident", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/long-term-resident", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/spouse-of-japanese", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/designated-activities-employment", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/education-certification", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/education-certification/finder", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
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
    { url: "/treatment-work-balance", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/treatment-work-balance/plan-builder", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/mental-health", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/mental-health-management", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/mental-health-management/stress-check", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/mental-health-management/small-business", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/mental-health-management/interview-guidance", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/glossary", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/faq", lastModified: "2026-05-16", priority: 0.9, changeFrequency: "monthly" },
    { url: "/faq/law-system", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/faq/management", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/faq/chemical", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/faq/health-education", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/faq/search", lastModified: "2026-05-16", priority: 0.6, changeFrequency: "monthly" },
    { url: "/pdf", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/safety-diary", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/notifications", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/goods", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/work-environment-measurement", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/work-environment-measurement/target-finder", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/work-environment-measurement/management-class-judge", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/signage", lastModified: "2026-05-06", priority: 0.5, changeFrequency: "weekly" },
    { url: "/features", lastModified: "2026-05-15", priority: 0.8, changeFrequency: "monthly" },
    { url: "/features/comparison", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/features/quick-tour", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/features/use-cases", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/bcp", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    // /qa-knowledge: reduced to thin landing (募集中), excluded from sitemap (F-007 B縮小)
    { url: "/resources", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/insurance", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    // /api-docs and /lms removed: pre-launch features (no real API yet, LMS β waitlist only).
    // Audit reference: harsh-third-party-2026-05-16 F-001/F-002.
    { url: "/ky/morning", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/security", lastModified: "2026-05-15", priority: 0.3, changeFrequency: "yearly" },
    // /dpa removed: individual-operator phase, standard template after incorporation.
    // Audit reference: harsh-third-party-2026-05-16 G-002.
    { url: "/safety-signs", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/about", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "yearly" },
    { url: "/about/cases", lastModified: "2026-04-19", priority: 0.6, changeFrequency: "monthly" },
    { url: "/about/chatbot-eval", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "monthly" },
    { url: "/about/data-sources", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "monthly" },
    { url: "/about/news-feed", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "monthly" },
    { url: "/chemical-ra/product-search", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/laws/glossary", lastModified: "2026-04-19", priority: 0.7, changeFrequency: "monthly" },
    { url: "/newsletter", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "monthly" },
    { url: "/resources/mlit", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/subsidies/calculator", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/quick", lastModified: "2026-04-19", priority: 0.6, changeFrequency: "monthly" },
    { url: "/signage/map", lastModified: "2026-05-06", priority: 0.4, changeFrequency: "weekly" },
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

  const safetySignCategoryPages: typeof pages = SIGN_CATEGORIES.map((c) => ({
    url: `/safety-signs/category/${c.id}`,
    lastModified: "2026-05-16",
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  const safetySignIndustryPages: typeof pages = INDUSTRIES.map((i) => ({
    url: `/safety-signs/industry/${i.id}`,
    lastModified: "2026-05-16",
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  const safetySignDetailPages: typeof pages = SAFETY_SIGNS.map((s) => ({
    url: `/safety-signs/sign/${s.id}`,
    lastModified: "2026-05-16",
    priority: 0.5,
    changeFrequency: "monthly",
  }));

  const illnessGuidePages: typeof pages = ILLNESS_CATEGORIES.map((c) => ({
    url: `/treatment-work-balance/illness-guide/${c.id}`,
    lastModified: "2026-05-16",
    priority: 0.75,
    changeFrequency: "monthly",
  }));

  return [
    ...filtered,
    ...circularPages,
    ...articlePages,
    ...equipmentPages,
    ...featureCategoryPages,
    ...safetySignCategoryPages,
    ...safetySignIndustryPages,
    ...safetySignDetailPages,
    ...illnessGuidePages,
  ].map(
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
