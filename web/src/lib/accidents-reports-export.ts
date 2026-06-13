/**
 * 業種別 労働災害分析レポート（ハブ）の出力（柱C-7）。
 * 業種比較サマリー（事例数・死亡数・最多事故型）を CSV／要点テキストで持ち出し、
 * 元請の月例安全会議・ベンチマーク資料に貼れるようにする。集計値はそのまま転記＝捏造なし。純関数。
 */
import type { AllIndustriesSummary } from "@/lib/accident-analysis";
import { sectionsToCsv } from "@/lib/export/csv";

export const REPORTS_CSV_FILENAME = "accident-reports-by-industry.csv";

function jp(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** 業種別サマリー表を CSV へ（Excel で開ける控え・集計用）。 */
export function industriesSummaryToCsv(s: AllIndustriesSummary): string {
  return sectionsToCsv([
    {
      title: `業種別 労働災害分析レポート（${s.yearRange.min}〜${s.yearRange.max}年・累計）`,
      headers: ["業種", "事例（件）", "うち死亡（人）", "最多事故型"],
      rows: s.industries.map((it) => [it.label, it.total, it.fatal, it.topType ?? "—"]),
    },
  ]);
}

/** 会議資料に貼る「要点」プレーンテキスト。 */
export function industriesSummaryToText(s: AllIndustriesSummary): string {
  const lines = s.industries.map(
    (it) =>
      `・${it.label}：${jp(it.total)}件（うち死亡${jp(it.fatal)}人）最多事故型「${it.topType ?? "—"}」`,
  );
  return [
    `【業種別 労働災害分析レポート】${s.yearRange.min}〜${s.yearRange.max}年・累計 ${jp(s.totalCombined)}件`,
    ...lines,
    `出典：安全AIポータル 業種別レポート（厚労省データ＋curated事例）`,
  ].join("\n");
}
