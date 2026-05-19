import type { QuotaKey, QuotaSpec } from "./types";

/**
 * Vercel Hobby plan monthly limits as of 2026-05. Sourced from
 * vercel.com/docs/limits and re-confirmed against the project's own
 * "comprehensive-status-report-2026-05-01" handoff doc.
 *
 * When Vercel publishes a limit change, update this table — the dashboard
 * and the Hobby-readiness judgment both read from here.
 *
 * `fastOriginTransfer` has no published Hobby cap but is tracked anyway
 * because the project burned 30 GB in May 2026 (3x our internal target),
 * so the dashboard surfaces it as an observability metric without a
 * pass/fail verdict.
 */
export const HOBBY_LIMITS: Record<QuotaKey, QuotaSpec> = {
  bandwidth: {
    key: "bandwidth",
    label: "Bandwidth",
    unit: "GB",
    hobbyLimit: 100,
  },
  functionInvocations: {
    key: "functionInvocations",
    label: "Function Invocations",
    unit: "count",
    hobbyLimit: 100_000,
  },
  buildExecutionMinutes: {
    key: "buildExecutionMinutes",
    label: "Build Execution",
    unit: "minutes",
    hobbyLimit: 6_000,
  },
  edgeRequests: {
    key: "edgeRequests",
    label: "Edge Requests",
    unit: "count",
    hobbyLimit: 1_000_000,
  },
  isrWrites: {
    key: "isrWrites",
    label: "ISR Writes",
    unit: "count",
    hobbyLimit: 200_000,
  },
  imageOptimization: {
    key: "imageOptimization",
    label: "Image Optimization",
    unit: "count",
    hobbyLimit: 1_000,
  },
  fastOriginTransfer: {
    key: "fastOriginTransfer",
    label: "Fast Origin Transfer",
    unit: "GB",
    hobbyLimit: null,
  },
};

export const QUOTA_ORDER: QuotaKey[] = [
  "bandwidth",
  "functionInvocations",
  "buildExecutionMinutes",
  "edgeRequests",
  "isrWrites",
  "imageOptimization",
  "fastOriginTransfer",
];

export function formatQuantity(value: number, unit: QuotaSpec["unit"]): string {
  if (unit === "GB") {
    return `${value.toFixed(2)} GB`;
  }
  if (unit === "minutes") {
    return `${Math.round(value).toLocaleString("ja-JP")} 分`;
  }
  return Math.round(value).toLocaleString("ja-JP");
}
