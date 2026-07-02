import { describe, it, expect } from "vitest";
import { ageHours, isDataStale } from "./data-freshness";

describe("ageHours", () => {
  it("経過時間を時間単位で返す", () => {
    const now = new Date("2026-07-02T12:00:00Z");
    expect(ageHours("2026-07-02T09:00:00Z", now)).toBe(3);
  });

  it("パース不能な文字列は null", () => {
    expect(ageHours("not-a-date", new Date())).toBeNull();
  });
});

describe("isDataStale", () => {
  const now = new Date("2026-07-02T12:00:00Z");

  it("しきい値以内は stale ではない", () => {
    expect(isDataStale("2026-07-02T11:00:00Z", 24, now)).toBe(false);
  });

  it("しきい値を超えると stale", () => {
    expect(isDataStale("2026-06-14T00:16:28.365Z", 24, now)).toBe(true);
  });

  it("パース不能な日時は検知を沈黙させないため stale 扱い", () => {
    expect(isDataStale("", 24, now)).toBe(true);
  });
});
