/**
 * Type definitions for the Vercel usage monitoring dashboard.
 *
 * The shape is intentionally provider-agnostic so the underlying client can
 * call whichever Vercel REST endpoint is current (the team-usage endpoints
 * have moved between /v1, /v9, and /v1/teams/:id/usage over time).
 */

export type QuotaKey =
  | "bandwidth"
  | "functionInvocations"
  | "buildExecutionMinutes"
  | "edgeRequests"
  | "isrWrites"
  | "imageOptimization"
  | "fastOriginTransfer";

export type QuotaUnit = "GB" | "count" | "minutes";

export interface QuotaSpec {
  key: QuotaKey;
  label: string;
  unit: QuotaUnit;
  /** Hobby plan monthly limit. `null` means "no published Hobby limit". */
  hobbyLimit: number | null;
}

export interface UsageSample {
  key: QuotaKey;
  spec: QuotaSpec;
  /** Month-to-date raw count, in `spec.unit`. */
  current: number;
  /** Mirror of `spec.hobbyLimit` for convenience. */
  limit: number | null;
  /** 0..N (can exceed 100). `null` when limit is unknown. */
  percent: number | null;
}

export type AlertLevel = "ok" | "watch" | "warn" | "critical" | "exceeded" | "unknown";

export interface SampleStatus {
  level: AlertLevel;
  label: string;
  bg: string;
  fg: string;
}

export type UsageSource = "live" | "cache" | "mock" | "fallback";

export interface BillingPeriod {
  start: string; // ISO
  end: string;   // ISO
  daysIntoPeriod: number;
  daysRemaining: number;
  totalDays: number;
}

export interface UsageTrendPoint {
  /** YYYY-MM-DD */
  date: string;
  /** Daily delta (not cumulative) per quota. */
  values: Partial<Record<QuotaKey, number>>;
}

export interface UsageSnapshot {
  generatedAt: string;
  source: UsageSource;
  warningMessage?: string;
  period: BillingPeriod;
  samples: UsageSample[];
  trend: UsageTrendPoint[];
}

export interface HobbyReadiness {
  status: "ready" | "borderline" | "blocked" | "unknown";
  /** Projected month-end usage per quota, in same units as `current`. */
  projections: Array<{
    key: QuotaKey;
    spec: QuotaSpec;
    projected: number;
    limit: number | null;
    percent: number | null;
    verdict: "ready" | "borderline" | "blocked" | "unknown";
  }>;
  /** Human-readable single-line summary. */
  summary: string;
  /** Reductions needed for the worst quotas. */
  recommendations: string[];
}
