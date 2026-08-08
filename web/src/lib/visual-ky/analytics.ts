"use client";

import { trackEvent } from "@/lib/track-events";

export const VISUAL_KY_EVENT_NAMES = [
  "visual_ky_view",
  "visual_ky_start",
  "visual_ky_hazard_select",
  "visual_ky_answer_reveal",
  "visual_ky_complete",
  "visual_ky_next_action",
  "visual_ky_print",
  "visual_ky_facilitator_start",
] as const;

export type VisualKyEventName = (typeof VISUAL_KY_EVENT_NAMES)[number];

function coarseDeviceClass(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1100) return "tablet";
  return "desktop";
}

function currentJstDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function trackVisualKyEvent(
  action: VisualKyEventName,
  input: {
    scenarioId: string;
    category: string;
    difficulty: string;
    ctaPosition?: string;
    completionState?: "started" | "revealed" | "completed";
    answerCount?: number;
  },
): void {
  trackEvent(action, {
    scenario_id: input.scenarioId,
    category: input.category,
    difficulty: input.difficulty,
    device_class: coarseDeviceClass(),
    cta_position: input.ctaPosition,
    completion_state: input.completionState,
    answer_count:
      typeof input.answerCount === "number"
        ? Math.max(0, Math.min(9, Math.round(input.answerCount)))
        : undefined,
    deployment:
      process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
        ? "production"
        : "non-production",
    date: currentJstDate(),
  });
}
