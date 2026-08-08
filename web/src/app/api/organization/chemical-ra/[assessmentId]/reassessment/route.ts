import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  flagChemicalRaReassessment,
  type GovernanceDatabase,
} from "@/lib/chemical/ra-governance-repository";
import { CHEMICAL_REASSESSMENT_TRIGGERS } from "@/lib/chemical/ra-governance";
import {
  beginSharedIdempotency,
  completeSharedIdempotency,
  fingerprintSharedRequest,
  releaseSharedIdempotency,
  sharedRateLimitGuard,
} from "@/lib/security/shared-state";
import {
  organizationAccessStatus,
  requireCurrentOrganizationAccess,
} from "@/lib/server/organization-access";
import { privateJson, readBoundedJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const ROUTE_KEY = "organization.chemical-ra.reassessment";
const RETENTION_MS = 24 * 60 * 60 * 1_000;
const schema = z
  .object({
    triggerType: z.enum(CHEMICAL_REASSESSMENT_TRIGGERS),
    reason: z.string().trim().min(1).max(2_000),
    sourceRef: z.string().trim().max(2_048).nullable().optional().default(null),
  })
  .strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ assessmentId: string }> },
): Promise<Response> {
  const limited = await sharedRateLimitGuard(request, {
    routeKey: ROUTE_KEY,
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;
  const { assessmentId } = await context.params;
  if (!IDENTIFIER.test(assessmentId)) {
    return privateJson({ ok: false, reason: "invalid_scope" }, 400);
  }
  const access = await requireCurrentOrganizationAccess("editor");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  const organizationId = access.organizationId;
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    return privateJson({ ok: false, reason: "idempotency_key_required" }, 428);
  }
  const body = await readBoundedJson(request, 16 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    return privateJson({ ok: false, reason: "invalid_input" }, 400);
  }
  let requestHash: string;
  try {
    requestHash = fingerprintSharedRequest(ROUTE_KEY, {
      organizationId,
      assessmentId,
      actorUserId: access.userId,
      body: parsed.data,
    });
  } catch {
    return privateJson({ ok: false, reason: "shared_state_unavailable" }, 503);
  }
  const lease = await beginSharedIdempotency<{ triggerId: string }>({
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
  if (!prisma) {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "database_unavailable" }, 503);
  }
  try {
    const result = await flagChemicalRaReassessment(
      prisma as unknown as GovernanceDatabase,
      {
        organizationId,
        assessmentId,
        actorUserId: access.userId,
        ...parsed.data,
      },
    );
    if (!result.ok) {
      await releaseSharedIdempotency({
        routeKey: ROUTE_KEY,
        key,
        requestHash,
        leaseToken: lease.leaseToken,
      }).catch(() => false);
      return privateJson(result, 404);
    }
    await completeSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
      response: { triggerId: result.triggerId },
      retentionMs: RETENTION_MS,
    });
    return privateJson({ ok: true, replayed: false, triggerId: result.triggerId });
  } catch {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "reassessment_write_failed" }, 503);
  }
}
