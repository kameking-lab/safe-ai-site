import { describe, expect, it } from "vitest";
import {
  CHECKUP_TIMING_ORDER,
  classifyCheckupTiming,
  dueSoonWindow,
} from "./health-checkup-timing";

// Fixed reference: 2026-06-15 (noon-local semantics inside the engine).
const REF = new Date(2026, 5, 15, 12, 0, 0, 0);

describe("classifyCheckupTiming", () => {
  it("returns 未記録 when no date is given", () => {
    const t = classifyCheckupTiming(6, undefined, REF);
    expect(t.status).toBe("unrecorded");
    expect(t.nextDueDate).toBeNull();
    expect(t.monthsSince).toBeNull();
  });

  it("treats a malformed date as 未記録", () => {
    expect(classifyCheckupTiming(12, "2026/01/01", REF).status).toBe("unrecorded");
    expect(classifyCheckupTiming(12, "garbage", REF).status).toBe("unrecorded");
  });

  it("flags 期限超過 once the legal interval is exceeded", () => {
    // 12-month exam last done 13 months ago.
    const t = classifyCheckupTiming(12, "2025-05-10", REF);
    expect(t.status).toBe("overdue");
    expect(t.monthsSince).toBe(13);
    expect(t.monthsUntilDue).toBe(-1);
    expect(t.nextDueDate).toBe("2026-05-10");
  });

  it("flags 期限間近 within the due-soon window but not yet overdue", () => {
    // 6-month exam done 5 months ago -> 1 month until due (window = 2).
    const t = classifyCheckupTiming(6, "2026-01-12", REF);
    expect(t.status).toBe("due-soon");
    expect(t.monthsUntilDue).toBe(1);
    expect(t.nextDueDate).toBe("2026-07-12");
  });

  it("reports 適正 when well within the interval", () => {
    // 12-month exam done 2 months ago.
    const t = classifyCheckupTiming(12, "2026-04-15", REF);
    expect(t.status).toBe("ok");
    expect(t.monthsUntilDue).toBe(10);
  });

  it("at exactly the interval boundary it is due-soon, not overdue", () => {
    // 6-month exam done exactly 6 calendar months ago.
    const t = classifyCheckupTiming(6, "2025-12-15", REF);
    expect(t.status).toBe("due-soon");
    expect(t.monthsSince).toBe(6);
    expect(t.monthsUntilDue).toBe(0);
  });

  it("treats event-driven (interval 0) recorded exams as 適正 without a deadline", () => {
    const t = classifyCheckupTiming(0, "2025-01-01", REF);
    expect(t.status).toBe("ok");
    expect(t.nextDueDate).toBeNull();
    expect(t.monthsUntilDue).toBeNull();
  });

  it("dueSoonWindow narrows for short intervals and caps at 2", () => {
    expect(dueSoonWindow(12)).toBe(2);
    expect(dueSoonWindow(6)).toBe(2);
    expect(dueSoonWindow(1)).toBe(1);
    expect(dueSoonWindow(0)).toBe(0);
  });

  it("orders overdue before due-soon before unrecorded before ok", () => {
    expect(CHECKUP_TIMING_ORDER.overdue).toBeLessThan(CHECKUP_TIMING_ORDER["due-soon"]);
    expect(CHECKUP_TIMING_ORDER["due-soon"]).toBeLessThan(CHECKUP_TIMING_ORDER.unrecorded);
    expect(CHECKUP_TIMING_ORDER.unrecorded).toBeLessThan(CHECKUP_TIMING_ORDER.ok);
  });
});
