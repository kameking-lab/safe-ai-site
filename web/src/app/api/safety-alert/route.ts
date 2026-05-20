import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_DISCLAIMER_SYSTEM_INSTRUCTION, AI_LEGAL_DISCLAIMER } from "@/lib/gemini";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import { cdnCacheHeaders, noStoreHeaders } from "@/lib/api-cache";

export const runtime = "nodejs";

// F-005: 朝礼アラートはニュース・天候・法改正の日次変動に追従。1h保持+24h SWR。
const SUCCESS_CACHE = cdnCacheHeaders("DAILY");

type AlertKind = "fatal-accident" | "weather" | "law-revision";

type RequestBody = {
  kind: AlertKind;
  title: string;
  context?: string;
};

type ResponseBody = {
  alert?: string;
  disclaimer?: string;
  error?: string;
  degraded?: boolean;
  degradedReason?: string;
};

const SYSTEM_PROMPT = `あなたは労働安全衛生の現場監督者です。朝礼や安全朝会で読み上げる短い注意喚起文を作成します。

ルール:
- 200〜350文字程度で、現場作業員が朝礼で聞いて理解できる平易な日本語で書く
- 冒頭に「本日の注意喚起」と入れて結論ファースト
- 該当する具体的な対策行動を3つ以内の箇条書きで示す
- 過度に法的に断定せず、「〜に注意」「〜を徹底」など行動を促す表現を使う
- ヘルメット・保護具などの基本装備にも触れる
${AI_DISCLAIMER_SYSTEM_INSTRUCTION}`;

function buildPrompt(kind: AlertKind, title: string, context?: string): string {
  const ctx = context ? `\n\n補足情報:\n${context}` : "";
  switch (kind) {
    case "fatal-accident":
      return `直近の死亡事故ニュースをもとに、現場の朝礼で使う注意喚起文を作成してください。\n\n事故概要: ${title}${ctx}`;
    case "weather":
      return `本日〜1週間以内に予想される警報級の悪天候をもとに、屋外作業現場の朝礼で使う注意喚起文を作成してください。\n\n気象情報: ${title}${ctx}`;
    case "law-revision":
      return `直近の労働安全衛生関連法改正をもとに、現場の朝礼で使う注意喚起文を作成してください。\n\n法改正概要: ${title}${ctx}`;
  }
}

export async function POST(request: Request): Promise<NextResponse<ResponseBody>> {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です。" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  if (!body?.kind || !body?.title?.trim()) {
    return NextResponse.json(
      { error: "kind と title は必須です。" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    return NextResponse.json(
      {
        alert:
          "（Gemini API キーが未設定のためAI生成は無効です。サンプル文）\n本日の注意喚起: " +
          body.title +
          "\n・基本装備（ヘルメット・保護具）の着用を徹底してください\n・始業前のKYで本日のリスクを再確認しましょう\n・無理な作業は避け、声かけ・指差呼称を励行してください",
        disclaimer: AI_LEGAL_DISCLAIMER,
      },
      { status: 200, headers: SUCCESS_CACHE },
    );
  }

  try {
    const text = await withCircuitBreaker(
      "gemini",
      async () => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: SYSTEM_PROMPT,
        });
        const prompt = buildPrompt(body.kind, body.title.trim(), body.context?.trim());
        const result = await model.generateContent(prompt);
        return result.response.text();
      },
      { failureThreshold: 4, cooldownMs: 60_000 }
    );
    return NextResponse.json(
      { alert: text, disclaimer: AI_LEGAL_DISCLAIMER },
      { status: 200, headers: SUCCESS_CACHE }
    );
  } catch (err) {
    const lower = err instanceof Error ? err.message.toLowerCase() : "";
    let reason = "AIサービスへの接続に失敗しました";
    if (err instanceof CircuitOpenError) reason = "AIサービスが連続失敗中（自動復旧待ち）";
    else if (lower.includes("quota") || lower.includes("429")) reason = "AIサービスの利用制限に達しました";
    console.error("[safety-alert] Gemini call failed:", err instanceof Error ? err.message : err);
    // 縮退応答はGemini復帰時に再生成すべきなのでキャッシュしない
    return NextResponse.json(
      {
        alert:
          `（AI生成は現在ご利用いただけません: ${reason}。汎用テンプレートを表示します）\n` +
          `本日の注意喚起: ${body.title}\n` +
          `・基本装備（ヘルメット・墜落制止用器具・保護具）の着用を必ず確認してください\n` +
          `・始業前KYで本日のリスクを再確認し、危険箇所では指差呼称を徹底しましょう\n` +
          `・体調不良や違和感を感じたら無理せず作業中止・声かけをしてください`,
        disclaimer: AI_LEGAL_DISCLAIMER,
        degraded: true,
        degradedReason: reason,
      },
      { status: 200, headers: noStoreHeaders() },
    );
  }
}
