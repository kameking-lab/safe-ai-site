import { describe, it, expect } from "vitest";
import {
  anchorPulloutCalculator,
  coneProjectedArea,
  coneStrengthN,
  bondStrengthN,
} from "./anchor-pullout";
import { normalizeValues } from "../schema";

/**
 * あと施工アンカー引抜き耐力の数値固定テスト。
 * 期待値はコーン状破壊式 0.31·√σB·Ac、付着式 τa·π·D·ℓce から独立に手計算した値（外部突合）。
 */
describe("anchor-pullout: コーン投影面積・耐力（外部突合＝手計算値）", () => {
  it("Ac = π·ℓce·(ℓce+D)（ℓce=100,D=12 → 35186 mm²）", () => {
    expect(coneProjectedArea(100, 12)).toBeCloseTo(Math.PI * 100 * 112, 3);
    expect(coneProjectedArea(100, 12)).toBeCloseTo(35185.84, 1);
  });

  it("コーン状破壊耐力 Tcb=0.31·√σB·Ac（σB21,ℓce100,D12 → 約50.0 kN）", () => {
    const N = coneStrengthN(21, 100, 12);
    expect(N).toBeCloseTo(0.31 * Math.sqrt(21) * Math.PI * 100 * 112, 3);
    expect(N / 1000).toBeCloseTo(49.99, 1);
  });

  it("付着破壊耐力 Ta=τa·π·D·ℓce（τa10,D16,ℓce125 → 約62.8 kN）", () => {
    const N = bondStrengthN(10, 16, 125);
    expect(N).toBeCloseTo(10 * Math.PI * 16 * 125, 3);
    expect(N / 1000).toBeCloseTo(62.83, 1);
  });
});

describe("anchor-pullout: compute の判定（安全率・支配モード）", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(anchorPulloutCalculator, raw);
    expect(errors).toEqual([]);
    return anchorPulloutCalculator.compute(values);
  };

  it("M12・埋込100・Fc21・常時・設計10kN → コーンのみ、許容≈16.7kN、安全率≈1.67でOK", () => {
    const out = run({ designLoad: 10, concreteStrength: 21, embedDepth: 100, anchorDia: 12, bondStrength: 0, safetyFactor: "longterm" });
    // コーン 49.99kN /3 = 16.66kN 許容、安全率 = 16.66/10 = 1.67倍（value は安全率）
    expect(out.tone).toBe("safe");
    expect(out.value).toBe("1.67");
    expect(out.unit).toBe("倍");
    expect(out.summary).toContain("コーン状破壊");
    expect(out.items.some((i) => i.value.includes("16.7"))).toBe(true);
  });

  it("付着未入力なら付着評価をスキップして警告を出す", () => {
    const out = run({ bondStrength: 0 });
    expect(out.warnings.join("\n")).toContain("付着破壊");
    expect(out.warnings.join("\n")).toContain("証明書");
  });

  it("接着系 M16・埋込125・Fc24・τa10 → 付着(62.8kN)がコーン(84.1kN)より小さく支配", () => {
    const out = run({ designLoad: 20, concreteStrength: 24, embedDepth: 125, anchorDia: 16, bondStrength: 10, safetyFactor: "longterm" });
    expect(out.summary).toContain("付着破壊");
    // min(84.09, 62.83)=62.83 /3 = 20.94kN ≥ 設計20kN → OK
    expect(out.tone).toBe("safe");
  });

  it("設計引張力が許容を上回るとNG（危険トーン＋見直し警告）", () => {
    const out = run({ designLoad: 100, concreteStrength: 21, embedDepth: 100, anchorDia: 12, bondStrength: 0, safetyFactor: "longterm" });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("引抜き不足");
    expect(out.warnings.join("\n")).toContain("下回");
  });

  it("安全率2（地震時）は常時3より許容が大きくなる", () => {
    const longterm = run({ designLoad: 0, concreteStrength: 21, embedDepth: 100, anchorDia: 12, safetyFactor: "longterm" });
    const shortterm = run({ designLoad: 0, concreteStrength: 21, embedDepth: 100, anchorDia: 12, safetyFactor: "shortterm" });
    // value は designLoad=0 のとき許容[kN]
    const l = Number(longterm.value);
    const s = Number(shortterm.value);
    expect(s).toBeGreaterThan(l);
    expect(s / l).toBeCloseTo(1.5, 2); // 3/2
  });

  it("縁端距離・鋼材・施工品質が範囲外である旨の警告を常に含む", () => {
    const out = run({});
    const w = out.warnings.join("\n");
    expect(w).toContain("縁端距離");
    expect(w).toContain("施工品質");
  });

  it("設計引張力0なら許容引抜き荷重のみ表示（安全率判定なし）", () => {
    const out = run({ designLoad: 0, bondStrength: 0 });
    expect(out.unit).toBe("kN");
    expect(out.steps.join("\n")).toContain("設計引張力を入力すると");
  });
});
