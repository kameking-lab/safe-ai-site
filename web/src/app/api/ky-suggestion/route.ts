import { NextResponse } from "next/server";
import { suggestKyByIndustryAndWork } from "@/lib/ky-suggestion";
import {
  KY_INDUSTRY_IDS,
  KY_WORK_TYPE_IDS,
  type KyIndustryId,
  type KyWorkTypeId,
} from "@/types/ky-example";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const industryRaw = url.searchParams.get("industry");
  const workTypeRaw = url.searchParams.get("workType");
  const freeText = url.searchParams.get("q") ?? undefined;
  const limitRaw = url.searchParams.get("limit");

  const industry = isIndustry(industryRaw) ? industryRaw : undefined;
  const workType = isWorkType(workTypeRaw) ? workTypeRaw : undefined;

  let limit = 12;
  if (limitRaw) {
    const parsed = Number.parseInt(limitRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(parsed, 30);
    }
  }

  const results = suggestKyByIndustryAndWork({
    industry,
    workType,
    freeText,
    limit,
  });

  return NextResponse.json(
    {
      results: results.map((r) => ({
        id: r.example.id,
        industry: r.example.industry,
        workType: r.example.workType,
        title: r.example.title,
        hazards: r.example.hazards,
        risks: r.example.risks,
        countermeasures: r.example.countermeasures,
        keywords: r.example.keywords,
        source: r.example.source,
        score: r.score,
        matchedOn: r.matchedOn,
      })),
      query: { industry, workType, freeText, limit },
    },
    { status: 200 }
  );
}

function isIndustry(value: string | null): value is KyIndustryId {
  return value !== null && (KY_INDUSTRY_IDS as readonly string[]).includes(value);
}

function isWorkType(value: string | null): value is KyWorkTypeId {
  return value !== null && (KY_WORK_TYPE_IDS as readonly string[]).includes(value);
}
