import { describe, it, expect } from "vitest";
import {
  yearOptions,
  MONTH_OPTIONS,
  daysInMonth,
  dayOptions,
  temperatureOptions,
  LIKELIHOOD_OPTIONS,
  SEVERITY_OPTIONS,
  evalScore,
  riskGrade,
} from "./pulldown-options";

describe("yearOptions", () => {
  it("当年-2〜+5 の8件を返す", () => {
    const ys = yearOptions(new Date(2026, 0, 1));
    expect(ys).toEqual([2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031]);
  });
});

describe("MONTH_OPTIONS", () => {
  it("1〜12", () => {
    expect([...MONTH_OPTIONS]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe("daysInMonth / dayOptions", () => {
  it("2月は平年28日・うるう年29日", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29); // 2028はうるう年
    expect(daysInMonth(2100, 2)).toBe(28); // 100年例外
    expect(daysInMonth(2000, 2)).toBe(29); // 400年例外
  });
  it("4月は30日・1月は31日", () => {
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 1)).toBe(31);
  });
  it("dayOptions は1始まりで末日まで", () => {
    expect(dayOptions(2026, 2)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    expect(dayOptions(2026, 4).at(-1)).toBe(30);
  });
  it("不正な月はフォールバック31", () => {
    expect(daysInMonth(2026, 0)).toBe(31);
    expect(daysInMonth(2026, 13)).toBe(31);
  });
});

describe("temperatureOptions", () => {
  it("既定 -15〜45 を昇順で返す", () => {
    const ts = temperatureOptions();
    expect(ts[0]).toBe(-15);
    expect(ts.at(-1)).toBe(45);
    expect(ts.length).toBe(61);
  });
  it("min>max は空", () => {
    expect(temperatureOptions(10, 5)).toEqual([]);
  });
});

describe("可能性・重大性", () => {
  it("どちらも3段階", () => {
    expect(LIKELIHOOD_OPTIONS.map((o) => o.value)).toEqual([3, 2, 1]);
    expect(SEVERITY_OPTIONS.map((o) => o.value)).toEqual([3, 2, 1]);
  });
});

describe("evalScore / riskGrade", () => {
  it("評価値は積", () => {
    expect(evalScore(3, 3)).toBe(9);
    expect(evalScore(2, 1)).toBe(2);
  });
  it("区分しきい値 >=6 大 / >=3 中 / それ以下 小", () => {
    expect(riskGrade(9).grade).toBe("high");
    expect(riskGrade(6).grade).toBe("high");
    expect(riskGrade(4).grade).toBe("medium");
    expect(riskGrade(3).grade).toBe("medium");
    expect(riskGrade(2).grade).toBe("low");
    expect(riskGrade(1).grade).toBe("low");
  });
});
