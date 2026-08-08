import { NextResponse, type NextRequest } from "next/server";
import { bearerAuthError, verifyBearerSecret } from "@/lib/server/bearer-auth";
import { runProductionSearchConsoleOperations } from "@/lib/search-console/production-operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(request: NextRequest) {
  const auth = verifyBearerSecret(request, process.env.CRON_SECRET);
  if (!auth.ok) return bearerAuthError(auth);
  if (
    process.env.VERCEL_ENV !== "production" ||
    process.env.SEARCH_CONSOLE_OPERATIONS_ENABLED?.trim().toLowerCase() !==
      "true"
  ) {
    return NextResponse.json(
      {
        ok: false,
        operationStatus: "blocked-external",
        error: { code: "search_console_operations_disabled" },
      },
      { status: 503, headers: HEADERS },
    );
  }

  const report = await runProductionSearchConsoleOperations({
    allowMutations: true,
    inspectUrls: true,
  });
  const inspectionFailureCount = report.urlInspection.results.filter(
    (result) => result.status !== "active",
  ).length;
  const inspectionComplete =
    report.urlInspection.requested &&
    report.urlInspection.results.length ===
      report.urlInspection.productionUrls &&
    inspectionFailureCount === 0;
  const sitemapComplete =
    report.sitemap.submissionResult === "submitted" ||
    (report.sitemap.submissionResult === "already-submitted" &&
      (report.sitemap.errors ?? 0) === 0);
  const complete =
    report.access === "active" &&
    !report.failure &&
    sitemapComplete &&
    inspectionComplete;
  const operationStatus =
    report.access !== "active"
      ? "blocked-external"
      : complete
        ? "active"
        : "partial-failure";
  console.info(
    "[search-console-operations]",
    JSON.stringify({
      access: report.access,
      sitemap: report.sitemap.submissionResult,
      sitemapErrors: report.sitemap.errors,
      sitemapWarnings: report.sitemap.warnings,
      inspectedProductionUrls: report.urlInspection.results.length,
      inspectedPreviewUrls: report.urlInspection.previewUrls,
      inspectedHeatHoldUrls: report.urlInspection.heatHoldUrls,
      inspectionFailureCount,
      operationStatus,
      failure: report.failure?.code ?? null,
    }),
  );
  return NextResponse.json(
    { ok: complete, operationStatus, inspectionFailureCount, ...report },
    {
      status: report.access !== "active" ? 503 : complete ? 200 : 502,
      headers: HEADERS,
    },
  );
}
