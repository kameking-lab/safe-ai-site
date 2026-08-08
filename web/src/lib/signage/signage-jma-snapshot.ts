import type { JmaMapLevel, JmaWarningsFile } from "@/lib/jma/jma-data";
import { assessJmaDataTrust } from "@/lib/jma/jma-data-trust";
import { isCurrentJmaWarningRegion } from "@/lib/jma/jma-region-trust";
import { isActiveWarningStatus } from "@/lib/jma/parse-jma-warning";

export type SignageJmaSnapshot = {
  prefectureLevels: Record<string, JmaMapLevel>;
  verifiedPrefectureCount: number;
  jmaHeadline: string | null;
  jmaReportTime: string | null;
  selectedWarnings: Array<{ code: string; status: string }>;
  selectedWarningState: "live" | "degraded" | "unavailable";
  degraded: boolean;
  sourceFetchedAt: string;
};

function newestEntry<T extends { reportDatetime: string | null }>(entries: T[]): T | undefined {
  return [...entries].sort((a, b) => {
    const aTime = a.reportDatetime ? Date.parse(a.reportDatetime) : Number.NEGATIVE_INFINITY;
    const bTime = b.reportDatetime ? Date.parse(b.reportDatetime) : Number.NEGATIVE_INFINITY;
    return bTime - aTime;
  })[0];
}

/**
 * ランタイムJMAデータをサイネージ用へ変換する。
 * quality が live でない、または選択都道府県が欠ける場合は必ず degraded にする。
 * 呼び出し側は degraded を「警報なし」として扱ってはならない。
 */
export function buildSignageJmaSnapshot(
  warnings: JmaWarningsFile,
  prefectureIso: string,
  cityCode?: string | null,
  now: Date = new Date(),
): SignageJmaSnapshot {
  const prefectureLevels = Object.fromEntries(
    Object.entries(warnings.byIso)
      .filter(([iso]) => isCurrentJmaWarningRegion(warnings, iso, now))
      .map(([iso, entry]) => [iso, entry.level]),
  );
  const prefecture = warnings.byIso[prefectureIso];
  const selectedRegionIsCurrent = isCurrentJmaWarningRegion(
    warnings,
    prefectureIso,
    now,
  );
  const entries = selectedRegionIsCurrent ? (prefecture?.entries ?? []) : [];
  const newest = newestEntry(entries);
  const selectedWarnings: Array<{ code: string; status: string }> = [];
  const seen = new Set<string>();
  const trust = assessJmaDataTrust({
    fetchedAt: warnings.fetchedAt,
    quality: warnings.quality,
    actualCoverage: Object.keys(warnings.byIso).length,
    expectedCoverage: 47,
    now,
  });

  if (cityCode) {
    for (const entry of entries) {
      for (const warning of entry.warnings) {
        const status = warning.status ?? "";
        if (
          warning.areaCode !== cityCode ||
          !warning.code ||
          !isActiveWarningStatus(status)
        ) {
          continue;
        }
        const key = `${warning.code}\u0000${status}`;
        if (seen.has(key)) continue;
        seen.add(key);
        selectedWarnings.push({ code: warning.code, status });
      }
    }
  }

  const selectedWarningState =
    !prefecture || !cityCode
      ? "unavailable"
      : selectedRegionIsCurrent
        ? "live"
        : "degraded";

  return {
    prefectureLevels,
    verifiedPrefectureCount: Object.keys(prefectureLevels).length,
    jmaHeadline: newest?.headline?.trim() || null,
    jmaReportTime: newest?.reportDatetime ?? null,
    selectedWarnings,
    selectedWarningState,
    degraded: trust.status !== "live" || !prefecture,
    sourceFetchedAt:
      (selectedRegionIsCurrent ? prefecture?.sourceFetchedAt : null) ??
      warnings.fetchedAt,
  };
}
