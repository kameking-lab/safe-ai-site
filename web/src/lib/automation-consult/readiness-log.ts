import "server-only";
import { getAutomationConsultReadinessReasons } from "./availability";

const PREFIX = "[automation-consult:readiness:v1]";
const DEDUP_MS = 5 * 60 * 1_000;
let lastSignature = "";
let lastLoggedAt = Number.NEGATIVE_INFINITY;

/** Server only. No request, environment values, or arbitrary log input accepted. */
export function logAutomationConsultReadinessFailure(): void {
  const signature = getAutomationConsultReadinessReasons().join(",");
  if (!signature) return;
  const now = Date.now();
  if (signature === lastSignature && now - lastLoggedAt < DEDUP_MS) return;
  lastSignature = signature;
  lastLoggedAt = now;
  try {
    console.warn(PREFIX, signature);
  } catch {
    // Diagnostics must not change the fixed intake_unavailable response.
  }
}
