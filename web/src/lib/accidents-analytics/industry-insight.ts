import type { AnalyticsAggregates, IndustryDeathRate, NameCount } from "./types";

/**
 * 「まず、自業種の要点」用のサマリー（軸G: 事故分析の直感性）。
 *
 * 67枚のグラフに入る前に、初見の安全担当者が「自分の業種で多い事故の型・件数順位・
 * 死亡率」を1画面で掴めるよう、既存の集計（industryTypeMatrix / industryRanking /
 * industryDeathRate）から業種別の要点だけを抽出する純関数。表示はダッシュボードと
 * 同じ指標を使い、詳細は下の多軸グラフへ段階展開する。
 */
export type IndustryInsight = {
  industry: string;
  /** その業種で多い事故の型 上位（件数降順、最大3件） */
  topTypes: NameCount[];
  /** その業種の事例件数（matrix行合計） */
  industryTotal: number;
  /** 事故件数の多い業種ランキング順位（1始まり、無ければ null） */
  rank: number | null;
  /** 業種数（順位の母数） */
  industryCount: number;
  /** その業種の死亡率（％。ダッシュボードの死亡率指標と同一） */
  deathRate: IndustryDeathRate | null;
  /** 全体の死亡率（％） */
  overallFatalRatePercent: number;
  /** 全体死亡率との比較 */
  fatalComparison: "above" | "below" | "similar";
};

/** 死亡率の全体比較の閾値（±この値[ポイント]以内は「同程度」） */
const SIMILAR_BAND = 3;

export function getIndustryInsight(
  agg: AnalyticsAggregates,
  industry: string,
): IndustryInsight | null {
  if (!industry) return null;

  const m = agg.industryTypeMatrix;
  const idx = m.industries.indexOf(industry);
  let topTypes: NameCount[] = [];
  let industryTotal = 0;
  if (idx >= 0) {
    const row = m.matrix[idx] ?? [];
    const pairs: NameCount[] = m.types.map((name, j) => ({
      name,
      count: row[j] ?? 0,
    }));
    industryTotal = pairs.reduce((sum, p) => sum + p.count, 0);
    topTypes = pairs
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  const rankIdx = agg.industryRanking.findIndex((x) => x.name === industry);
  const rank = rankIdx >= 0 ? rankIdx + 1 : null;

  const deathRate =
    agg.industryDeathRate.find((d) => d.industry === industry) ?? null;
  const overall = agg.kpi.fatalRatePercent;

  let fatalComparison: IndustryInsight["fatalComparison"] = "similar";
  if (deathRate) {
    const diff = deathRate.rate - overall;
    if (diff > SIMILAR_BAND) fatalComparison = "above";
    else if (diff < -SIMILAR_BAND) fatalComparison = "below";
  }

  return {
    industry,
    topTypes,
    industryTotal,
    rank,
    industryCount: agg.industryRanking.length,
    deathRate,
    overallFatalRatePercent: overall,
    fatalComparison,
  };
}
