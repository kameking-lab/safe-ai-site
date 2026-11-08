/**
 * 化学物質リスクアセスメント用の物質データ（厚生労働省 CREATE-SIMPLE ver3.2.1 の物質リスト 3,417 物質）。
 *
 * 静的化: コミット済みの JSON をビルド時に一度だけ配信用に生成する（実行時のサーバー処理 0）。
 * 画面はこれを1回だけ取得し、検索と判定はすべて端末内で行う。
 */
import { NextResponse } from "next/server";
import substances from "@/data/create-simple/substances.json";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(substances, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
    },
  });
}
