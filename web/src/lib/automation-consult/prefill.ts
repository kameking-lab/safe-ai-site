/**
 * URL prefillとサーバーvalidationが共有する粗い相談区分。
 *
 * この定数をZod schemaと同じモジュールへ置くと、query prefillだけを読む
 * 小さいclient islandにもZod全体が同梱されるため、依存を逆転させない。
 */
export const automationConsultationTypes = [
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

export type AutomationConsultationType =
  (typeof automationConsultationTypes)[number];

export const AUTOMATION_CONSULT_PREFILL_QUERY_KEY = "consultationType";

const allowedConsultationTypes = new Set<string>(
  automationConsultationTypes,
);
const ALLOWED_ATTRIBUTION_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
]);
const MAX_ATTRIBUTION_VALUE_LENGTH = 100;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;

/**
 * Reads only the coarse, server-approved consultation category.
 *
 * The accepted query must contain exactly one `consultationType` parameter.
 * A small set of attribution-only UTM keys may accompany it, but those values
 * are validated and deliberately discarded rather than becoming form state.
 * Free text, names, addresses, organisations, health details, unknown keys,
 * duplicated keys, padded values, and mixed-case values fail closed.
 */
export function parseAutomationConsultationTypePrefill(
  query: URLSearchParams | string | null | undefined,
): AutomationConsultationType | null {
  if (query == null) return null;

  let params: URLSearchParams;
  try {
    params =
      typeof query === "string"
        ? new URLSearchParams(query.startsWith("?") ? query.slice(1) : query)
        : query;
  } catch {
    return null;
  }

  const entries = [...params.entries()];
  const seen = new Set<string>();
  let consultationType: string | null = null;
  for (const [key, value] of entries) {
    if (seen.has(key)) return null;
    seen.add(key);

    if (key === AUTOMATION_CONSULT_PREFILL_QUERY_KEY) {
      consultationType = value;
      continue;
    }
    if (
      !ALLOWED_ATTRIBUTION_QUERY_KEYS.has(key) ||
      value.length > MAX_ATTRIBUTION_VALUE_LENGTH ||
      CONTROL_CHARACTERS.test(value)
    ) {
      return null;
    }
  }

  return consultationType !== null && allowedConsultationTypes.has(consultationType)
    ? (consultationType as AutomationConsultationType)
    : null;
}
