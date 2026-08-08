import { z } from "zod";
import {
  AUTOMATION_FUNNEL_BUDGET_BUCKETS,
  AUTOMATION_FUNNEL_CONSULTATION_CATEGORIES,
  AUTOMATION_FUNNEL_CTA_POSITIONS,
  AUTOMATION_FUNNEL_EVENTS,
  AUTOMATION_FUNNEL_ROUTE_TEMPLATES,
} from "./contract";
export {
  AUTOMATION_FUNNEL_BUDGET_BUCKETS,
  AUTOMATION_FUNNEL_CONSULTATION_CATEGORIES,
  AUTOMATION_FUNNEL_CTA_POSITIONS,
  AUTOMATION_FUNNEL_ENDPOINT,
  AUTOMATION_FUNNEL_EVENTS,
  AUTOMATION_FUNNEL_ROUTE_TEMPLATES,
  type AutomationFunnelBudgetBucket,
  type AutomationFunnelConsultationCategory,
  type AutomationFunnelCtaPosition,
  type AutomationFunnelEvent,
  type AutomationFunnelPayload,
  type AutomationFunnelRouteTemplate,
} from "./contract";

// Zod's default object-parser JIT probes `Function(...)`, which is correctly
// rejected by this site's strict CSP. Keep validation CSP-safe instead of
// weakening `script-src` with unsafe-eval.
z.config({ jitless: true });

export const automationFunnelPayloadSchema = z
  .object({
    event: z.enum(AUTOMATION_FUNNEL_EVENTS),
    route_template: z.enum(AUTOMATION_FUNNEL_ROUTE_TEMPLATES),
    cta_position: z.enum(AUTOMATION_FUNNEL_CTA_POSITIONS).optional(),
    consultation_category: z
      .enum(AUTOMATION_FUNNEL_CONSULTATION_CATEGORIES)
      .optional(),
    budget_bucket: z.enum(AUTOMATION_FUNNEL_BUDGET_BUCKETS).optional(),
    device_class: z.enum(["mobile", "tablet", "desktop"]),
    anonymous_bucket: z.string().regex(/^af_[a-f0-9]{24}$/),
    consent_state: z.literal("granted"),
  })
  .strict();
