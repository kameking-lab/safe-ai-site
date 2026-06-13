import { describe, expect, it } from "vitest";
import {
  computeRiskPredictionConclusion,
  riskScoreMarkerPercent,
  RISK_BAND_SEGMENTS,
  RISK_LEVEL_ORDER,
  RISK_LEVEL_VISUAL,
} from "./risk-prediction-visual";
import type { RiskLevel, SafetyScore } from "@/lib/utils/risk-search";

function makeScore(overall: number, riskLevel: RiskLevel): Pick<SafetyScore, "overall" | "riskLevel"> {
  return { overall, riskLevel };
}

describe("computeRiskPredictionConclusion", () => {
  it("高リスクは赤(danger)・スコアをデカ数字に乗せる", () => {
    const c = computeRiskPredictionConclusion(makeScore(82, "高"));
    expect(c.level).toBe("高");
    expect(c.big).toBe(82);
    expect(c.title).toBe("高リスク");
    expect(c.visual.tone).toBe("danger");
  });

  it("中リスクは黄(warning)", () => {
    const c = computeRiskPredictionConclusion(makeScore(45, "中"));
    expect(c.title).toBe("中リスク");
    expect(c.visual.tone).toBe("warning");
  });

  it("低リスクは緑(safe)", () => {
    const c = computeRiskPredictionConclusion(makeScore(12, "低"));
    expect(c.title).toBe("低リスク");
    expect(c.visual.tone).toBe("safe");
  });

  it("各レベルに「次にやること」の体言止め短アクションがある", () => {
    for (const lv of RISK_LEVEL_ORDER) {
      const c = computeRiskPredictionConclusion(makeScore(50, lv));
      expect(c.shortAction.length).toBeGreaterThan(0);
    }
  });
});

describe("色の文法（JIS安全色）", () => {
  it("低→中→高 の順で 緑→黄→赤 になっている（オオカミ少年化を防ぐ並び）", () => {
    expect(RISK_LEVEL_VISUAL["低"].tone).toBe("safe");
    expect(RISK_LEVEL_VISUAL["中"].tone).toBe("warning");
    expect(RISK_LEVEL_VISUAL["高"].tone).toBe("danger");
  });

  it("solid チップは amber/orange/emerald/rose-500+白 の低コントラスト組合せを使わない", () => {
    // WCAG AA 不適合の代表パターン（第2回監査指摘）が混入していないこと
    for (const lv of RISK_LEVEL_ORDER) {
      const chip = RISK_LEVEL_VISUAL[lv].chip;
      expect(chip).not.toContain("bg-amber-500 text-white");
      expect(chip).not.toContain("bg-orange-500 text-white");
      expect(chip).not.toContain("bg-emerald-600 text-white");
    }
  });
});

describe("色帯セグメント（しきい値整合）", () => {
  it("低/中/高 の3区分・合計100%", () => {
    expect(RISK_BAND_SEGMENTS.map((s) => s.level)).toEqual(["低", "中", "高"]);
    const total = RISK_BAND_SEGMENTS.reduce((sum, s) => sum + s.widthPct, 0);
    expect(total).toBe(100);
  });

  it("セグメント境界が computeSafetyScore のしきい値(30/60)と一致する", () => {
    // 低=0〜30 / 中=30〜60 / 高=60〜100
    const low = RISK_BAND_SEGMENTS[0].widthPct; // 30
    const mid = RISK_BAND_SEGMENTS[1].widthPct; // 30
    expect(low).toBe(30);
    expect(low + mid).toBe(60);
  });
});

describe("riskScoreMarkerPercent", () => {
  it("スコアそのものを位置に使う（デカ数字と一致）", () => {
    expect(riskScoreMarkerPercent(0)).toBe(0);
    expect(riskScoreMarkerPercent(60)).toBe(60);
    expect(riskScoreMarkerPercent(100)).toBe(100);
  });

  it("範囲外はクランプする", () => {
    expect(riskScoreMarkerPercent(-5)).toBe(0);
    expect(riskScoreMarkerPercent(140)).toBe(100);
  });
});
