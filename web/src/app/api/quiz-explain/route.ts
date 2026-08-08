import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";

/**
 * 旧経路は呼び出し元が正答と法令根拠を任意に指定でき、approved corpus として
 * 検証できなかった。サーバー側の問題IDから正答・根拠を解決する方式へ移行するまで廃止する。
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "この解説生成経路は廃止されました。",
      code: "ROUTE_RETIRED",
      explanation: null,
      source: "withheld",
      aiUsed: false,
    },
    {
      status: 410,
      headers: {
        ...noStoreHeaders(),
        "X-AI-Used": "false",
      },
    },
  );
}
