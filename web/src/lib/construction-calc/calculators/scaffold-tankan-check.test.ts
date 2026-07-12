import { describe, it, expect } from "vitest";
import { scaffoldTankanCheckCalculator, TANKAN_LIMITS } from "./scaffold-tankan-check";
import { normalizeValues } from "../schema";

/**
 * 単管足場チェックの数値固定テスト。
 * しきい値は安衛則第570条・第571条の条文値そのもの。
 */
describe("scaffold-tankan-check: 基準値（安衛則570・571条）", () => {
  it("条文のしきい値が固定されている", () => {
    expect(TANKAN_LIMITS.spanKetaMax).toBe(1.85);
    expect(TANKAN_LIMITS.spanHariMax).toBe(1.5);
    expect(TANKAN_LIMITS.loadPerBayMax).toBe(400);
    expect(TANKAN_LIMITS.wallTieVerticalMax).toBe(5);
    expect(TANKAN_LIMITS.wallTieHorizontalMax).toBe(5.5);
    expect(TANKAN_LIMITS.doublePostThreshold).toBe(31);
  });
});

describe("scaffold-tankan-check: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(scaffoldTankanCheckCalculator, raw);
    expect(errors).toEqual([]);
    return scaffoldTankanCheckCalculator.compute(values);
  };
  const base = { spanKeta: 1.8, spanHari: 1.2, height: 10, loadPerBay: 300, wallTieV: 5, wallTieH: 5.5 };

  it("標準的な外部足場は基準適合", () => {
    const out = run(base);
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("基準適合");
  });

  it("境界値: 上限ちょうど（1.85m・1.5m・400kg・5m・5.5m）は適合", () => {
    const out = run({ spanKeta: 1.85, spanHari: 1.5, height: 10, loadPerBay: 400, wallTieV: 5, wallTieH: 5.5 });
    expect(out.tone).toBe("safe");
  });

  it("けた行方向1.9mは不適合（571条1項1号）", () => {
    const out = run({ ...base, spanKeta: 1.9 });
    expect(out.tone).toBe("danger");
    expect(out.summary).toContain("けた行方向");
  });

  it("積載荷重410kgは不適合（571条1項4号: 400kg限度）", () => {
    const out = run({ ...base, loadPerBay: 410 });
    expect(out.tone).toBe("danger");
    const item = out.items.find((i) => i.label.includes("積載荷重"));
    expect(item?.tone).toBe("danger");
  });

  it("壁つなぎ垂直5.5m・水平6mは不適合（570条1項5号）", () => {
    const out = run({ ...base, wallTieV: 5.5, wallTieH: 6 });
    expect(out.tone).toBe("danger");
    expect(out.value).toBe("2"); // 不適合2項目
  });

  it("高さ31m超は2本組の必要性を警告（571条1項3号）", () => {
    const out = run({ ...base, height: 35 });
    expect(out.tone).toBe("safe"); // 2本組は情報提供でありNG判定ではない
    expect(out.warnings.join("\n")).toContain("2本組");
    const item = out.items.find((i) => i.label.includes("2本組"));
    expect(item?.tone).toBe("warning");
  });

  it("高さ31mちょうどは2本組警告を出さない（「超える部分」）", () => {
    const out = run({ ...base, height: 31 });
    expect(out.items.find((i) => i.label.includes("2本組"))).toBeUndefined();
  });

  it("作業主任者（565条）・基準抜粋の注意は常に含む", () => {
    const out = run(base);
    const w = out.warnings.join("\n");
    expect(w).toContain("作業主任者");
    expect(w).toContain("抜粋");
  });
});

describe("scaffold-tankan-check: 入力正規化", () => {
  it("負の積載荷重は既定値へ", () => {
    const { values, errors } = normalizeValues(scaffoldTankanCheckCalculator, { loadPerBay: -10 });
    expect(values.loadPerBay).toBe(300);
    expect(errors.length).toBe(1);
  });
});
