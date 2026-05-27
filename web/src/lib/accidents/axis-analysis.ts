/**
 * 事故の多軸分析（Phase B P3-2・純粋関数）。
 *
 * 曜日別は occurredOn から導出可能な実データのため集計する。
 * 時間帯・経験年数は AccidentCase に構造化フィールドが無く、推測で値を作ると創作になるため
 * 集計しない（UI側で「本サイト事例DBには無し→公式統計参照」と明示）。
 */
import type { AccidentCase } from "@/lib/types/domain";

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export interface WeekdayBucket {
  /** 0=日 .. 6=土 */
  index: number;
  label: string;
  count: number;
}

/** occurredOn（実データ）から曜日別件数を集計（日付不正は除外）。 */
export function computeWeekdayDistribution(cases: readonly AccidentCase[]): {
  total: number;
  buckets: WeekdayBucket[];
} {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  let total = 0;
  for (const c of cases) {
    const d = new Date(c.occurredOn);
    if (Number.isNaN(d.getTime())) continue;
    counts[d.getDay()] += 1;
    total += 1;
  }
  return {
    total,
    buckets: counts.map((count, index) => ({ index, label: WEEKDAY_LABELS[index], count })),
  };
}

/**
 * 本サイト事例DBで「構造化集計が可能な軸／不可能な軸」を明示するためのメタ情報。
 * 創作防止のため、データが無い軸は available=false とし公式統計参照を促す。
 */
export const AXIS_AVAILABILITY: { key: string; label: string; available: boolean; note: string }[] = [
  { key: "weekday", label: "曜日別", available: true, note: "発生日から集計" },
  {
    key: "timeofday",
    label: "時間帯別",
    available: false,
    note: "本サイト事例DBに時間帯の構造化データなし。公式統計（e-Stat・死傷災害DB）を参照",
  },
  {
    key: "experience",
    label: "経験年数別",
    available: false,
    note: "本サイト事例DBに経験年数の構造化データなし。公式統計（死傷災害DB）を参照",
  },
];
