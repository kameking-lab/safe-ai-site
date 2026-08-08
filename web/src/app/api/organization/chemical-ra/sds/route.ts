import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createChemicalSdsRecord,
  type GovernanceDatabase,
} from "@/lib/chemical/ra-governance-repository";
import { isValidCasNumber } from "@/lib/chemical/ra-governance";
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
  requireSiteInOrganization,
} from "@/lib/server/organization-access";
import { privateJson, readBoundedJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const ROUTE_KEY = "organization.chemical-ra.sds";
const RETENTION_MS = 24 * 60 * 60 * 1_000;
const schema = z
  .object({
    chemicalIdentity: z.string().trim().min(1).max(240),
    casNumber: z.string().trim().max(32).nullable().optional().default(null),
    mixtureConfirmed: z.boolean().default(false),
    versionLabel: z.string().trim().min(1).max(120),
    issueDate: z.string().datetime(),
    sourceUrl: z
      .string()
      .url()
      .max(2_048)
      .refine((value) => value.startsWith("https://"))
      .nullable()
      .optional()
      .default(null),
    evidence: z.array(z.unknown()).min(1).max(50),
  })
  .strict();

function scope(request: Request) {
  const siteId =
    request.headers.get("x-site-id")?.trim() ??
    "";
  return {
    siteId: IDENTIFIER.test(siteId) ? siteId : null,
  };
}

export async function POST(request: Request): Promise<Response> {
  const limited = await sharedRateLimitGuard(request, {
    routeKey: ROUTE_KEY,
    limit: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const selected = scope(request);
  if (!selected.siteId) {
    return privateJson({ ok: false, reason: "invalid_scope" }, 400);
  }
  const access = await requireCurrentOrganizationAccess("editor");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  if (
    !(await requireSiteInOrganization(
      access.organizationId,
      selected.siteId,
    ))
  ) {
    return privateJson({ ok: false, reason: "site_scope_invalid" }, 403);
  }
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    return privateJson({ ok: false, reason: "idempotency_key_required" }, 428);
  }
  const body = await readBoundedJson(request, 64 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    return privateJson({ ok: false, reason: "invalid_input" }, 400);
  }
  if (
    (parsed.data.casNumber && !isValidCasNumber(parsed.data.casNumber)) ||
    (!parsed.data.casNumber && !parsed.data.mixtureConfirmed)
  ) {
    return privateJson({ ok: false, reason: "identity_unresolved" }, 422);
  }
  const issueDate = new Date(parsed.data.issueDate);
  if (issueDate.getTime() > Date.now()) {
    return privateJson({ ok: false, reason: "future_issue_date" }, 422);
  }
  let requestHash: string;
  try {
    requestHash = fingerprintSharedRequest(ROUTE_KEY, {
      organizationId: access.organizationId,
      siteId: selected.siteId,
      actorUserId: access.userId,
      body: parsed.data,
    });
  } catch {
    return privateJson({ ok: false, reason: "shared_state_unavailable" }, 503);
  }
  const lease = await beginSharedIdempotency<{
    sdsRecordId: string;
    reassessmentAssessmentIds: string[];
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
    const result = await createChemicalSdsRecord(
      prisma as unknown as GovernanceDatabase,
      {
        ...parsed.data,
        organizationId: access.organizationId,
        siteId: selected.siteId,
        issueDate,
        actorUserId: access.userId,
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
    return privateJson({ ok: false, reason: "sds_write_failed" }, 503);
  }
}
