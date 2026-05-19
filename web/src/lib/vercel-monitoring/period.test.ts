import { describe, expect, it } from "vitest";
import { currentBillingPeriod } from "./period";

describe("currentBillingPeriod", () => {
  it("starts on the 1st UTC of the current month", () => {
    const period = currentBillingPeriod(new Date("2026-05-20T15:30:00Z"));
    expect(period.start).toBe("2026-05-01T00:00:00.000Z");
    expect(period.end).toBe("2026-06-01T00:00:00.000Z");
    expect(period.totalDays).toBe(31);
    expect(period.daysIntoPeriod).toBe(20);
    expect(period.daysRemaining).toBe(11);
  });

  it("handles February of a non-leap year", () => {
    const period = currentBillingPeriod(new Date("2026-02-15T00:00:00Z"));
    expect(period.totalDays).toBe(28);
    expect(period.daysIntoPeriod).toBe(15);
  });

  it("treats the first day of the month as day 1", () => {
    const period = currentBillingPeriod(new Date("2026-05-01T00:00:01Z"));
    expect(period.daysIntoPeriod).toBe(1);
    expect(period.daysRemaining).toBe(30);
  });
});
