import type { JmaFetchQuality } from "./jma-data";
import { dataFreshness } from "@/lib/time/jst-date";

export type JmaTrustStatus = "live" | "degraded" | "unavailable";

export type JmaTrustAssessment = {
  status: JmaTrustStatus;
  reasons: string[];
};

export function assessJmaDataTrust(args: {
  fetchedAt?: string | null;
  quality?: JmaFetchQuality;
  actualCoverage?: number;
  expectedCoverage?: number;
  now?: Date;
}): JmaTrustAssessment {
  const reasons: string[] = [];
  if (!args.fetchedAt) return { status: "unavailable", reasons: ["fetchedAt-missing"] };
  const parsed = Date.parse(args.fetchedAt);
  if (!Number.isFinite(parsed)) return { status: "unavailable", reasons: ["fetchedAt-invalid"] };

  const freshness = dataFreshness(args.fetchedAt, args.now);
  if (freshness !== "fresh") reasons.push(parsed > (args.now ?? new Date()).getTime() ? "fetchedAt-future" : "fetchedAt-stale");

  const quality = args.quality;
  if (!quality) return { status: "unavailable", reasons: [...reasons, "quality-missing"] };
  if (quality.status !== "live") reasons.push(`quality-${quality.status}`);
  if (
    quality.attempted <= 0 ||
    quality.succeeded < 0 ||
    quality.failed < 0 ||
    quality.succeeded + quality.failed !== quality.attempted ||
    (quality.status === "live" && (quality.succeeded !== quality.attempted || quality.failed !== 0))
  ) {
    reasons.push("quality-counts-inconsistent");
  }
  if (
    args.expectedCoverage !== undefined &&
    args.actualCoverage !== args.expectedCoverage
  ) {
    reasons.push("coverage-partial");
  }

  return { status: reasons.length === 0 ? "live" : "degraded", reasons };
}
