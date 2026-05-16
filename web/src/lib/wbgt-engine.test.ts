import { describe, it, expect } from "vitest";
import {
  assess,
  calculateWBGT,
  determineRiskLevel,
  estimateNaturalWetBulb,
  getRecommendations,
} from "@/lib/wbgt-engine";

describe("estimateNaturalWetBulb (Stull 2011)", () => {
  it("matches the well-known textbook example T=25 RH=50 ≈ 18.3 °C", () => {
    const tnwb = estimateNaturalWetBulb(25, 50);
    expect(tnwb).toBeGreaterThan(17.5);
    expect(tnwb).toBeLessThan(19);
  });

  it("approaches air temperature as humidity nears 100 %", () => {
    const t = 30;
    const tnwb = estimateNaturalWetBulb(t, 99);
    expect(Math.abs(tnwb - t)).toBeLessThan(0.5);
  });

  it("rejects out-of-range humidity", () => {
    expect(() => estimateNaturalWetBulb(25, -5)).toThrow();
    expect(() => estimateNaturalWetBulb(25, 120)).toThrow();
  });
});

describe("calculateWBGT", () => {
  it("uses the outdoor formula when globe temperature is provided", () => {
    const r = calculateWBGT({
      airTempC: 32,
      humidity: 70,
      globeTempC: 42,
      environment: "outdoor",
    });
    // 0.7*Tnwb + 0.2*42 + 0.1*32
    // Tnwb ~ 27.5, so WBGT ~ 0.7*27.5 + 8.4 + 3.2 = 30.85
    expect(r.formula).toBe("outdoor-with-globe");
    expect(r.wbgt).toBeGreaterThan(29);
    expect(r.wbgt).toBeLessThan(33);
  });

  it("uses the indoor formula and Ta+1 estimate when no globe temperature", () => {
    const r = calculateWBGT({
      airTempC: 30,
      humidity: 75,
      environment: "indoor",
    });
    expect(r.formula).toBe("indoor-estimated");
    expect(r.globeTempUsedC).toBeCloseTo(31, 1);
    // 0.7*Tnwb + 0.3*31, Tnwb ~ 26.5, so WBGT ~ 27.85
    expect(r.wbgt).toBeGreaterThan(26);
    expect(r.wbgt).toBeLessThan(30);
  });

  it("returns a Liljegren-style estimate for outdoor with no globe", () => {
    const r = calculateWBGT({
      airTempC: 33,
      humidity: 65,
      windSpeedMps: 1,
      solarRadiationWm2: 800,
      environment: "outdoor",
    });
    expect(r.formula).toBe("outdoor-estimated");
    expect(r.globeTempUsedC).toBeGreaterThan(r.naturalWetBulbC);
  });

  it("throws on absurd air temperatures", () => {
    expect(() =>
      calculateWBGT({ airTempC: -50, humidity: 50, environment: "outdoor" }),
    ).toThrow();
  });
});

describe("determineRiskLevel", () => {
  it("classifies WBGT 32 with heavy work as danger", () => {
    const r = determineRiskLevel(32, "heavy", "acclimatized");
    expect(r.level).toBe("danger");
    expect(r.label).toBe("危険");
  });

  it("classifies WBGT 24 with moderate work as caution", () => {
    const r = determineRiskLevel(24, "moderate", "acclimatized");
    expect(r.level).toBe("caution");
  });

  it("downshifts thresholds for non-acclimatized workers", () => {
    // WBGT 23 + moderate: acclimatized [22,25,28,31] -> caution,
    // non-acclimatized [20,23,26,29] -> warning.
    const acc = determineRiskLevel(23, "moderate", "acclimatized");
    const nonAcc = determineRiskLevel(23, "moderate", "non-acclimatized");
    const order = ["safe", "caution", "warning", "severe-warning", "danger"];
    expect(order.indexOf(nonAcc.level)).toBeGreaterThan(order.indexOf(acc.level));
  });

  it("returns safe below the lowest threshold", () => {
    const r = determineRiskLevel(15, "light", "acclimatized");
    expect(r.level).toBe("safe");
  });
});

describe("getRecommendations", () => {
  it("requires work suspension at the danger level", () => {
    const rec = getRecommendations("danger", "heavy");
    expect(rec.suspendWork).toBe(true);
    expect(rec.fluidIntakeMlPerHour).toMatch(/1000/);
  });

  it("provides ratio guidance even at safe level", () => {
    const rec = getRecommendations("safe", "light");
    expect(rec.suspendWork).toBe(false);
    expect(rec.coolingMeasures.length).toBeGreaterThan(0);
  });

  it("tightens work/rest ratio for heavy work at warning", () => {
    const heavy = getRecommendations("warning", "heavy");
    const light = getRecommendations("warning", "light");
    expect(heavy.workRestRatio).not.toBe(light.workRestRatio);
  });
});

describe("assess", () => {
  it("returns a combined assessment for a hot outdoor construction site", () => {
    const result = assess(
      {
        airTempC: 34,
        humidity: 80,
        globeTempC: 45,
        environment: "outdoor",
      },
      "heavy",
      "acclimatized",
    );
    expect(result.wbgt.wbgt).toBeGreaterThan(28);
    expect(["severe-warning", "danger"]).toContain(result.risk.level);
    expect(result.recommendation.coolingMeasures.length).toBeGreaterThan(0);
  });

  it("handles indoor moderate work with no globe measurement", () => {
    const result = assess(
      { airTempC: 28, humidity: 70, environment: "indoor" },
      "moderate",
      "non-acclimatized",
    );
    expect(result.wbgt.formula).toBe("indoor-estimated");
    expect(result.risk.label).toBeDefined();
  });
});
