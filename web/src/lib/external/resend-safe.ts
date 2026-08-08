/**
 * Safe wrappers around the Resend SDK.
 *
 * Email is best-effort. Logs contain delivery metadata only; recipients,
 * subjects and message bodies can contain personal information and must not
 * be copied to application logs.
 *
 * Caller-facing routes decide whether delivery is optional. Submission routes
 * must not report acceptance when `delivered` is false.
 */
import { withCircuitBreaker, CircuitOpenError } from "./circuit-breaker";
import { externalCredentialedServicesAllowed } from "@/lib/server/deployment-safety";

export type SafeEmailParams = {
  /** Tag for log lines / circuit breaker. e.g. "inquiry", "weather-alert". */
  tag: string;
  from: string;
  to: string | string[];
  /** Reply-To address. Header values are never written to logs. */
  replyTo?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  /** Provider timeout. Defaults to 10 seconds and is capped at 30 seconds. */
  timeoutMs?: number;
  /** Stable provider key used to make retries safe across server instances. */
  idempotencyKey?: string;
};

export type SafeEmailResult =
  | { delivered: true; id: string | null }
  | { delivered: false; reason: "not_configured" | "circuit_open" | "send_failed"; detail: string };

const HEADER_CONTROL_CHARACTERS = /[\r\n\u0000-\u001f\u007f]/;

function logFallback(params: SafeEmailParams, reason: string): void {
  console.warn(
    `[resend:${params.tag}] delivery failed (${reason}) — recipientCount=${
      Array.isArray(params.to) ? params.to.length : 1
    }`
  );
}

function hasUnsafeHeaders(params: SafeEmailParams): boolean {
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const replyTo = params.replyTo
    ? Array.isArray(params.replyTo)
      ? params.replyTo
      : [params.replyTo]
    : [];
  return (
    [params.from, params.subject, ...recipients, ...replyTo].some((value) =>
      HEADER_CONTROL_CHARACTERS.test(value),
    ) ||
    (params.idempotencyKey !== undefined &&
      !/^[A-Za-z0-9._:-]{8,200}$/.test(params.idempotencyKey))
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("provider timeout")), timeoutMs);
    timeout.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

export async function sendEmailSafe(params: SafeEmailParams): Promise<SafeEmailResult> {
  if (!externalCredentialedServicesAllowed()) {
    return {
      delivered: false,
      reason: "not_configured",
      detail: "delivery disabled in preview safety mode",
    };
  }
  if (hasUnsafeHeaders(params)) {
    logFallback(params, "invalid header");
    return { delivered: false, reason: "send_failed", detail: "invalid email header" };
  }

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
        const timeoutMs = Math.min(30_000, Math.max(1, params.timeoutMs ?? 10_000));
        const payload = {
          from: params.from,
          to: params.to,
          replyTo: params.replyTo,
          subject: params.subject,
          html: params.html ?? "",
          text: params.text,
        };
        const sendRequest = params.idempotencyKey
          ? resend.emails.send(payload, { idempotencyKey: params.idempotencyKey })
          : resend.emails.send(payload);
        const { error, data } = await withTimeout(sendRequest, timeoutMs);
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
    logFallback(params, "provider request failed");
    console.error(`[resend:${params.tag}] send failed`);
    return { delivered: false, reason: "send_failed", detail: "provider request failed" };
  }
}
