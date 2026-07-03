/**
 * 事故データベース本体（/accidents）の出力（柱C-7横展開）。
 * 「月例安全会議の資料に貼る」を完了させる CSV／要点テキスト生成。
 * ページ側で計算済みの集計値をそのまま転記＝捏造・水増しなし。純関数。
 */
import type { AccidentTypeCount } from "./accident-visual";
import { sectionsToCsv } from "@/lib/export/csv";

export const ACCIDENTS_CSV_FILENAME = "accident-database-summary.csv";

export type AccidentsSummary = {
  total: number;
  mhlw: number;
  curated: number;
  preliminary: number;
  synthetic: number;
  typeCounts: AccidentTypeCount[];
};

function jp(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** 収録件数の内訳＋事故型ランキングを1つの CSV へ（Excel で開ける控え）。 */
export function accidentsSummaryToCsv(s: AccidentsSummary): string {
  return sectionsToCsv([
    {
      title: "事故データベース サマリー",
      headers: ["項目", "値"],
      rows: [
        ["総収録件数", s.total],
        ["厚労省データ（件）", s.mhlw],
        ["curated詳細事例（件）", s.curated],
        ["想定例・速報基準（件）", s.preliminary],
        ["合成（件）", s.synthetic],
      ],
    },
    {
      title: "事故の型別 件数ランキング",
      headers: ["事故の型", "件数"],
      rows: s.typeCounts.map((x) => [x.type, x.count]),
    },
  ]);
}

/** 会議資料に貼る「要点」プレーンテキスト。 */
export function accidentsSummaryToText(s: AccidentsSummary): string {
  const top3 = s.typeCounts
    .slice(0, 3)
    .map((x, i) => `${i + 1}.${x.type}(${jp(x.count)}件)`)
    .join("　");
  return [
    `【事故データベース サマリー】総収録件数：${jp(s.total)}件`,
    `内訳：厚労省 ${jp(s.mhlw)}件／curated ${jp(s.curated)}件／想定例(速報基準) ${jp(s.preliminary)}件／合成 ${jp(s.synthetic)}件`,
    `事故の型TOP3：${top3}`,
    `出典：安全AIポータル 労働災害 事故事例データベース（厚労省データ＋curated事例）`,
  ].join("\n");
}
