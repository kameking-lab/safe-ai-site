import type { AnalyticsAggregates } from "./types";

export type TypeComposition = {
  label: string;
  count: number;
  denominator: number;
  percent: number;
};

/**
 * 事故型の構成比を、事故型以外が同じ比較母集団から算出する。
 * 0件時は 0% と誤読させず、空状態として扱う。
 */
export function buildTypeComposition(
  filtered: AnalyticsAggregates,
  comparisonBaseline: AnalyticsAggregates,
  selectedType?: string | null,
): TypeComposition | null {
  const denominator = comparisonBaseline.meta.filteredCases;
  const topType = comparisonBaseline.typeRanking[0];
  const label = selectedType ?? topType?.name;
  const count = selectedType ? filtered.meta.filteredCases : topType?.count;

  if (!label || !count || filtered.meta.filteredCases === 0 || denominator <= 0) {
    return null;
  }

  return {
    label,
    count,
    denominator,
    percent: Math.round((count / denominator) * 1_000) / 10,
  };
}
