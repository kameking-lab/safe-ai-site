import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const quizExplainSchema = z.object({
  questionText: z.string().min(1, "問題文を入力してください。").max(2000, "問題文は2000文字以内で入力してください。"),
  choices: z.array(z.object({
    label: z.string().max(10),
    text: z.string().max(500),
  })).min(1).max(10),
  correctAnswer: z.string().max(10, "正答は10文字以内で入力してください。"),
  selectedAnswer: z.string().max(10).nullable().optional(),
  relatedLaw: z.string().max(200, "関連法令は200文字以内で入力してください。").optional(),
  fallbackExplanation: z.string().max(1000, "フォールバック解説は1000文字以内で入力してください。").optional(),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディのJSON形式が不正です。" }, { status: 400 });
  }

  const parsed = quizExplainSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "入力内容が不正です。" }, { status: 400 });
  }

  const { questionText, choices, correctAnswer, relatedLaw, fallbackExplanation } = parsed.data;

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
