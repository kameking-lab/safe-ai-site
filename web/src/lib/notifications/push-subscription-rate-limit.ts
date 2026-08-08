import {
  __resetDevelopmentSharedStateForTests,
  consumeSharedRateLimit,
} from "@/lib/security/shared-state";

const WINDOW_MS = 10 * 60 * 1_000;
const MAX_MUTATIONS = 30;

export type PushSubscriptionRateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
};

export async function checkPushSubscriptionRateLimit(
  clientKey: string,
  now: number = Date.now(),
): Promise<PushSubscriptionRateLimitResult> {
  const result = await consumeSharedRateLimit(
    {
      policy: {
        routeKey: "push-subscription",
        limit: MAX_MUTATIONS,
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

export function __resetPushSubscriptionRateLimitForTests(): void {
  __resetDevelopmentSharedStateForTests();
}

export const PUSH_SUBSCRIPTION_RATE_LIMIT_CONFIG = {
  windowMs: WINDOW_MS,
  maxMutations: MAX_MUTATIONS,
} as const;
