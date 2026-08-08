import { describe, expect, it } from "vitest";
import type { AccidentCase } from "@/lib/types/domain";
import {
  assessHomeWarningWeather,
  isVerifiableOfficialAccident,
} from "./home-three-pillars-data";

const base: AccidentCase = {
  id: "audit-case",
  title: "監査用",
  occurredOn: "2026-01-01",
  type: "墜落",
  workCategory: "建設業",
  severity: "死亡",
  summary: "監査用",
  mainCauses: [],
  preventionPoints: [],
};

describe("home fatal-accident provenance gate", () => {
  it("URL形式だけではホームの検証済み事故として扱わない", () => {
    expect(
      isVerifiableOfficialAccident({
        ...base,
        provenance: "mhlw",
        source: { site: "厚生労働省", url: "https://anzeninfo.mhlw.go.jp/example" },
      }),
    ).toBe(false);
    expect(isVerifiableOfficialAccident({ ...base, provenance: "mhlw" })).toBe(false);
    expect(
      isVerifiableOfficialAccident({
        ...base,
        provenance: "synthetic",
        source: { site: "厚生労働省", url: "https://anzeninfo.mhlw.go.jp/example" },
      }),
    ).toBe(false);
    expect(
      isVerifiableOfficialAccident({
        ...base,
        provenance: "mhlw",
        source: { site: "偽装", url: "https://anzeninfo.mhlw.go.jp.evil.example/case" },
      }),
    ).toBe(false);
  });
});

type SnapshotEntry = {
  level: "warning" | "advisory" | "none";
  entries: Array<{
    headline: string;
    level: "warning" | "advisory";
    reportDatetime: string;
  }>;
};

function completeSnapshot(
  fetchedAt: string,
): { fetchedAt: string; byIso: Record<string, SnapshotEntry> } {
  return {
    fetchedAt,
    byIso: Object.fromEntries(
      Array.from({ length: 47 }, (_, index) => [
        `JP-${String(index + 1).padStart(2, "0")}`,
        { level: "none" as const, entries: [] },
      ]),
    ),
  };
}

describe("home JMA warning snapshot trust gate", () => {
  const now = Date.parse("2026-07-24T03:00:00.000Z");

  it("allows all-clear only for a complete and fresh 47-prefecture snapshot", () => {
    const snapshot = completeSnapshot("2026-07-24T02:30:00.000Z");
    expect(assessHomeWarningWeather(snapshot, now)).toMatchObject({
      status: "live",
      reason: "verified_current_snapshot",
      warnings: [],
      fetchedAt: snapshot.fetchedAt,
    });
  });

  it("returns a current warning only when both retrieval and report times are fresh", () => {
    const snapshot = completeSnapshot("2026-07-24T02:30:00.000Z");
    snapshot.byIso["JP-13"] = {
      level: "warning",
      entries: [
        {
          level: "warning",
          headline: "監査用の警報見出し",
          reportDatetime: "2026-07-24T11:20:00+09:00",
        },
      ],
    };
    const result = assessHomeWarningWeather(snapshot, now);
    expect(result).toMatchObject({
      status: "live",
      reason: "verified_current_snapshot",
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      iso: "JP-13",
      prefecture: "東京都",
      level: "warning",
    });
  });

  it("withholds conclusions for stale retrieval and stale warning reports", () => {
    const oldSnapshot = completeSnapshot("2026-07-24T00:00:00.000Z");
    expect(assessHomeWarningWeather(oldSnapshot, now)).toMatchObject({
      status: "stale",
      reason: "snapshot_too_old",
      warnings: [],
    });

    const oldReport = completeSnapshot("2026-07-24T02:30:00.000Z");
    oldReport.byIso["JP-13"] = {
      level: "advisory",
      entries: [
        {
          level: "advisory",
          headline: "監査用の注意報見出し",
          reportDatetime: "2026-07-23T20:00:00+09:00",
        },
      ],
    };
    expect(assessHomeWarningWeather(oldReport, now)).toMatchObject({
      status: "stale",
      reason: "warning_report_too_old",
      warnings: [],
    });
  });

  it("withholds conclusions for missing prefectures, future dates and malformed records", () => {
    const partial = completeSnapshot("2026-07-24T02:30:00.000Z");
    delete partial.byIso["JP-47"];
    expect(assessHomeWarningWeather(partial, now)).toMatchObject({
      status: "partial",
      reason: "incomplete_prefecture_coverage",
      warnings: [],
    });

    const future = completeSnapshot("2026-07-24T04:00:00.000Z");
    expect(assessHomeWarningWeather(future, now)).toMatchObject({
      status: "unavailable",
      reason: "future_timestamp",
      warnings: [],
    });

    const malformed = completeSnapshot("2026-07-24T02:30:00.000Z") as {
      fetchedAt: string;
      byIso: Record<string, SnapshotEntry | null>;
    };
    malformed.byIso["JP-13"] = null;
    expect(assessHomeWarningWeather(malformed, now)).toMatchObject({
      status: "unavailable",
      reason: "invalid_snapshot",
      warnings: [],
    });
    expect(assessHomeWarningWeather({ malformed: true }, now)).toMatchObject({
      status: "unavailable",
      reason: "invalid_snapshot",
      warnings: [],
    });
  });
});
