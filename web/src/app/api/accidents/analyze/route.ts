import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OFFICIAL_ACCIDENT_SEARCH_URL =
  "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_FND.aspx";

function responseHeaders(): Record<string, string> {
  return {
    ...noStoreHeaders(),
    "X-AI-Used": "false",
    "X-Advice-Status": "withheld",
    "X-Data-Status": "quarantined",
  };
}

/**
 * The previous local accident corpus cannot currently be traced back to an
 * individual official record. Keep the endpoint fail-closed until an
 * independently reviewed allowlist exists. In particular, do not parse,
 * retain, log, score, or echo the submitted work description.
 */
export async function POST(request: Request) {
  let body: { workContent?: unknown };
  try {
    body = (await request.json()) as { workContent?: unknown };
  } catch {
    // Keep the quarantine response shape even for malformed input so this
    // retired path never becomes an oracle for hidden records.
    body = {};
  }
  const workContent =
    typeof body.workContent === "string" ? body.workContent : "";
  const safety = evaluateChatbotSafety(workContent);
  if (safety) {
    return NextResponse.json(
      {
        ok: false,
        reason: safety.kind === "emergency" ? "emergency" : "safety_hold",
        sourceStatus: "withheld",
        advice: null,
        adviceStatus: "withheld",
        aiUsed: false,
        requiresHumanReview: true,
        relatedCases: [],
        message: safety.response,
      },
      { status: 422, headers: responseHeaders() },
    );
  }
  return NextResponse.json(
    {
      ok: false,
      reason: "accident_corpus_quarantined",
      sourceStatus: "quarantined",
      advice: null,
      adviceStatus: "withheld",
      aiUsed: false,
      requiresHumanReview: true,
      relatedCases: [],
      officialSearchUrl: OFFICIAL_ACCIDENT_SEARCH_URL,
      message:
        "個別事故の一次資料との対応を確認できていないため、関連事例の自動抽出を停止しています。厚生労働省「職場のあんぜんサイト」で一次情報を確認してください。",
    },
    { status: 503, headers: responseHeaders() },
  );
}
