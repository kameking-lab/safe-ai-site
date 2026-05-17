/**
 * Safe wrappers around the Resend SDK.
 *
 * Email is best-effort: if Resend is misconfigured or down, the payload is
 * always written to server logs so the operator can replay it manually, and
 * the caller still receives a structured result instead of a thrown error.
 *
 * Caller-facing routes should treat `delivered: false` as a soft failure
 * (still acknowledge the user) rather than surfacing a 500.
 */
import { withCircuitBreaker, CircuitOpenError } from "./circuit-breaker";

export type SafeEmailParams = {
  /** Tag for log lines / circuit breaker. e.g. "inquiry", "weather-alert". */
  tag: string;
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

export type SafeEmailResult =
  | { delivered: true; id: string | null }
  | { delivered: false; reason: "not_configured" | "circuit_open" | "send_failed"; detail: string };

function logFallback(params: SafeEmailParams, reason: string): void {
  console.warn(
    `[resend:${params.tag}] fallback log (${reason}) — recipients=${
      Array.isArray(params.to) ? params.to.length : 1
    } subject=${JSON.stringify(params.subject)}`
  );
}

export async function sendEmailSafe(params: SafeEmailParams): Promise<SafeEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logFallback(params, "RESEND_API_KEY unset");
    return { delivered: false, reason: "not_configured", detail: "RESEND_API_KEY unset" };
  }

  try {
    return await withCircuitBreaker(
      "resend",
      async () => {
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);
        const { error, data } = await resend.emails.send({
          from: params.from,
          to: params.to,
          subject: params.subject,
          html: params.html ?? "",
          text: params.text,
        });
        if (error) {
          throw new Error(typeof error === "string" ? error : JSON.stringify(error));
        }
        return { delivered: true as const, id: data?.id ?? null };
      },
      { failureThreshold: 4, cooldownMs: 120_000 }
    );
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      logFallback(params, "circuit open");
      return { delivered: false, reason: "circuit_open", detail: err.message };
    }
    const detail = err instanceof Error ? err.message : String(err);
    logFallback(params, `send failed: ${detail}`);
    console.error(`[resend:${params.tag}] send failed:`, detail);
    return { delivered: false, reason: "send_failed", detail };
  }
}
