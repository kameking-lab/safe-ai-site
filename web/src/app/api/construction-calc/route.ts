import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/external/fetch-with-timeout";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import { cdnCacheHeaders } from "@/lib/api-cache";
import { AI_LEGAL_DISCLAIMER } from "@/lib/gemini";
import { getCalculator, CONSTRUCTION_CALCULATORS } from "@/lib/construction-calc/registry";
import {
  routeByKeywords,
  validateExtraction,
  calculatorManifest,
} from "@/lib/construction-calc/ai-router";
import { normalizeValues, CALC_DISCLAIMER } from "@/lib/construction-calc/schema";

/**
 * 建設計算コーナーの AI 入口/出口。
 *
 * 絶対原則: 計算は決定論的な compute()（単体テストで数値固定）だけが行う。
 * AI の役割は
 *   (a) 入口 = 自由記述 → 計算機の特定と入力値の抽出（POST）。
 *       抽出値は必ず validateExtraction でスキーマ検証し、確信の持てない値は
 *       採用せず質問として返す（勝手に埋めない）。
 *   (b) 出口 = 計算結果の平易な解説（GET）。サーバー側で compute() を再実行した
 *       決定論的結果だけを材料に解説させ、新しい数値の生成は禁止する。
 * 既存 Gemini 経路（GEMINI_API_KEY・gemini-2.5-flash・サーキットブレーカ共有）を
 * 再利用し、新規 env は追加しない（Path A）。キー未設定・失敗時は決定論
 * フォールバック（キーワードルーティング / テンプレ解説）へ落ちる。
 */

const GEMINI_TIMEOUT_MS = 12_000;
const SUCCESS_CACHE = cdnCacheHeaders("INDUSTRY");
const MAX_TEXT_LENGTH = 400;

async function callGemini(prompt: string, json: boolean): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "dummy") return null;
  const data = await withCircuitBreaker(
    "gemini",
    async () => {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            ...(json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
          }),
          timeoutMs: GEMINI_TIMEOUT_MS,
        },
      );
      if (!res.ok) throw new Error(`gemini HTTP ${res.status}`);
      return (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
    },
    { failureThreshold: 4, cooldownMs: 60_000 },
  );
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

/* ------------------------------------------------------------------ */
/* POST = AI入口: 自由記述 → 計算機の特定＋入力値の抽出                    */
/* ------------------------------------------------------------------ */

type RouteResponse = {
  matched: {
    slug: string;
    title: string;
    /** 検証済みの抽出値（この値で計算機を初期表示する） */
    values: Record<string, string | number>;
    /** 読み取れなかった・確信が持てなかった値への質問 */
    questions: string[];
  } | null;
  /** matched が無い場合の候補（キーワード一致） */
  candidates: { slug: string; title: string }[];
  message: string;
  source: "ai" | "fallback";
};

function fallbackRoute(text: string): RouteResponse {
  const matches = routeByKeywords(text);
  if (matches.length === 0) {
    return {
      matched: null,
      candidates: [],
      message:
        "該当する計算機が見つかりませんでした。下の一覧から選ぶか、「玉掛け」「足場」「掘削」などの言葉を含めてお試しください。",
      source: "fallback",
    };
  }
  const top = getCalculator(matches[0].slug)!;
  // フォールバックは計算機の特定のみ（値の抽出はしない）。全フィールドを質問として返す。
  const { questions } = validateExtraction(top, {});
  return {
    matched: { slug: top.slug, title: top.title, values: {}, questions },
    candidates: matches.slice(1, 3).map((m) => ({ slug: m.slug, title: m.title })),
    message: `「${top.title}」が使えそうです（キーワード判定）。条件を入力してください。`,
    source: "fallback",
  };
}

export async function POST(req: Request) {
  let text: string;
  try {
    const body = (await req.json()) as { text?: unknown };
    text = String(body.text ?? "").trim();
  } catch {
    return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "text は必須です" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `text は${MAX_TEXT_LENGTH}文字以内で入力してください` },
      { status: 400 },
    );
  }

  const prompt =
    `あなたは建設現場向け計算機ポータルの受付です。ユーザーの自由記述に最も適合する計算機を1つ選び、` +
    `読み取れた入力値を抽出してください。\n\n` +
    `【計算機一覧】\n${calculatorManifest()}\n\n` +
    `【厳守ルール】\n` +
    `- あなたは計算をしない。判定もしない（計算はサーバーの検証済みエンジンが行う）\n` +
    `- 明記されていない値・確信が持てない値は絶対に推測して埋めない（そのフィールドを省略する）\n` +
    `- 単位の換算のみ可（例: 2t→2000（kg単位のフィールドの場合））\n` +
    `- select フィールドは必ず選択肢の value 文字列を使う\n` +
    `- 適合する計算機がなければ slug は null\n\n` +
    `【回答形式】JSONのみ: {"slug": "計算機のslug または null", "values": {"フィールドid": 値}}\n\n` +
    `【ユーザーの記述】\n${text}`;

  try {
    const raw = await callGemini(prompt, true);
    if (!raw) {
      return NextResponse.json(fallbackRoute(text));
    }
    const parsed = JSON.parse(raw) as { slug?: unknown; values?: Record<string, unknown> };
    const slug = typeof parsed.slug === "string" ? parsed.slug : null;
    const calc = slug ? getCalculator(slug) : undefined;
    if (!calc) {
      // AI が該当なしと判断 → キーワードでの次善候補も添える
      const kw = routeByKeywords(text);
      return NextResponse.json({
        matched: null,
        candidates: kw.slice(0, 2).map((m) => ({ slug: m.slug, title: m.title })),
        message:
          "この内容に対応する計算機はまだありません。近い計算機の候補と一覧からお選びください。",
        source: "ai",
      } satisfies RouteResponse);
    }
    const { values, questions } = validateExtraction(calc, parsed.values);
    return NextResponse.json({
      matched: { slug: calc.slug, title: calc.title, values, questions },
      candidates: [],
      message:
        questions.length === 0
          ? `「${calc.title}」で計算できます。読み取った条件を確認してください。`
          : `「${calc.title}」で計算できます。読み取れなかった条件が${questions.length}件あります。`,
      source: "ai",
    } satisfies RouteResponse);
  } catch (err) {
    if (!(err instanceof CircuitOpenError)) {
      console.error(
        "[construction-calc] AI routing failed:",
        err instanceof Error ? err.message : err,
      );
    }
    return NextResponse.json(fallbackRoute(text));
  }
}

