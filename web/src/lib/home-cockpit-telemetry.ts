"use client";

import { trackEvent } from "@/components/Analytics";

export const HOME_COCKPIT_EVENTS = [
  "home_cockpit_view",
  "home_area_search_start",
  "home_area_resolved",
  "home_wbgt_detail_open",
  "home_heat_slide_view",
  "home_heat_slide_open",
  "home_chemical_search_start",
  "home_chemical_result_open",
  "home_chat_start",
] as const;

export type HomeCockpitEvent = (typeof HOME_COCKPIT_EVENTS)[number];

type AllowedAttributes = {
  action_type?: "area" | "slide" | "chemical" | "chat";
  area_resolution_level?: "prefecture" | "municipality" | "ambiguous";
  count_bucket?: "0" | "1" | "2-5" | "6+";
  destination_route_template?:
    | "/risk"
    | "/chemical-ra"
    | "/chatbot"
    | "/heat-illness-prevention/slides";
  device_class?: "mobile" | "tablet" | "desktop";
  connection_class?: "slow" | "medium" | "fast" | "unknown";
  elapsed_bucket?: "<100ms" | "100-499ms" | "500-1999ms" | "2000ms+";
  deployment?: string;
  date?: string;
};

const ACTION_TYPES = new Set(["area", "slide", "chemical", "chat"]);
const AREA_LEVELS = new Set(["prefecture", "municipality", "ambiguous"]);
const COUNT_BUCKETS = new Set(["0", "1", "2-5", "6+"]);
const DESTINATIONS = new Set([
  "/risk",
  "/chemical-ra",
  "/chatbot",
  "/heat-illness-prevention/slides",
]);
const ELAPSED_BUCKETS = new Set([
  "<100ms",
  "100-499ms",
  "500-1999ms",
  "2000ms+",
]);

/**
 * Runtime allowlist as a second boundary behind TypeScript. Unknown keys and
 * free-form values are dropped, including raw area, chemical, CAS and chat
 * text accidentally supplied by a future caller.
 */
export function sanitizeHomeCockpitAttributes(
  value: Record<string, unknown>,
): AllowedAttributes {
  const safe: AllowedAttributes = {};
  if (ACTION_TYPES.has(String(value.action_type))) {
    safe.action_type = value.action_type as AllowedAttributes["action_type"];
  }
  if (AREA_LEVELS.has(String(value.area_resolution_level))) {
    safe.area_resolution_level =
      value.area_resolution_level as AllowedAttributes["area_resolution_level"];
  }
  if (COUNT_BUCKETS.has(String(value.count_bucket))) {
    safe.count_bucket =
      value.count_bucket as AllowedAttributes["count_bucket"];
  }
  if (DESTINATIONS.has(String(value.destination_route_template))) {
    safe.destination_route_template =
      value.destination_route_template as AllowedAttributes["destination_route_template"];
  }
  if (ELAPSED_BUCKETS.has(String(value.elapsed_bucket))) {
    safe.elapsed_bucket =
      value.elapsed_bucket as AllowedAttributes["elapsed_bucket"];
  }
  return safe;
}

function deviceClass(): AllowedAttributes["device_class"] {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function connectionClass(): AllowedAttributes["connection_class"] {
  const effectiveType = (
    navigator as Navigator & {
      connection?: { effectiveType?: string };
    }
  ).connection?.effectiveType;
  if (effectiveType === "slow-2g" || effectiveType === "2g") return "slow";
  if (effectiveType === "3g") return "medium";
  if (effectiveType === "4g") return "fast";
  return "unknown";
}

function jstDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function elapsedBucket(elapsedMs: number): AllowedAttributes["elapsed_bucket"] {
  if (elapsedMs < 100) return "<100ms";
  if (elapsedMs < 500) return "100-499ms";
  if (elapsedMs < 2_000) return "500-1999ms";
  return "2000ms+";
}

export function countBucket(count: number): AllowedAttributes["count_bucket"] {
  if (count <= 0) return "0";
  if (count === 1) return "1";
  if (count <= 5) return "2-5";
  return "6+";
}

/**
 * Production-host only, consent-gated coarse telemetry. Callers cannot attach
 * raw region, chemical, CAS, question, URL query, or any free-form value.
 */
export function trackHomeCockpitEvent(
  event: HomeCockpitEvent,
  attributes: AllowedAttributes = {},
): void {
  if (
    typeof window === "undefined" ||
    window.location.hostname !== "www.anzen-ai-portal.jp" ||
    !HOME_COCKPIT_EVENTS.includes(event)
  ) {
    return;
  }
  const deployment =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 40) ||
    "production";
  const safeAttributes = {
    ...sanitizeHomeCockpitAttributes(attributes),
    device_class: deviceClass(),
    connection_class: connectionClass(),
    deployment,
    date: jstDate(),
  };
  trackEvent(event, safeAttributes);
}
