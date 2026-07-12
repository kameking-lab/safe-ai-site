/**
 * 建設計算コーナー 共通スキーマ（宣言的計算機定義）
 *
 * 設計原則（docs/construction-calc-design-2026-07-12.md）:
 * - 計算は決定論的な `compute()`（検証済みコード・単体テストで数値固定）が実行する。
 *   AI の役割は入口（自由記述→計算機と入力値の特定）と出口（結果の平易な解説）のみで、
 *   AI は計算そのものを一切行わない。
 * - 全計算機に根拠（安衛則条文・構造規格・JIS 等）を `basis` で明記する。
 * - 1計算機 = 1定義オブジェクト。kurashi-keisan 式の量産（BACKLOG-construction-calc.md）を
 *   見据え、フィールド定義・根拠・注意・計算式を宣言的に持つ。
 * - このモジュールは pure TS（React/IO なし）。クライアント・サーバー・テストで共用する。
 */

import type { SafetyTone } from "@/lib/design/safety-tone";

/** プルダウン選択肢 */
export type CalcSelectOption = {
  value: string;
  label: string;
};

/** プルダウン入力 */
export type CalcSelectField = {
  kind: "select";
  id: string;
  label: string;
  options: CalcSelectOption[];
  defaultValue: string;
  /** 入力欄の下に出す1行ヘルプ */
  help?: string;
};

/** 数値セル入力（単位・範囲つき） */
export type CalcNumberField = {
  kind: "number";
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  help?: string;
};

export type CalcField = CalcSelectField | CalcNumberField;

/** 計算機への入力値（正規化済み: number フィールドは number、select は string） */
export type CalcValues = Record<string, string | number>;

/** 根拠（条文・告示・規格）。法令ナビ収載条文は lawNaviPath も持つ */
export type CalcBasis = {
  /** 例: 「労働安全衛生規則 第356条（掘削面の勾配の基準）」 */
  label: string;
  /** 何を定めた根拠か1行で */
  description: string;
  /** サイト内 法令ナビの条文ページ（生成集合に在る場合のみ。幽霊リンク禁止） */
  lawNaviPath?: string;
  /** e-Gov 原文リンク */
  egovUrl?: string;
};

/** 結果の明細行（チェック項目・中間値） */
export type CalcCheckItem = {
  label: string;
  value: string;
  /** チェック系の行は適合/不適合トーンを持つ。中間値は省略 */
  tone?: SafetyTone;
  note?: string;
};

/** 決定論的計算の出力 */
export type CalcOutcome = {
  /** 結論トーン（safe=適合/使用可, danger=不適合/使用不可, warning=条件付き） */
  tone: SafetyTone;
  /** 結論の短ラベル（体言止め。例「使用可」「勾配超過」） */
  headline: string;
  /** デカ数字（例 張力・上限勾配）。無い計算機は省略 */
  value?: string;
  unit?: string;
  /** 結論の1行説明 */
  summary: string;
  /** 明細行 */
  items: CalcCheckItem[];
  /** 計算過程（式と代入値を人が追える形で） */
  steps: string[];
  /** このケース固有の注意喚起 */
  warnings: string[];
};

/** 使用例プリセット（UI のワンタップ入力・AI入口のフォールバック文言にも使う） */
export type CalcExample = {
  label: string;
  values: CalcValues;
};

export type ConstructionCalculator = {
  /** URL スラッグ（/construction-calc/[slug]） */
  slug: string;
  title: string;
  /** ハブカード用の短い名前 */
  shortTitle: string;
  summary: string;
  /** 入力定義（表示順） */
  fields: CalcField[];
  /** 根拠（画面に必ず明記） */
  basis: CalcBasis[];
  /** 固定の注意事項（免責は共通文言 CALC_DISCLAIMER を別途表示） */
  cautions: string[];
  examples: CalcExample[];
  /** AI入口のフォールバック・検索用キーワード */
  keywords: string[];
  /** 決定論的計算（正規化済み値を受ける。AI はこの関数を呼ばない・書き換えない） */
  compute: (values: CalcValues) => CalcOutcome;
};

/** 全計算機共通の免責文（結果の直下に必ず表示する） */
export const CALC_DISCLAIMER =
  "本計算は法令基準等に基づく概算・簡易チェックであり、実際の施工・使用の可否を保証するものではありません。実施工にあたっては、機材の証明書・製造者仕様と現地条件を確認のうえ、有資格者（作業主任者・施工管理技術者・構造設計者等）による検討を行ってください。";

export type NormalizedValues = {
  values: CalcValues;
  /** 入力不備（既定値で補ったフィールドの説明） */
  errors: string[];
};

/**
 * 外部入力（フォーム・URL クエリ・AI抽出）を計算可能な値へ正規化する。
 * - number: 数値化できない/範囲外 → 既定値に戻して errors へ記録
 * - select: 選択肢に無い値 → 既定値に戻して errors へ記録
 * 未指定フィールドは黙って既定値（エラー扱いしない）。
 */
export function normalizeValues(
  calc: Pick<ConstructionCalculator, "fields">,
  raw: Record<string, unknown> | undefined,
): NormalizedValues {
  const values: CalcValues = {};
  const errors: string[] = [];
  for (const field of calc.fields) {
    const input = raw?.[field.id];
    if (field.kind === "number") {
      if (input === undefined || input === null || input === "") {
        values[field.id] = field.defaultValue;
        continue;
      }
      const n = typeof input === "number" ? input : Number(String(input).trim());
      if (!Number.isFinite(n)) {
        values[field.id] = field.defaultValue;
        errors.push(`「${field.label}」は数値で入力してください（既定値 ${field.defaultValue}${field.unit} を使用）`);
      } else if (n < field.min || n > field.max) {
        values[field.id] = field.defaultValue;
        errors.push(
          `「${field.label}」は ${field.min}〜${field.max}${field.unit} の範囲で入力してください（既定値 ${field.defaultValue}${field.unit} を使用）`,
        );
      } else {
        values[field.id] = n;
      }
    } else {
      if (input === undefined || input === null || input === "") {
        values[field.id] = field.defaultValue;
        continue;
      }
      const s = String(input).trim();
      const hit = field.options.find((o) => o.value === s) ?? field.options.find((o) => o.label === s);
      if (hit) {
        values[field.id] = hit.value;
      } else {
        values[field.id] = field.defaultValue;
        errors.push(`「${field.label}」の選択値が不正です（既定値を使用）`);
      }
    }
  }
  return { values, errors };
}

/** 標準重力加速度 [N/kg]（kgf→kN 換算に使用） */
export const STANDARD_GRAVITY = 9.80665;

/** kgf → kN */
export function kgfToKn(kgf: number): number {
  return (kgf * STANDARD_GRAVITY) / 1000;
}

/** 数値の表示用整形（有効桁を保ちつつ桁区切り） */
export function formatNumber(n: number, maxFractionDigits = 1): string {
  return n.toLocaleString("ja-JP", { maximumFractionDigits: maxFractionDigits });
}
