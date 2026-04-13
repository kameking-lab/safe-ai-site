import { NextResponse } from "next/server";
import { z } from "zod";

const lawSummarySchema = z.object({
  law: z.string().min(1, "法令名を入力してください。").max(100, "法令名は100文字以内で入力してください。"),
  articleNum: z.string().min(1, "条文番号を入力してください。").max(50, "条文番号は50文字以内で入力してください。"),
  text: z.string().min(1, "条文テキストを入力してください。").max(5000, "条文テキストは5000文字以内で入力してください。"),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディのJSON形式が不正です。" }, { status: 400 });
  }

  const parsed = lawSummarySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "入力内容が不正です。" }, { status: 400 });
  }

  const { law, articleNum, text } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "dummy") {
    return NextResponse.json({
      summary: `【AI要約（フォールバック）】\n${law} ${articleNum}\n\n${text.slice(0, 200)}${text.length > 200 ? "…" : ""}\n\n（GEMINI_API_KEYが未設定のため、条文テキストの冒頭を表示しています。）`,
    });
  }

  const prompt = `以下の労働安全衛生法令の条文を、現場担当者向けに3〜5行で分かりやすく要約してください。法令名・条番号を冒頭に示し、重要なポイントを箇条書きで補足してください。\n\n法令: ${law} ${articleNum}\n\n条文:\n${text}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { summary: `API呼び出しエラー (${res.status})。管理者にご連絡ください。` },
      { status: 500 }
    );
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "要約を生成できませんでした。";
  return NextResponse.json({ summary });
}
