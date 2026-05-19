import { HOBBY_LIMITS } from "./limits";
import { WATCH_PERCENT } from "./status";
import type { HobbyReadiness, QuotaKey, UsageSnapshot } from "./types";

/**
 * Hobby-restore readiness (Phase D).
 *
 * We use the trailing 14-day average daily usage × 30 to project a "what
 * would the next full Hobby month look like at this pace". 14 days is a
 * compromise: long enough to dampen one-off CI bursts, short enough to
 * react after we tighten our [skip ci] discipline.
 *
 * Verdict per quota:
 *   ready      → projected ≤ 80% of limit
 *   borderline → 80% < projected ≤ 100%
 *   blocked    → projected > 100%
 *
 * Overall status is the worst of all per-quota verdicts. Quotas without a
 * Hobby limit (fastOriginTransfer) are skipped in the verdict but still
 * shown for context.
 */
const WINDOW_DAYS = 14;
const FORECAST_DAYS = 30;

export function judgeHobbyReadiness(snapshot: UsageSnapshot): HobbyReadiness {
  const todayMs = Date.now();
  const cutoffMs = todayMs - WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const recent = snapshot.trend.filter((p) => {
    const d = new Date(`${p.date}T00:00:00Z`).getTime();
    return d >= cutoffMs;
  });

  const dailySums: Partial<Record<QuotaKey, number>> = {};
  const dailyCounts: Partial<Record<QuotaKey, number>> = {};
  for (const point of recent) {
    for (const [keyRaw, value] of Object.entries(point.values)) {
      const key = keyRaw as QuotaKey;
      if (typeof value !== "number" || Number.isNaN(value)) continue;
      dailySums[key] = (dailySums[key] ?? 0) + value;
      dailyCounts[key] = (dailyCounts[key] ?? 0) + 1;
    }
  }

  const projections = (Object.keys(HOBBY_LIMITS) as QuotaKey[]).map((key) => {
    const spec = HOBBY_LIMITS[key];
    const sum = dailySums[key] ?? 0;
    const count = dailyCounts[key] ?? 0;
    const dailyAvg = count > 0 ? sum / count : 0;
    const projected = dailyAvg * FORECAST_DAYS;
    const limit = spec.hobbyLimit;
    const percent = limit && limit > 0 ? (projected / limit) * 100 : null;
    let verdict: HobbyReadiness["projections"][number]["verdict"];
    if (limit === null || count === 0) {
      verdict = "unknown";
    } else if (percent! > 100) {
      verdict = "blocked";
    } else if (percent! > WATCH_PERCENT) {
      verdict = "borderline";
    } else {
      verdict = "ready";
    }
    return { key, spec, projected, limit, percent, verdict };
  });

  const verdictRank: Record<HobbyReadiness["status"], number> = {
    blocked: 3,
    borderline: 2,
    unknown: 1,
    ready: 0,
  };
  let worst: HobbyReadiness["status"] = "ready";
  for (const p of projections) {
    if (p.verdict === "unknown") continue;
    if (verdictRank[p.verdict] > verdictRank[worst]) {
      worst = p.verdict;
    }
  }

  const blocking = projections.filter((p) => p.verdict === "blocked");
  const borderline = projections.filter((p) => p.verdict === "borderline");

  let summary: string;
  if (worst === "ready") {
    summary = `直近${WINDOW_DAYS}日平均では全クォータがHobby上限の${WATCH_PERCENT}%以下に収まる見込み。Hobby復帰可能。`;
  } else if (worst === "borderline") {
    const names = borderline.map((p) => p.spec.label).join("・");
    summary = `直近${WINDOW_DAYS}日平均では ${names} がHobby上限の${WATCH_PERCENT}〜100%圏内。微調整で復帰可能だが余裕なし。`;
  } else if (worst === "blocked") {
    const names = blocking.map((p) => p.spec.label).join("・");
    summary = `直近${WINDOW_DAYS}日平均では ${names} がHobby上限を突破する見込み。現状ペースでの復帰は危険。`;
  } else {
    summary = "判定に必要な過去データが不足。トレンドが揃うまで判定保留。";
  }

  const recommendations: string[] = [];
  for (const p of [...blocking, ...borderline]) {
    if (p.limit === null) continue;
    const target = p.limit * 0.7;
    const reduceBy = Math.max(0, p.projected - target);
    const reducePct = p.projected > 0 ? Math.round((reduceBy / p.projected) * 100) : 0;
    recommendations.push(
      `${p.spec.label}: 月間 ${formatRough(p.projected, p.spec.unit)} → ${formatRough(
        target,
        p.spec.unit
      )} まで約 ${reducePct}% 削減 (例: ISR Writesなら revalidate=43200 + [skip ci] 徹底)`
    );
  }

  return { status: worst, projections, summary, recommendations };
}

function formatRough(value: number, unit: string): string {
  if (unit === "GB") return `${value.toFixed(1)}GB`;
  if (unit === "minutes") return `${Math.round(value).toLocaleString("ja-JP")}分`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString("ja-JP");
}
