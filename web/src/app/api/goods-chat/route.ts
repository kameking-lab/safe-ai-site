import { NextResponse } from "next/server";
import { matchGoodsCategories, PPE_SELECTION_CHECKLIST } from "@/lib/goods-chat-selection";
import { noStoreHeaders } from "@/lib/api-cache";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type GoodsChatRequest = {
  question: string;
  aiProviderConsent?: boolean;
};

/**
 * 後方互換のため型は残す。ただし、検証済みの製品データと選定根拠を結び付けられるまで
 * API から商品推薦を返してはならない。
 */
export type GoodsRecommendation = {
  item: string;
  reason: string;
  lawBasis: string;
  searchQuery: string;
};

export type GoodsChatResponse = {
  reply: string;
  recommendations: GoodsRecommendation[];
  matchedCategories: Array<{
    id: string;
    reason: string;
  }>;
  checklist: string[];
  selectionStatus: "withheld";
  requiresHumanReview: true;
  aiUsed: false;
  degraded: true;
  degradedReason: "product_suitability_unverified";
};

function responseHeaders(): Record<string, string> {
  return {
    ...noStoreHeaders(),
    "X-AI-Used": "false",
    "X-Selection-Status": "withheld",
  };
}

export async function POST(request: Request) {
  let body: GoodsChatRequest;
  try {
    body = (await request.json()) as GoodsChatRequest;
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "リクエスト形式が不正です。" } },
      { status: 400, headers: responseHeaders() },
    );
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "作業条件を入力してください。" } },
      { status: 400, headers: responseHeaders() },
    );
  }
  const safety = evaluateChatbotSafety(question);
  if (safety) {
    return NextResponse.json(
      {
        error: {
          code: safety.kind === "emergency" ? "EMERGENCY" : "SAFETY_HOLD",
          message: safety.response,
        },
        selectionStatus: "withheld",
        recommendations: [],
        checklist: [],
        aiUsed: false,
        requiresHumanReview: true,
      },
      { status: 422, headers: responseHeaders() },
    );
  }
  if (question.length > 2_000) {
    return NextResponse.json(
      { error: { code: "TOO_LARGE", message: "入力は2,000文字以内にしてください。" } },
      { status: 413, headers: responseHeaders() },
    );
  }

  const response: GoodsChatResponse = {
    reply:
      "入力内容から関連する保護具・安全用品のカテゴリ候補を整理しました。特定製品の適合性は判定していないため、次の条件を人が確認してから選定してください。",
    recommendations: [],
    matchedCategories: matchGoodsCategories(question),
    checklist: [...PPE_SELECTION_CHECKLIST],
    selectionStatus: "withheld",
    requiresHumanReview: true,
    aiUsed: false,
    degraded: true,
    degradedReason: "product_suitability_unverified",
  };

  return NextResponse.json(response, { status: 200, headers: responseHeaders() });
}
