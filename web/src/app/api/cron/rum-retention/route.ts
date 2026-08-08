import { NextResponse, type NextRequest } from "next/server";
import { bearerAuthError, verifyBearerSecret } from "@/lib/server/bearer-auth";
import { getRumServerReadiness } from "@/lib/rum/server-readiness";
import { getAutomationFunnelServerReadiness } from "@/lib/automation-funnel/server-readiness";
import {
  planOperationsRetention,
  purgeOperationsRetention,
} from "@/lib/operations/retention";
import { deleteExpiredSharedState } from "@/lib/security/shared-state";
import { deleteExpiredAutomationConsultTickets } from "@/lib/automation-consult/queue";
import { processDueChemicalReassessments } from "@/lib/chemical/ra-governance-repository";
import { prisma } from "@/lib/prisma";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(request: NextRequest) {
  const auth = verifyBearerSecret(request, process.env.CRON_SECRET);
  if (!auth.ok) return bearerAuthError(auth);

  const readiness = getRumServerReadiness();
  const funnelReadiness = getAutomationFunnelServerReadiness();
  if (
    process.env.VERCEL_ENV !== "production" ||
    !process.env.DATABASE_URL?.trim()
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "rum_unavailable" } },
      { status: 503, headers: HEADERS },
    );
  }

  try {
    const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
    const result = dryRun
      ? await planOperationsRetention()
      : await purgeOperationsRetention();
    const sharedState = dryRun
      ? { rateBuckets: null, idempotency: null, mode: "not-deleted" as const }
      : { ...(await deleteExpiredSharedState()), mode: "deleted" as const };
    const automationConsultQueue = dryRun
      ? { deleted: null, mode: "not-deleted" as const }
      : {
          deleted: prisma
            ? await deleteExpiredAutomationConsultTickets(
                prisma as unknown as GovernanceSql,
              )
            : null,
          mode: "deleted" as const,
        };
    const chemicalReassessment = dryRun
      ? { processed: null, mode: "not-updated" as const }
      : {
          processed: prisma
            ? (
                await processDueChemicalReassessments(
                  prisma as unknown as GovernanceDatabase,
                )
              ).processed
            : null,
          mode: "updated" as const,
        };
    const complete = result.funnelStore === "available";
    return NextResponse.json(
      {
        ok: complete,
        dryRun,
        eligibleOrDeleted: result,
        sharedState,
        automationConsultQueue,
        chemicalReassessment,
        retentionDays: {
          rum: readiness.retentionDays,
          funnel: funnelReadiness.retentionDays,
        },
        retentionSource: "row-expiresAt",
      },
      { status: complete ? 200 : 502, headers: HEADERS },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "retention_cleanup_failed" } },
      { status: 503, headers: HEADERS },
    );
  }
}
