/**
 * /api/ra/auto
 *
 * 旧独自式による自動リスクレベル判定は停止した。含有率、取扱量、換気、時間だけでは
 * ばく露濃度を推定できず、単位の異なる濃度基準値との比較もできないため fail closed。
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
          "自動リスクレベル判定は提供していません。製品固有の最新SDS、実測値、厚生労働省の公式CREATE-SIMPLEを使い、化学物質管理者または専門家が確認してください。",
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
