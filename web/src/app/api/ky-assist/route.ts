import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

/**
 * Retired legacy endpoint.
 *
 * It previously accepted arbitrary work context and returned ungrounded risk
 * scores without the consent, provenance, and human-approval gates used by
 * /api/ky/suggest. Do not parse, log, retain, score, or echo the request body.
 */
export async function POST(_request: Request) {
  return NextResponse.json(
    {
      ok: false,
      reason: "legacy_ky_assist_retired",
      replacement: "/api/ky/suggest",
      message:
        "旧KY補助APIは停止しました。KY用紙の確認付き候補機能を利用してください。",
    },
    {
      status: 410,
      headers: {
        ...noStoreHeaders(),
        "X-Feature-Status": "retired",
      },
    },
  );
}
