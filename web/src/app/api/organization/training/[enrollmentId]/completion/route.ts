import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";
import { recordTrainingCompletion } from "@/lib/education/training-governance-repository";
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
const ROUTE_KEY = "organization.training.completion";
const RETENTION_MS = 24 * 60 * 60 * 1_000;
const bodySchema = z
  .object({
    expiresAt: z.string().datetime().nullable().optional(),
    renewalDueAt: z.string().datetime().nullable().optional(),
  })
  .strict();

function date(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ enrollmentId: string }> },
): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: ROUTE_KEY,
    limit: 12,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;
  const { enrollmentId } = await context.params;
  if (!IDENTIFIER.test(enrollmentId)) {
    return privateJson({ ok: false, reason: "invalid_scope" }, 400);
  }
  const access = await requireCurrentOrganizationAccess("reviewer");
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
  const body = await readBoundedJson(request, 8 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return privateJson({ ok: false, reason: "invalid_input" }, 400);
  }
  let requestHash: string;
  try {
    requestHash = fingerprintSharedRequest(ROUTE_KEY, {
      organizationId,
      enrollmentId,
      actorUserId: access.userId,
      body: parsed.data,
    });
  } catch {
    return privateJson({ ok: false, reason: "shared_state_unavailable" }, 503);
  }
  const lease = await beginSharedIdempotency<{
    completionId: string;
    level: string;
    displayLabel: string;
    formalCertificateAllowed: boolean;
    missingForFormal: string[];
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
    return privateJson({ ok: false, reason: "database_unavailable" }, 503);
  }
  try {
    const result = await recordTrainingCompletion(database, {
      organizationId,
      enrollmentId,
      actorUserId: access.userId,
      actorRole: access.role,
      expiresAt: date(parsed.data.expiresAt),
      renewalDueAt: date(parsed.data.renewalDueAt),
    });
    if (!result.ok) {
      await releaseSharedIdempotency({
        routeKey: ROUTE_KEY,
        key,
        requestHash,
        leaseToken: lease.leaseToken,
      }).catch(() => false);
      return privateJson(result, 404);
    }
    const replay = {
      completionId: result.completionId,
      level: result.level,
      displayLabel: result.displayLabel,
      formalCertificateAllowed: result.formalCertificateAllowed,
      missingForFormal: result.missingForFormal,
    };
    await completeSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
      response: replay,
      retentionMs: RETENTION_MS,
    });
    return privateJson({
      ok: true,
      replayed: false,
      ...replay,
      certificateGenerated: false,
    });
  } catch {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "completion_failed" }, 503);
  }
}
