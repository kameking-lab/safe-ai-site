import {
  __resetDevelopmentSharedStateForTests,
  consumeSharedRateLimit,
  getRateLimitSubject,
} from "@/lib/security/shared-state";

const WINDOW_MS = 10 * 60 * 1_000;
const MAX_REQUESTS = 40;

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
): Promise<RateLimitResult> {
  const result = await consumeSharedRateLimit(
    {
      policy: {
        routeKey: "chatbot",
        limit: MAX_REQUESTS,
        windowMs: WINDOW_MS,
      },
      rawSubject: clientIp,
    },
    { now, previewGlobalSubject: true },
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
} as const;
