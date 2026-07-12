import { describe, it, expect } from "vitest";
import { excavationSlopeCalculator, slopeLimit, slopeRatioLabel } from "./excavation-slope";
import { normalizeValues } from "../schema";

/**
 * 掘削面勾配チェックの数値固定テスト。
 * 期待値は安衛則第356条・第357条の条文の区分そのもの。
 * 高さの境界（2m・5m）は条文の「未満/以上」に厳密に従う。
 */
describe("excavation-slope: slopeLimit（安衛則356条・357条のルール表）", () => {
  it("岩盤・堅い粘土: 5m未満→90° / 5m以上→75°（境界5.0mは75°）", () => {
    expect(slopeLimit("rock_hard_clay", 4.9).limitDeg).toBe(90);
    expect(slopeLimit("rock_hard_clay", 5.0).limitDeg).toBe(75);
    expect(slopeLimit("rock_hard_clay", 10).limitDeg).toBe(75);
  });

  it("その他の地山: 2m未満→90° / 2〜5m未満→75° / 5m以上→60°", () => {
    expect(slopeLimit("other", 1.9).limitDeg).toBe(90);
    expect(slopeLimit("other", 2.0).limitDeg).toBe(75); // 境界: 2m以上
    expect(slopeLimit("other", 4.9).limitDeg).toBe(75);
    expect(slopeLimit("other", 5.0).limitDeg).toBe(60); // 境界: 5m以上
  });

  it("砂: 高さ5m未満なら制限なし / 5m以上なら35°以下（357条）", () => {
    expect(slopeLimit("sand", 4.9).limitDeg).toBeNull();
    expect(slopeLimit("sand", 5.0).limitDeg).toBe(35);
    expect(slopeLimit("sand", 5.0).basisArticle).toBe("第357条");
  });

  it("崩壊しやすい状態: 高さ2m未満なら制限なし / 2m以上なら45°以下（357条）", () => {
    expect(slopeLimit("collapse_prone", 1.9).limitDeg).toBeNull();
    expect(slopeLimit("collapse_prone", 2.0).limitDeg).toBe(45);
  });
});

describe("excavation-slope: 勾配の割表記", () => {
  it("45°は1:1、90°は垂直", () => {
    expect(slopeRatioLabel(45)).toBe("1:1");
    expect(slopeRatioLabel(90)).toBe("垂直");
    // 60° → 1:0.58
    expect(slopeRatioLabel(60)).toBe("1:0.58");
  });
});

describe("excavation-slope: compute の判定", () => {
  const run = (raw: Record<string, unknown>) => {
    const { values, errors } = normalizeValues(excavationSlopeCalculator, raw);
    expect(errors).toEqual([]);
    return excavationSlopeCalculator.compute(values);
  };

  it("その他の地山・深さ3m・勾配60° → 適合（上限75°）", () => {
    const out = run({ soil: "other", height: 3, slope: 60 });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("基準適合");
    expect(out.value).toBe("75");
  });

  it("その他の地山・深さ3m・勾配80° → 超過", () => {
    const out = run({ soil: "other", height: 3, slope: 80 });
    expect(out.tone).toBe("danger");
    expect(out.headline).toBe("勾配超過");
  });

  it("境界値: 上限ちょうどの勾配は適合（75°≦75°）", () => {
    const out = run({ soil: "other", height: 3, slope: 75 });
    expect(out.tone).toBe("safe");
  });

  it("砂・深さ6m・勾配40° → 超過（35°以下が必要）", () => {
    const out = run({ soil: "sand", height: 6, slope: 40 });
    expect(out.tone).toBe("danger");
  });

  it("砂・深さ4m → 高さ条件により勾配制限なしで適合＋根拠の説明", () => {
    const out = run({ soil: "sand", height: 4, slope: 80 });
    expect(out.tone).toBe("safe");
    expect(out.warnings.join("\n")).toContain("35°");
  });

  it("深さ2m以上は作業主任者の選任（359条）を警告する", () => {
    const out = run({ soil: "other", height: 2, slope: 60 });
    expect(out.warnings.join("\n")).toContain("作業主任者");
    expect(out.warnings.join("\n")).toContain("第359条");
  });

  it("深さ2m未満は作業主任者警告を出さない", () => {
    const out = run({ soil: "other", height: 1.5, slope: 60 });
    expect(out.warnings.join("\n")).not.toContain("作業主任者");
  });

  it("手掘り適用・点検（358条）の注意は常に含む", () => {
    const out = run({ soil: "other", height: 3, slope: 60 });
    const w = out.warnings.join("\n");
    expect(w).toContain("手掘り");
    expect(w).toContain("第358条");
  });
});

describe("excavation-slope: 入力正規化", () => {
  it("数値でない高さは既定値へ", () => {
    const { values, errors } = normalizeValues(excavationSlopeCalculator, { height: "深い" });
    expect(values.height).toBe(3);
    expect(errors.length).toBe(1);
  });
});
