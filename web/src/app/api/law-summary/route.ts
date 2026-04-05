import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { law, articleNum, text } = (await req.json()) as {
    law: string;
    articleNum: string;
    text: string;
  };

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "dummy") {
    return NextResponse.json({
      summary: `【AI要約（フォールバック）】\n${law} ${articleNum}\n\n${text.slice(0, 200)}${text.length > 200 ? "…" : ""}\n\n（GEMINI_API_KEYが未設定のため、条文テキストの冒頭を表示しています。）`,
    });
  }

  const prompt = `以下の労働安全衛生法令の条文を、現場担当者向けに3〜5行で分かりやすく要約してください。法令名・条番号を冒頭に示し、重要なポイントを箇条書きで補足してください。\n\n法令: ${law} ${articleNum}\n\n条文:\n${text}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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
