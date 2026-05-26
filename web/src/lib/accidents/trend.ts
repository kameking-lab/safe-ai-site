/**
 * 事故トレンド集計（Phase B P1-4・純粋関数）。
 *
 * 既存事故事例（AccidentCase[]、occurredOn を持つ実データ）から、指定期間内の
 * 事故型別・業種別の件数を集計する。AIトレンド要約の根拠（実データ）を作るための決定論ロジック。
 * 推測値は作らず、データに存在する件数のみ集計する。
 */
import type { AccidentCase } from "@/lib/types/domain";

export interface TrendBucket {
  label: string;
  count: number;
}

export interface AccidentTrend {
  periodLabel: string;
  total: number;
  byType: TrendBucket[];
  byIndustry: TrendBucket[];
}

function topBuckets(counts: Map<string, number>, limit: number): TrendBucket[] {
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * now から months か月さかのぼった期間の事故を集計する。
 * @param months 集計期間（月）。例: 12 = 直近1年。
 */
export function computeAccidentTrend(
  cases: readonly AccidentCase[],
  months: number,
  now: Date = new Date()
): AccidentTrend {
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);
  const byType = new Map<string, number>();
  const byIndustry = new Map<string, number>();
  let total = 0;
  for (const c of cases) {
    const d = new Date(c.occurredOn);
    if (Number.isNaN(d.getTime())) continue;
    if (d < from || d > now) continue;
    total += 1;
    byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
    byIndustry.set(c.workCategory, (byIndustry.get(c.workCategory) ?? 0) + 1);
  }
  return {
    periodLabel: `直近${months}か月`,
    total,
    byType: topBuckets(byType, 6),
    byIndustry: topBuckets(byIndustry, 6),
  };
}
