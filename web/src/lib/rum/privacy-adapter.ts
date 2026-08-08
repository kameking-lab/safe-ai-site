export const RUM_SAME_ORIGIN_ENDPOINT = "/api/rum";

export type RumMetric = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";
export type RumRating = "good" | "needs-improvement" | "poor";
export type RumNavigationType =
  | "navigate"
  | "reload"
  | "back-forward"
  | "prerender"
  | "unknown";
export type RumDeviceClass = "mobile" | "tablet" | "desktop";
export type RumConnectionClass = "slow" | "medium" | "fast" | "unknown";

export type RawRumMetric = {
  pathname: string;
  metric: string;
  value: number;
  rating: string;
  navigationType: string;
  deviceClass: string;
  connectionClass: string;
  buildId: string;
  anonymousBucket: string;
};

export type RumPayload = {
  route_template: string;
  metric: RumMetric;
  value: number;
  rating: RumRating;
  navigation_type: RumNavigationType;
  device_class: RumDeviceClass;
  connection_class: RumConnectionClass;
  build_id: string;
  anonymous_bucket: string;
};

type RumTransport = (
  endpoint: typeof RUM_SAME_ORIGIN_ENDPOINT,
  payload: RumPayload,
) => void | Promise<void>;

type RumAdapterOptions = {
  consentGranted: boolean;
  endpointEnabled: boolean;
  productionRuntime: boolean;
  dntOrGpc: boolean;
  transport: RumTransport;
  clearAnonymousBucket?: () => void;
};

const EXACT_ROUTE_TEMPLATES = new Set([
  "/",
  "/safety-ai",
  "/signage",
  "/risk",
  "/law-search",
  "/accident-news",
  "/privacy",
  "/security",
]);

const METRICS = new Set<RumMetric>(["LCP", "CLS", "INP", "FCP", "TTFB"]);
const RATINGS = new Set<RumRating>(["good", "needs-improvement", "poor"]);
const NAVIGATION_TYPES = new Set<RumNavigationType>([
  "navigate",
  "reload",
  "back-forward",
  "prerender",
  "unknown",
]);
const DEVICE_CLASSES = new Set<RumDeviceClass>([
  "mobile",
  "tablet",
  "desktop",
]);
const CONNECTION_CLASSES = new Set<RumConnectionClass>([
  "slow",
  "medium",
  "fast",
  "unknown",
]);
const SAFE_BUILD_ID = /^[A-Za-z0-9_-]{1,80}$/;
const SAFE_BUCKET = /^[A-Za-z0-9_-]{8,64}$/;

function routeTemplate(pathname: string): string | null {
  if (
    !pathname.startsWith("/") ||
    pathname.includes("?") ||
    pathname.includes("#") ||
    pathname.includes("\\") ||
    pathname.includes("%")
  ) {
    return null;
  }
  if (EXACT_ROUTE_TEMPLATES.has(pathname)) return pathname;
  if (/^\/accidents\/[a-z0-9-]{1,80}$/i.test(pathname)) {
    return "/accidents/[id]";
  }
  if (/^\/laws\/[a-z0-9-]{1,80}$/i.test(pathname)) {
    return "/laws/[slug]";
  }
  if (/^\/revisions\/(?:19|20)\d{2}\/[a-z0-9-]{1,80}$/i.test(pathname)) {
    return "/revisions/[year]/[slug]";
  }
  return null;
}

export function isRumRouteEligible(pathname: string): boolean {
  return routeTemplate(pathname) !== null;
}

function clampMetric(metric: RumMetric, rawValue: number): number {
  const maximum = metric === "CLS" ? 10 : 600_000;
  return Math.min(maximum, Math.max(0, rawValue));
}

/** Build a fresh allowlist-only payload. Unknown or sensitive input is dropped. */
export function prepareRumPayload(input: RawRumMetric): RumPayload | null {
  const template = routeTemplate(input.pathname);
  if (
    !template ||
    !METRICS.has(input.metric as RumMetric) ||
    !Number.isFinite(input.value) ||
    !RATINGS.has(input.rating as RumRating) ||
    !NAVIGATION_TYPES.has(input.navigationType as RumNavigationType) ||
    !DEVICE_CLASSES.has(input.deviceClass as RumDeviceClass) ||
    !CONNECTION_CLASSES.has(input.connectionClass as RumConnectionClass) ||
    !SAFE_BUILD_ID.test(input.buildId) ||
    !SAFE_BUCKET.test(input.anonymousBucket)
  ) {
    return null;
  }

  const metric = input.metric as RumMetric;
  return {
    route_template: template,
    metric,
    value: clampMetric(metric, input.value),
    rating: input.rating as RumRating,
    navigation_type: input.navigationType as RumNavigationType,
    device_class: input.deviceClass as RumDeviceClass,
    connection_class: input.connectionClass as RumConnectionClass,
    build_id: input.buildId,
    anonymous_bucket: input.anonymousBucket,
  };
}

/**
 * The only transport is injected, the endpoint is fixed, and all gates fail
 * closed. Routes that can expose consultation, health, AI, KY, chemical, or
 * account activity are intentionally absent from the allowlist.
 */
export function createRumAdapter(options: RumAdapterOptions) {
  let consentGranted = options.consentGranted;

  return {
    async record(input: RawRumMetric): Promise<boolean> {
      if (
        !consentGranted ||
        !options.endpointEnabled ||
        !options.productionRuntime ||
        options.dntOrGpc
      ) {
        return false;
      }
      const payload = prepareRumPayload(input);
      if (!payload) return false;
      await options.transport(RUM_SAME_ORIGIN_ENDPOINT, payload);
      return true;
    },
    grantConsent(): void {
      consentGranted = true;
    },
    withdrawConsent(): void {
      consentGranted = false;
      options.clearAnonymousBucket?.();
    },
  };
}

export function createRumMockTransport() {
  const calls: Array<{
    endpoint: typeof RUM_SAME_ORIGIN_ENDPOINT;
    payload: RumPayload;
  }> = [];
  const transport: RumTransport = (endpoint, payload) => {
    calls.push({ endpoint, payload });
  };
  return { calls, transport };
}
