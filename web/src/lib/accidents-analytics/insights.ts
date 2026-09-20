import type { AnalyticsAggregates, NameCount } from "./types";

export type AnalyticsInsight = {
  label: string;
  value: string;
  description: string;
};

function top(items: readonly NameCount[]): NameCount | null {
  return items.reduce<NameCount | null>(
    (best, item) => (!best || item.count > best.count ? item : best),
    null,
  );
}

function share(count: number, denominator: number): string {
  if (denominator === 0) return "0%";
  return `${Math.round((count / denominator) * 1000) / 10}%`;
}

function insight(
  label: string,
  item: NameCount | null,
  denominator: number,
): AnalyticsInsight {
  if (!item || denominator === 0) {
    return {
      label,
      value: "該当データなし",
      description:
        "この条件では算出できません。収録事例内の構成比であり、発生率やリスクの高さを示すものではありません。",
    };
  }
  return {
    label,
    value: `${item.name} ${item.count.toLocaleString("ja-JP")}件`,
    description: `収録事例内の構成比は ${share(item.count, denominator)} です。発生率やリスクの高さを示すものではありません。`,
  };
}

/** 現在のAND絞り込みと同じ母集団から、断定を避けた短い観察を3点返す。 */
export function buildAnalyticsInsights(
  aggregates: AnalyticsAggregates,
): AnalyticsInsight[] {
  return [
    insight(
      "最も多い事故の型",
      top(aggregates.typeRanking),
      aggregates.meta.coverage.type.known,
    ),
    insight(
      "最も多い発生月",
      top(aggregates.seasonalityByMonth),
      aggregates.meta.coverage.month.known,
    ),
    insight(
      "最も多い起因物",
      top(aggregates.causeRanking),
      aggregates.meta.coverage.cause.known,
    ),
  ];
}
