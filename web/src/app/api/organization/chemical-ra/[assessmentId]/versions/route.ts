import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createChemicalRaRevision,
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
const ROUTE_KEY = "organization.chemical-ra.revision";
const RETENTION_MS = 24 * 60 * 60 * 1_000;
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().default(null);
const bodySchema = z
  .object({
    chemicalIdentity: z.string().trim().min(1).max(240),
    casNumber: optionalText(32),
    identityConfirmed: z.boolean().default(false),
    mixtureConfirmed: z.boolean().default(false),
    mixtureComponents: z.array(z.unknown()).max(100).default([]),
    sdsRecordId: optionalText(64),
    sdsVersionLabel: optionalText(120),
    sdsIssueDate: optionalText(40),
    processName: optionalText(240),
    taskName: optionalText(240),
    quantity: optionalText(120),
    concentration: optionalText(120),
    exposureDuration: optionalText(120),
    frequency: optionalText(120),
    temperature: optionalText(120),
    ventilation: optionalText(240),
    localExhaust: optionalText(240),
    skinExposure: optionalText(240),
    ppe: z.array(z.unknown()).max(100).default([]),
    existingControl: z.array(z.unknown()).max(100).default([]),
    additionalControl: z.array(z.unknown()).max(100).default([]),
    reviewerUserId: optionalText(64),
    approverUserId: optionalText(64),
    dueDate: optionalText(40),
    reassessmentDate: optionalText(40),
    aiCandidatesReviewed: z.boolean().default(false),
    sources: z.array(z.unknown()).max(50).default([]),
    evidence: z.array(z.unknown()).max(50).default([]),
    unresolvedWarnings: z.array(z.unknown()).max(100).default([]),
    changeReason: z.string().trim().min(1).max(2_000),
    submitForReview: z.boolean().default(false),
  })
  .strict();

function date(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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
  const body = await readBoundedJson(request, 128 * 1_024);
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
    versionId: string;
    versionNumber: number;
    status: string;
    missing: string[];
    reassessmentTriggers: string[];
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
    const result = await createChemicalRaRevision(database, {
      ...parsed.data,
      organizationId,
      assessmentId,
      actorUserId: access.userId,
      sdsIssueDate: date(parsed.data.sdsIssueDate),
      dueDate: date(parsed.data.dueDate),
      reassessmentDate: date(parsed.data.reassessmentDate),
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
      versionId: result.versionId,
      versionNumber: result.versionNumber,
      status: result.status,
      missing: result.missing,
      reassessmentTriggers: result.reassessmentTriggers,
    };
    await completeSharedIdempotency({
      routeKey: ROUTE_KEY,
      key,
      requestHash,
      leaseToken: lease.leaseToken,
      response: replay,
      retentionMs: RETENTION_MS,
    });
    return privateJson(
      {
        ok: true,
        replayed: false,
        ...replay,
        formalAssessment: false,
        message:
          "改訂版を作成しました。レビュー決定と承認が完了するまでは正式評価ではありません。",
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
    return privateJson({ ok: false, reason: "revision_failed" }, 503);
  }
}
