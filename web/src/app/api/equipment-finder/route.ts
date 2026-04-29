import { NextResponse } from "next/server";
import { recommendEquipment, type RecommendInput } from "@/lib/equipment-recommendation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/equipment-finder?industry=construction&hazard=fall&season=summer&budget=50000
export async function GET(req: Request) {
  const url = new URL(req.url);
  const industry = url.searchParams.get("industry") ?? undefined;
  const hazard = url.searchParams.get("hazard") ?? undefined;
  const season = url.searchParams.get("season") ?? undefined;
  const budgetParam = url.searchParams.get("budget");
  let budgetCap: number | undefined;
  if (budgetParam !== null && budgetParam !== "" && budgetParam !== "any") {
    const parsed = Number(budgetParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      budgetCap = parsed;
    }
  }

  const input: RecommendInput = {
    industry: industry || undefined,
    hazard: hazard || undefined,
    season: season || undefined,
    budgetCap,
  };

  const result = recommendEquipment(input);
  return NextResponse.json(
    {
      input,
      totalCandidates: result.totalCandidates,
      top: result.top,
      others: result.others,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    }
  );
}
