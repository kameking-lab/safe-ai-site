import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  recordChemicalRaReviewDecision,
  type GovernanceDatabase,
} from "@/lib/chemical/ra-governance-repository";
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
const ROUTE_KEY = "organization.chemical-ra.review";
const RETENTION_MS = 24 * 60 * 60 * 1_000;
const bodySchema = z
  .object({
    decision: z.enum(["recommend-approval", "changes-requested"]),
    comment: z.string().trim().max(2_000).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === "changes-requested" && !value.comment?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comment"],
        message: "changes-requested requires a comment",
      });
    }
  });

export async function POST(
  request: Request,
  context: { params: Promise<{ assessmentId: string }> },
): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: ROUTE_KEY,
    limit: 12,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;

  const { assessmentId } = await context.params;
  if (!IDENTIFIER.test(assessmentId)) {
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
  const body = await readBoundedJson(request, 16 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return privateJson({ ok: false, reason: "invalid_input" }, 400);
  }
  const requestHash = fingerprintSharedRequest(ROUTE_KEY, {
    organizationId,
    assessmentId,
    actorUserId: access.userId,
    body: parsed.data,
  });
  const lease = await beginSharedIdempotency<{
    reviewDecisionId: string;
    versionNumber: number;
    decision: "recommend-approval" | "changes-requested";
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
    const result = await recordChemicalRaReviewDecision(database, {
      organizationId,
      assessmentId,
      actorUserId: access.userId,
      actorRole: access.role,
      decision: parsed.data.decision,
      comment: parsed.data.comment ?? null,
    });
    if (!result.ok) {
      await releaseSharedIdempotency({
        routeKey: ROUTE_KEY,
        key,
        requestHash,
        leaseToken: lease.leaseToken,
      }).catch(() => false);
      return privateJson(
        result,
        result.reason === "assessment_not_found" ? 404 : 422,
      );
    }
    const replay = {
      reviewDecisionId: result.reviewDecisionId,
      versionNumber: result.versionNumber,
      decision: result.decision,
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
    return privateJson({ ok: false, reason: "review_failed" }, 503);
  }
}
