import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";

/**
 * 任意本文を approved corpus として外部AIへ送る旧経路は廃止した。
 * サーバー側resource ID解決、用語集、対訳レビュー、版管理が整うまで本文訳を返さない。
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "article_translation_withheld",
      message:
        "未監修の機械翻訳を安全・法令情報として表示しないため、本文の自動翻訳を停止しています。日本語原文と公式資料を確認してください。",
      text: null,
      source: "withheld",
      aiUsed: false,
      requiresHumanReview: true,
    },
    {
      status: 410,
      headers: {
        ...noStoreHeaders(),
        "X-AI-Used": "false",
        "X-Translation-Status": "withheld",
      },
    },
  );
}
