import "server-only";

import { Buffer } from "node:buffer";

const MAX_ENDPOINT_LENGTH = 2_048;
const MAX_KEY_LENGTH = 256;

/**
 * Browser vendors' Web Push delivery domains.
 *
 * Matching is performed on a DNS-label boundary. For example,
 * `updates.push.services.mozilla.com` is accepted while
 * `push.services.mozilla.com.example.test` and
 * `evilpush.services.mozilla.com` are rejected.
 */
const PUSH_PROVIDER_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
] as const;

export type ValidPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  prefecture: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedProviderHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return PUSH_PROVIDER_HOST_SUFFIXES.some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
  );
}

/**
 * Returns a normalized browser Web Push endpoint, or null when the URL must
 * not be used for an outbound request.
 */
export function validatePushEndpoint(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_ENDPOINT_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== "" ||
    url.hostname.endsWith(".") ||
    !isAllowedProviderHost(url.hostname) ||
    !url.pathname ||
    url.pathname === "/"
  ) {
    return null;
  }

  return url.toString();
}

function isBase64UrlOfDecodedLength(value: unknown, decodedLength: number): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_KEY_LENGTH ||
    !/^[A-Za-z0-9_-]+={0,2}$/.test(value)
  ) {
    return false;
  }

  try {
    const unpadded = value.replace(/=+$/, "");
    const padding = "=".repeat((4 - (unpadded.length % 4)) % 4);
    const decoded = Buffer.from(
      unpadded.replace(/-/g, "+").replace(/_/g, "/") + padding,
      "base64",
    );
    return decoded.byteLength === decodedLength;
  } catch {
    return false;
  }
}

function parsePrefecture(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^JP-\d{2}$/.test(value)) return undefined;
  const code = Number(value.slice(3));
  return code >= 1 && code <= 47 ? value : undefined;
}

export function parsePushSubscriptionBody(value: unknown): ValidPushSubscription | null {
  if (!isRecord(value) || !isRecord(value.subscription)) return null;
  const subscription = value.subscription;
  if (!isRecord(subscription.keys)) return null;

  const endpoint = validatePushEndpoint(subscription.endpoint);
  const p256dh = subscription.keys.p256dh;
  const auth = subscription.keys.auth;
  const prefecture = parsePrefecture(value.prefecture);

  if (
    !endpoint ||
    !isBase64UrlOfDecodedLength(p256dh, 65) ||
    !isBase64UrlOfDecodedLength(auth, 16) ||
    prefecture === undefined
  ) {
    return null;
  }

  return { endpoint, p256dh, auth, prefecture };
}

export const PUSH_SUBSCRIPTION_INPUT_LIMITS = {
  maxEndpointLength: MAX_ENDPOINT_LENGTH,
  maxKeyLength: MAX_KEY_LENGTH,
} as const;
