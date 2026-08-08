import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";
import { promoteSignageConfiguration } from "@/lib/signage/fleet-repository";
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
} from "@/lib/server/organization-access";
import { privateJson, readBoundedJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const ROUTE_KEY = "organization.signage.configuration-promote";
const RETENTION_MS = 24 * 60 * 60 * 1_000;
const bodySchema = z
  .object({
    rolloutStage: z.enum(["staged", "all"]),
    deviceIds: z.array(z.string().regex(IDENTIFIER)).min(1).max(500),
  })
  .strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ configurationId: string }> },
): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: ROUTE_KEY,
    limit: 8,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;
  const organizationId = request.headers.get("x-organization-id")?.trim() ?? "";
  const { configurationId } = await context.params;
  if (!IDENTIFIER.test(organizationId) || !IDENTIFIER.test(configurationId)) {
    return privateJson({ ok: false, reason: "invalid_scope" }, 400);
  }
  const access = await requireOrganizationAccess(organizationId, "admin");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    return privateJson({ ok: false, reason: "idempotency_key_required" }, 428);
  }
  const body = await readBoundedJson(request, 32 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = bodySchema.safeParse(body.value);
  if (
    !parsed.success ||
    new Set(parsed.data.deviceIds).size !== parsed.data.deviceIds.length
  ) {
    return privateJson({ ok: false, reason: "invalid_promotion" }, 400);
  }
  const requestHash = fingerprintSharedRequest(ROUTE_KEY, {
    organizationId,
    configurationId,
    actorUserId: access.userId,
    body: parsed.data,
  });
  const lease = await beginSharedIdempotency<{
    rolloutIds: string[];
    rolloutStage: "staged" | "all";
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
  const database = prisma as unknown as GovernanceDatabase | null;
  if (!database) {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "fleet_backend_unavailable" }, 503);
  }
  try {
    const result = await promoteSignageConfiguration(database, {
      organizationId,
      configurationId,
      actorUserId: access.userId,
      ...parsed.data,
    });
    if (!result.ok) {
      await releaseSharedIdempotency({
        routeKey: ROUTE_KEY,
        key,
        requestHash,
        leaseToken: lease.leaseToken,
      }).catch(() => false);
      return privateJson(result, 422);
    }
    const replay = {
      rolloutIds: result.rolloutIds,
      rolloutStage: result.rolloutStage,
    };
    await completeSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
      response: replay,
      retentionMs: RETENTION_MS,
    });
    return privateJson({ ok: true, replayed: false, ...replay }, 201);
  } catch {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "promotion_failed" }, 503);
  }
}
