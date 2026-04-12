import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://safe-ai-site.vercel.app";
  const now = new Date();

  const pages = [
    { url: "/", priority: 1.0, changeFrequency: "daily" as const },
    { url: "/accidents", priority: 0.9, changeFrequency: "weekly" as const },
    { url: "/e-learning", priority: 0.9, changeFrequency: "weekly" as const },
    { url: "/exam-quiz", priority: 0.9, changeFrequency: "weekly" as const },
    { url: "/laws", priority: 0.9, changeFrequency: "weekly" as const },
    { url: "/ky", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/risk", priority: 0.8, changeFrequency: "daily" as const },
    { url: "/chatbot", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/law-search", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/chemical-ra", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/risk-prediction", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/pricing", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/safety-diary", priority: 0.6, changeFrequency: "monthly" as const },
    { url: "/bear-map", priority: 0.6, changeFrequency: "daily" as const },
    { url: "/notifications", priority: 0.6, changeFrequency: "monthly" as const },
    { url: "/goods", priority: 0.6, changeFrequency: "monthly" as const },
    { url: "/contact", priority: 0.5, changeFrequency: "yearly" as const },
    { url: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { url: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return pages.map(({ url, priority, changeFrequency }) => ({
    url: `${base}${url}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
