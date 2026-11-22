import { isUnfinishedPublicReadingPath } from "@/lib/public-reading-status";

export const OPTIONAL_TRACKING_CONSENT_KEY = "safe-ai:optional-tracking-consent:v1";
export const OPTIONAL_TRACKING_CONSENT_EVENT =
  "safe-ai:optional-tracking-consent-change";

const SENSITIVE_ROUTE_PREFIXES = [
  "/account",
  "/admin",
  "/auth",
  "/api/auth",
  "/contact",
  "/chatbot",
  "/chemical-ra",
  "/ky",
  "/meeting",
  "/notifications",
  "/payment",
  "/pricing/success",
  "/pricing/cancel",
  "/risk",
  "/search",
  "/site-records",
  "/safety-diary",
  "/strategy/plan-generator",
  "/heat-illness-prevention/log",
  "/health-checkups",
  "/foreign-workers/safety-training",
];

const SENSITIVE_ROUTE_SEGMENT = /(?:^|\/)(?:share|invite|callback|token|access-token)(?:\/|$)/i;
const SENSITIVE_URL_PARAM = /^(?:q|query|question|search|keyword|token|access_?token|id_?token|code|state|session|secret|share|invite|email|phone|name|message|text)$/i;

// Query parameters are user-controlled. Only fixed channel labels may be sent.
const ATTRIBUTION_VALUES = {
  utm_source: new Set(["share", "line", "teams", "newsletter", "anzen_ai_portal"]),
  utm_medium: new Set(["share", "social", "referral", "email", "messaging", "line", "teams"]),
};

const BLOCKED_PARAM_NAME =
  /(?:query|question|search|email|phone|name|message|text|description|token|secret|url|location)/i;

// Ads are limited to public reading pages. Analytics may run on a broader set
// of routes, including tools where an ad could interrupt a safety workflow.
const AD_READING_PAGES = new Set([
  "/laws",
  "/laws/glossary",
  "/guides/ky-sheet",
  "/guides/safety-signage",
  "/guides/chemical-ra-create-simple",
  "/guides/industry-accident-reports",
]);
// The circular detail route also serves a large unverified, noindex archive.
// Keep the ad surface tied to individually verified public documents only.
const AD_VERIFIED_DETAIL_PAGES = new Set([
  "/circulars/mhlw-notice-0014",
]);

function safeAttribution(searchParams: URLSearchParams): URLSearchParams {
  const attribution = new URLSearchParams();
  for (const [key, allowed] of Object.entries(ATTRIBUTION_VALUES)) {
    const values = searchParams.getAll(key);
    if (values.length === 1 && allowed.has(values[0])) attribution.set(key, values[0]);
  }
  return attribution;
}

export function isOptionalTrackingPath(pathname: string): boolean {
  let normalized = pathname;
  try {
    normalized = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (SENSITIVE_ROUTE_SEGMENT.test(normalized)) return false;
  return !SENSITIVE_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export function isOptionalTrackingUrl(value: string | URL): boolean {
  let url: URL;
  try {
    url = value instanceof URL ? value : new URL(value, "https://privacy.invalid");
  } catch {
    return false;
  }
  if (!isOptionalTrackingPath(url.pathname)) return false;
  // Visual KY variants can expose UI state in GA's automatic page_location.
  // Limit query-bearing URLs to public scenarios with fixed attribution labels.
  if (
    (url.pathname === "/training/visual-ky" ||
      url.pathname.startsWith("/training/visual-ky/")) &&
    url.search.length > 0
  ) {
    if (url.hash || !/^\/training\/visual-ky\/[a-z0-9-]+$/.test(url.pathname)) return false;
    const attribution = safeAttribution(url.searchParams);
    for (const [key, value] of url.searchParams) {
      if (attribution.get(key) !== value) return false;
    }
  }
  // 相談種別を事前選択するクエリを含め、相談ページのクエリは一切計測しない。
  if (url.pathname === "/services/automation" && url.search.length > 0) return false;
  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_URL_PARAM.test(key)) return false;
  }
  return !/(?:token|access[_-]?token|id[_-]?token|secret)=/i.test(url.hash);
}

export function isAdEligiblePath(pathname: string): boolean {
  if (!isOptionalTrackingPath(pathname)) return false;
  let normalized: string;
  try {
    normalized = decodeURIComponent(pathname).replace(/\/$/u, "") || "/";
  } catch {
    return false;
  }
  if (isUnfinishedPublicReadingPath(normalized)) return false;
  return AD_READING_PAGES.has(normalized) || AD_VERIFIED_DETAIL_PAGES.has(normalized);
}

export function isAdEligibleUrl(value: string | URL): boolean {
  if (!isOptionalTrackingUrl(value)) return false;
  try {
    const url = value instanceof URL ? value : new URL(value, "https://privacy.invalid");
    return isAdEligiblePath(url.pathname);
  } catch {
    return false;
  }
}

export function sanitizedAnalyticsLocation(value: string | URL): {
  page_path: string;
  page_location: string;
} | null {
  let url: URL;
  try {
    url = value instanceof URL ? value : new URL(value, "https://privacy.invalid");
  } catch {
    return null;
  }
  if (!isOptionalTrackingUrl(url)) return null;
  const attribution = safeAttribution(url.searchParams).toString();
  return {
    page_path: url.pathname,
    page_location: `${url.origin}${url.pathname}${attribution ? `?${attribution}` : ""}`,
  };
}

export function sanitizeAnalyticsParams(
  params: Record<string, unknown> | undefined
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (BLOCKED_PARAM_NAME.test(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === "boolean") safe[key] = value;
    else if (typeof value === "string" && value.length <= 100 && !/[\r\n@]/.test(value)) {
      safe[key] = value;
    }
  }
  return safe;
}

export function hasOptionalTrackingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OPTIONAL_TRACKING_CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function hasPrivacySignalOptOut(): boolean {
  if (typeof navigator === "undefined") return false;
  const privacyNavigator = navigator as Navigator & {
    globalPrivacyControl?: boolean;
    msDoNotTrack?: string;
  };
  const privacyWindow =
    typeof window === "undefined"
      ? undefined
      : (window as Window & { doNotTrack?: string });

  return (
    privacyNavigator.globalPrivacyControl === true ||
    privacyNavigator.doNotTrack === "1" ||
    privacyNavigator.msDoNotTrack === "1" ||
    privacyWindow?.doNotTrack === "1"
  );
}
