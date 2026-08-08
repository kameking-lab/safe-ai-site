import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";
import { rotateSignageDeviceToken } from "@/lib/signage/fleet-repository";
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
const ROUTE_KEY = "organization.signage.device-rotate";
const RETENTION_MS = 24 * 60 * 60 * 1_000;

function secret(): string | null {
  const value =
    process.env.SIGNAGE_FLEET_TOKEN_SECRET?.trim() ||
    process.env.SHARED_STATE_HMAC_SECRET?.trim() ||
    process.env.AUTOMATION_CONSULT_STATE_HASH_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ deviceId: string }> },
): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: ROUTE_KEY,
    limit: 6,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;
  const organizationId =
    request.headers.get("x-organization-id")?.trim() ??
    new URL(request.url).searchParams.get("organization")?.trim() ??
    "";
  const { deviceId } = await context.params;
  if (!IDENTIFIER.test(organizationId) || !IDENTIFIER.test(deviceId)) {
    return privateJson({ ok: false, reason: "invalid_scope" }, 400);
  }
  const access = await requireOrganizationAccess(organizationId, "admin");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  const tokenSecret = secret();
  if (!tokenSecret || !prisma) {
    return privateJson({ ok: false, reason: "fleet_backend_unavailable" }, 503);
  }
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    return privateJson({ ok: false, reason: "idempotency_key_required" }, 428);
  }
  const requestHash = fingerprintSharedRequest(ROUTE_KEY, {
    organizationId,
    deviceId,
    actorUserId: access.userId,
  });
  const lease = await beginSharedIdempotency<{ deviceId: string }>({
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
    return privateJson({
      ok: true,
      replayed: true,
      deviceId,
      deviceToken: null,
      tokenMessage: "rotation済みです。tokenは初回応答だけに表示します。",
    });
  }
  try {
    const result = await rotateSignageDeviceToken(
      prisma as unknown as GovernanceDatabase,
      {
        organizationId,
        deviceId,
        actorUserId: access.userId,
        tokenSecret,
      },
    );
    if (!result) {
      await releaseSharedIdempotency({
        routeKey: ROUTE_KEY,
        key,
        requestHash,
        leaseToken: lease.leaseToken,
      }).catch(() => false);
      return privateJson({ ok: false, reason: "device_not_found" }, 404);
    }
    await completeSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
      response: { deviceId },
      retentionMs: RETENTION_MS,
    });
    return privateJson({
      ok: true,
      replayed: false,
      deviceId,
      deviceToken: result.deviceToken,
      tokenMessage: "旧tokenは無効です。新tokenは再表示されません。",
      connectionState: "接続未確認",
    });
  } catch {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "rotation_failed" }, 503);
  }
}
