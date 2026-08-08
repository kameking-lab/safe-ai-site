import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createChemicalRaDraft,
  listChemicalRaLedger,
  type GovernanceDatabase,
  type GovernanceSql,
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
  requireSiteInOrganization,
} from "@/lib/server/organization-access";
import {
  privateJson,
  readBoundedJson,
} from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const ROUTE_KEY = "organization.chemical-ra";
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().default(null);

const createSchema = z
  .object({
    assessmentNumber: z.string().trim().min(1).max(80),
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

function selectedSite(request: Request): string | null {
  const siteId =
    request.headers.get("x-site-id")?.trim() ?? null;
  return siteId && IDENTIFIER.test(siteId) ? siteId : null;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function csvCell(value: unknown): string {
  let text =
    value instanceof Date
      ? value.toISOString()
      : value === null || value === undefined
        ? ""
        : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: `${ROUTE_KEY}.read`,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;

  const access = await requireCurrentOrganizationAccess("viewer");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  const database = prisma as unknown as GovernanceSql | null;
  if (!database) {
    return privateJson({ ok: false, reason: "database_unavailable" }, 503);
  }
  try {
    const rows = await listChemicalRaLedger(
      database,
      access.organizationId,
      null,
    );
    const wantsCsv =
      new URL(request.url).searchParams.get("format") === "csv" ||
      request.headers.get("accept")?.includes("text/csv");
    if (wantsCsv) {
      const headings = [
        "assessmentNumber",
        "siteName",
        "chemicalIdentity",
        "casNumber",
        "sdsVersionLabel",
        "status",
        "reassessmentDate",
        "ownerUserId",
        "unresolvedWarningCount",
      ];
      const lines = [
        headings.map(csvCell).join(","),
        ...rows.map((row) =>
          headings
            .map((heading) =>
              csvCell(row[heading as keyof typeof row]),
            )
            .join(","),
        ),
      ];
      return new Response(`\uFEFF${lines.join("\r\n")}`, {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition":
            'attachment; filename="chemical-ra-ledger.csv"',
          "Content-Type": "text/csv; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return privateJson({ ok: true, records: rows });
  } catch {
    return privateJson({ ok: false, reason: "ledger_unavailable" }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  const rateLimit = await sharedRateLimitGuard(request, {
    routeKey: `${ROUTE_KEY}.create`,
    limit: 12,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;

  const siteId = selectedSite(request);
  if (!siteId) {
    return privateJson(
      { ok: false, reason: "site_scope_required" },
      400,
    );
  }
  const access = await requireCurrentOrganizationAccess("editor");
  if (!access.ok) {
    return privateJson(
      { ok: false, reason: access.reason },
      organizationAccessStatus(access),
    );
  }
  if (!(await requireSiteInOrganization(access.organizationId, siteId))) {
    return privateJson({ ok: false, reason: "site_scope_invalid" }, 403);
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) {
    return privateJson({ ok: false, reason: "idempotency_key_required" }, 428);
  }
  const body = await readBoundedJson(request, 128 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = createSchema.safeParse(body.value);
  if (!parsed.success) {
    return privateJson({ ok: false, reason: "invalid_input" }, 400);
  }

  let requestHash: string;
  try {
    requestHash = fingerprintSharedRequest(ROUTE_KEY, {
      organizationId: access.organizationId,
      siteId,
      actorUserId: access.userId,
      body: parsed.data,
    });
  } catch {
    return privateJson({ ok: false, reason: "shared_state_unavailable" }, 503);
  }
  const lease = await beginSharedIdempotency<{
    assessmentId: string;
    versionId: string;
    status: string;
    missing: string[];
  }>({
    routeKey: ROUTE_KEY,
    key: idempotencyKey,
    requestHash,
    ttlMs: IDEMPOTENCY_TTL_MS,
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
    return privateJson({ ok: true, replayed: true, ...lease.response }, 200);
  }

  const database = prisma as unknown as GovernanceDatabase | null;
  if (!database) {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key: idempotencyKey,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "database_unavailable" }, 503);
  }
  try {
    const result = await createChemicalRaDraft(database, {
      ...parsed.data,
      organizationId: access.organizationId,
      siteId,
      sdsIssueDate: parseDate(parsed.data.sdsIssueDate),
      dueDate: parseDate(parsed.data.dueDate),
      reassessmentDate: parseDate(parsed.data.reassessmentDate),
      actorUserId: access.userId,
    });
    await completeSharedIdempotency({
      routeKey: ROUTE_KEY,
      key: idempotencyKey,
      requestHash,
      leaseToken: lease.leaseToken,
      response: result,
      retentionMs: IDEMPOTENCY_TTL_MS,
    });
    return privateJson(
      {
        ok: true,
        replayed: false,
        ...result,
        formalAssessment: false,
        message:
          result.status === "review-required"
            ? "レビュー待ちです。承認完了までは正式評価ではありません。"
            : "下書きを保存しました。未承認のため正式評価ではありません。",
      },
      201,
    );
  } catch {
    await releaseSharedIdempotency({
      routeKey: ROUTE_KEY,
      key: idempotencyKey,
      requestHash,
      leaseToken: lease.leaseToken,
    }).catch(() => false);
    return privateJson({ ok: false, reason: "write_failed" }, 503);
  }
}
