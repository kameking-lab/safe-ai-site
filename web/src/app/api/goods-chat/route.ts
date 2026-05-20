/**
 * /api/goods-chat
 * 作業内容に応じた保護具選びをGemini APIで回答し、アフィリエイトリンクに誘導する。
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import { cdnCacheHeaders, noStoreHeaders } from "@/lib/api-cache";

// F-005: 同一質問に対するAI生成は概ね収束する一方、商品リンクの鮮度を考慮して5分のみ。
const SUCCESS_CACHE = cdnCacheHeaders("REALTIME");

export type GoodsChatRequest = {
  question: string;
};

export type GoodsRecommendation = {
  item: string;           // 保護具名
  reason: string;         // 必要な理由
  lawBasis: string;       // 法令根拠
  searchQuery: string;    // 検索クエリ (Amazon/楽天)
};

export type GoodsChatResponse = {
  reply: string;
  recommendations: GoodsRecommendation[];
  /** AI 生成が失敗してフォールバック応答を返したことを示すフラグ */
  degraded?: boolean;
  degradedReason?: string;
};

const FALLBACK_RECOMMENDATIONS: GoodsRecommendation[] = [
  {
    item: "保護帽（産業用ヘルメット）",
    reason: "現場立入時の頭部保護として全業種で標準",
    lawBasis: "安衛則第539条",
    searchQuery: "保護帽 産業用ヘルメット JIS T8131",
  },
  {
    item: "安全靴（JIS T8101適合）",
    reason: "足への飛来落下物・釘の踏み抜き防止",
    lawBasis: "安衛則第558条",
    searchQuery: "安全靴 JIS T8101",
  },
  {
    item: "保護手袋",
    reason: "切創・摩擦・薬品からの手指保護（作業に応じて選定）",
    lawBasis: "安衛則第594条",
    searchQuery: "作業用 保護手袋",
  },
];

function buildDegradedResponse(question: string, reason: string): GoodsChatResponse {
  return {
    reply:
      `（AI生成は現在ご利用いただけません: ${reason}。汎用の保護具候補を表示します。）\n\n` +
      `ご質問: ${question}\n\n` +
      `作業内容や環境（高所・化学物質・粉塵など）が具体的に分かれば、後ほどAIで再選定できます。`,
    recommendations: FALLBACK_RECOMMENDATIONS,
    degraded: true,
    degradedReason: reason,
  };
}

const SYSTEM_PROMPT = `あなたは労働安全衛生法の専門家で、現場の保護具選定を支援するアドバイザーです。

ユーザーが作業内容・作業環境を入力したら、以下の形式で回答してください。

【回答形式】
1. 作業リスクの簡潔な説明（2〜3行）
2. 必要な保護具リスト（JSON形式で返す）
3. 着用・使用時の重要な注意点

【JSONブロックのフォーマット】
必ず以下の形式でJSONをコードブロック内に記述してください：
\`\`\`json
[
  {
    "item": "保護具名",
    "reason": "この作業で必要な理由（1行）",
    "lawBasis": "根拠法令（安衛則第○条等）",
    "searchQuery": "Amazon/楽天での検索キーワード"
  }
]
\`\`\`

【ルール】
- 実際の労働安全衛生法・同施行規則・各種省令に基づいて回答する
- 法令に根拠がある場合は必ず条文を引用する
- 保護具は3〜6件を目安に、優先度の高いものから列挙する
- 不明な場合は「専門家への相談を推奨します」と明記する
- 回答は日本語で、現場担当者が理解しやすい表現を使う`;

function extractRecommendations(reply: string): GoodsRecommendation[] {
  const match = reply.match(/```json\s*([\s\S]*?)```/);
  if (!match?.[1]) return [];
  try {
    const parsed = JSON.parse(match[1]) as GoodsRecommendation[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        typeof item.item === "string" &&
        typeof item.reason === "string" &&
        typeof item.lawBasis === "string" &&
        typeof item.searchQuery === "string"
    );
  } catch {
    return [];
  }
}

function removeJsonBlock(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim();
}

export async function POST(request: Request) {
  let body: GoodsChatRequest | null = null;
  try {
    body = (await request.json()) as GoodsChatRequest;
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "リクエスト形式が不正です。" } },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const question = body?.question?.trim();
  if (!question || question.length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "作業内容を入力してください。" } },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    // APIキー未設定時はデモ回答
    const demoResponse: GoodsChatResponse = {
      reply:
        "【デモ回答】Gemini APIキー（GEMINI_API_KEY）が設定されていません。\n\n" +
        "一般的な高所作業（2m以上）の場合、以下の保護具が必要です：\n" +
        "フルハーネス型墜落制止用器具（高さ6.75m超では義務）、安全帽、安全靴など。\n\n" +
        "実際の推奨は作業内容・環境を入力してご確認ください。",
      recommendations: [
        {
          item: "フルハーネス型墜落制止用器具",
          reason: "高所作業（6.75m超）での墜落防止に必須",
          lawBasis: "安衛則第518条・第519条",
          searchQuery: "フルハーネス 墜落制止用器具",
        },
        {
          item: "保護帽（産業用ヘルメット）",
          reason: "飛来落下物・墜落時の頭部保護",
          lawBasis: "安衛則第539条",
          searchQuery: "保護帽 産業用ヘルメット JIS T8131",
        },
        {
          item: "安全靴（JIS T8101適合）",
          reason: "足への飛来落下物・踏み抜き防止",
          lawBasis: "安衛則第558条",
          searchQuery: "安全靴 JIS T8101",
        },
      ],
    };
    return NextResponse.json(demoResponse, { status: 200, headers: SUCCESS_CACHE });
  }

  const userPrompt = `以下の作業内容・環境に対して、必要な保護具を推薦してください。

【作業内容・環境】
${question}

保護具の選定根拠となる法令条文を引用し、JSONブロックに含めて回答してください。`;

  try {
    const rawReply = await withCircuitBreaker(
      "gemini",
      async () => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: SYSTEM_PROMPT,
        });
        const result = await model.generateContent(userPrompt);
        return result.response.text();
      },
      { failureThreshold: 4, cooldownMs: 60_000 }
    );
    const recommendations = extractRecommendations(rawReply);
    const cleanReply = removeJsonBlock(rawReply);
    const response: GoodsChatResponse = { reply: cleanReply, recommendations };
    return NextResponse.json(response, { status: 200, headers: SUCCESS_CACHE });
  } catch (err) {
    const lower = err instanceof Error ? err.message.toLowerCase() : "";
    let reason = "AIサービス接続エラー";
    if (err instanceof CircuitOpenError) reason = "AIサービスが連続失敗中（自動復旧待ち）";
    else if (lower.includes("quota") || lower.includes("429")) reason = "APIクォータ超過";
    else if (lower.includes("timeout")) reason = "AI応答タイムアウト";
    console.error("[goods-chat] Gemini call failed:", err instanceof Error ? err.message : err);
    // 縮退応答はGemini復帰時に再生成すべきなのでキャッシュしない
    return NextResponse.json(buildDegradedResponse(question, reason), {
      status: 200,
      headers: noStoreHeaders(),
    });
  }
}
