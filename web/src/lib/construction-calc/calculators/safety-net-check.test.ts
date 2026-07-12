import { describe, it, expect } from "vitest";
import { safetyNetCheckCalculator, netLimits } from "./safety-net-check";
import { normalizeValues } from "../schema";

/**
 * 安全ネット基準チェックの数値固定テスト。
 * 期待値は告示（墜落による危険を防止するためのネットの構造等の安全基準に関する技術上の指針）
 * ４−１−１〜４−１−３の式そのものから手計算する（出典から独立）。
 */
describe("safety-net-check: netLimits（告示の式・境界値）", () => {
  it("単体ネット・L=A=3m（L≥A）・10cm網目 → H1=2.25m・S=0.75m・H2=2.55m", () => {
    const r = netLimits({ netType: "single", meshSize: "10", shortSideL: 3, supportSpacingA: 3 });
    expect(r.fallHeightMaxM).toBeCloseTo(2.25, 6);
    expect(r.slackMaxM).toBeCloseTo(0.75, 6);
    expect(r.clearanceMinM).toBeCloseTo(2.55, 6);
  });

  it("単体ネット・L=2m<A=4m・10cm網目 → H1=2.5m・S=0.8333m・H2=2.975m", () => {
    const r = netLimits({ netType: "single", meshSize: "10", shortSideL: 2, supportSpacingA: 4 });
    expect(r.fallHeightMaxM).toBeCloseTo(2.5, 6);
    expect(r.slackMaxM).toBeCloseTo(0.8333, 3);
    expect(r.clearanceMinM).toBeCloseTo(2.975, 6);
  });

  it("複合ネット・L=A=3m → H1=1.8m（単体より小さい）・Sは単体と同じ0.75m", () => {
    const r = netLimits({ netType: "composite", meshSize: "10", shortSideL: 3, supportSpacingA: 3 });
    expect(r.fallHeightMaxM).toBeCloseTo(1.8, 6);
    expect(r.slackMaxM).toBeCloseTo(0.75, 6);
  });

  it("複合ネット・L=2m<A=4m → H1=0.20(L+2A)=2.0m", () => {
    const r = netLimits({ netType: "composite", meshSize: "10", shortSideL: 2, supportSpacingA: 4 });
    expect(r.fallHeightMaxM).toBeCloseTo(2.0, 6);
  });

  it("5cm網目・L=A=3m → H2=0.95L=2.85m（10cm網目より厳しい）", () => {
    const r = netLimits({ netType: "single", meshSize: "5", shortSideL: 3, supportSpacingA: 3 });
    expect(r.clearanceMinM).toBeCloseTo(2.85, 6);
  });

  it("境界値: L=Aちょうどは「L≥Aのとき」の式(0.75L)を使う（L<Aの式と同値になる境界）", () => {
    const atBoundary = netLimits({ netType: "single", meshSize: "10", shortSideL: 3, supportSpacingA: 3 });
    expect(atBoundary.fallHeightMaxM).toBeCloseTo(0.75 * 3, 6);
  });

  it("L>Aでは「L≥Aのとき」の式(0.75L)を使う", () => {
    const r = netLimits({ netType: "single", meshSize: "10", shortSideL: 5, supportSpacingA: 3 });
    expect(r.fallHeightMaxM).toBeCloseTo(0.75 * 5, 6);
  });
});

describe("safety-net-check: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(safetyNetCheckCalculator, raw);
    expect(errors).toEqual([]);
    return safetyNetCheckCalculator.compute(values);
  };

  it("単体ネット・L=A=3m・落下高さ2.0m・下部の空き2.6m → 基準適合", () => {
    const out = run({ netType: "single", meshSize: "10", shortSideL: 3, supportSpacingA: 3, plannedFallHeightM: 2.0, clearanceBelowM: 2.6 });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("基準適合");
  });

  it("単体ネット・L=2m<A=4m・落下高さ3.0m・下部の空き2.5m → 基準超過（両方NG）", () => {
    const out = run({ netType: "single", meshSize: "10", shortSideL: 2, supportSpacingA: 4, plannedFallHeightM: 3.0, clearanceBelowM: 2.5 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("基準超過");
    expect(out.warnings.join("\n")).toContain("落下高さ");
    expect(out.warnings.join("\n")).toContain("下部の空き");
  });

  it("複合ネット・5cm網目・L=A=3m・落下高さ1.5m・下部の空き3.0m → 基準適合", () => {
    const out = run({ netType: "composite", meshSize: "5", shortSideL: 3, supportSpacingA: 3, plannedFallHeightM: 1.5, clearanceBelowM: 3.0 });
    expect(out.tone).toBe("safe");
  });

  it("安衛則第518条・第519条への言及を常に含む", () => {
    const out = run({});
    expect(out.warnings.join("\n")).toContain("第518条");
    expect(out.warnings.join("\n")).toContain("第519条");
  });

  it("支持点の強度（600kg・連続架構物の特例）の参考値を常に示す", () => {
    const out = run({ supportSpacingA: 3 });
    expect(out.warnings.join("\n")).toContain("600kg");
    expect(out.items.some((i) => i.label.includes("支持点強度"))).toBe(true);
  });
});
