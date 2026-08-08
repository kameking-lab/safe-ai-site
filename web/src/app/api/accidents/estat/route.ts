/**
 * e-Stat accident-catalog integration is intentionally unavailable.
 *
 * The previous implementation required E_STAT_API_KEY. This repository only
 * permits key-free public data sources, so the route must remain fail-closed
 * even when a legacy environment variable is present. Do not parse, echo, log,
 * or forward the request query while the integration is quarantined.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const E_STAT_CATALOG_URL =
  "https://www.e-stat.go.jp/stat-search/database";

export async function GET(_request: Request) {
  return NextResponse.json(
    {
      ok: false,
      sourceStatus: "quarantined",
      reason: "estat_keyed_integration_not_permitted",
      total: 0,
      tables: [],
      officialCatalogUrl: E_STAT_CATALOG_URL,
      message:
        "キー付きe-Stat API連携は利用できません。必要な統計はe-Stat公式検索で確認してください。",
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Data-Status": "quarantined",
      },
    },
  );
}
