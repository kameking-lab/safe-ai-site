export type ConcentrationComparison =
  | {
      status: "comparable";
      level: "danger" | "warning" | "reference";
      label: string;
      detail: string;
      ratio: number;
      unit: string;
    }
  | {
      status: "unverifiable";
      level: "warning";
      label: string;
      detail: string;
    };

export function normalizeConcentrationUnit(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .replace(/[（）()]/g, "")
    .replace(/\s+/g, "")
    .replace(/m[³3]/g, "m3")
    .replace(/m\^3/g, "m3");
}

export function parseExposureLimit(limit: string | null | undefined): { value: number; unit: string } | null {
  if (!limit) return null;
  const normalized = limit.replace(/[０-９．]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0xfee0)
  );
  const match = normalized.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*(ppm|mg\s*\/\s*m(?:\^?3|³))/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = normalizeConcentrationUnit(match[2]);
  return Number.isFinite(value) && value > 0 && unit ? { value, unit } : null;
}

export function compareConcentration(
  measuredText: string,
  measuredUnit: string,
  limitText: string | null | undefined
): ConcentrationComparison | null {
  if (!measuredText.trim() || !limitText) return null;
  const measured = Number(measuredText.trim());
  if (!Number.isFinite(measured) || measured < 0) {
    return {
      status: "unverifiable",
      level: "warning",
      label: "判定不能",
      detail: "測定値は0以上の数値で入力してください。",
    };
  }
  const limit = parseExposureLimit(limitText);
  if (!limit) {
    return {
      status: "unverifiable",
      level: "warning",
      label: "判定不能",
      detail: "基準値または単位を機械的に確認できません。一次資料で確認してください。",
    };
  }
  const unit = normalizeConcentrationUnit(measuredUnit);
  if (!unit) {
    return {
      status: "unverifiable",
      level: "warning",
      label: "単位未選択・判定不能",
      detail: `測定値の単位を選択してください。基準値の単位は ${limit.unit} です。`,
    };
  }
  if (unit !== limit.unit) {
    return {
      status: "unverifiable",
      level: "warning",
      label: "単位不一致・判定不能",
      detail: `測定値は ${unit}、基準値は ${limit.unit} です。換算条件がないため比較しません。`,
    };
  }
  const ratio = measured / limit.value;
  if (ratio > 1) {
    return {
      status: "comparable",
      level: "danger",
      label: `基準値超過（${ratio.toFixed(2)}倍）`,
      detail: `測定値 ${measured}${unit} > 基準値 ${limit.value}${unit}。測定条件を確認し、作業改善と専門家確認が必要です。`,
      ratio,
      unit,
    };
  }
  if (ratio === 1) {
    return {
      status: "comparable",
      level: "warning",
      label: "基準値と同値・要確認",
      detail: `測定値と基準値はいずれも ${measured}${unit} です。丸め・測定条件を含め専門家が確認してください。`,
      ratio,
      unit,
    };
  }
  if (ratio >= 0.5) {
    return {
      status: "comparable",
      level: "warning",
      label: `基準値の ${Math.round(ratio * 100)}%`,
      detail: "基準値に近い参考値です。測定条件と単位を含め、改善の要否を専門家が確認してください。",
      ratio,
      unit,
    };
  }
  return {
    status: "comparable",
    level: "reference",
    label: `基準値の ${Math.round(ratio * 100)}%（数値比較）`,
    detail: "基準値より低い数値ですが、安全・適合の判定ではありません。測定条件と単位を含め専門家が確認してください。",
    ratio,
    unit,
  };
}
