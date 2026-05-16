/**
 * Industry landing page content model.
 *
 * Powers /industries (hub) and /industries/[industry] (5 specialised
 * entry points). Curated content complements the data-aggregation
 * pages at /accidents-reports/[industry] by surfacing recommended
 * features, key challenges and law highlights in one place tuned for
 * search-engine traffic landing on industry-specific queries.
 */

import type { IndustrySlug } from "@/lib/accident-analysis";

export type IndustryChallenge = {
  /** Short title shown on the card head */
  title: string;
  /** 1-2 sentence elaboration */
  body: string;
  /** Optional icon (emoji) for visual grouping */
  icon: string;
};

export type IndustryLawHighlight = {
  /** Statute / regulation display name */
  name: string;
  /** Most-cited articles / sub-sections (short list) */
  articles: string;
  /** Short note on why this matters to the industry */
  note: string;
  /** Where to drill into the full text (slash-prefixed path or full URL) */
  href: string;
};

export type IndustryRecommendation = {
  /** Title that names the feature */
  title: string;
  /** 1 sentence on why this feature fits this industry */
  reason: string;
  /** Slash-prefixed in-app path */
  href: string;
  /** Emoji prefix for the card */
  icon: string;
  /** Optional explicit CTA label */
  cta?: string;
};

export type IndustryWorkType = {
  /** Work type / category label */
  name: string;
  /** What the typical hazard profile looks like */
  hazard: string;
};

export type IndustryKeyword = {
  /** Visible chip text */
  label: string;
  /** Optional search target (defaults to law search) */
  href?: string;
};

/**
 * One industry's landing page content.
 *
 * Fields are kept short on purpose — long body copy belongs in
 * /accidents-reports/[industry] (data-driven) or /articles (long-form).
 * This page is a hub that routes the visitor to the right tool.
 */
export type IndustryContent = {
  slug: IndustrySlug;
  /** SEO title (full <title>) */
  seoTitle: string;
  /** SEO meta description (<= 160 chars) */
  seoDescription: string;
  /** 1-line headline shown in the hero */
  heroHeadline: string;
  /** 2-3 sentence lead paragraph for the hero */
  heroLead: string;
  /** Search-keyword chips (用語) shown above the fold */
  keywords: IndustryKeyword[];
  /** 4-6 top challenges expressed as cards */
  challenges: IndustryChallenge[];
  /** 5-8 priority laws / regulations with internal links */
  lawHighlights: IndustryLawHighlight[];
  /** 4-6 typical work types and their hazard profile */
  workTypes: IndustryWorkType[];
  /** Recommended features inside the portal (4-6) */
  recommendations: IndustryRecommendation[];
  /** Industry-specific FAQ shown as schema.org FAQPage */
  faq: { question: string; answer: string }[];
};
