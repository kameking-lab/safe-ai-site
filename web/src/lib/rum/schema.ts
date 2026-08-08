import { z } from "zod";

// Preserve the production CSP by disabling Zod's Function-based parser JIT.
z.config({ jitless: true });

export const RUM_ROUTE_TEMPLATES = [
  "/",
  "/safety-ai",
  "/signage",
  "/risk",
  "/law-search",
  "/accident-news",
  "/privacy",
  "/security",
  "/accidents/[id]",
  "/laws/[slug]",
  "/revisions/[year]/[slug]",
] as const;

const ROUTE_TEMPLATES = new Set<string>(RUM_ROUTE_TEMPLATES);

export const rumPayloadSchema = z
  .object({
    route_template: z.string().refine((value) => ROUTE_TEMPLATES.has(value)),
    metric: z.enum(["LCP", "CLS", "INP", "FCP", "TTFB"]),
    value: z.number().finite().min(0).max(600_000),
    rating: z.enum(["good", "needs-improvement", "poor"]),
    navigation_type: z.enum([
      "navigate",
      "reload",
      "back-forward",
      "prerender",
      "unknown",
    ]),
    device_class: z.enum(["mobile", "tablet", "desktop"]),
    connection_class: z.enum(["slow", "medium", "fast", "unknown"]),
    build_id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
    anonymous_bucket: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.metric === "CLS" && payload.value > 10) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "invalid_metric_range",
      });
    }
  });

export type ValidatedRumPayload = z.infer<typeof rumPayloadSchema>;
