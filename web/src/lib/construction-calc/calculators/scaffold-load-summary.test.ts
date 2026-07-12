import { describe, it, expect } from "vitest";
import {
  scaffoldLoadSummaryCalculator,
  bayLiveLoadKgf,
  nToKgf,
  BAY_LOAD_LIMIT_KG,
} from "./scaffold-load-summary";
import { normalizeValues, STANDARD_GRAVITY } from "../schema";

/**
 * 足場荷重集計の数値固定テスト。
 * 期待値は安衛則571条1項4号の400kg限度そのものと、
 * 「（自重＋w×面積）÷本数」という単純な集計式の手計算に独立して一致させる。
 */
describe("scaffold-load-summary: nToKgf / bayLiveLoadKgf 換算", () => {
  it("N→kgf は標準重力加速度で除する", () => {
    expect(nToKgf(STANDARD_GRAVITY)).toBeCloseTo(1, 9);
    expect(nToKgf(9806.65)).toBeCloseTo(1000, 6);
  });

  it("1スパンの積載荷重 = w × スパン長 × 奥行 ÷ 9.80665", () => {
    // w=1000N/m², 1.8m×2.0m=3.6m² → 3600N ÷ 9.80665 ≈ 367.09kgf
    expect(bayLiveLoadKgf(1.8, 2.0, 1000)).toBeCloseTo(3600 / STANDARD_GRAVITY, 6);
  });

  it("境界値: ちょうど400kgとなる面積で400kg（571条1項4号の限度と一致）", () => {
    // w=1000N/m² のとき、400kgf ちょうどになる面積 = 400×9.80665/1000 = 3.92266 m²
    const area = (BAY_LOAD_LIMIT_KG * STANDARD_GRAVITY) / 1000;
    expect(bayLiveLoadKgf(1, area, 1000)).toBeCloseTo(400, 6);
  });
});

describe("scaffold-load-summary: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(scaffoldLoadSummaryCalculator, raw);
    expect(errors).toEqual([]);
    return scaffoldLoadSummaryCalculator.compute(values);
  };

  it("外部突合: 建地1本負担 =（自重＋w×総面積÷9.80665）÷本数 の手計算と一致", () => {
    const selfWeightTotalKg = 1000;
    const postCount = 10;
    const floorLoadW = 1000; // N/m²
    const totalFloorAreaM2 = 40;
    const out = run({
      selfWeightTotalKg,
      postCount,
      spanM: 1.8,
      bayDepthM: 0.5,
      floorLoadW,
      totalFloorAreaM2,
    });
    const expectedLiveLoadKgf = (floorLoadW * totalFloorAreaM2) / STANDARD_GRAVITY;
    const expectedTotalKgf = selfWeightTotalKg + expectedLiveLoadKgf;
    const expectedPerPost = expectedTotalKgf / postCount;
    expect(out.value).toBe(expectedPerPost.toLocaleString("ja-JP", { maximumFractionDigits: 1 }));
  });

  it("1スパン積載が400kg以内なら適合", () => {
    const out = run({ spanM: 1.8, bayDepthM: 0.5, floorLoadW: 1500 });
    // 1.8*0.5*1500/9.80665 ≈ 137.7kgf ≤ 400
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("400kg限度内");
  });

  it("1スパン積載が400kgを超えると不適合（571条1項4号）", () => {
    const out = run({ spanM: 1.8, bayDepthM: 1.5, floorLoadW: 4000 });
    // 1.8*1.5*4000/9.80665 ≈ 1101.9kgf > 400
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("400kg限度超過");
    expect(out.warnings.join("\n")).toContain("571条1項4号");
  });

  it("境界値: ちょうど400kgは適合（以下）", () => {
    // フィールドの奥行き上限(2m)内に収まるよう w を調整し、ちょうど400kgとなる組み合わせにする
    const spanM = 1.8;
    const bayDepthM = 1.5;
    const floorLoadW = (BAY_LOAD_LIMIT_KG * STANDARD_GRAVITY) / (spanM * bayDepthM);
    const out = run({ spanM, bayDepthM, floorLoadW });
    expect(out.tone).toBe("safe");
  });

  it("地耐力照査は範囲外である旨・壁つなぎ/作業主任者の警告を常に含む", () => {
    const out = run({});
    const w = out.warnings.join("\n");
    expect(w).toContain("地耐力");
    expect(w).toContain("壁つなぎ");
    expect(w).toContain("作業主任者");
  });
});

describe("scaffold-load-summary: 入力正規化", () => {
  it("数値でない建地本数は既定値へ", () => {
    const { values, errors } = normalizeValues(scaffoldLoadSummaryCalculator, { postCount: "たくさん" });
    expect(values.postCount).toBe(12);
    expect(errors.length).toBe(1);
  });
});
