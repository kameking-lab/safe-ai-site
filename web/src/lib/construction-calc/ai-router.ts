/**
 * AI入口の決定論部分:
 * - キーワードによる計算機ルーティング（GEMINI_API_KEY が無い/失敗時のフォールバック）
 * - AI が抽出した入力値の検証（絶対原則: 確信の持てない値は勝手に埋めず質問で返す。
 *   範囲外・選択肢外の値は採用せず、質問として返す）
 *
 * 計算そのものは常に registry の compute()（決定論・単体テストで数値固定）が行う。
 * AI の出力はここで必ず検証してから使う。
 */

import type { CalcValues, ConstructionCalculator } from "./schema";
import { CONSTRUCTION_CALCULATORS } from "./registry";

export type RouteMatch = {
  slug: string;
  title: string;
  score: number;
};

/** 自由記述→計算機のキーワードマッチ（決定論フォールバック） */
export function routeByKeywords(text: string): RouteMatch[] {
  const t = text.toLowerCase();
  const matches: RouteMatch[] = [];
  for (const calc of CONSTRUCTION_CALCULATORS) {
    let score = 0;
    for (const kw of calc.keywords) {
      if (t.includes(kw.toLowerCase())) score += kw.length >= 2 ? 2 : 1;
    }
    if (score > 0) {
      matches.push({ slug: calc.slug, title: calc.title, score });
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}

export type ExtractionResult = {
  /** 採用された入力値（検証済み。未採用フィールドは含まない） */
  values: CalcValues;
  /** ユーザーへ返す質問（読み取れなかった・確信が持てなかった値） */
  questions: string[];
};

/**
 * AI が抽出した値を計算機スキーマで検証する。
 * - number: 有限数かつ [min,max] 内のみ採用。それ以外は棄却して質問へ
 * - select: options の value / label に一致するもののみ採用
 * - 抽出されなかった必須フィールドは質問として返す（既定値で黙って計算しない）
 */
export function validateExtraction(
  calc: ConstructionCalculator,
  extracted: Record<string, unknown> | undefined | null,
): ExtractionResult {
  const values: CalcValues = {};
  const questions: string[] = [];
  for (const field of calc.fields) {
    const raw = extracted?.[field.id];
    if (raw === undefined || raw === null || raw === "") {
      questions.push(questionFor(calc, field.id));
      continue;
    }
    if (field.kind === "number") {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[,，]/g, "").trim());
      if (Number.isFinite(n) && n >= field.min && n <= field.max) {
        values[field.id] = n;
      } else {
        questions.push(
          `「${field.label}」として ${String(raw)} が読み取られましたが範囲外です。${field.min}〜${field.max}${field.unit} で入力してください。`,
        );
      }
    } else {
      const s = String(raw).trim();
      const hit =
        field.options.find((o) => o.value === s) ?? field.options.find((o) => o.label.includes(s) && s.length > 0);
      if (hit) {
        values[field.id] = hit.value;
      } else {
        questions.push(questionFor(calc, field.id));
      }
    }
  }
  return { values, questions };
}

function questionFor(calc: ConstructionCalculator, fieldId: string): string {
  const field = calc.fields.find((f) => f.id === fieldId);
  if (!field) return "";
  if (field.kind === "number") {
    return `「${field.label}」が読み取れませんでした。${field.min}〜${field.max}${field.unit} で入力してください。`;
  }
  const opts = field.options.map((o) => o.label).join(" / ");
  return `「${field.label}」が読み取れませんでした。次から選んでください: ${opts}`;
}

/** AI入口プロンプト用の計算機マニフェスト（機械可読な入力仕様） */
export function calculatorManifest(): string {
  return CONSTRUCTION_CALCULATORS.map((c) => {
    const fields = c.fields
      .map((f) =>
        f.kind === "number"
          ? `  - ${f.id} (数値, 単位${f.unit}, ${f.min}〜${f.max}): ${f.label}`
          : `  - ${f.id} (選択: ${f.options.map((o) => `"${o.value}"=${o.label}`).join(", ")}): ${f.label}`,
      )
      .join("\n");
    return `slug: ${c.slug}\n用途: ${c.title} — ${c.summary}\n入力フィールド:\n${fields}`;
  }).join("\n\n");
}
