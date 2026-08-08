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

const BLOCKED_PARAM_NAME =
  /(?:query|question|search|email|phone|name|message|text|description|token|secret|url|location)/i;

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
  // Visual KY query variants are UI state (print format, result, facilitator
  // controls). GA automatically attaches page_location to custom events, so
  // keep optional scripts and events off whenever one of these URLs has a
  // query instead of relying only on event-param sanitization.
  if (
    (url.pathname === "/training/visual-ky" ||
      url.pathname.startsWith("/training/visual-ky/")) &&
    url.search.length > 0
  ) {
    return false;
  }
  // 相談種別を事前選択するクエリを含め、相談ページのクエリは一切計測しない。
  if (url.pathname === "/services/automation" && url.search.length > 0) return false;
  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_URL_PARAM.test(key)) return false;
  }
  return !/(?:token|access[_-]?token|id[_-]?token|secret)=/i.test(url.hash);
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
  return { page_path: url.pathname, page_location: `${url.origin}${url.pathname}` };
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
