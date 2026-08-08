import { PrismaClient } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import {
  anonymizeAutomationConsultClient,
  PostgresAutomationConsultStateStore,
} from "@/lib/automation-consult/state-store";
import { runAutomationConsultStateProbe } from "@/lib/automation-consult/production-state-probe";
import { prisma } from "@/lib/prisma";
import { bearerAuthError, verifyBearerSecret } from "@/lib/server/bearer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(request: NextRequest) {
  const auth = verifyBearerSecret(request, process.env.CRON_SECRET);
  if (!auth.ok) return bearerAuthError(auth);
  if (
    process.env.AUTOMATION_CONSULT_STATE_BACKEND?.trim().toLowerCase() !==
      "postgres" ||
    !prisma
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "shared_state_unavailable" } },
      { status: 503, headers: HEADERS },
    );
  }
  const database = prisma;

  const anonymousClientKey = anonymizeAutomationConsultClient(
    "192.0.2.1",
  );
  if (!anonymousClientKey) {
    return NextResponse.json(
      { ok: false, error: { code: "state_hash_secret_unavailable" } },
      { status: 503, headers: HEADERS },
    );
  }

  const secondClient = new PrismaClient({ log: [] });
  try {
    const report = await runAutomationConsultStateProbe({
      first: new PostgresAutomationConsultStateStore(database),
      second: new PostgresAutomationConsultStateStore(secondClient),
      anonymousClientKey,
      cleanup: async (keys, clientKey) => {
        await database.$transaction([
          database.automationConsultState.deleteMany({
            where: { key: { in: keys } },
          }),
          database.automationConsultRateBucket.deleteMany({
            where: { clientKey },
          }),
        ]);
      },
    });
    console.info(
      "[automation-consult-state-probe]",
      JSON.stringify({
        ok: report.ok,
        backend: report.backend,
        independentClients: report.independentClients,
        replay: report.idempotency.replay,
        conflict: report.idempotency.conflict,
        duplicateSuccessRows: report.idempotency.duplicateSuccessRows,
        sharedRateLimit: report.rateLimit.sharedAcrossClients,
        syntheticRowsRemoved: report.syntheticRowsRemoved,
        piiIncluded: false,
      }),
    );
    return NextResponse.json(report, {
      status: report.ok ? 200 : 503,
      headers: HEADERS,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "shared_state_probe_failed" } },
      { status: 503, headers: HEADERS },
    );
  } finally {
    await secondClient.$disconnect().catch(() => undefined);
  }
}
