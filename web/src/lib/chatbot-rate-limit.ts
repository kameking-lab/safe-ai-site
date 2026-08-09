import {
  __resetDevelopmentSharedStateForTests,
  consumeSharedRateLimit,
  getRateLimitSubject,
} from "@/lib/security/shared-state";

const WINDOW_MS = 10 * 60 * 1_000;
const MAX_REQUESTS = 40;
// One protected, AI-OFF Preview audit exercises the frozen electrical set
// through both deployed transports (88 JSON + 88 browser SSE requests) plus
// the fixed 12-case conversation checks. Keep a small bounded margin without
// weakening production or the standalone SAFE_AI_STAGING_MODE fail-safe.
const PREVIEW_MAX_REQUESTS = 240;

export function chatbotRateLimitMaxRequests(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return env.VERCEL_ENV === "preview" ? PREVIEW_MAX_REQUESTS : MAX_REQUESTS;
}

export function getClientIp(request: Request): string {
  return getRateLimitSubject(request);
}

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

/**
 * Chatbot abuse protection backed by the shared PostgreSQL fixed window.
 * Production never falls back to process-local state. SSO-protected Preview
 * may use the explicitly requested deployment-wide anonymous bucket.
 */
export async function checkRateLimit(
  clientIp: string,
  now: number = Date.now(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<RateLimitResult> {
  const result = await consumeSharedRateLimit(
    {
      policy: {
        routeKey: "chatbot",
        limit: chatbotRateLimitMaxRequests(env),
        windowMs: WINDOW_MS,
      },
      rawSubject: clientIp,
    },
    { env, now, previewGlobalSubject: true },
  );
  return {
    allowed: result.allowed,
    retryAfterSec: result.retryAfterSec,
  };
}

export function rateLimitMessage(retryAfterSec: number): string {
  const min = Math.ceil(retryAfterSec / 60);
  return (
    `アクセスが集中しています。お手数ですが約${min}分後に再度お試しください。\n\n` +
    "お急ぎの場合は公式情報をご利用ください：\n" +
    "- e-Gov 法令検索: https://laws.e-gov.go.jp/\n" +
    "- 厚生労働省 職場のあんぜんサイト: https://anzeninfo.mhlw.go.jp/"
  );
}

export function __resetRateLimitForTests(): void {
  __resetDevelopmentSharedStateForTests();
}

export const RATE_LIMIT_CONFIG = {
  windowMs: WINDOW_MS,
  maxRequests: MAX_REQUESTS,
  previewMaxRequests: PREVIEW_MAX_REQUESTS,
} as const;
