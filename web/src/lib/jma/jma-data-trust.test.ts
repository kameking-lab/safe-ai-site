import { describe, expect, it } from "vitest";
import { assessJmaDataTrust } from "./jma-data-trust";

const liveQuality = { status: "live" as const, attempted: 47, succeeded: 47, failed: 0 };
const now = new Date("2026-07-23T03:00:00.000Z");

describe("assessJmaDataTrust", () => {
  it.each([
    ["2026-07-23T02:45:01.000Z", "live"],
    ["2026-07-23T02:45:00.000Z", "live"],
    ["2026-07-23T02:44:59.999Z", "degraded"],
    ["2026-07-23T03:00:00.001Z", "degraded"],
    ["not-a-date", "unavailable"],
  ] as const)("classifies fetchedAt %s as %s", (fetchedAt, status) => {
    expect(assessJmaDataTrust({
      fetchedAt,
      quality: liveQuality,
      actualCoverage: 47,
      expectedCoverage: 47,
      now,
    }).status).toBe(status);
  });

  it("rejects missing timestamps, partial regions, and quality contradictions", () => {
    expect(assessJmaDataTrust({ quality: liveQuality, now }).status).toBe("unavailable");
    expect(assessJmaDataTrust({
      fetchedAt: "2026-07-23T02:55:00Z",
      quality: liveQuality,
      actualCoverage: 46,
      expectedCoverage: 47,
      now,
    }).reasons).toContain("coverage-partial");
    expect(assessJmaDataTrust({
      fetchedAt: "2026-07-23T02:55:00Z",
      quality: { ...liveQuality, succeeded: 46, failed: 1 },
      actualCoverage: 47,
      expectedCoverage: 47,
      now,
    }).reasons).toContain("quality-counts-inconsistent");
  });
});
