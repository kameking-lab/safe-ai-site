export type AutomationConsultRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

const WINDOW_MS = 10 * 60 * 1_000;
const MAX_REQUESTS = 5;
const MAX_BUCKETS = 4_096;
const buckets = new Map<string, number[]>();

export function getAutomationConsultClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",", 1)[0]?.trim();
  if (firstForwarded) return firstForwarded.slice(0, 128);

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp ? realIp.slice(0, 128) : "unknown";
}

export function checkAutomationConsultRateLimit(
  clientIp: string,
  now = Date.now()
): AutomationConsultRateLimitResult {
  const windowStart = now - WINDOW_MS;
  const recent = (buckets.get(clientIp) ?? []).filter((timestamp) => timestamp > windowStart);

  if (recent.length >= MAX_REQUESTS) {
    buckets.set(clientIp, recent);
    const retryAt = recent[0] + WINDOW_MS;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((retryAt - now) / 1_000)),
    };
  }

  recent.push(now);
  buckets.set(clientIp, recent);

  if (buckets.size > MAX_BUCKETS) {
    for (const [key, timestamps] of buckets) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= windowStart) {
        buckets.delete(key);
      }
    }
  }

  return { allowed: true };
}

export function __resetAutomationConsultRateLimitForTests(): void {
  buckets.clear();
}
