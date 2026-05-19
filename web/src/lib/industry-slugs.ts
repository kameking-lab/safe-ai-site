/**
 * Canonical industry slug definitions for the 5-bucket accident-statistics model.
 *
 * Each feature uses its own internal IndustryId (safety-plan uses "transportation",
 * health-checkup uses "medical", KY uses "medical-welfare", foreign-worker uses "care", etc.)
 * because they map to different domain taxonomies.  The adapter maps below translate each
 * feature's internal ID to the canonical slug so cross-tool deep-links work uniformly.
 *
 * Canonical slugs match the URL segments of /accidents-reports/[industry].
 */

export type IndustrySlug =
  | "construction"
  | "manufacturing"
  | "transport"
  | "healthcare"
  | "service";

export const INDUSTRY_LABELS_JA: Record<IndustrySlug, string> = {
  construction: "建設業",
  manufacturing: "製造業",
  transport: "運輸交通業",
  healthcare: "医療福祉",
  service: "サービス業",
};

// safety-plan IndustryId → canonical IndustrySlug
export const SAFETY_PLAN_TO_SLUG: Partial<Record<string, IndustrySlug>> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transportation: "transport",
  medical: "healthcare",
  service: "service",
  // retail / food / wholesale / warehouse / office → no matching accident-analysis slug
};

// Inverse of SAFETY_PLAN_TO_SLUG — canonical IndustrySlug → safety-plan IndustryId.
// Used by cross-tool deep-links from /accidents-reports → /strategy/plan-generator?industry=...
// so the plan-generator form can pre-select the matching industry (SEO-012).
export const SLUG_TO_SAFETY_PLAN: Record<IndustrySlug, string> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transport: "transportation",
  healthcare: "medical",
  service: "service",
};

// health-checkup IndustryId → canonical IndustrySlug
export const HEALTH_CHECKUP_TO_SLUG: Partial<Record<string, IndustrySlug>> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transportation: "transport",
  medical: "healthcare",
  service: "service",
};

// KY-examples KyIndustryId → canonical IndustrySlug
export const KY_TO_SLUG: Partial<Record<string, IndustrySlug>> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transport: "transport",
  "medical-welfare": "healthcare",
  service: "service",
};

// foreign-worker MaterialIndustry → canonical IndustrySlug (partial — agriculture etc. have no match)
export const FOREIGN_WORKER_TO_SLUG: Partial<Record<string, IndustrySlug>> = {
  construction: "construction",
  manufacturing: "manufacturing",
  care: "healthcare",
};
