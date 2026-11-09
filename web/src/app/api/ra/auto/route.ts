/**
 * /api/ra/auto
 *
 * 旧独自式（ra-engine）による判定APIは廃止済み。常に 503 を返す。
 * 化学物質のリスクレベル判定は /chemical-ra（厚生労働省 CREATE-SIMPLE の手法に基づく計算、
 * 実装は src/lib/create-simple/）で行う。
 */
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "リクエスト形式が不正です。" } },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "ASSESSMENT_UNAVAILABLE",
        message:
          "このAPIは廃止しました。化学物質のリスクレベル判定は /chemical-ra（化学物質リスクアセスメント）で行えます。",
      },
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "86400",
      },
    },
  );
}
