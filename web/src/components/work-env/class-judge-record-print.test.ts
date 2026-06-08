import { describe, it, expect } from "vitest";
import { formatMeasuredOn } from "./class-judge-record-print";

describe("formatMeasuredOn", () => {
  it("空文字は空文字を返す（手書き欄として印刷される）", () => {
    expect(formatMeasuredOn("")).toBe("");
  });

  it("ISO日付を和暦表記に整形する", () => {
    expect(formatMeasuredOn("2026-06-05")).toBe("2026年6月5日");
  });

  it("月日のゼロ埋めを外して表記する", () => {
    expect(formatMeasuredOn("2025-01-09")).toBe("2025年1月9日");
  });

  it("不正な日付値は空文字を返す（記録に壊れた日付を出さない）", () => {
    expect(formatMeasuredOn("not-a-date")).toBe("");
  });
});
