import { createHmac } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AutomationFunnelPayload } from "./schema";

const SAFE_DEPLOYMENT = /^[A-Za-z0-9_-]{1,80}$/;
const RATE_HMAC_DOMAIN = "anzen-ai-portal:automation-funnel-rate-limit:v1";

function jstDate(now: Date): Date {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${date}T00:00:00.000Z`);
}

export function safeDeploymentId(
  env: Record<string, string | undefined> = process.env,
): string {
  const candidates = [
    env.VERCEL_DEPLOYMENT_ID,
    env.VERCEL_GIT_COMMIT_SHA,
    env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  ];
  return candidates.find((value) => SAFE_DEPLOYMENT.test(value ?? "")) ??
    "unknown-production";
}

export function anonymizeAutomationFunnelBucket(
  anonymousBucket: string,
  secret: string | undefined = process.env.RUM_RATE_LIMIT_HASH_SECRET,
): string | null {
  const normalizedSecret = secret?.trim();
  if (
    !/^af_[a-f0-9]{24}$/.test(anonymousBucket) ||
    !normalizedSecret ||
    normalizedSecret.length < 32
  ) {
    return null;
  }
  return createHmac("sha256", normalizedSecret)
    .update(RATE_HMAC_DOMAIN)
    .update("\0")
    .update(anonymousBucket)
    .digest("base64url");
}

export async function persistAutomationFunnelEvent(
  payload: AutomationFunnelPayload,
  retentionDays: number,
  database: PrismaClient | null = prisma,
  now = new Date(),
): Promise<void> {
  if (!database) throw new Error("automation_funnel_database_unavailable");
  await database.automationFunnelEvent.create({
    data: {
      event: payload.event,
      routeTemplate: payload.route_template,
      ctaPosition: payload.cta_position,
      consultationCategory: payload.consultation_category,
      budgetBucket: payload.budget_bucket,
      deviceClass: payload.device_class,
      eventDate: jstDate(now),
      anonymousBucket: payload.anonymous_bucket,
      consentState: payload.consent_state,
      deployment: safeDeploymentId(),
      createdAt: now,
      expiresAt: new Date(
        now.getTime() + retentionDays * 24 * 60 * 60 * 1_000,
      ),
    },
    select: { id: true },
  });
}

export async function countExpiredAutomationFunnelEvents(
  database: PrismaClient | null = prisma,
  now = new Date(),
): Promise<number> {
  if (!database) throw new Error("automation_funnel_database_unavailable");
  return database.automationFunnelEvent.count({
    where: { expiresAt: { lte: now } },
  });
}

export async function deleteExpiredAutomationFunnelEvents(
  database: PrismaClient | null = prisma,
  now = new Date(),
): Promise<number> {
  if (!database) throw new Error("automation_funnel_database_unavailable");
  const result = await database.automationFunnelEvent.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  return result.count;
}
