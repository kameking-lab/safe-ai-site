import { NextResponse } from "next/server";
import { fetchPageAnalytics } from "@/lib/stats/page-analytics-client";
import type { StatsPeriod } from "@/lib/stats/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePeriod(raw: string | null): StatsPeriod {
  if (raw === "7d" || raw === "30d" || raw === "90d") return raw;
  return "30d";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const data = await fetchPageAnalytics(period);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-cache, must-revalidate" },
  });
}
