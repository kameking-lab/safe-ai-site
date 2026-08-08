import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";
import { stageSignageConfiguration } from "@/lib/signage/fleet-repository";
import {
  beginSharedIdempotency,
  completeSharedIdempotency,
  fingerprintSharedRequest,
  releaseSharedIdempotency,
  sharedRateLimitGuard,
} from "@/lib/security/shared-state";
import {
  organizationAccessStatus,
  requireOrganizationAccess,
  requireSiteInOrganization,
} from "@/lib/server/organization-access";
import { privateJson, readBoundedJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const ROUTE_KEY = "organization.signage.configuration-stage";
const RETENTION_MS = 24 * 60 * 60 * 1_000;

const configurationSchema = z
  .object({
    siteId: z.string().regex(IDENTIFIER).nullable(),
    deviceIds: z.array(z.string().regex(IDENTIFIER)).max(200),
    rolloutStage: z.enum(["preview", "canary"]),
    assignedLayout: z.enum(["morning", "continuous", "emergency"]),
    schedule: z
      .array(
        z
          .object({
            days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
            start: z.string().regex(/^\d{2}:\d{2}$/),
            end: z.string().regex(/^\d{2}:\d{2}$/),
          })
          .strict(),
      )
      .max(20),
    emergencyOverride: z
      .object({
        active: z.boolean(),
        message: z.string().trim().max(160).nullable(),
        expiresAt: z.string().datetime().nullable(),
      })
      .strict()
      .nullable(),
    contentSource: z
      .object({
        feeds: z
          .array(z.enum(["jma-warning", "accident-news", "law-revision"]))
          .min(1)
          .max(3),
      })
      .strict(),
    weatherSource: z
      .object({
        provider: z.enum(["jma", "open-meteo"]),
        areaCode: z.string().regex(/^[0-9]{2,6}$/),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.rolloutStage === "preview" && value.deviceIds.length !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deviceIds"],
        message: "preview cannot target a production device",
      });
    }
    if (value.rolloutStage === "canary" && value.deviceIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deviceIds"],
        message: "canary requires one or more verified devices",
      });
    }
  });

function signingSecret(): string | null {
  const value =
    process.env.SIGNAGE_FLEET_SIGNING_SECRET?.trim() ||
    process.env.SHARED_STATE_HMAC_SECRET?.trim() ||
    process.env.AUTOMATION_CONSULT_STATE_HASH_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

export async function POST(request: Request): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: ROUTE_KEY,
    limit: 8,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;
  const organizationId =
    request.headers.get("x-organization-id")?.trim() ??
    new URL(request.url).searchParams.get("organization")?.trim() ??
    "";
  if (!IDENTIFIER.test(organizationId)) {
    return privateJson({ ok: false, reason: "organization_scope_required" }, 400);
  }
  const access = await requireOrganizationAccess(organizationId, "admin");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  const secret = signingSecret();
  if (!secret || !prisma) {
    return privateJson({ ok: false, reason: "fleet_backend_unavailable" }, 503);
  }
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    return privateJson({ ok: false, reason: "idempotency_key_required" }, 428);
  }
  const body = await readBoundedJson(request, 64 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = configurationSchema.safeParse(body.value);
  if (!parsed.success || new Set(parsed.data?.deviceIds ?? []).size !== parsed.data?.deviceIds.length) {
    return privateJson({ ok: false, reason: "invalid_configuration" }, 400);
  }
  if (
    parsed.data.siteId &&
    !(await requireSiteInOrganization(organizationId, parsed.data.siteId))
  ) {
    return privateJson({ ok: false, reason: "site_scope_invalid" }, 403);
  }
  let requestHash: string;
  try {
    requestHash = fingerprintSharedRequest(ROUTE_KEY, {
      organizationId,
      actorUserId: access.userId,
      body: parsed.data,
    });
  } catch {
    return privateJson({ ok: false, reason: "shared_state_unavailable" }, 503);
  }
  const lease = await beginSharedIdempotency<{
    configurationId: string;
    version: number;
    checksum: string;
    rolloutIds: string[];
  }>({
    routeKey: ROUTE_KEY,
    key,
    requestHash,
    ttlMs: RETENTION_MS,
  }).catch(() => null);
  if (!lease) {
    return privateJson({ ok: false, reason: "shared_state_unavailable" }, 503);
  }
  if (lease.state === "conflict") {
    return privateJson({ ok: false, reason: "idempotency_conflict" }, 409);
  }
  if (lease.state === "pending") {
    return privateJson({ ok: false, reason: "request_in_progress" }, 409);
  }
  if (lease.state === "replay") {
    return privateJson({ ok: true, replayed: true, ...lease.response });
  }
  try {
    const result = await stageSignageConfiguration(
      prisma as unknown as GovernanceDatabase,
      {
        organizationId,
        siteId: parsed.data.siteId,
        deviceIds: parsed.data.deviceIds,
        rolloutStage: parsed.data.rolloutStage,
        configuration: {
          assignedLayout: parsed.data.assignedLayout,
          schedule: parsed.data.schedule,
          emergencyOverride: parsed.data.emergencyOverride,
          contentSource: parsed.data.contentSource,
          weatherSource: parsed.data.weatherSource,
        },
        actorUserId: access.userId,
        signingSecret: secret,
        signingKeyVersion: 1,
      },
    );
    await completeSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
      response: result,
      retentionMs: RETENTION_MS,
    });
    return privateJson({ ok: true, replayed: false, ...result }, 201);
  } catch {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "rollout_failed" }, 503);
  }
}