/* ------------------------------------------------------------------ */
/* GET = AI出口: 決定論的な計算結果の平易な解説                            */
/* ------------------------------------------------------------------ */

function fallbackExplanation(
  calcTitle: string,
  outcome: ReturnType<NonNullable<ReturnType<typeof getCalculator>>["compute"]>,
): string {
  return (
    `【結論】${outcome.headline} — ${outcome.summary}\n\n` +
    `【計算の流れ】\n${outcome.steps.map((s) => `・${s}`).join("\n")}\n\n` +
    `【注意】\n${outcome.warnings.map((w) => `・${w}`).join("\n")}\n\n` +
    `（AI解説は現在利用できないため、${calcTitle}の計算結果をそのまま表示しています）`
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  const calc = getCalculator(slug);
  if (!calc) {
    return NextResponse.json(
      {
        error: `計算機が見つかりません: ${slug}`,
        available: CONSTRUCTION_CALCULATORS.map((c) => c.slug),
      },
      { status: 404 },
    );
  }

  // クエリから入力値を正規化（不正値は既定値へ・決定論）
  const raw: Record<string, unknown> = {};
  for (const f of calc.fields) {
    const v = url.searchParams.get(f.id);
    if (v !== null) raw[f.id] = v;
  }
  const { values } = normalizeValues(calc, raw);
  // 計算は必ずサーバー側の決定論エンジンで実行（クライアントの数値は信用しない）
  const outcome = calc.compute(values);

  const inputSummary = calc.fields
    .map((f) => {
      const v = values[f.id];
      if (f.kind === "number") return `${f.label}: ${v}${f.unit}`;
      const opt = f.options.find((o) => o.value === String(v));
      return `${f.label}: ${opt?.label ?? String(v)}`;
    })
    .join(" / ");

  const prompt =
    `以下は建設現場向け計算機「${calc.title}」の決定論的な計算結果です。` +
    `現場の作業者向けに、平易な日本語で解説してください。\n\n` +
    `【厳守ルール】\n` +
    `- 新しい数値を計算・追加しない。以下に書かれた数値・条文のみ言及できる\n` +
    `- 最初に結論を1文で言い切る\n` +
    `- なぜその結果になるのかを2〜3文で説明する\n` +
    `- 現場で気をつけることを2〜3点、箇条書きで示す\n` +
    `- 全体で300字程度。断定的な法解釈は避け、根拠条文名を添える\n\n` +
    `【入力】${inputSummary}\n` +
    `【結論】${outcome.headline} — ${outcome.summary}\n` +
    `【明細】\n${outcome.items.map((i) => `- ${i.label}: ${i.value}`).join("\n")}\n` +
    `【計算過程】\n${outcome.steps.map((s) => `- ${s}`).join("\n")}\n` +
    `【注意事項】\n${outcome.warnings.map((w) => `- ${w}`).join("\n")}\n` +
    `【根拠】${calc.basis.map((b) => b.label).join(" / ")}\n\n` +
    `回答の最後に必ず「※${AI_LEGAL_DISCLAIMER}」を付記してください。`;

  try {
    const explanation = await callGemini(prompt, false);
    if (!explanation) {
      return NextResponse.json(
        {
          explanation: fallbackExplanation(calc.title, outcome),
          source: "fallback",
          disclaimer: CALC_DISCLAIMER,
        },
        { headers: SUCCESS_CACHE },
      );
    }
    return NextResponse.json(
      { explanation, source: "ai", disclaimer: CALC_DISCLAIMER },
      { headers: SUCCESS_CACHE },
    );
  } catch (err) {
    if (!(err instanceof CircuitOpenError)) {
      console.error(
        "[construction-calc] AI explanation failed:",
        err instanceof Error ? err.message : err,
      );
    }
    // フォールバックも同一入力なら同一出力なのでキャッシュ可
    return NextResponse.json(
      {
        explanation: fallbackExplanation(calc.title, outcome),
        source: "fallback",
        disclaimer: CALC_DISCLAIMER,
      },
      { headers: SUCCESS_CACHE },
    );
  }
}
