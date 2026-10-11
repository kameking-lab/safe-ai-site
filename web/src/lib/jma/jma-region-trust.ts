import { warningHttpIssue } from './warning-snapshot.mjs';
import type { JmaWarningsFile } from "@/lib/jma/jma-data";
import { assessJmaDataTrust, type JmaTrustAssessment } from "./jma-data-trust";
import { dataFreshness } from "@/lib/time/jst-date";

/**
 * A positive warning and a negative "no warning" conclusion are trusted only
 * when the selected prefecture was obtained from a current live response.
 *
 * Legacy snapshots have no per-region provenance. They are accepted only when
 * the complete dataset explicitly reports live quality and a fresh timestamp.
 */
export function isCurrentJmaWarningRegion(
  warnings: JmaWarningsFile,
  prefectureIso: string,
  now: Date = new Date(),
): boolean {
  const prefecture = warnings.byIso[prefectureIso];
  if (!prefecture) return false;

  if (prefecture.sourceStatus === "fallback" || prefecture.sourceIssue) {
    return false;
  }
  if (prefecture.sourceStatus === "live") {
    // HTTP freshness includes time spent in the runtime cache, independently of announcement age.
    const receivedAt = Date.parse(prefecture.sourceFetchedAt ?? warnings.fetchedAt);
    for (const entry of prefecture.entries) {
      if (entry.sourceHttpDate !== undefined) {
        const cachedAge = (entry.sourceHttpAgeSeconds ?? 0) + Math.max(0, now.getTime() - receivedAt) / 1000;
        if (warningHttpIssue(new Headers({date: entry.sourceHttpDate ?? "", age: String(Math.ceil(cachedAge))}), now)) return false;
      }
    }
    return dataFreshness(
      prefecture.sourceFetchedAt ?? warnings.fetchedAt,
      now,
    ) === "fresh";
  }

  return (
    warnings.quality?.status === "live" &&
    dataFreshness(warnings.fetchedAt, now) === "fresh"
  );
}

/** Aggregate trust counts only regions that are still current after runtime caching. */
export function assessJmaWarningTrust(
  warnings: JmaWarningsFile,
  now: Date = new Date(),
): JmaTrustAssessment {
  return assessJmaDataTrust({
    fetchedAt: warnings.fetchedAt,
    quality: warnings.quality,
    actualCoverage: Object.keys(warnings.byIso).filter((iso) =>
      isCurrentJmaWarningRegion(warnings, iso, now),
    ).length,
    expectedCoverage: 47,
    now,
  });
}
