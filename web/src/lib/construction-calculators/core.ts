import type {
  CalculationOutcome,
  CalculationResult,
  DisplayValue,
  PortableValue,
  RoundingConfig,
  ValidationIssue,
} from "./types";

export const DEFAULT_ROUNDING: RoundingConfig = {
  decimalPlaces: 2,
  mode: "round",
};

export const MAX_LINEAR_METRES = 1_000_000;
export const MAX_AREA_M2 = 1_000_000_000_000;
export const MAX_VOLUME_M3 = 1_000_000_000_000_000;
export const MAX_MASS_KG = 1_000_000_000_000_000_000;
export const MAX_COUNT = 1_000_000_000;

export function normalizeRounding(
  rounding: RoundingConfig | undefined,
): RoundingConfig {
  const candidate = rounding ?? DEFAULT_ROUNDING;
  if (
    !Number.isInteger(candidate.decimalPlaces) ||
    candidate.decimalPlaces < 0 ||
    candidate.decimalPlaces > 6 ||
    !(["round", "ceil", "floor"] as const).includes(candidate.mode)
  ) {
    return { ...DEFAULT_ROUNDING };
  }
  return { decimalPlaces: candidate.decimalPlaces, mode: candidate.mode };
}

/**
 * 「四捨五入」は0から離れる向きのhalf-up、切上げ/切捨ては数学的な
 * +Infinity/-Infinity方向とする。数量系の主要出力は通常非負である。
 */
export function applyRounding(value: number, config: RoundingConfig): number {
  const factor = 10 ** config.decimalPlaces;
  const scaled = value * factor;
  // One scaled ULP is enough to remove arithmetic noise such as
  // 12.42 -> 1242.0000000000002 without swallowing a real remainder at
  // large magnitudes. A wider tolerance can silently under-round quantities.
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled));
  const nearestInteger = Math.round(scaled);
  const integerSnapped =
    Math.abs(scaled - nearestInteger) <= tolerance ? nearestInteger : scaled;
  if (config.mode === "ceil") {
    return Math.ceil(integerSnapped) / factor;
  }
  if (config.mode === "floor") {
    return Math.floor(integerSnapped) / factor;
  }
  const absolute = Math.abs(value);
  const absoluteScaled = absolute * factor;
  const lower = Math.floor(absoluteScaled);
  const halfSnapped =
    Math.abs(absoluteScaled - (lower + 0.5)) <=
    Number.EPSILON * Math.max(1, absoluteScaled)
      ? lower + 0.5
      : absoluteScaled;
  const rounded = Math.floor(halfSnapped + 0.5) / factor;
  return Object.is(value, -0) || value < 0 ? -rounded : rounded;
}

/**
 * 台数・本数の式で使う整数切上げ。乗除で整数境界の直上に生じた
 * 1 ULP以内の表現誤差だけを整数へ戻す。0より小さい値には使わない。
 */
export function ceilCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return Number.NaN;
  const nearestInteger = Math.round(value);
  // The ratio can accumulate one ULP in the numerator and another in division.
  // Two ULPs repairs that boundary while preserving a representable remainder
  // larger than the numerical uncertainty (covered by regression fixtures).
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(value)) * 2;
  const snapped =
    nearestInteger >= 1 && Math.abs(value - nearestInteger) <= tolerance
      ? nearestInteger
      : value;
  return Math.ceil(snapped);
}

export function finiteIssue(field: string, value: unknown): ValidationIssue | null {
  return typeof value === "number" && Number.isFinite(value)
    ? null
    : {
        field,
        code: "not-finite",
        message: `${field}は有限の数値で入力してください。`,
      };
}

export function enumIssue<T extends string>(
  field: string,
  value: unknown,
  allowed: readonly T[],
): ValidationIssue | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? null
    : {
        field,
        code: "out-of-range",
        message: `${field}の選択値または単位が正しくありません。`,
      };
}

export function positiveIssue(
  field: string,
  value: unknown,
  max: number,
): ValidationIssue | null {
  const finite = finiteIssue(field, value);
  if (finite) return finite;
  const numberValue = value as number;
  if (numberValue === 0) {
    return { field, code: "zero", message: `${field}は0より大きくしてください。` };
  }
  if (numberValue < 0) {
    return { field, code: "negative", message: `${field}は負数にできません。` };
  }
  if (numberValue > max) {
    return {
      field,
      code: "too-large",
      message: `${field}が計算可能範囲を超えています。単位を確認してください。`,
    };
  }
  return null;
}

export function nonNegativeIssue(
  field: string,
  value: unknown,
  max: number,
): ValidationIssue | null {
  const finite = finiteIssue(field, value);
  if (finite) return finite;
  const numberValue = value as number;
  if (numberValue < 0) {
    return { field, code: "negative", message: `${field}は負数にできません。` };
  }
  if (numberValue > max) {
    return {
      field,
      code: "too-large",
      message: `${field}が計算可能範囲を超えています。単位を確認してください。`,
    };
  }
  return null;
}

export function integerIssue(
  field: string,
  value: unknown,
  min: number,
  max: number,
): ValidationIssue | null {
  const finite = finiteIssue(field, value);
  if (finite) return finite;
  const numberValue = value as number;
  if (!Number.isInteger(numberValue) || numberValue < min || numberValue > max) {
    return {
      field,
      code: "out-of-range",
      message: `${field}は${min}〜${max}の整数で入力してください。`,
    };
  }
  return null;
}

export function percentageIssue(
  field: string,
  value: unknown,
  allowZero = true,
): ValidationIssue | null {
  const finite = finiteIssue(field, value);
  if (finite) return finite;
  const numberValue = value as number;
  const minimum = allowZero ? 0 : Number.EPSILON;
  if (numberValue < minimum || numberValue > 100) {
    return {
      field,
      code: "out-of-range",
      message: `${field}は${allowZero ? "0" : "0より大きい値"}〜100%で入力してください。`,
    };
  }
  return null;
}

export function compactIssues(
  issues: Array<ValidationIssue | null | undefined>,
): ValidationIssue[] {
  return issues.filter((issue): issue is ValidationIssue => Boolean(issue));
}

export function invalid(errors: ValidationIssue[]): CalculationOutcome {
  return { ok: false, errors };
}

export function validResult(args: {
  calculatorId: string;
  formulaVersion: string;
  rawOutputs: Record<string, PortableValue>;
  outputs: Record<string, PortableValue>;
  displayValues: DisplayValue[];
  usedInputs: Record<string, PortableValue>;
  formula: string[];
  rounding: RoundingConfig;
  assumptions: string[];
  warnings?: string[];
}): CalculationOutcome {
  const result: CalculationResult = {
    ...args,
    warnings: args.warnings ?? [],
    isEstimate: true,
  };
  return { ok: true, result };
}

export function resultTooLargeIssue(
  field: string,
  value: number,
  maximum: number,
): ValidationIssue | null {
  return Number.isFinite(value) && Math.abs(value) <= maximum
    ? null
    : {
        field,
        code: "too-large",
        message: "計算結果が計算可能範囲を超えています。入力値と単位を確認してください。",
      };
}

export function resultCountIssue(field: string, value: number): ValidationIssue | null {
  return Number.isSafeInteger(value) && value >= 1 && value <= MAX_COUNT
    ? null
    : {
        field,
        code: "too-large",
        message: "必要台数または本数が計算可能範囲を超えています。入力値と単位を確認してください。",
      };
}
