import { NextResponse } from "next/server";
import { accidentCasesMock } from "@/data/mock/accident-cases";
import { computeAccidentTrend } from "@/lib/accidents/trend";
import { getMonthlySokuhouSummary } from "@/lib/accidents/monthly-sokuhou-summary";
import {
  isAccidentEligibleForOperationalEvidence,
  resolveAccidentProvenance,
} from "@/lib/accident-source";
import { cdnCacheHeaders } from "@/lib/api-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const monthsRaw = new URL(request.url).searchParams.get("months");
  const months =
    monthsRaw === "1" || monthsRaw === "3" || monthsRaw === "12"
      ? Number(monthsRaw)
      : 12;
  const eligibleCases = accidentCasesMock.filter(
    isAccidentEligibleForOperationalEvidence,
  );
  const trend = computeAccidentTrend(eligibleCases, months);
  const evidenceScope = {
    officialRepublished: eligibleCases.filter(
      (item) => resolveAccidentProvenance(item) === "mhlw",
    ).length,
    curated: eligibleCases.filter(
      (item) => resolveAccidentProvenance(item) === "curated",
    ).length,
    excludedSynthetic: accidentCasesMock.filter(
      (item) => resolveAccidentProvenance(item) === "synthetic",
    ).length,
    excludedPreliminary: accidentCasesMock.filter(
      (item) => resolveAccidentProvenance(item) === "preliminary",
    ).length,
  };
  const sokuhou = getMonthlySokuhouSummary(5);

  return NextResponse.json(
    {
      ok: true,
      source: "data_only",
      trend,
      sokuhou,
      evidenceScope,
      summary: null,
      summaryStatus: "withheld",
      aiUsed: false,
      requiresHumanReview: true,
    },
    {
      headers: {
        ...cdnCacheHeaders("DAILY"),
        "X-AI-Used": "false",
        "X-Summary-Status": "withheld",
      },
    },
  );
}
