import { describe, expect, it } from "vitest";
import type { JmaWarningsFile } from "@/lib/jma/jma-data";
import { buildSignageJmaSnapshot } from "./signage-jma-snapshot";

function fixture(status: "live" | "degraded" | "fallback"): JmaWarningsFile {
  const byIso: JmaWarningsFile["byIso"] = Object.fromEntries(Array.from({ length: 47 }, (_, index) => [
    `JP-${String(index + 1).padStart(2, "0")}`,
    { level: "none" as const, entries: [] },
  ]));
  byIso["JP-13"] = {
    level: "warning",
    sourceStatus:
      status === "degraded"
        ? "live"
        : status === "fallback"
          ? "fallback"
          : undefined,
    sourceFetchedAt: "2026-07-22T01:00:00.000Z",
    entries: [
      {
        sourceCode: "130000",
        level: "warning",
        headline: "東京都に大雨警報",
        reportDatetime: "2026-07-22T10:00:00+09:00",
        publishingOffice: "気象庁",
        warnings: [
          { areaCode: "1310410", code: "03", status: "発表", level: "warning" },
        ],
      },
    ],
  };
  return {
    fetchedAt: "2026-07-22T01:00:00.000Z",
    quality: {
      status,
      attempted: 1,
      succeeded: status === "fallback" ? 0 : 1,
      failed: status === "live" ? 0 : 1,
    },
    byIso,
  };
}

describe("buildSignageJmaSnapshot", () => {
  it("liveデータは選択地点の警報と都道府県レベルを返す", () => {
    const result = buildSignageJmaSnapshot(fixture("live"), "JP-13", "1310410", new Date("2026-07-22T01:10:00Z"));
    expect(result.degraded).toBe(false);
    expect(result.selectedWarningState).toBe("live");
    expect(result.verifiedPrefectureCount).toBe(47);
    expect(result.prefectureLevels["JP-13"]).toBe("warning");
    expect(result.selectedWarnings).toEqual([{ code: "03", status: "発表" }]);
  });

  it("別地域の失敗で全体がdegradedでも、選択地域のlive警報を保持する", () => {
    const result = buildSignageJmaSnapshot(
      fixture("degraded"),
      "JP-13",
      "1310410",
      new Date("2026-07-22T01:10:00Z"),
    );
    expect(result.degraded).toBe(true);
    expect(result.selectedWarningState).toBe("live");
    expect(result.prefectureLevels["JP-13"]).toBe("warning");
    expect(result.selectedWarnings).toEqual([{ code: "03", status: "発表" }]);
  });

  it("fallback警報を現在の発表中情報として返さない", () => {
    const result = buildSignageJmaSnapshot(
      fixture("fallback"),
      "JP-13",
      "1310410",
      new Date("2026-07-22T01:10:00Z"),
    );
    expect(result.degraded).toBe(true);
    expect(result.selectedWarningState).toBe("degraded");
    expect(result.prefectureLevels["JP-13"]).toBeUndefined();
    expect(result.selectedWarnings).toEqual([]);
    expect(result.sourceFetchedAt).toBe("2026-07-22T01:00:00.000Z");
  });

  it("選択地点でも解除済みの警報は発表中一覧へ残さない", () => {
    const data = fixture("live");
    data.byIso["JP-13"].entries[0].warnings = [
      { areaCode: "1310410", code: "03", status: "解除", level: "warning" },
    ];
    const result = buildSignageJmaSnapshot(
      data,
      "JP-13",
      "1310410",
      new Date("2026-07-22T01:10:00Z"),
    );
    expect(result.selectedWarnings).toEqual([]);
  });

  it("live表明でも選択都道府県が欠ければdegradedにする", () => {
    const data = fixture("live");
    delete data.byIso["JP-47"];
    const result = buildSignageJmaSnapshot(data, "JP-47", "4720100", new Date("2026-07-22T01:10:00Z"));
    expect(result.degraded).toBe(true);
    expect(result.selectedWarningState).toBe("unavailable");
    expect(result.selectedWarnings).toEqual([]);
  });

  it.each([
    ["2026-07-22T00:44:59Z", "stale"],
    ["invalid", "invalid"],
    ["2026-07-22T01:10:01Z", "future"],
  ])("live表明でも%s時刻をdegradedにする (%s)", (fetchedAt) => {
    const data = fixture("live");
    data.fetchedAt = fetchedAt;
    expect(buildSignageJmaSnapshot(data, "JP-13", "1310410", new Date("2026-07-22T01:10:00Z")).degraded).toBe(true);
  });
});
