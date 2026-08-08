import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import {
  listSignageFleet,
  registerSignageDevice,
} from "@/lib/signage/fleet-repository";
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
const ROUTE_KEY = "organization.signage.device-register";
const RETENTION_MS = 24 * 60 * 60 * 1_000;
const bodySchema = z
  .object({
    siteId: z.string().regex(IDENTIFIER),
    name: z.string().trim().min(1).max(160),
    staleThresholdSec: z.number().int().min(30).max(3_600).default(300),
  })
  .strict();

function organization(request: Request): string | null {
  const value =
    request.headers.get("x-organization-id")?.trim() ??
    new URL(request.url).searchParams.get("organization")?.trim() ??
    "";
  return IDENTIFIER.test(value) ? value : null;
}

function fleetTokenSecret(): string | null {
  const value =
    process.env.SIGNAGE_FLEET_TOKEN_SECRET?.trim() ||
    process.env.SHARED_STATE_HMAC_SECRET?.trim() ||
    process.env.AUTOMATION_CONSULT_STATE_HASH_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

export async function GET(request: Request): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: "organization.signage.read",
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;
  const organizationId = organization(request);
  if (!organizationId) {
    return privateJson({ ok: false, reason: "organization_scope_required" }, 400);
  }
  const access = await requireOrganizationAccess(organizationId, "viewer");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  if (!prisma) {
    return privateJson({ ok: false, reason: "database_unavailable" }, 503);
  }
  try {
    const rows = await listSignageFleet(
      prisma as unknown as GovernanceSql,
      organizationId,
    );
    return privateJson({ ok: true, records: rows });
  } catch {
    return privateJson({ ok: false, reason: "fleet_unavailable" }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: ROUTE_KEY,
    limit: 8,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;
  const organizationId = organization(request);
  if (!organizationId) {
    return privateJson({ ok: false, reason: "organization_scope_required" }, 400);
  }
  const access = await requireOrganizationAccess(organizationId, "admin");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  const secret = fleetTokenSecret();
  if (!secret || !prisma) {
    return privateJson({ ok: false, reason: "fleet_backend_unavailable" }, 503);
  }
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    return privateJson({ ok: false, reason: "idempotency_key_required" }, 428);
  }
  const body = await readBoundedJson(request, 8 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return privateJson({ ok: false, reason: "invalid_input" }, 400);
  }
  if (
    !(await requireSiteInOrganization(organizationId, parsed.data.siteId))
  ) {
    return privateJson({ ok: false, reason: "site_scope_invalid" }, 403);
  }
  let requestHash: string;
  try {
    requestHash = fingerprintSharedRequest(ROUTE_KEY, {
      organizationId,
      actorUserId: access.userId,
      ...parsed.data,
    });
  } catch {
    return privateJson({ ok: false, reason: "shared_state_unavailable" }, 503);
  }
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
      deviceId: lease.response.deviceId,
      deviceToken: null,
      tokenMessage: "端末tokenは初回応答だけに表示します。必要ならrotationを実行してください。",
    });
  }
  try {
    const result = await registerSignageDevice(
      prisma as unknown as GovernanceDatabase,
      {
        organizationId,
        siteId: parsed.data.siteId,
        name: parsed.data.name,
        actorUserId: access.userId,
        tokenSecret: secret,
        staleThresholdSec: parsed.data.staleThresholdSec,
      },
    );
    await completeSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
      response: { deviceId: result.deviceId },
      retentionMs: RETENTION_MS,
    });
    return privateJson(
      {
        ok: true,
        replayed: false,
        deviceId: result.deviceId,
        deviceToken: result.deviceToken,
        tokenMessage:
          "このtokenは再表示されません。端末へ安全に設定し、応答を保存しないでください。",
        connectionState: "接続未確認",
      },
      201,
    );
  } catch {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "registration_failed" }, 503);
  }
}
