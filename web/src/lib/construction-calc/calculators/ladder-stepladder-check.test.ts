import { describe, it, expect } from "vitest";
import { ladderStepladderCheckCalculator, LADDER_LIMITS } from "./ladder-stepladder-check";
import { normalizeValues } from "../schema";

/**
 * 移動はしご・脚立チェックの数値固定テスト。
 * 期待値は安衛則527条(幅30cm)・528条(角度75度以下)・526条(1.5m超)の条文値そのもの。
 * 上端突出60cmは556条5号（はしご道）の準用・目安であり、不適合カウントに含めない。
 */
describe("ladder-stepladder-check: 移動はしご（527条・556条5号準用）", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(ladderStepladderCheckCalculator, raw);
    expect(errors).toEqual([]);
    return ladderStepladderCheckCalculator.compute(values);
  };

  it("幅35cm・突出70cmは適合", () => {
    const out = run({ equipmentType: "ladder", widthCm: 35, topProtrusionCm: 70, workHeightM: 1 });
    expect(out.tone).toBe("safe");
  });

  it("境界値: 幅ちょうど30cmは適合・29cmは不適合（527条3号）", () => {
    const ok = run({ equipmentType: "ladder", widthCm: LADDER_LIMITS.minWidthCm, topProtrusionCm: 70, workHeightM: 1 });
    expect(ok.tone).toBe("safe");
    const ng = run({ equipmentType: "ladder", widthCm: 29, topProtrusionCm: 70, workHeightM: 1 });
    expect(ng.tone).toBe("danger");
  });

  it("上端突出が60cm未満でも目安（warning）扱いで不適合カウントに含めない", () => {
    const out = run({ equipmentType: "ladder", widthCm: 35, topProtrusionCm: 40, workHeightM: 1 });
    expect(out.tone).toBe("safe");
    const item = out.items.find((i) => i.label.includes("上端の突出"));
    expect(item?.tone).toBe("warning");
  });
});

describe("ladder-stepladder-check: 脚立（528条3号）", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(ladderStepladderCheckCalculator, raw);
    expect(errors).toEqual([]);
    return ladderStepladderCheckCalculator.compute(values);
  };

  it("境界値: 開き角度ちょうど75度は適合・76度は不適合", () => {
    const ok = run({ equipmentType: "stepladder", legAngleDeg: LADDER_LIMITS.maxStepladderAngleDeg, workHeightM: 1 });
    expect(ok.tone).toBe("safe");
    const ng = run({ equipmentType: "stepladder", legAngleDeg: 76, workHeightM: 1 });
    expect(ng.tone).toBe("danger");
  });

  it("天板での作業ありは不適合", () => {
    const out = run({ equipmentType: "stepladder", legAngleDeg: 70, topPlateWork: "する", workHeightM: 1 });
    expect(out.tone).toBe("danger");
  });
});

describe("ladder-stepladder-check: 昇降設備の要否（526条・1.5m超）", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(ladderStepladderCheckCalculator, raw);
    expect(errors).toEqual([]);
    return ladderStepladderCheckCalculator.compute(values);
  };

  it("境界値: 1.5mちょうどは対象外・1.51mは対象（超えるで厳密に）", () => {
    const notYet = run({ equipmentType: "ladder", widthCm: 35, topProtrusionCm: 70, workHeightM: 1.5 });
    expect(notYet.warnings.join("\n")).not.toContain("526条");
    const yes = run({ equipmentType: "ladder", widthCm: 35, topProtrusionCm: 70, workHeightM: 1.51 });
    expect(yes.warnings.join("\n")).toContain("526条");
  });
});

describe("ladder-stepladder-check: 入力正規化", () => {
  it("数値でない開き角度は既定値へ", () => {
    const { values, errors } = normalizeValues(ladderStepladderCheckCalculator, { legAngleDeg: "たおれる" });
    expect(values.legAngleDeg).toBe(70);
    expect(errors.length).toBe(1);
  });
});
