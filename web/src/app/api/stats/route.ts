import { NextResponse } from "next/server";
import { fetchStats } from "@/lib/stats/ga4-client";
import type { StatsPeriod } from "@/lib/stats/types";

export const runtime = "nodejs";
// 60 分キャッシュ（GA4 が設定済みでも頻繁に叩かないように）
export const revalidate = 3600;

function parsePeriod(raw: string | null): StatsPeriod {
  if (raw === "7d" || raw === "30d" || raw === "90d") return raw;
  return "30d";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const data = await fetchStats(period);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
