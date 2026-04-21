import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://safe-ai-site.vercel.app";

  type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  const pages: { url: string; lastModified: string; priority: number; changeFrequency: Freq }[] = [
    { url: "/", lastModified: "2026-04-19", priority: 1.0, changeFrequency: "daily" },
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
    { url: "/education", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "monthly" },
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
    { url: "/signage", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "daily" },
    { url: "/about", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "yearly" },
    { url: "/contact", lastModified: "2026-04-22", priority: 0.5, changeFrequency: "yearly" },
    { url: "/privacy", lastModified: "2025-10-01", priority: 0.3, changeFrequency: "yearly" },
    { url: "/terms", lastModified: "2025-10-01", priority: 0.3, changeFrequency: "yearly" },
  ];

  return pages.map(({ url, lastModified, priority, changeFrequency }) => ({
    url: `${base}${url}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
