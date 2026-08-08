import { describe, expect, it } from "vitest";
import { compareConcentration, parseExposureLimit } from "./concentration-comparison";

describe("chemical concentration comparison gold boundaries", () => {
  it("parses known ppm and mg/m3 limits", () => {
    expect(parseExposureLimit("1 ppm")).toEqual({ value: 1, unit: "ppm" });
    expect(parseExposureLimit("0.5 mg/m³")).toEqual({ value: 0.5, unit: "mg/m3" });
  });

  it("does not infer an unknown or missing unit", () => {
    expect(compareConcentration("1", "", "1 ppm")).toMatchObject({ status: "unverifiable", label: "単位未選択・判定不能" });
    expect(compareConcentration("1", "ppm", "基準値なし")).toMatchObject({ status: "unverifiable", label: "判定不能" });
  });

  it("rejects unit mismatch without implicit conversion", () => {
    expect(compareConcentration("1", "ppm", "1 mg/m3")).toMatchObject({ status: "unverifiable", label: "単位不一致・判定不能" });
  });

  it("keeps equality, below and above boundary distinct", () => {
    expect(compareConcentration("1", "ppm", "1 ppm")).toMatchObject({ status: "comparable", level: "warning", ratio: 1 });
    expect(compareConcentration("0.49", "ppm", "1 ppm")).toMatchObject({ status: "comparable", level: "reference", ratio: 0.49 });
    expect(compareConcentration("1.01", "ppm", "1 ppm")).toMatchObject({ status: "comparable", level: "danger", ratio: 1.01 });
  });

  it("rejects invalid and negative measurements", () => {
    expect(compareConcentration("-1", "ppm", "1 ppm")).toMatchObject({ status: "unverifiable" });
    expect(compareConcentration("1 ppm", "ppm", "1 ppm")).toMatchObject({ status: "unverifiable" });
  });
});
