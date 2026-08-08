import { createHmac } from "node:crypto";

const IDEMPOTENCY_KEY_PATTERN = /^([a-z0-9]{8,12})\.([A-Za-z0-9-]{16,80})$/;
const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1_000;
const IDEMPOTENCY_PENDING_TTL_MS = 5 * 60 * 1_000;
const IDEMPOTENCY_SUCCESS_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_ENTRIES = 4_096;

export type AutomationConsultSuccess = {
  ok: true;
  referenceId: string;
  receivedAt: string;
  deliveryMode?: "dry-run" | "queued";
};

type Entry = {
  fingerprint: string;
  status: "pending" | "success";
  expiresAt: number;
  response?: AutomationConsultSuccess;
};

const entries = new Map<string, Entry>();

export function isValidAutomationConsultIdempotencyKey(value: string | null): value is string {
  return Boolean(value && parseAutomationConsultSubmissionDate(value));
}

/**
 * The client timestamp makes the provider request body stable across retries
 * and across stateless server instances. Old/future keys fail closed.
 */
export function parseAutomationConsultSubmissionDate(
  value: string,
  now = Date.now(),
): Date | null {
  const match = value.match(IDEMPOTENCY_KEY_PATTERN);
  if (!match) return null;
  const timestamp = Number.parseInt(match[1], 36);
  if (!Number.isFinite(timestamp)) return null;
  if (timestamp < now - IDEMPOTENCY_KEY_TTL_MS || timestamp > now + 5 * 60 * 1_000) {
    return null;
  }
  return new Date(timestamp);
}

const FINGERPRINT_DOMAIN = "anzen-ai-portal:automation-consult:idempotency:v1";

/**
 * Creates a non-reversible, deployment-scoped comparison value for retries.
 * The consultation body can contain direct identifiers and free text, so a
 * plain digest must never be persisted to a shared store.
 */
export function fingerprintAutomationConsultInput(
  value: unknown,
  secret: string | undefined = process.env.AUTOMATION_CONSULT_STATE_HASH_SECRET,
): string | null {
  const normalizedSecret = secret?.trim();
  if (!normalizedSecret || normalizedSecret.length < 32) return null;
  return createHmac("sha256", normalizedSecret)
    .update(FINGERPRINT_DOMAIN)
    .update("\0")
    .update(JSON.stringify(value))
    .digest("base64url");
}

export function beginAutomationConsultIdempotency(
  key: string,
  fingerprint: string,
  now = Date.now()
):
  | { state: "new" }
  | { state: "replay"; response: AutomationConsultSuccess }
  | { state: "pending" }
  | { state: "conflict" } {
  prune(now);
  const existing = entries.get(key);
  if (!existing) {
    entries.set(key, {
      fingerprint,
      status: "pending",
      expiresAt: now + IDEMPOTENCY_PENDING_TTL_MS,
    });
    return { state: "new" };
  }

  if (existing.fingerprint !== fingerprint) return { state: "conflict" };
  if (existing.status === "pending") return { state: "pending" };
  if (existing.response) return { state: "replay", response: existing.response };
  return { state: "pending" };
}

export function completeAutomationConsultIdempotency(
  key: string,
  response: AutomationConsultSuccess,
  now = Date.now()
): void {
  const existing = entries.get(key);
  if (!existing) return;
  entries.set(key, {
    ...existing,
    status: "success",
    expiresAt: now + IDEMPOTENCY_SUCCESS_TTL_MS,
    response,
  });
}

export function failAutomationConsultIdempotency(key: string): void {
  entries.delete(key);
}

function prune(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
  while (entries.size >= MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value as string | undefined;
    if (!oldestKey) break;
    entries.delete(oldestKey);
  }
}

export function __resetAutomationConsultIdempotencyForTests(): void {
  entries.clear();
}
