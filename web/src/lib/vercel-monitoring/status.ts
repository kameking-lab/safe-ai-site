import type { AlertLevel, SampleStatus, UsageSample } from "./types";

/**
 * Thresholds picked from the task brief (Phase C):
 *   80%  → 警告 (watch)
 *   95%  → 危険 (warn)
 *  100%+ → 停止リスク (critical / exceeded)
 *
 * "watch" vs. "warn" vs. "critical" map directly to the three Phase C
 * states. We added "exceeded" so the dashboard can render "停止リスク"
 * differently once we are already over the limit (red + striped border)
 * vs. "approaching" the limit.
 */
export const WATCH_PERCENT = 80;
export const WARN_PERCENT = 95;
export const CRITICAL_PERCENT = 100;

export function classify(percent: number | null): AlertLevel {
  if (percent === null) return "unknown";
  if (percent >= CRITICAL_PERCENT) return "exceeded";
  if (percent >= WARN_PERCENT) return "critical";
  if (percent >= WATCH_PERCENT) return "warn";
  if (percent >= 60) return "watch";
  return "ok";
}

const STATUS_STYLE: Record<AlertLevel, Omit<SampleStatus, "level">> = {
  ok: { label: "正常", bg: "bg-emerald-100", fg: "text-emerald-800" },
  watch: { label: "監視", bg: "bg-sky-100", fg: "text-sky-800" },
  warn: { label: "警告", bg: "bg-amber-100", fg: "text-amber-800" },
  critical: { label: "危険", bg: "bg-orange-100", fg: "text-orange-800" },
  exceeded: { label: "停止リスク", bg: "bg-red-100", fg: "text-red-800" },
  unknown: { label: "—", bg: "bg-slate-100", fg: "text-slate-600" },
};

export function statusFor(sample: UsageSample): SampleStatus {
  const level = classify(sample.percent);
  return { level, ...STATUS_STYLE[level] };
}

export function statusForLevel(level: AlertLevel): SampleStatus {
  return { level, ...STATUS_STYLE[level] };
}

export function summarizeAlerts(samples: UsageSample[]): {
  worstLevel: AlertLevel;
  counts: Record<AlertLevel, number>;
} {
  const counts: Record<AlertLevel, number> = {
    ok: 0,
    watch: 0,
    warn: 0,
    critical: 0,
    exceeded: 0,
    unknown: 0,
  };
  for (const s of samples) {
    counts[classify(s.percent)] += 1;
  }
  const order: AlertLevel[] = ["exceeded", "critical", "warn", "watch", "unknown", "ok"];
  const worstLevel = order.find((level) => counts[level] > 0) ?? "ok";
  return { worstLevel, counts };
}
