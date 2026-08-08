import type { JmaWarningsFile } from "@/lib/jma/jma-data";
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
