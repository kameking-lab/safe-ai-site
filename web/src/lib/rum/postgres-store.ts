import { createHmac } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ValidatedRumPayload } from "./schema";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_METRICS = 60;
const RATE_GRACE_MS = 60_000;
const HMAC_DOMAIN = "anzen-ai-portal:rum-rate-limit:v1";

export type RumRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function getRumClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",", 1)[0]?.trim();
  if (first) return first.slice(0, 128);
  return request.headers.get("x-real-ip")?.trim().slice(0, 128) || "unknown";
}

export function anonymizeRumClient(
  clientIp: string,
  secret: string | undefined = process.env.RUM_RATE_LIMIT_HASH_SECRET,
): string | null {
  const normalizedSecret = secret?.trim();
  if (!normalizedSecret || normalizedSecret.length < 32) return null;
  return createHmac("sha256", normalizedSecret)
    .update(HMAC_DOMAIN)
    .update("\0")
    .update(clientIp)
    .digest("base64url");
}

export async function consumeRumRateLimit(
  anonymousClientKey: string,
  database: PrismaClient | null = prisma,
  now = Date.now(),
): Promise<RumRateLimitResult> {
  if (!database) throw new Error("rum_database_unavailable");
  const windowStartMs = Math.floor(now / RATE_WINDOW_MS) * RATE_WINDOW_MS;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + RATE_WINDOW_MS + RATE_GRACE_MS);
  const bucket = await database.rumRateBucket.upsert({
    where: {
      clientKey_windowStart: {
        clientKey: anonymousClientKey,
        windowStart,
      },
    },
    create: {
      clientKey: anonymousClientKey,
      windowStart,
      count: 1,
      expiresAt,
    },
    update: {
      count: { increment: 1 },
      expiresAt,
    },
    select: { count: true },
  });
  if (bucket.count <= RATE_MAX_METRICS) return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowStartMs + RATE_WINDOW_MS - now) / 1_000),
    ),
  };
}

export async function persistRumMetric(
  payload: ValidatedRumPayload,
  retentionDays: number,
  database: PrismaClient | null = prisma,
): Promise<void> {
  if (!database) throw new Error("rum_database_unavailable");
  const expiresAt = new Date(
    Date.now() + retentionDays * 24 * 60 * 60 * 1_000,
  );
  await database.rumMetric.create({
    data: {
      routeTemplate: payload.route_template,
      metric: payload.metric,
      value: payload.value,
      rating: payload.rating,
      navigationType: payload.navigation_type,
      deviceClass: payload.device_class,
      connectionClass: payload.connection_class,
      buildId: payload.build_id,
      anonymousBucket: payload.anonymous_bucket,
      expiresAt,
    },
    select: { id: true },
  });
}

export async function deleteExpiredRum(
  database: PrismaClient | null = prisma,
  now = new Date(),
): Promise<{ metrics: number; rateBuckets: number }> {
  if (!database) throw new Error("rum_database_unavailable");
  const [metrics, rateBuckets] = await database.$transaction([
    database.rumMetric.deleteMany({ where: { expiresAt: { lte: now } } }),
    database.rumRateBucket.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  return { metrics: metrics.count, rateBuckets: rateBuckets.count };
}

export async function countExpiredRum(
  database: PrismaClient | null = prisma,
  now = new Date(),
): Promise<{ metrics: number; rateBuckets: number }> {
  if (!database) throw new Error("rum_database_unavailable");
  const [metrics, rateBuckets] = await database.$transaction([
    database.rumMetric.count({ where: { expiresAt: { lte: now } } }),
    database.rumRateBucket.count({ where: { expiresAt: { lte: now } } }),
  ]);
  return { metrics, rateBuckets };
}
