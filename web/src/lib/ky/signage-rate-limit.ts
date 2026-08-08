import {
  __resetDevelopmentSharedStateForTests,
  consumeSharedRateLimit,
} from "@/lib/security/shared-state";

const WINDOW_MS = 60_000;
const MAX_LOOKUPS = 10;

export type SignageRateLimitResult = { allowed: boolean; retryAfterSec: number };

export async function checkSignageLookupRateLimit(
  clientKey: string,
  now: number = Date.now(),
): Promise<SignageRateLimitResult> {
  const result = await consumeSharedRateLimit(
    {
      policy: {
        routeKey: "ky-signage-lookup",
        limit: MAX_LOOKUPS,
        windowMs: WINDOW_MS,
      },
      rawSubject: clientKey,
    },
    { now },
  );
  return {
    allowed: result.allowed,
    retryAfterSec: result.retryAfterSec,
  };
}

export function __resetSignageRateLimitForTests(): void {
  __resetDevelopmentSharedStateForTests();
}

export const SIGNAGE_RATE_LIMIT_CONFIG = {
  windowMs: WINDOW_MS,
  maxLookups: MAX_LOOKUPS,
} as const;
