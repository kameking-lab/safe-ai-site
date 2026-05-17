/**
 * Industry landing page content model.
 *
 * Powers /industries (hub) and /industries/[industry] (10 specialised
 * entry points). Curated content complements the data-aggregation
 * pages at /accidents-reports/[industry] by surfacing recommended
 * features, key challenges and law highlights in one place tuned for
 * search-engine traffic landing on industry-specific queries.
 *
 * The 10 slugs cover the full Japanese OSH industry taxonomy used by
 * /strategy/plan-generator. Five of those slugs (construction,
 * manufacturing, transport, healthcare, service) also align with the
 * 5-bucket accident-statistics model and surface an analytics block;
 * the other five (retail, food, wholesale, warehouse, office) skip
 * that block and rely on the curated content alone.
 */

import type { IndustrySlug } from "@/lib/industry-slugs";
import type { IndustryId } from "@/types/safety-plan";

/**
 * URL slug for an industry landing page. Matches the segment used in
 * /industries/[industry]. Decoupled from IndustrySlug so we can host
 * landing pages for industries that have no accident-statistics bucket.
 */
export type IndustryContentSlug =
  | "construction"
  | "manufacturing"
  | "transport"
  | "healthcare"
  | "service"
  | "retail"
  | "food"
  | "wholesale"
  | "warehouse"
  | "office";

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
 * One typical accident pattern for the industry. Body is one
 * sentence — the visitor follows the link for the full case.
 */
export type IndustryAccidentExample = {
  /** Pattern title (e.g. "高所からの墜落") */
  title: string;
  /** 1-2 sentence representative scenario */
  summary: string;
  /** Drill-down link (accident report, curated case, or filtered /accidents) */
  href: string;
};

/**
 * One MHLW circular relevant to the industry. References an entry in
 * /circulars by id so the link is verified by the build.
 */
export type IndustryCircular = {
  /** ID of the MhlwNotice entry */
  id: string;
  /** Display title (kept here so we don't load the full circulars dataset client-side) */
  title: string;
  /** Issuer (短縮表記) */
  issuer: string;
  /** Issued date (ISO yyyy-mm-dd) */
  date: string;
  /** 1 sentence on why this matters for this industry */
  relevance: string;
};

/** Recommended KY topic for this industry. */
export type IndustryKyTopic = {
  /** KY topic title */
  title: string;
  /** Scenario / work step description */
  scenario: string;
  /** Deep-link into /ky with prefilled industry */
  href: string;
};

/** Recommended chemical substance to manage (RA target). */
export type IndustryChemicalSubstance = {
  /** Substance name */
  name: string;
  /** CAS number if applicable */
  casNo?: string;
  /** Short hazard profile */
  hazard: string;
  /** Deep-link to /chemical-ra or /chemical-database */
  href: string;
};

/** Required or recommended training / licence. */
export type IndustryEducationCert = {
  /** Certificate / training name */
  name: string;
  /** Category label */
  type: "特別教育" | "技能講習" | "免許" | "職長教育" | "労働衛生教育";
  /** Target workers / work scope */
  target: string;
  /** Deep-link into /education-certification or /education */
  href: string;
};

/** Related FAQ category entry. */
export type IndustryFaqCategoryLink = {
  /** Display label */
  label: string;
  /** /faq/[category] slug */
  category: "law-system" | "management" | "chemical" | "health-education";
  /** Why this category fits this industry */
  rationale: string;
};

/**
 * One industry's landing page content.
 *
 * Fields are kept short on purpose — long body copy belongs in
 * /accidents-reports/[industry] (data-driven) or /articles (long-form).
 * This page is a hub that routes the visitor to the right tool.
 */
export type IndustryContent = {
  slug: IndustryContentSlug;
  /** Canonical Japanese label */
  label: string;
  /** English label (used in metadata fallback) */
  labelEn: string;
  /** Emoji used on cards and headings */
  icon: string;
  /** Tailwind color token for the swatch (e.g. amber/blue/emerald) */
  colorClass: string;
  /** Short Japanese tagline shown under the title */
  tagline: string;
  /** Slug into the safety-plan generator (10-industry taxonomy) */
  safetyPlanIndustry: IndustryId;
  /** If the industry has an accident-statistics bucket, the canonical slug */
  accidentAnalysisSlug?: IndustrySlug;
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
  /** 5-10 typical accident patterns with drill-down links */
  accidentExamples: IndustryAccidentExample[];
  /** 3-6 high-relevance MHLW circulars */
  circulars: IndustryCircular[];
  /** 4-6 typical work types and their hazard profile */
  workTypes: IndustryWorkType[];
  /** 3-6 KY topics tailored to this industry */
  kyTopics: IndustryKyTopic[];
  /** 3-6 chemical substances (may be empty for office-type industries) */
  chemicalSubstances: IndustryChemicalSubstance[];
  /** 4-8 required / recommended training and licences */
  educationCerts: IndustryEducationCert[];
  /** 2-4 FAQ categories relevant to the industry */
  faqCategories: IndustryFaqCategoryLink[];
  /** Recommended features inside the portal (4-6) */
  recommendations: IndustryRecommendation[];
  /** Industry-specific FAQ shown as schema.org FAQPage */
  faq: { question: string; answer: string }[];
  /** Long-tail SEO keywords (30-50) — rendered as a chip cloud */
  longTailKeywords: string[];
};
