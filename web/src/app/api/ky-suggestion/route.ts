import { NextResponse } from "next/server";
import { suggestKyByIndustryAndWork } from "@/lib/ky-suggestion";
import {
  KY_INDUSTRY_IDS,
  KY_WORK_TYPE_IDS,
  type KyIndustryId,
  type KyWorkTypeId,
} from "@/types/ky-example";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const industryRaw = typeof body.industry === "string" ? body.industry : null;
  const workTypeRaw = typeof body.workType === "string" ? body.workType : null;
  const freeText =
    typeof body.q === "string" ? body.q.slice(0, 500) : undefined;
  const limitRaw = typeof body.limit === "number" ? body.limit : null;

  const industry = isIndustry(industryRaw) ? industryRaw : undefined;
  const workType = isWorkType(workTypeRaw) ? workTypeRaw : undefined;

  const safety = freeText ? evaluateChatbotSafety(freeText) : null;
  if (safety) {
    return NextResponse.json(
      {
        results: [],
        reason: safety.kind,
        message: safety.response,
        query: { industry, workType, freeText: null, limit: 0 },
      },
      {
        status: 422,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  let limit = 12;
  if (limitRaw !== null) {
    if (Number.isFinite(limitRaw) && limitRaw > 0) {
      limit = Math.min(Math.trunc(limitRaw), 30);
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
    { status: 200, headers: { "Cache-Control": "private, no-store" } }
  );
}

export function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    {
      status: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
    },
  );
}

function isIndustry(value: string | null): value is KyIndustryId {
  return value !== null && (KY_INDUSTRY_IDS as readonly string[]).includes(value);
}

function isWorkType(value: string | null): value is KyWorkTypeId {
  return value !== null && (KY_WORK_TYPE_IDS as readonly string[]).includes(value);
}
