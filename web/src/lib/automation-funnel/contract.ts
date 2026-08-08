/**
 * Browser-safe automation funnel contract.
 *
 * Keep this module free of runtime schema libraries. The site-wide consent
 * boundary imports it on every public page, while Zod validation stays in the
 * server Route Handler bundle.
 */
export const AUTOMATION_FUNNEL_EVENTS = [
  "automation_service_view",
  "automation_pricing_view",
  "automation_example_select",
  "automation_cta_click",
  "automation_form_start",
  "automation_form_unavailable",
  "automation_form_validation_error",
  "automation_form_success",
] as const;

export const AUTOMATION_FUNNEL_ROUTE_TEMPLATES = [
  "/",
  "/services/automation",
  "/safety-ai",
  "/chemical-ra",
  "/ky/paper",
  "/signage",
  "/chatbot",
  "/safety-diary",
  "/features",
  "/education",
  "/strategy/plan-generator",
  "/heat-illness-prevention",
  "/heat-illness-prevention/slides",
  "/heat-illness-prevention/elearning",
  "sitewide",
] as const;

export const AUTOMATION_FUNNEL_CTA_POSITIONS = [
  "hero",
  "after_pricing",
  "final",
  "home",
  "home_primary",
  "home_pricing",
  "home_examples",
  "home_training",
  "home_hero",
  "global_nav",
  "mobile_nav",
  "footer",
  "features",
  "safety_ai",
  "ky",
  "safety_diary",
  "chemical_ra",
  "signage",
  "chatbot",
  "annual_plan",
  "education",
  "heat_hub",
  "heat_slides",
  "heat_elearning",
] as const;

export const AUTOMATION_FUNNEL_CONSULTATION_CATEGORIES = [
  "automation",
  "ai-utilization",
  "safety-efficiency",
  "training",
  "training-materials",
  "manuals",
  "signage",
  "heat-illness-training",
  "safety-education-materials",
  "wbgt-weather-notifications",
  "heat-signage",
  "ky-document-automation",
  "other",
] as const;

export const AUTOMATION_FUNNEL_BUDGET_BUCKETS = [
  "under-50000",
  "50000-100000",
  "100000-300000",
  "300000-500000",
  "over-500000",
  "undecided",
] as const;

export type AutomationFunnelEvent =
  (typeof AUTOMATION_FUNNEL_EVENTS)[number];
export type AutomationFunnelRouteTemplate =
  (typeof AUTOMATION_FUNNEL_ROUTE_TEMPLATES)[number];
export type AutomationFunnelCtaPosition =
  (typeof AUTOMATION_FUNNEL_CTA_POSITIONS)[number];
export type AutomationFunnelConsultationCategory =
  (typeof AUTOMATION_FUNNEL_CONSULTATION_CATEGORIES)[number];
export type AutomationFunnelBudgetBucket =
  (typeof AUTOMATION_FUNNEL_BUDGET_BUCKETS)[number];

export type AutomationFunnelPayload = {
  event: AutomationFunnelEvent;
  route_template: AutomationFunnelRouteTemplate;
  cta_position?: AutomationFunnelCtaPosition;
  consultation_category?: AutomationFunnelConsultationCategory;
  budget_bucket?: AutomationFunnelBudgetBucket;
  device_class: "mobile" | "tablet" | "desktop";
  anonymous_bucket: string;
  consent_state: "granted";
};

export const AUTOMATION_FUNNEL_ENDPOINT = "/api/automation-funnel";
