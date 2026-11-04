import { NextResponse } from "next/server";
import { fetchSearchConsole } from "@/lib/stats/search-console-client";
import type { StatsPeriod } from "@/lib/stats/types";
import { hasAdminPageAccess } from "@/lib/server/admin-access";
import { externalCredentialedServicesAllowed } from "@/lib/server/deployment-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePeriod(raw: string | null): StatsPeriod {
  if (raw === "7d" || raw === "30d" || raw === "90d") return raw;
  return "30d";
}

export async function GET(request: Request) {
  if (
    !externalCredentialedServicesAllowed() ||
    !(await hasAdminPageAccess().catch(() => false))
  ) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const data = await fetchSearchConsole(period);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
