import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

/**
 * The former Blob search has no record-level primary-source verification
 * allowlist. Keep it fail-closed even when Blob credentials exist. Do not
 * parse, log, retain, or echo query terms while the corpus is quarantined.
 */
export function GET() {
  return NextResponse.json(
    {
      ok: false,
      sourceStatus: "quarantined",
      reason: "mhlw_accident_corpus_quarantined",
      total: 0,
      records: [],
      officialSearchUrl:
        "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_FND.aspx",
      message:
        "個別事故と一次資料の対応を確認できていないため、この検索APIを停止しています。厚生労働省「職場のあんぜんサイト」で確認してください。",
    },
    {
      status: 405,
      headers: {
        ...noStoreHeaders(),
        "X-Data-Status": "quarantined",
      },
    },
  );
}
