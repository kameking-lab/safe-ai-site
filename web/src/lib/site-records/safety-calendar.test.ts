import { describe, it, expect } from "vitest";
import { SAFETY_CALENDAR, RECURRING_ITEMS, MONTH_LABEL } from "./safety-calendar";

describe("SAFETY_CALENDAR", () => {
  it("1〜12月すべてが昇順で揃い、各月に項目がある", () => {
    expect(SAFETY_CALENDAR).toHaveLength(12);
    SAFETY_CALENDAR.forEach((m, i) => {
      expect(m.month).toBe(i + 1);
      expect(m.items.length).toBeGreaterThan(0);
    });
  });
  it("全国安全週間は7月、全国労働衛生週間は10月に含まれる", () => {
    const jul = SAFETY_CALENDAR.find((m) => m.month === 7)!;
    const oct = SAFETY_CALENDAR.find((m) => m.month === 10)!;
    expect(jul.items.some((i) => i.label.includes("全国安全週間"))).toBe(true);
    expect(oct.items.some((i) => i.label.includes("全国労働衛生週間"))).toBe(true);
  });
});

describe("RECURRING_ITEMS / MONTH_LABEL", () => {
  it("毎月・毎日の活動とリンクがある", () => {
    expect(RECURRING_ITEMS.length).toBeGreaterThanOrEqual(5);
    expect(RECURRING_ITEMS.some((i) => i.href === "/ky/paper")).toBe(true);
  });
  it("月ラベルは1-12に対応", () => {
    expect(MONTH_LABEL[6]).toBe("6月");
    expect(MONTH_LABEL[12]).toBe("12月");
  });
});
