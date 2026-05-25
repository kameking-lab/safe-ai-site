/**
 * KY全面再設計 Phase 5: Gemini 本接続による危険箇所の提案。
 *
 * 入力: 作業内容（自由記述）＋ 過去の類似KY事例（RAG: ky-suggestion で150件から検索）。
 * 出力: 危険のポイント・対策・可能性(1-3)・重大性(1-3)・評価値・根拠 の構造化提案。
 *
 * 設計:
 *  - 既存擬似AI（buildRiskAssessmentTable）を二段フォールバックの2段目に温存。
 *  - ハルシネーション対策: 各提案が過去事例に裏付けられるか（grounded）を判定して明示。
 *  - SDK 呼び出しは generate を差し替え可能にし、純ロジック（プロンプト/パース/検証）を単体テスト可能に。
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { evalScore, riskGrade } from "@/lib/ky/pulldown-options";
import { buildRiskAssessmentTable } from "@/data/mock/ky-assist-responses";
import { AI_LEGAL_DISCLAIMER } from "@/lib/gemini";
import type { KySuggestionResult } from "@/lib/ky-suggestion";

const MODEL = "gemini-2.5-flash";

export type KyHazardSuggestion = {
  /** 危険のポイント（1R） */
  hazard: string;
  /** 対策（3R） */
  reduction: string;
  likelihood: 1 | 2 | 3;
  severity: 1 | 2 | 3;
  /** 評価値（= 可能性×重大性のスコア） */
  evaluation: number;
  /** リスクレベル表示用ラベル */
  riskLabel: string;
  /** 根拠（なぜこの危険か。事例番号や一般的知見の別を明記） */
  basis: string;
  /** 過去の類似事例に裏付けがあるか（ハルシネーション対策の目印） */
  grounded: boolean;
};

export type HazardSuggestionResponse = {
  source: "gemini" | "fallback";
  suggestions: KyHazardSuggestion[];
  disclaimer: string;
  note?: string;
};

export type GeminiGenerate = (system: string, user: string) => Promise<string>;

function resolveApiKey(): string | null {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return k && k.trim() && k !== "dummy" ? k : null;
}

/** Gemini が利用可能か（APIキーが設定されているか）。 */
export function isGeminiConfigured(): boolean {
  return resolveApiKey() !== null;
}

function clampLevel(v: unknown): 1 | 2 | 3 {
  const n = Math.round(Number(v));
  if (n <= 1 || Number.isNaN(n)) return 1;
  if (n >= 3) return 3;
  return 2;
}

function formatExample(r: KySuggestionResult, idx: number): string {
  const e = r.example;
  return [
    `事例${idx + 1}（${e.title}）`,
    `  危険: ${e.hazards.join(" / ") || "—"}`,
    `  対策: ${e.countermeasures.join(" / ") || "—"}`,
  ].join("\n");
}

/** Gemini へ渡すシステム/ユーザープロンプトを組み立てる（純関数・テスト可能）。 */
export function buildHazardPrompt(
  workContent: string,
  examples: KySuggestionResult[]
): { system: string; user: string } {
  const system = [
    "あなたは日本の建設・製造現場の労働安全の専門家です。",
    "作業内容から、危険予知活動(KY)の「危険のポイント」と「対策」を提案します。",
    "必ず日本語で答え、出力は厳密なJSONのみとし、前後に説明文やmarkdownのコードフェンスを付けないこと。",
    "JSON形式: {\"hazards\":[{\"hazard\":string,\"reduction\":string,\"likelihood\":1|2|3,\"severity\":1|2|3,\"basis\":string}]}",
    "hazardsは3〜5件。likelihood=可能性(1低〜3高)、severity=重大性(1軽微〜3重大)。",
    "提供された過去の類似事例を最優先の根拠とし、basisにどの事例に基づくかを書くこと。",
    "事例に無い一般的な危険を挙げる場合は、basisに「一般的知見」と明記すること（憶測で断定しない）。",
  ].join("\n");

  const exampleBlock =
    examples.length > 0
      ? examples.slice(0, 6).map(formatExample).join("\n")
      : "（該当する過去事例は見つかりませんでした。一般的な建設安全の知見で補ってよいが、basisに『一般的知見』と明記すること）";

  const user = [
    `作業内容:\n${workContent.trim() || "（未入力）"}`,
    "",
    `過去の類似KY事例:\n${exampleBlock}`,
    "",
    "上記を踏まえ、この作業のKY危険のポイントと対策をJSONで出力してください。",
  ].join("\n");

  return { system, user };
}

