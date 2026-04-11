import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchRelevantArticles, buildContextFromArticles } from "@/lib/rag-search";
import type {
  ChatApiRequest,
  ChatApiResponse,
  ApiErrorResponse,
} from "@/lib/types/api";

function jsonError(status: number, code: ApiErrorResponse["error"]["code"], message: string) {
  return NextResponse.json<ApiErrorResponse>(
    {
      error: {
        code,
        message,
        retryable: status >= 500,
      },
    },
    { status }
  );
}

function parseDelay(value: string | null, fallbackMs: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallbackMs;
  }
  return parsed;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveForceError(requestUrl: URL, request: Request) {
  return requestUrl.searchParams.get("forceError") ?? request.headers.get("x-force-error");
}

const SYSTEM_PROMPT = `あなたは労働安全衛生法の専門家AIアシスタントです。
以下のルールを厳守してください。

1. 必ず提供された法令条文のみに基づいて回答すること
2. 回答には必ず根拠条文を引用すること（「根拠：[法令名][条文番号]」の形式）
3. 法令に記載がない場合は「法令上の明確な規定は見つかりませんでした」と正直に回答すること
4. ハルシネーション（根拠のない情報の創作）は絶対に行わないこと
5. 日本語で丁寧に回答すること
6. 専門用語には補足説明を加えること
7. 現場で使える具体的な実務アドバイスを最後に1〜2行加えること`;

function buildUserPrompt(revisionTitle: string, question: string, context: string): string {
  return `以下の法令条文を参照して、労働安全担当者からの質問に答えてください。
質問は次の法改正に関連します：「${revisionTitle}」

【参照法令条文】
${context}

【質問】
${question}

上記の法令条文のみに基づいて回答してください。法令に記載がない事項については「法令上の明確な規定は見つかりませんでした」と回答してください。`;
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const delayMs = parseDelay(requestUrl.searchParams.get("delayMs"), 0);
  const forceError = resolveForceError(requestUrl, request);

  if (delayMs > 0) {
    await wait(delayMs);
  }

  if (forceError === "timeout") {
    await wait(5000);
  }
  if (forceError === "5xx") {
    return jsonError(503, "UNAVAILABLE", "チャットAPIが一時的に利用できません。");
  }
  if (forceError === "validation") {
    return jsonError(400, "VALIDATION", "チャットの入力形式が不正です。");
  }

  let body: ChatApiRequest | null = null;
  try {
    body = (await request.json()) as ChatApiRequest;
  } catch {
    return jsonError(400, "VALIDATION", "リクエストボディのJSON形式が不正です。");
  }

  const question = body?.question?.trim();
  if (!question) {
    return jsonError(400, "VALIDATION", "質問文を入力してください。");
  }

  const revisionTitle = body?.revisionTitle?.trim() || "選択中の法改正";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    return NextResponse.json<ChatApiResponse>(
      {
        reply:
          "AIチャットボット（Gemini）のAPIキーが設定されていません。\n" +
          "Vercelの環境変数 GEMINI_API_KEY を設定すると、労働安全衛生法に基づく回答を取得できます。",
      },
      { status: 200 }
    );
  }

  // RAG: 関連条文を検索しコンテキスト化
  const relevantArticles = searchRelevantArticles(`${revisionTitle} ${question}`, 10);
  const context = buildContextFromArticles(relevantArticles);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const userPrompt = buildUserPrompt(revisionTitle, question, context);
    const result = await model.generateContent(userPrompt);
    const answer = result.response.text();

    return NextResponse.json<ChatApiResponse>({ reply: answer }, { status: 200 });
  } catch (err) {
    const isOverload = err instanceof Error && err.message.toLowerCase().includes("quota");
    return jsonError(
      503,
      "UNAVAILABLE",
      isOverload
        ? "AIサービスの利用制限に達しました。しばらくしてから再試行してください。"
        : "AIサービスへの接続に失敗しました。しばらくしてから再試行してください。"
    );
  }
}
