import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";
import { rollbackSignageConfiguration } from "@/lib/signage/fleet-repository";
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
import { privateJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const ROUTE_KEY = "organization.signage.rollback";
const RETENTION_MS = 24 * 60 * 60 * 1_000;

export async function POST(
  request: Request,
  context: { params: Promise<{ rolloutId: string }> },
): Promise<Response> {
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
  const { rolloutId } = await context.params;
  if (!IDENTIFIER.test(organizationId) || !IDENTIFIER.test(rolloutId)) {
    return privateJson({ ok: false, reason: "invalid_scope" }, 400);
  }
  const access = await requireOrganizationAccess(organizationId, "admin");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  if (!prisma) {
    return privateJson({ ok: false, reason: "database_unavailable" }, 503);
  }
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    return privateJson({ ok: false, reason: "idempotency_key_required" }, 428);
  }
  let requestHash: string;
  try {
    requestHash = fingerprintSharedRequest(ROUTE_KEY, {
      organizationId,
      rolloutId,
      actorUserId: access.userId,
    });
  } catch {
    return privateJson({ ok: false, reason: "shared_state_unavailable" }, 503);
  }
  const lease = await beginSharedIdempotency<{ rollbackRolloutId: string }>({
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
    const result = await rollbackSignageConfiguration(
      prisma as unknown as GovernanceDatabase,
      { organizationId, rolloutId, actorUserId: access.userId },
    );
    if (!result) {
      await releaseSharedIdempotency({
        routeKey: ROUTE_KEY,
        key,
        requestHash,
        leaseToken: lease.leaseToken,
      }).catch(() => false);
      return privateJson(
        { ok: false, reason: "rollback_target_unavailable" },
        422,
      );
    }
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
    return privateJson({ ok: false, reason: "rollback_failed" }, 503);
  }
}
