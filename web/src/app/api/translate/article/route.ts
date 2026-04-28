import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type TranslateRequest = {
  /** 翻訳対象のテキスト（タイトル+本文を改行で連結したもの） */
  text: string;
  /** 翻訳先言語コード（en / zh / vi / pt / tl） */
  targetLang: "en" | "zh" | "vi" | "pt" | "tl";
  /** リソース識別用（キャッシュキーに含める） */
  resource?: string;
  resourceId?: string;
};

export type TranslateResponse = {
  text: string;
  /** "gemini" or "placeholder" */
  source: "gemini" | "placeholder";
  /** 注意書き（プレースホルダーの場合） */
  notice?: string;
};

const LANG_NAMES: Record<TranslateRequest["targetLang"], string> = {
  en: "English",
  zh: "Simplified Chinese",
  vi: "Vietnamese",
  pt: "Brazilian Portuguese",
  tl: "Tagalog (Filipino)",
};

function buildPlaceholder(text: string, lang: TranslateRequest["targetLang"]): TranslateResponse {
  const label = LANG_NAMES[lang];
  return {
    text: `[${label} translation pending — Gemini API key not configured]\n\n${text}`,
    source: "placeholder",
    notice:
      "Gemini API key (GEMINI_API_KEY) が未設定のため、原文を返しています。サーバ環境変数を設定すると自動で翻訳されます。",
  };
}

export async function POST(request: Request) {
  let body: TranslateRequest;
  try {
    body = (await request.json()) as TranslateRequest;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.text || !body?.targetLang) {
    return NextResponse.json(
      { error: "missing_required_fields" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(buildPlaceholder(body.text, body.targetLang));
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = [
      `You are a professional translator specialized in Japanese occupational safety and health terminology.`,
      `Translate the following Japanese text into ${LANG_NAMES[body.targetLang]}.`,
      `Preserve technical terms (JIS standards, regulation names, hazard categories) accurately.`,
      `Do not add commentary; output only the translated text.`,
      ``,
      `=== Source ===`,
      body.text,
      `=== End ===`,
    ].join("\n");

    const result = await model.generateContent(prompt);
    const translated = result.response.text();

    return NextResponse.json({
      text: translated.trim(),
      source: "gemini",
    } satisfies TranslateResponse);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json(
      {
        ...buildPlaceholder(body.text, body.targetLang),
        notice: `Gemini呼び出しエラー: ${reason}`,
      },
      { status: 200 }
    );
  }
}
