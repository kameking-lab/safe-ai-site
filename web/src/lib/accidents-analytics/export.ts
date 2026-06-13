/**
 * 事故統計ダッシュボードの出力（柱C-7）。
 * 「月例安全会議の資料に貼る」を完了させるための CSV／要点テキスト生成。
 * 集計値（aggregates）をそのまま転記＝捏造・水増しなし。純関数。
 */
import type { AnalyticsAggregates } from "./types";
import { sectionsToCsv } from "@/lib/export/csv";

export const ANALYTICS_CSV_FILENAME = "accident-statistics.csv";

function jp(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** ダッシュボードの主要集計表を1つの CSV へ（Excel で開ける控え・集計用）。 */
export function analyticsToCsv(a: AnalyticsAggregates): string {
  return sectionsToCsv([
    {
      title: "事故統計ダッシュボード サマリー",
      headers: ["項目", "値"],
      rows: [
        ["収録期間", `${a.meta.yearsCovered.from}〜${a.meta.yearsCovered.to}年`],
        ["curated詳細事例（件）", a.meta.curatedCases],
        ["厚労省 死亡災害DB（件）", a.meta.mhlwDeathsCount],
        [`${a.kpi.recentYearLabel}の事故件数（件）`, a.kpi.recentYearCount],
        ["直近12ヶ月の事故件数（件）", a.kpi.trailing12mCount],
        ["死亡災害比率（%）", a.kpi.fatalRatePercent],
        [
          `前年比 ${a.yoyComparison.previousYear.year}→${a.yoyComparison.currentYear.year}（%）`,
          a.yoyComparison.deltaPercent,
        ],
      ],
    },
    {
      title: "業種別 事故件数ランキング",
      headers: ["業種", "件数"],
      rows: a.industryRanking.map((x) => [x.name, x.count]),
    },
    {
      title: "事故種類別 件数ランキング",
      headers: ["事故種類", "件数"],
      rows: a.typeRanking.map((x) => [x.name, x.count]),
    },
    {
      title: "業種別 死亡率",
      headers: ["業種", "総数", "うち死亡", "死亡率（%）"],
      rows: a.industryDeathRate.map((x) => [x.industry, x.total, x.fatal, x.rate]),
    },
    {
      title: "年別 事故件数推移",
      headers: ["年", "件数"],
      rows: a.yearTrend.map((x) => [x.year, x.count]),
    },
    {
      title: "起因物 ランキング",
      headers: ["起因物", "件数"],
      rows: a.causeRanking.map((x) => [x.name, x.count]),
    },
    {
      title: "都道府県別 死亡災害",
      headers: ["都道府県", "件数"],
      rows: a.prefectureRanking.map((x) => [x.name, x.count]),
    },
  ]);
}

/** 会議資料に貼る「要点」プレーンテキスト（デカ数字の結論＋TOP3）。 */
export function analyticsToSummaryText(a: AnalyticsAggregates): string {
  const top3i = a.kpi.riskiestIndustries
    .map((x, i) => `${i + 1}.${x.name}(${jp(x.count)}件)`)
    .join("　");
  const top3t = a.kpi.riskiestTypes
    .map((x, i) => `${i + 1}.${x.name}(${jp(x.count)}件)`)
    .join("　");
  const delta = `${a.yoyComparison.deltaPercent > 0 ? "+" : ""}${a.yoyComparison.deltaPercent}%`;
  return [
    `【事故統計サマリー】収録期間 ${a.meta.yearsCovered.from}〜${a.meta.yearsCovered.to}年`,
    `${a.kpi.recentYearLabel}の事故件数：${jp(a.kpi.recentYearCount)}件（前年比 ${delta}）`,
    `死亡災害比率：${a.kpi.fatalRatePercent}%`,
    `危険業種TOP3：${top3i}`,
    `事故種類TOP3：${top3t}`,
    `出典：安全AIポータル 事故統計ダッシュボード（厚労省データ＋curated事例）`,
  ].join("\n");
}
