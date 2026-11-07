import { describe, expect, it } from "vitest";
import { formatNumber } from "./schema";

describe("060 従来計算画面も非ゼロを0と表示しない", () => {
  it.each([
    [0.0001, 2, "表示精度未満"],
    [-0.0001, 2, "表示精度未満（負の値）"],
    [0, 2, "0"],
    [-0, 2, "-0"],
    [0.006, 2, "0.01"],
    [123456.789, 2, "123,456.79"],
  ] as const)("精度と符号を保つ: %s / %s桁", (raw, precision, expected) => {
    expect(formatNumber(raw, precision)).toBe(expected);
  });
});
