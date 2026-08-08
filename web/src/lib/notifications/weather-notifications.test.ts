import { describe, expect, it } from "vitest";
import type { JmaWarningsFile } from "@/lib/jma/jma-data";
import { buildWeatherNotifications } from "./weather-notifications";

const now = new Date("2026-07-26T03:00:00.000Z");

function fixture(sourceStatus: "live" | "fallback"): JmaWarningsFile {
  return {
    fetchedAt:
      sourceStatus === "live"
        ? "2026-07-26T02:55:00.000Z"
        : "2026-07-13T00:00:00.000Z",
    quality: {
      status: sourceStatus === "live" ? "degraded" : "fallback",
      attempted: 47,
      succeeded: sourceStatus === "live" ? 46 : 0,
      failed: sourceStatus === "live" ? 1 : 47,
    },
    byIso: {
      "JP-13": {
        level: "warning",
        sourceStatus,
        sourceFetchedAt:
          sourceStatus === "live"
            ? "2026-07-26T02:55:00.000Z"
            : "2026-07-13T00:00:00.000Z",
        entries: [
          {
            sourceCode: "130000",
            level: "warning",
            headline: "東京都に大雨警報",
            reportDatetime: "2026-07-26T11:50:00+09:00",
            publishingOffice: "気象庁",
            warnings: [],
          },
        ],
      },
    },
  };
}

describe("buildWeatherNotifications provenance boundary", () => {
  it("全体degradedでも地域単位でliveかつfreshな警報は通知へ残す", () => {
    const items = buildWeatherNotifications("JP-13", fixture("live"), now);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      category: "weather",
      severity: "warning",
    });
    expect(items[0].title).toContain("発表中");
  });

  it("fallbackの古い警報を現在の発表中通知へ変換しない", () => {
    expect(buildWeatherNotifications("JP-13", fixture("fallback"), now)).toEqual([]);
  });
});
