import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchRelevantArticlesWithScore, buildContextFromArticles, formatSourceCitations } from "@/lib/rag-search";
import type { LawArticle } from "@/data/laws";

export type ChatbotRequest = {
  message: string;
  history?: Array<{ role: string; content: string }>;
};

export type ChatbotSource = {
  law: string;
  article: string;
  text: string;
};

export type ChatbotResponse = {
  answer: string;
  sources: ChatbotSource[];
  source_type: "rag" | "ai_inference";
  confidence: "high" | "medium" | "low";
};

type ApiErrorBody = {
  error: string;
  retryable: boolean;
};

function jsonError(status: number, message: string, retryable = false) {
  return NextResponse.json<ApiErrorBody>({ error: message, retryable }, { status });
}

const SYSTEM_PROMPT = `あなたは労働安全衛生法の専門家AIアシスタントです。
以下のルールを厳守してください。

1. 必ず提供された法令条文のみに基づいて回答すること
2. 回答には必ず根拠条文を引用すること（「根拠：[法令名][条文番号]」の形式）
3. 法令に記載がない場合や不明確な場合は「法令上の明確な規定は見つかりませんでした」と正直に回答すること
4. ハルシネーション（根拠のない情報の創作）は絶対に行わないこと
5. 日本語で丁寧に回答すること
6. 専門用語には補足説明を加えること

回答の形式：
- まず質問への直接的な回答を述べる
- 次に根拠となる条文を引用する（「根拠：安衛法第○条」等）
- 必要に応じて補足説明を加える`;

function buildUserPrompt(question: string, context: string): string {
  return `以下の法令条文を参照して、質問に答えてください。

【参照法令条文】
${context}

【質問】
${question}

上記の法令条文のみに基づいて回答してください。法令に記載がない事項については「法令上の明確な規定は見つかりませんでした」と回答してください。`;
}

export async function POST(request: Request) {
  let body: ChatbotRequest | null = null;
  try {
    body = (await request.json()) as ChatbotRequest;
  } catch {
    return jsonError(400, "リクエストボディのJSON形式が不正です。");
  }

  const message = body?.message?.trim();
  if (!message) {
    return jsonError(400, "質問文を入力してください。");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    // APIキー未設定時はフォールバックレスポンス
    return NextResponse.json<ChatbotResponse>(
      {
        answer:
          "現在、AIチャットボット機能はAPIキーが設定されていないため利用できません。\n\n" +
          "GEMINI_API_KEYを環境変数に設定することで、労働安全衛生法に関するご質問にお答えできます。",
        sources: [],
        source_type: "ai_inference",
        confidence: "medium",
      },
      { status: 200 }
    );
  }

  // RAG: 関連条文の検索（スコア付き）
  const { articles: relevantArticles, normalizedScore } = searchRelevantArticlesWithScore(message, 10);
  const context = buildContextFromArticles(relevantArticles);

  const hasRagHits = relevantArticles.length > 0;
  const source_type: "rag" | "ai_inference" = hasRagHits ? "rag" : "ai_inference";
  const confidence: "high" | "medium" | "low" = hasRagHits
    ? normalizedScore >= 0.8 ? "high" : normalizedScore >= 0.5 ? "medium" : "low"
    : "medium";

  // Gemini Flash API呼び出し
  console.log("[chatbot] API key present:", !!apiKey);
  let answer: string;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const userPrompt = buildUserPrompt(message, context);
    console.log("[chatbot] Calling Gemini API, question length:", message.length);
    const result = await model.generateContent(userPrompt);
    answer = result.response.text();
    console.log("[chatbot] Gemini API response received, answer length:", answer.length);
  } catch (err) {
    console.error("[chatbot] Gemini API error:", err instanceof Error ? err.message : String(err));
    const isOverload =
      err instanceof Error && err.message.toLowerCase().includes("quota");
    return jsonError(
      503,
      isOverload
        ? "AIサービスの利用制限に達しました。しばらくしてから再試行してください。"
        : "AIサービスへの接続に失敗しました。しばらくしてから再試行してください。",
      true
    );
  }

  // 出典引用を回答末尾に追記
  if (relevantArticles.length > 0) {
    answer += formatSourceCitations(relevantArticles);
  }

  // sourcesを整形
  const sources: ChatbotSource[] = relevantArticles.map((a: LawArticle) => ({
    law: `${a.law}（${a.lawShort}）`,
    article: a.articleNum + (a.articleTitle ? `「${a.articleTitle}」` : ""),
    text: a.text.length > 200 ? a.text.slice(0, 200) + "…" : a.text,
  }));

  return NextResponse.json<ChatbotResponse>({ answer, sources, source_type, confidence }, { status: 200 });
}
