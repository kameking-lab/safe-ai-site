import type { SafetyTone } from "@/lib/design/safety-tone";

/**
 * /risk リスク管理ハブの「明日以降の見通し」ストリップ判定（柱0・柱3）。
 *
 * 結論カード（weather-conclusion.ts）は「今日」の全国状態を1メッセージで断定する。
 * 一方「台風前日の元請安全担当」は明日の屋外作業を止めるか前日に決める。
 * その判断材料（明日以降の予報）は従来「1週間予報」タブの奥に埋まっていた。
 * この関数は既存の Open-Meteo 予報（regions[].days[].alertLevel）を日別に再集計するだけで、
 * 新しい値は作らない（捏造なし）。今日は結論カードに任せ、ここは明日以降に絞る（重複・矛盾を避ける）。
 *
 * 色の文法は結論カードと同一:
 *   警報相当が1地域でも = 赤 / 注意報相当のみ = 黄 / どちらもなし = 緑。
 * JMA の実況警報は当日分しか提供されないため、明日以降は予報ベース（その旨はUIで明記）。
 */

export type OutlookAlertLevel = "none" | "advisory" | "warning";

export type RiskWeatherOutlookInput = {
  days: { date: string; alertLevel: OutlookAlertLevel }[];
};

export type RiskWeatherOutlookDay = {
  /** 予報日（"2026-06-15"） */
  date: string;
  /** 何日後か（1 = 明日） */
  offset: number;
  /** 明日/明後日（それ以降は空文字＝日付のみで示す） */
  dayLabel: string;
  /** 色帯トーン（赤=警報・黄=注意報・緑=なし） */
  tone: SafetyTone;
  /** その日の全国最悪レベル */
  level: OutlookAlertLevel;
  /** レベルの短ラベル */
  levelLabel: string;
  /** 警報相当の地域ブロック数 */
  warningCount: number;
  /** 注意報相当の地域ブロック数 */
  advisoryCount: number;
  /** 集計対象の地域ブロック総数 */
  totalRegions: number;
};

const RELATIVE_LABELS: Record<number, string> = { 1: "明日", 2: "明後日" };

function levelToTone(level: OutlookAlertLevel): SafetyTone {
  if (level === "warning") return "danger";
  if (level === "advisory") return "warning";
  return "safe";
}

function levelToLabel(level: OutlookAlertLevel): string {
  if (level === "warning") return "警報相当";
  if (level === "advisory") return "注意報相当";
  return "概ね良好";
}

/**
 * 予報日別に全国ブロックの最悪レベルと該当数を集計する。
 * @param regions 8地域ブロックの日別予報
 * @param opts.startOffset 起点（既定1=明日。0にすると今日を含む）
 * @param opts.days 表示日数（既定3）
 */
export function buildRiskWeatherOutlook(
  regions: RiskWeatherOutlookInput[],
  opts: { startOffset?: number; days?: number } = {}
): RiskWeatherOutlookDay[] {
  const startOffset = opts.startOffset ?? 1;
  const span = opts.days ?? 3;
  const base = regions[0]?.days ?? [];
  const out: RiskWeatherOutlookDay[] = [];

  for (let k = 0; k < span; k++) {
    const idx = startOffset + k;
    const baseDay = base[idx];
    if (!baseDay) break;

    let warningCount = 0;
    let advisoryCount = 0;
    for (const region of regions) {
      const lvl = region.days[idx]?.alertLevel;
      if (lvl === "warning") warningCount += 1;
      else if (lvl === "advisory") advisoryCount += 1;
    }

    const level: OutlookAlertLevel =
      warningCount > 0 ? "warning" : advisoryCount > 0 ? "advisory" : "none";

    out.push({
      date: baseDay.date,
      offset: idx,
      dayLabel: RELATIVE_LABELS[idx] ?? "",
      tone: levelToTone(level),
      level,
      levelLabel: levelToLabel(level),
      warningCount,
      advisoryCount,
      totalRegions: regions.length,
    });
  }

  return out;
}
