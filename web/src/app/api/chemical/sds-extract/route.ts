import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SDSには供給者名、担当者、電話番号、署名等が含まれ得る。ローカルでのプレビュー、
 * 匿名化、項目ごとの原文照合が整うまではファイルを受信・外部送信しない。
 */
export async function POST(_request: Request) {
  return NextResponse.json(
    {
      ok: false,
      reason: "uninspectable_binary",
      message:
        "ファイル内の個人情報・機密情報を送信前に検査できないため、SDS取込みを停止しています。製品名またはCAS番号を手入力し、最新SDSの原文を確認してください。",
      extracted: null,
      aiUsed: false,
      requiresHumanReview: true,
    },
    {
      status: 422,
      headers: {
        ...noStoreHeaders(),
        "X-AI-Used": "false",
        "X-Extraction-Status": "withheld",
      },
    },
  );
}
