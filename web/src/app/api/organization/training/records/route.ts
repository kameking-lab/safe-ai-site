import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";
import {
  writeOrganizationTrainingRecord,
  type TrainingRecordWriteInput,
} from "@/lib/education/training-record-repository";
import type { OrganizationRole } from "@/lib/organization-roles";
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
const ROUTE_KEY = "organization.training.records";
const RETENTION_MS = 24 * 60 * 60 * 1_000;
const id = z.string().regex(IDENTIFIER);
const evidence = z.array(z.unknown()).max(50).default([]);
const bodySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create-learner"),
      siteId: id,
      displayName: z.string().trim().min(1).max(160),
      identityEvidence: evidence,
    })
    .strict(),
  z
    .object({
      action: z.literal("verify-identity"),
      learnerId: id,
      identityStatus: z.enum(["pending", "verified", "rejected"]),
      identityEvidence: evidence,
    })
    .strict(),
  z
    .object({
      action: z.literal("create-course-version"),
      courseCode: z.string().trim().min(1).max(80),
      title: z.string().trim().min(1).max(240),
      classification: z.enum([
        "self-study",
        "internal-support",
        "part-of-statutory-training",
        "formal-statutory-training",
        "skill-training",
        "special-education",
        "foreman-training",
        "operation-chief",
        "employment-restriction",
      ]),
      legalCategory: z.string().trim().min(1).max(48),
      source: z.unknown(),
      instructorRequirementLabel: z.string().trim().min(1).max(1_000),
      practicalRequirementLabel: z.string().trim().min(1).max(1_000),
      versionLabel: z.string().trim().min(1).max(120),
      requiredMinutes: z.number().int().min(1).max(100_000),
      assessmentRequirement: z.unknown(),
      attendanceRequirement: z.unknown(),
      practicalRequirement: z.unknown(),
      instructorRequirement: z.unknown(),
      effectiveFrom: z.string().datetime(),
      effectiveTo: z.string().datetime().nullable().default(null),
      sourceSnapshot: z.unknown(),
    })
    .strict(),
  z
    .object({
      action: z.literal("create-enrollment"),
      siteId: id,
      learnerId: id,
      courseVersionId: id,
      dueDate: z.string().datetime().nullable().default(null),
      evidence,
    })
    .strict(),
  z
    .object({
      action: z.literal("record-progress"),
      enrollmentId: id,
      progressPercent: z.number().int().min(0).max(100),
      learningMinutes: z.number().int().min(0).max(1_000_000),
      evidence,
    })
    .strict(),
  z
    .object({
      action: z.literal("record-attendance"),
      enrollmentId: id,
      attendanceType: z.string().trim().min(1).max(32),
      attendedMinutes: z.number().int().min(0).max(100_000),
      instructorUserId: id.nullable().default(null),
      practicalCompleted: z.boolean().default(false),
      evidence,
      occurredAt: z.string().datetime(),
    })
    .strict(),
  z
    .object({
      action: z.literal("record-assessment"),
      enrollmentId: id,
      assessmentType: z.string().trim().min(1).max(32),
      score: z.number().min(0).max(100).nullable().default(null),
      passed: z.boolean(),
      evidence,
      assessedAt: z.string().datetime(),
    })
    .strict(),
]);

function minimumRole(
  action: z.infer<typeof bodySchema>["action"],
): OrganizationRole {
  if (action === "create-course-version") return "admin";
  if (
    action === "verify-identity" ||
    action === "record-attendance" ||
    action === "record-assessment"
  ) {
    return "reviewer";
  }
  return "editor";
}

function repositoryInput(
  data: z.infer<typeof bodySchema>,
  common: {
    organizationId: string;
    actorUserId: string;
    actorRole: OrganizationRole;
  },
): TrainingRecordWriteInput {
  if (data.action === "create-course-version") {
    return {
      ...common,
      ...data,
      effectiveFrom: new Date(data.effectiveFrom),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
    };
  }
  if (data.action === "create-enrollment") {
    return {
      ...common,
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    };
  }
  if (data.action === "record-attendance") {
    return { ...common, ...data, occurredAt: new Date(data.occurredAt) };
  }
  if (data.action === "record-assessment") {
    return { ...common, ...data, assessedAt: new Date(data.assessedAt) };
  }
  return { ...common, ...data };
}

export async function POST(request: Request): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: ROUTE_KEY,
    limit: 30,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;
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
  const access = await requireCurrentOrganizationAccess(
    minimumRole(parsed.data.action),
  );
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  const organizationId = access.organizationId;
  const requestHash = fingerprintSharedRequest(ROUTE_KEY, {
    organizationId,
    actorUserId: access.userId,
    body: parsed.data,
  });
  const lease = await beginSharedIdempotency<{
    entityType: string;
    entityId: string;
    status: string;
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
    const result = await writeOrganizationTrainingRecord(
      database,
      repositoryInput(parsed.data, {
        organizationId,
        actorUserId: access.userId,
        actorRole: access.role,
      }),
    );
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
      entityType: result.entityType,
      entityId: result.entityId,
      status: result.status,
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
    return privateJson({ ok: false, reason: "training_record_failed" }, 503);
  }
}
