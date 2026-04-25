/**
 * リスクアセスメント簡易判定エンジン（CREATE-SIMPLE 簡略版）。
 *
 * 厚労省 CREATE-SIMPLE のロジックを大胆に簡略化したもの。実際の CREATE-SIMPLE は
 * Excel ベースで GHS 区分・物理化学性状・取扱量・換気・作業時間からばく露推定を
 * 行うが、ここでは含有率 × 取扱量 × 換気 × 作業時間で曝露指数を出し、
 * 8 時間濃度基準値との比から I〜IV のリスクレベルを判定する。
 *
 * 出典/参考:
 *   - 厚労省「化学物質リスクアセスメント支援ツール CREATE-SIMPLE Ver 3.0」
 *   - 安衛則第577条の2（濃度基準値）
 *
 * 注意: PoC 用簡略実装のため、最終判断は CREATE-SIMPLE 公式版または専門家
 * （労働衛生コンサルタント等）の判断によること（事業者責任）。
 */

import type { SdsComponent, SdsProduct } from "@/lib/sds-fetcher";
import { findByCas } from "@/lib/mhlw-chemicals";

export type Ventilation = "none" | "general" | "local";
export type AmountLevel = "small" | "medium" | "large";

export type RaInput = {
  product: SdsProduct;
  ventilation: Ventilation;
  amount: AmountLevel;
  /** 1 日あたり作業時間（時間） */
  durationHours: number;
};

export type RiskLevel = "I" | "II" | "III" | "IV";

export type ComponentRaResult = {
  cas: string;
  name: string;
  contentPct: number;
  /** 8 時間濃度基準値（ppm or mg/m³） */
  limit8h?: string;
  /** 推定ばく露指数（基準値に対する倍率。1.0 で基準値ちょうど） */
  exposureRatio: number;
  level: RiskLevel;
  /** 規制カテゴリ（がん原性・皮膚等） */
  flags?: {
    carcinogenic: boolean;
    skin: boolean;
  };
};

export type RaResult = {
  product: SdsProduct;
  components: ComponentRaResult[];
  /** 全成分のうち最も高い（悪い）レベル */
  overallLevel: RiskLevel;
  /** 推奨対策 */
  recommendations: string[];
  /** 入力サマリ */
  inputSummary: {
    ventilation: string;
    amount: string;
    durationHours: number;
  };
};

const VENTILATION_FACTOR: Record<Ventilation, number> = {
  // 換気が悪いほど指数が高い
  none: 3.0,
  general: 1.0,
  local: 0.3,
};

const AMOUNT_FACTOR: Record<AmountLevel, number> = {
  // 少量 < 中量 < 大量
  small: 0.3,
  medium: 1.0,
  large: 3.0,
};

const VENTILATION_LABEL: Record<Ventilation, string> = {
  none: "換気なし",
  general: "全体換気",
  local: "局所排気",
};

const AMOUNT_LABEL: Record<AmountLevel, string> = {
  small: "少量（<1L/日）",
  medium: "中量（1〜10L/日）",
  large: "大量（>10L/日）",
};

/** 濃度基準値文字列を数値（ppm 換算）に。失敗時は null */
function parseLimit(limit?: string): number | null {
  if (!limit) return null;
  const m = limit.match(/([\d.]+)/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (Number.isNaN(v)) return null;
  return v;
}

function classifyRatio(ratio: number, isCarcinogenic: boolean): RiskLevel {
  // がん原性物質は閾値を厳しく
  const adj = isCarcinogenic ? ratio * 3 : ratio;
  if (adj < 0.1) return "I";
  if (adj < 0.5) return "II";
  if (adj < 1.0) return "III";
  return "IV";
}

const LEVEL_ORDER: Record<RiskLevel, number> = { I: 1, II: 2, III: 3, IV: 4 };

function evaluateComponent(c: SdsComponent, input: RaInput): ComponentRaResult {
  const mhlw = findByCas(c.cas);
  const limit8h = mhlw?.details?.limit8h;
  const limitNum = parseLimit(limit8h) ?? 50; // 不明時はゆるい値で代用

  // ばく露指数:
  //   含有率(%) / 100 * 換気係数 * 取扱量係数 * (作業時間/8h)
  // を「相対ばく露濃度」として扱い、基準値と比較する。
  const baseExposure = (c.contentPct / 100)
    * VENTILATION_FACTOR[input.ventilation]
    * AMOUNT_FACTOR[input.amount]
    * (Math.min(input.durationHours, 24) / 8);

  // 8h 換算 (相対) を「ppm/mg/m³ 単位の見積もり」と仮置きし、limitNum との比を取る
  // 単位はあくまで相対指標（PoC）。
  const estimatedConcentration = baseExposure * 100; // %→ppm 相当の係数 100
  const ratio = estimatedConcentration / Math.max(limitNum, 0.0001);

  const flags = mhlw?.flags;
  const isCarcinogenic = flags?.carcinogenic ?? false;
  const level = classifyRatio(ratio, isCarcinogenic);

  return {
    cas: c.cas,
    name: c.name,
    contentPct: c.contentPct,
    limit8h,
    exposureRatio: Math.round(ratio * 100) / 100,
    level,
    flags: flags ? { carcinogenic: flags.carcinogenic, skin: flags.skin } : undefined,
  };
}

function recommendations(level: RiskLevel, hasCarcinogenic: boolean, hasSkin: boolean): string[] {
  const out: string[] = [];
  switch (level) {
    case "I":
      out.push("【現状維持】定期的な作業環境測定で管理を継続してください。");
      break;
    case "II":
      out.push("【要注意】現状の管理を維持しつつ、ばく露低減策を検討してください。");
      out.push("作業時間の短縮・換気改善・代替物質の検討を推奨。");
      break;
    case "III":
      out.push("【要改善】ばく露を減らす対策が必要です。");
      out.push("局所排気装置の設置・密閉化・保護具（呼吸用保護具）着用を実施。");
      out.push("作業環境測定（管理区分判定）を実施してください。");
      break;
    case "IV":
      out.push("【直ちに改善】重大ばく露の可能性。直ちに作業を中止し対策を講じてください。");
      out.push("代替物質への切り替え、密閉化、局所排気装置の即時設置が必要。");
      out.push("呼吸用保護具（防毒マスクまたは送気マスク）を必ず着用。");
      break;
  }
  if (hasCarcinogenic) {
    out.push("がん原性物質を含むため、ばく露記録を 30 年保存（安衛則第577条の2第3項）。");
  }
  if (hasSkin) {
    out.push("皮膚等障害化学物質のため、不浸透性保護手袋・保護衣の着用が必要（安衛則第594条の2）。");
  }
  return out;
}

export function runRiskAssessment(input: RaInput): RaResult {
  const componentResults = input.product.components.map((c) => evaluateComponent(c, input));
  const overall = componentResults.reduce<RiskLevel>(
    (acc, r) => (LEVEL_ORDER[r.level] > LEVEL_ORDER[acc] ? r.level : acc),
    "I"
  );
  const hasCarc = componentResults.some((r) => r.flags?.carcinogenic);
  const hasSkin = componentResults.some((r) => r.flags?.skin);
  return {
    product: input.product,
    components: componentResults,
    overallLevel: overall,
    recommendations: recommendations(overall, hasCarc, hasSkin),
    inputSummary: {
      ventilation: VENTILATION_LABEL[input.ventilation],
      amount: AMOUNT_LABEL[input.amount],
      durationHours: input.durationHours,
    },
  };
}
