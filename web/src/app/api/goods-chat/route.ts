import { NextResponse } from "next/server";
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
  checklist: string[];
  selectionStatus: "withheld";
  requiresHumanReview: true;
  aiUsed: false;
  degraded: true;
  degradedReason: "product_suitability_unverified";
};

export const PPE_SELECTION_CHECKLIST = [
  "作業、危険源、ばく露経路、使用時間、頻度を特定する",
  "化学物質を扱う場合は、最新版SDSの第8項などで推奨保護具を確認する",
  "必要な国家検定、JIS等の規格、性能区分と使用期限を確認する",
  "顔面・身体へのフィット、他の保護具との干渉、サイズを実装着で確認する",
  "交換時期、点検、洗浄、保管、教育の手順を決める",
  "保護具だけに頼らず、代替、隔離、局所排気、作業方法の改善を先に検討する",
  "安全衛生担当者、保護具着用管理責任者、メーカー等へ適合性を確認する",
] as const;

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
      "製品の適合性と法令根拠を検証できないため、自動の商品推薦は停止しています。次の条件を人が確認してから製品を選定してください。",
    recommendations: [],
    checklist: [...PPE_SELECTION_CHECKLIST],
    selectionStatus: "withheld",
    requiresHumanReview: true,
    aiUsed: false,
    degraded: true,
    degradedReason: "product_suitability_unverified",
  };

  return NextResponse.json(response, { status: 200, headers: responseHeaders() });
}
