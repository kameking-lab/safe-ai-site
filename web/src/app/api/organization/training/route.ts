import { prisma } from "@/lib/prisma";
import {
  listTrainingProgress,
  type TrainingProgressRow,
} from "@/lib/education/training-governance-repository";
import type { GovernanceSql } from "@/lib/chemical/ra-governance-repository";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";
import {
  organizationAccessStatus,
  requireCurrentOrganizationAccess,
} from "@/lib/server/organization-access";
import { privateJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function scope(request: Request) {
  const url = new URL(request.url);
  return {
    format: url.searchParams.get("format"),
  };
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
    routeKey: "organization.training.read",
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;
  const selected = scope(request);
  const access = await requireCurrentOrganizationAccess("viewer");
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
    const rows = await listTrainingProgress(
      prisma as unknown as GovernanceSql,
      access.organizationId,
      null,
    );
    if (
      selected.format === "csv" ||
      request.headers.get("accept")?.includes("text/csv")
    ) {
      const fields: Array<keyof TrainingProgressRow> = [
        "siteName",
        "displayName",
        "identityStatus",
        "courseCode",
        "courseTitle",
        "classification",
        "legalCategory",
        "courseVersion",
        "status",
        "progressPercent",
        "learningMinutes",
        "requiredMinutes",
        "dueDate",
        "completionLabel",
        "renewalDueAt",
      ];
      const lines = [
        fields.map(csvCell).join(","),
        ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(",")),
      ];
      return new Response(`\uFEFF${lines.join("\r\n")}`, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": 'attachment; filename="training-progress.csv"',
          "Content-Type": "text/csv; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return privateJson({ ok: true, records: rows });
  } catch {
    return privateJson({ ok: false, reason: "progress_unavailable" }, 503);
  }
}