/** モデル出力テキストから危険提案を抽出・検証する（純関数・テスト可能）。 */
export function parseHazardSuggestions(
  text: string,
  examples: KySuggestionResult[]
): KyHazardSuggestion[] {
  const json = extractJsonObject(text);
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const hazardsRaw = (parsed as { hazards?: unknown })?.hazards;
  if (!Array.isArray(hazardsRaw)) return [];

  const out: KyHazardSuggestion[] = [];
  for (const item of hazardsRaw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const hazard = typeof o.hazard === "string" ? o.hazard.trim() : "";
    if (!hazard) continue;
    const likelihood = clampLevel(o.likelihood);
    const severity = clampLevel(o.severity);
    const evaluation = evalScore(likelihood, severity);
    out.push({
      hazard,
      reduction: typeof o.reduction === "string" ? o.reduction.trim() : "",
      likelihood,
      severity,
      evaluation,
      riskLabel: riskGrade(evaluation).label,
      basis: typeof o.basis === "string" ? o.basis.trim() : "",
      grounded: isGrounded(hazard, examples),
    });
    if (out.length >= 5) break;
  }
  return out;
}

/** ```json ... ``` や前後テキストを取り除き、最初の { ... } を取り出す。 */
function extractJsonObject(text: string): string | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return body.slice(start, end + 1);
}

/** 危険文が過去事例のいずれかと語句を共有するか（ハルシネーション対策）。 */
function isGrounded(hazard: string, examples: KySuggestionResult[]): boolean {
  const hay = hazard.toLowerCase();
  for (const r of examples) {
    for (const h of [...r.example.hazards, ...r.example.keywords]) {
      const tokens = h.split(/[、・,（）()\s/]+/).filter((t) => t.length >= 2);
      if (tokens.some((t) => hay.includes(t.toLowerCase()))) return true;
    }
  }
  return false;
}

const defaultGenerate: GeminiGenerate = async (system, user) => {
  const key = resolveApiKey();
  if (!key) throw new Error("gemini_not_configured");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: system });
  const result = await model.generateContent(user);
  return result.response.text();
};

/**
 * Gemini で危険提案を生成（失敗・空なら throw → 呼び出し側で擬似AIにフォールバック）。
 * generate を差し替えればネットワーク無しで単体テスト可能。
 */
export async function generateHazardsWithGemini(
  workContent: string,
  examples: KySuggestionResult[],
  generate: GeminiGenerate = defaultGenerate
): Promise<KyHazardSuggestion[]> {
  const { system, user } = buildHazardPrompt(workContent, examples);
  const text = await generate(system, user);
  const suggestions = parseHazardSuggestions(text, examples);
  if (suggestions.length === 0) throw new Error("empty_suggestion");
  return suggestions;
}

/** 擬似AI（業種プリセット）による提案。Gemini 不可・失敗時の2段目フォールバック。 */
export function fallbackHazardSuggestions(workContent: string, industryId?: string): KyHazardSuggestion[] {
  const { rows } = buildRiskAssessmentTable({ workContext: workContent, industryId });
  return rows.map((row) => {
    const likelihood = clampLevel(row.likelihood);
    const severity = clampLevel(row.severity);
    const evaluation = evalScore(likelihood, severity);
    return {
      hazard: row.hazard,
      reduction: row.reduction,
      likelihood,
      severity,
      evaluation,
      riskLabel: riskGrade(evaluation).label,
      basis: "定型提案（業種プリセット）。AIキー未設定または応答不可のためのフォールバック。",
      grounded: false,
    };
  });
}

export const KY_SUGGEST_DISCLAIMER = AI_LEGAL_DISCLAIMER;
