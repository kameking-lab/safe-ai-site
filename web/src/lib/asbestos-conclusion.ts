/**
 * 石綿事前調査チェッカーの結論（柱0・ビジュアルファースト）
 *
 * 判定結果の最上部に置く「いまの状態」1メッセージを純関数で組み立てる。
 * この画面の結論は危険度ではなく「法令上やることが何件あるか」:
 *   義務あり = 青（JIS安全色の「指示」— やることの指示であって停止級の危険ではない）
 *   義務なし = 緑（新築等の対象外）
 * 赤・黄は期限超過等の「対応すべき異常」専用に温存する（色のオオカミ少年化防止）。
 *
 * 判定ロジックは asbestos-engine が単一ソース — ここは義務の列挙と色の割当のみ。
 */

import type { PreWorkSummary } from "@/lib/asbestos-engine";

export type AsbestosDutyId =
  | "investigation"
  | "investigator"
  | "report-rodo"
  | "report-taibo";

export interface AsbestosDuty {
  id: AsbestosDutyId;
  /** チップの短ラベル（漢字中心・体言止め） */
  label: string;
}

export interface AsbestosConclusion {
  /** info=やることあり（指示の青） / safe=対象外（緑） */
  tone: "info" | "safe";
  /** デカ数字: 法令上の義務の件数 */
  count: number;
  /** 状態の短ラベル（体言止め） */
  title: string;
  /** 1行だけの補足 */
  description: string;
  duties: AsbestosDuty[];
}

/**
 * 事前調査・有資格者・労基署報告・自治体（大防法）報告の4義務を列挙する。
 * 有資格者は事前調査義務がある場合のみ数える（調査が不要なら資格も問われない）。
 */
export function computeAsbestosConclusion(
  summary: Pick<PreWorkSummary, "investigation" | "reporting">,
): AsbestosConclusion {
  const duties: AsbestosDuty[] = [];
  if (summary.investigation.investigationRequired) {
    duties.push({ id: "investigation", label: "事前調査" });
    if (summary.investigation.qualifiedInvestigatorRequired) {
      duties.push({ id: "investigator", label: "調査者資格" });
    }
  }
  const req = summary.reporting.requirement;
  if (req === "required-anseiho-and-airpollution" || req === "required-anseiho-only") {
    duties.push({ id: "report-rodo", label: "労基署報告" });
  }
  if (req === "required-anseiho-and-airpollution" || req === "required-airpollution-only") {
    duties.push({ id: "report-taibo", label: "自治体報告" });
  }

  if (duties.length === 0) {
    return {
      tone: "safe",
      count: 0,
      title: "対応不要",
      description: "この条件では事前調査・報告義務のいずれも対象外です。",
      duties,
    };
  }
  return {
    tone: "info",
    count: duties.length,
    title: "やること",
    description: "各項目の根拠条文は下の判定結果に表示しています。",
    duties,
  };
}
