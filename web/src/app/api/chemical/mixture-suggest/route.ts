import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retired 2026-07-23.
 *
 * The former endpoint accepted composition only but generated ventilation,
 * PPE and work-control suggestions without server-validated quantity, time,
 * frequency, temperature, dispersion, skin-contact and existing-control
 * conditions. That is not a safe basis for occupational-hygiene advice.
 * Do not read or log the body; callers must use the latest product SDS and
 * the official assessment workflow with a qualified human reviewer.
 */
export async function POST(_request: Request) {
  return NextResponse.json(
    {
      ok: false,
      reason: "retired_for_safety",
      message:
        "このAI提案機能は安全上の理由で終了しました。最新SDSと公式評価手順を使い、化学物質管理者または専門家へ確認してください。",
      requiresHumanReview: true,
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
