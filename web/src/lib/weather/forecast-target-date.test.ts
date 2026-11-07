import { describe, expect, it } from "vitest";
import { resolveForecastTargetDate } from "./forecast-target-date";

describe("forecast calendar dates", () => {
  const now = new Date("2026-02-27T23:00:00+09:00");
  it.each(["2026-02-29", "2026-02-30", "2026-02-31", "2026-13-01", "2026-2-28"])("rejects %s", (date) => {
    expect(resolveForecastTargetDate(date, now)).toBeNull();
  });
  it("accepts a real leap day", () => {
    expect(resolveForecastTargetDate("2028-02-29", new Date("2028-02-28T00:00:00+09:00")))
      .toEqual({ date: "2028-02-29", daysAhead: 1 });
  });
  it("uses the JST day around UTC midnight and preserves the six-day boundary", () => {
    const time = new Date("2026-02-28T16:00:00Z");
    expect(resolveForecastTargetDate(null, time)).toEqual({ date: "2026-03-01", daysAhead: 0 });
    expect(resolveForecastTargetDate("2026-03-07", time)?.daysAhead).toBe(6);
    expect(resolveForecastTargetDate("2026-03-08", time)).toBeNull();
    expect(resolveForecastTargetDate("2026-02-28", time)).toBeNull();
  });
});
