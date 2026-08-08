import { describe, expect, it } from "vitest";
import { addDaysToDateKey, dataFreshness, jstDateKey, relativeJstDateLabel } from "./jst-date";

describe("JST date and freshness boundary", () => {
  it("uses Japan's calendar day around UTC rollover", () => {
    expect(jstDateKey("2026-07-22T15:00:00.000Z")).toBe("2026-07-23");
    expect(jstDateKey("2026-07-22T14:59:59.999Z")).toBe("2026-07-22");
  });

  it("labels relative dates from actual JST dates", () => {
    const now = new Date("2026-07-22T15:30:00.000Z");
    expect(relativeJstDateLabel("2026-07-23", now)).toBe("今日");
    expect(relativeJstDateLabel("2026-07-24", now)).toBe("明日");
    expect(relativeJstDateLabel("2026-07-25", now)).toBe("明後日");
    expect(addDaysToDateKey("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("treats future, invalid, missing, and expired timestamps as untrusted", () => {
    const now = new Date("2026-07-23T03:00:00.000Z");
    expect(dataFreshness("2026-07-23T02:50:00.000Z", now)).toBe("fresh");
    expect(dataFreshness("2026-07-23T02:44:59.000Z", now)).toBe("stale");
    expect(dataFreshness("2026-07-23T03:00:01.000Z", now)).toBe("stale");
    expect(dataFreshness("not-a-date", now)).toBe("unknown");
    expect(dataFreshness(null, now)).toBe("unknown");
  });

  it("keeps 15-minute boundary exact and accepts explicit timezone offsets", () => {
    const now = new Date("2026-07-23T03:00:00.000Z");
    expect(dataFreshness("2026-07-23T02:45:01.000Z", now)).toBe("fresh"); // 14:59
    expect(dataFreshness("2026-07-23T02:45:00.000Z", now)).toBe("fresh"); // 15:00
    expect(dataFreshness("2026-07-23T02:44:59.999Z", now)).toBe("stale");
    expect(dataFreshness("2026-07-23T11:50:00+09:00", now)).toBe("fresh");
  });
});
