import { NextRequest, NextResponse } from "next/server";

interface QuizExplainRequest {
  questionText: string;
  choices: { label: string; text: string }[];
  correctAnswer: string;
  selectedAnswer: string | null;
  relatedLaw?: string;
  fallbackExplanation?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as QuizExplainRequest;
  const { questionText, choices, correctAnswer, relatedLaw, fallbackExplanation } = body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      explanation: fallbackExplanation ?? "解説は準備中です。",
      source: "fallback",
    });
  }

  const choicesText = choices
    .map((c) => `${c.label}. ${c.text}`)
    .join("\n");

  const prompt = `以下は労働安全コンサルタント試験の問題です。

【問題】
${questionText}

【選択肢】
${choicesText}

【正答】${correctAnswer}
${relatedLaw ? `【関連法令】${relatedLaw}` : ""}

以下の点を含めて、わかりやすく解説してください（200〜300字程度）：
1. なぜ正答が正しいのか
2. 誤りやすい選択肢の解説
3. 試験で覚えるべきポイント`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({
        explanation: fallbackExplanation ?? "解説は準備中です。",
        source: "fallback",
      });
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return NextResponse.json({
      explanation: text || fallbackExplanation || "解説は準備中です。",
      source: text ? "ai" : "fallback",
    });
  } catch {
    return NextResponse.json({
      explanation: fallbackExplanation ?? "解説は準備中です。",
      source: "fallback",
    });
  }
}
