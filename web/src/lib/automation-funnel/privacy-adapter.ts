import {
  AUTOMATION_FUNNEL_BUDGET_BUCKETS,
  AUTOMATION_FUNNEL_CONSULTATION_CATEGORIES,
  AUTOMATION_FUNNEL_CTA_POSITIONS,
  AUTOMATION_FUNNEL_ENDPOINT,
  AUTOMATION_FUNNEL_EVENTS,
  AUTOMATION_FUNNEL_ROUTE_TEMPLATES,
  type AutomationFunnelPayload,
} from "./contract";

const EVENTS = new Set<string>(AUTOMATION_FUNNEL_EVENTS);
const ROUTES = new Set<string>(AUTOMATION_FUNNEL_ROUTE_TEMPLATES);
const CTA_POSITIONS = new Set<string>(AUTOMATION_FUNNEL_CTA_POSITIONS);
const CONSULTATION_CATEGORIES = new Set<string>(
  AUTOMATION_FUNNEL_CONSULTATION_CATEGORIES,
);
const BUDGET_BUCKETS = new Set<string>(AUTOMATION_FUNNEL_BUDGET_BUCKETS);
const SITEWIDE_POSITIONS = new Set(["global_nav", "mobile_nav", "footer"]);
const BUCKET = /^af_[a-f0-9]{24}$/;

export type RawAutomationFunnelEvent = {
  event: string;
  pathname: string;
  ctaPosition?: string;
  consultationCategory?: string;
  budgetBucket?: string;
  deviceClass: string;
  anonymousBucket: string;
};

type FunnelTransport = (
  endpoint: typeof AUTOMATION_FUNNEL_ENDPOINT,
  payload: AutomationFunnelPayload,
) => void | Promise<void>;

type FunnelAdapterOptions = {
  consentGranted: boolean;
  productionRuntime: boolean;
  dntOrGpc: boolean;
  transport: FunnelTransport;
  clearAnonymousBucket?: () => void;
};

function routeTemplate(
  pathname: string,
  ctaPosition: string | undefined,
): AutomationFunnelPayload["route_template"] | null {
  if (
    !pathname.startsWith("/") ||
    pathname.includes("?") ||
    pathname.includes("#") ||
    pathname.includes("\\") ||
    pathname.includes("%")
  ) {
    return null;
  }
  if (ROUTES.has(pathname)) {
    return pathname as AutomationFunnelPayload["route_template"];
  }
  if (ctaPosition && SITEWIDE_POSITIONS.has(ctaPosition)) return "sitewide";
  return null;
}

/** Creates a new allowlist-only object; arbitrary caller fields never survive. */
export function prepareAutomationFunnelPayload(
  input: RawAutomationFunnelEvent,
): AutomationFunnelPayload | null {
  const template = routeTemplate(input.pathname, input.ctaPosition);
  if (
    !template ||
    !EVENTS.has(input.event) ||
    !["mobile", "tablet", "desktop"].includes(input.deviceClass) ||
    !BUCKET.test(input.anonymousBucket)
  ) {
    return null;
  }

  const payload: AutomationFunnelPayload = {
    event: input.event as AutomationFunnelPayload["event"],
    route_template: template,
    device_class:
      input.deviceClass as AutomationFunnelPayload["device_class"],
    anonymous_bucket: input.anonymousBucket,
    consent_state: "granted",
  };
  if (input.ctaPosition && CTA_POSITIONS.has(input.ctaPosition)) {
    payload.cta_position =
      input.ctaPosition as AutomationFunnelPayload["cta_position"];
  }
  if (
    input.consultationCategory &&
    CONSULTATION_CATEGORIES.has(input.consultationCategory)
  ) {
    payload.consultation_category =
      input.consultationCategory as AutomationFunnelPayload["consultation_category"];
  }
  if (input.budgetBucket && BUDGET_BUCKETS.has(input.budgetBucket)) {
    payload.budget_bucket =
      input.budgetBucket as AutomationFunnelPayload["budget_bucket"];
  }
  return payload;
}

export function createAutomationFunnelAdapter(options: FunnelAdapterOptions) {
  let consentGranted = options.consentGranted;
  return {
    async record(input: RawAutomationFunnelEvent): Promise<boolean> {
      if (
        !consentGranted ||
        !options.productionRuntime ||
        options.dntOrGpc
      ) {
        return false;
      }
      const payload = prepareAutomationFunnelPayload(input);
      if (!payload) return false;
      await options.transport(AUTOMATION_FUNNEL_ENDPOINT, payload);
      return true;
    },
    grantConsent() {
      consentGranted = true;
    },
    withdrawConsent() {
      consentGranted = false;
      options.clearAnonymousBucket?.();
    },
  };
}

export function createAutomationFunnelMockTransport() {
  const calls: Array<{
    endpoint: typeof AUTOMATION_FUNNEL_ENDPOINT;
    payload: AutomationFunnelPayload;
  }> = [];
  const transport: FunnelTransport = (endpoint, payload) => {
    calls.push({ endpoint, payload });
  };
  return { calls, transport };
}
