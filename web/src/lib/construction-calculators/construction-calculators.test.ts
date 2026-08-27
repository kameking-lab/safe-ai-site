import { describe, expect, it } from "vitest";
import {
  constructionCalculatorRegistry,
  constructionCalculatorSlugs,
} from "@/data/construction-calculators/formula-registry";
import {
  calculateAggregateBase,
  calculateAsphaltMixture,
  calculateAverageEndArea,
  calculateConcrete,
  calculateDrainageSlope,
  calculateEarthworkConversion,
  calculateExcavation,
  calculateFormwork,
  calculateRebarSpacing,
  calculateRebarWeight,
  calculateScaleCoordinate,
  calculateSlope,
  type CalculationOutcome,
} from "./index";
import { applyRounding, ceilCount, normalizeRounding } from "./core";

const calculators: Record<
  string,
  (input: Record<string, unknown>) => CalculationOutcome
> = {
  "concrete-quantity": (input) => calculateConcrete(input as never),
  "excavation-backfill": (input) => calculateExcavation(input as never),
  "average-end-area": (input) => calculateAverageEndArea(input as never),
  "earthwork-conversion-dump-trucks": (input) =>
    calculateEarthworkConversion(input as never),
  "aggregate-base-quantity": (input) => calculateAggregateBase(input as never),
  "asphalt-mixture-quantity": (input) => calculateAsphaltMixture(input as never),
  "rebar-weight": (input) => calculateRebarWeight(input as never),
  "rebar-spacing": (input) => calculateRebarSpacing(input as never),
  "formwork-area": (input) => calculateFormwork(input as never),
  "slope-angle-length": (input) => calculateSlope(input as never),
  "drainage-slope": (input) => calculateDrainageSlope(input as never),
  "scale-coordinate": (input) => calculateScaleCoordinate(input as never),
};

const exactInputKeys: Record<string, string[]> = {
  "concrete-quantity": ["shape", "length", "width", "height", "diameter", "dimensionUnit", "quantity", "lossPercent", "truckCapacityM3", "rounding"],
  "excavation-backfill": ["shape", "length", "width", "depth", "dimensionUnit", "sideSlopeHorizontalPerVertical", "structureVolume", "baseMaterialVolume", "deductionVolumeUnit", "rounding"],
  "average-end-area": ["segments", "areaUnit", "lengthUnit", "rounding"],
  "earthwork-conversion-dump-trucks": ["bankVolume", "bankVolumeUnit", "bulkingFactor", "compactionFactor", "density", "densityUnit", "densityState", "truckPayload", "truckPayloadUnit", "loadingRatePercent", "rounding"],
  "aggregate-base-quantity": ["area", "areaUnit", "thickness", "thicknessUnit", "density", "densityUnit", "lossPercent", "vehicleCapacity", "vehicleCapacityUnit", "rounding"],
  "asphalt-mixture-quantity": ["area", "areaUnit", "thickness", "thicknessUnit", "density", "densityUnit", "lossPercent", "vehicleCapacity", "vehicleCapacityUnit", "rounding"],
  "rebar-weight": ["diameterMm", "length", "lengthUnit", "quantity", "rounding"],
  "rebar-spacing": ["constructionWidth", "leftCover", "rightCover", "requestedPitch", "barLength", "diameterMm", "dimensionUnit", "layers", "rounding"],
  "formwork-area": ["shape", "length", "width", "height", "dimensionUnit", "deductionArea", "deductionAreaUnit", "faces", "quantity", "rounding"],
  "slope-angle-length": ["mode", "horizontalDistance", "rise", "slopePercent", "angleDegrees", "ratioN", "lengthUnit", "rounding"],
  "drainage-slope": ["length", "lengthUnit", "gradeMode", "gradeValue", "referencePoint", "referenceElevationM", "flowDirection", "intervalCount", "rounding"],
  "scale-coordinate": ["mode", "solveFor", "scaleDenominator", "drawingLength", "drawingUnit", "actualLength", "actualUnit", "x1", "y1", "x2", "y2", "coordinateUnit", "rounding"],
};

describe("directed decimal rounding", () => {
  it("snaps binary representation noise without swallowing a real fractional remainder", () => {
    expect(applyRounding(12.420000000000002, { decimalPlaces: 2, mode: "ceil" })).toBe(12.42);
    expect(applyRounding(12.4200000001, { decimalPlaces: 2, mode: "ceil" })).toBe(12.43);
    expect(applyRounding(-12.420000000000002, { decimalPlaces: 2, mode: "floor" })).toBe(-12.42);
    expect(applyRounding(-12.4200000001, { decimalPlaces: 2, mode: "floor" })).toBe(-12.43);
    expect(applyRounding(1.005, { decimalPlaces: 2, mode: "round" })).toBe(1.01);
    expect(applyRounding(-1.005, { decimalPlaces: 2, mode: "round" })).toBe(-1.01);
    expect(applyRounding(100_000_000.00000007, { decimalPlaces: 6, mode: "ceil" })).toBe(
      100_000_000.000001,
    );
  });

  it("normalizes untrusted rounding modes from restored client history", () => {
    expect(
      normalizeRounding({ decimalPlaces: 2, mode: "bogus" as never }),
    ).toEqual({ decimalPlaces: 2, mode: "round" });
  });

  it("snaps only numerical noise at integer count boundaries", () => {
    expect(ceilCount(7.000000000000002)).toBe(7);
    expect(ceilCount(100_000_000.00000007)).toBe(100_000_001);
  });
});

describe("construction calculator formula registry", () => {
  it("contains exactly the 12 approved low-risk calculators", () => {
    expect(constructionCalculatorRegistry).toHaveLength(12);
    expect(new Set(constructionCalculatorSlugs).size).toBe(12);
    expect(Object.keys(calculators).sort()).toEqual([...constructionCalculatorSlugs].sort());
    expect(constructionCalculatorRegistry.every((entry) => entry.riskLevel === "low" && entry.clientOnly)).toBe(true);
  });

  it("exposes all required registry fields and no high-risk decision language", () => {
    const forbidden = /安全です|使用可能です|法令に適合|構造上問題ありません|許容荷重以内|設計確定|発注数量を保証/;
    for (const entry of constructionCalculatorRegistry) {
      expect(entry.calculatorId).toBe(entry.slug);
      expect(entry.formulaVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(entry.inputDefinitions.length).toBeGreaterThan(0);
      expect(entry.outputDefinitions.length).toBeGreaterThan(0);
      expect(entry.supportedUnits.length).toBeGreaterThan(0);
      expect(entry.sources.length).toBeGreaterThan(0);
      expect(entry.checkedAt).toBe("2026-08-27");
      expect(forbidden.test(JSON.stringify(entry))).toBe(false);
    }
  });

  it("keeps registry input keys exactly aligned with pure-function schemas", () => {
    for (const entry of constructionCalculatorRegistry) {
      const registryKeys = entry.inputDefinitions.map((definition) => definition.key).sort();
      expect(registryKeys, entry.slug).toEqual([...exactInputKeys[entry.slug]].sort());
      for (const fixture of entry.testFixtures.filter((item) => item.expectedOk)) {
        for (const key of Object.keys(fixture.input)) {
          expect(registryKeys, `${entry.slug}/${fixture.fixtureId}/${key}`).toContain(key);
        }
      }
    }
  });

  it("has three normal cases plus unit, boundary, zero, negative, large and rounding cases per calculator", () => {
    for (const entry of constructionCalculatorRegistry) {
      const counts = entry.testFixtures.reduce<Record<string, number>>((accumulator, fixture) => {
        accumulator[fixture.kind] = (accumulator[fixture.kind] ?? 0) + 1;
        return accumulator;
      }, {});
      expect(counts.normal, entry.slug).toBeGreaterThanOrEqual(3);
      for (const kind of ["unit-conversion", "boundary", "zero", "negative", "large", "rounding"]) {
        expect(counts[kind], `${entry.slug}/${kind}`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe("independently derived construction calculator fixtures", () => {
  for (const entry of constructionCalculatorRegistry) {
    describe(entry.slug, () => {
      for (const fixture of entry.testFixtures) {
        it(`${fixture.fixtureId}: ${fixture.derivation}`, () => {
          const outcome = calculators[entry.slug](fixture.input);
          expect(outcome.ok).toBe(fixture.expectedOk);
          if (!fixture.expectedOk) {
            expect(outcome.ok).toBe(false);
            if (!outcome.ok && fixture.expectedErrorField) {
              expect(outcome.errors.some((error) => error.field === fixture.expectedErrorField)).toBe(true);
            }
            return;
          }
          expect(outcome.ok).toBe(true);
          if (!outcome.ok) return;
          for (const [key, expected] of Object.entries(fixture.expectedOutputs ?? {})) {
            const actual = outcome.result.outputs[key];
            if (typeof expected === "number") {
              expect(typeof actual, `${fixture.fixtureId}/${key}`).toBe("number");
              expect(actual as number).toBeCloseTo(expected, 9);
            } else {
              expect(actual).toBe(expected);
            }
          }
          const numericRawValues = Object.values(outcome.result.rawOutputs).filter(
            (value): value is number => typeof value === "number",
          );
          expect(numericRawValues.every(Number.isFinite)).toBe(true);
          expect(outcome.result.isEstimate).toBe(true);
        });
      }
    });
  }
});

describe("formula-specific invariants", () => {
  it("rejects tampered units, NaN and Infinity instead of emitting a result", () => {
    const invalidUnit = calculateConcrete({ shape: "rectangular", length: 1, width: 1, height: 1, dimensionUnit: "yard" as never, quantity: 1, lossPercent: 0, truckCapacityM3: 1 });
    const nan = calculateRebarWeight({ diameterMm: Number.NaN, length: 1, lengthUnit: "m", quantity: 1 });
    const infinity = calculateSlope({ mode: "percent-run", horizontalDistance: 1, slopePercent: Number.POSITIVE_INFINITY, lengthUnit: "m" });
    expect(invalidUnit.ok).toBe(false);
    expect(nan.ok).toBe(false);
    expect(infinity.ok).toBe(false);
  });

  it("rejects a linear input beyond the documented calculation range", () => {
    const outcome = calculateConcrete({ shape: "rectangular", length: 1_000_001, width: 1, height: 1, dimensionUnit: "m", quantity: 1, lossPercent: 0, truckCapacityM3: 1 });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.errors.some((error) => error.field === "length" && error.code === "too-large")).toBe(true);
  });

  it("keeps CSV/PDF-ready outputs and raw outputs in one pure result", () => {
    const outcome = calculateConcrete({ shape: "rectangular", length: 10, width: 5, height: 0.23, dimensionUnit: "m", quantity: 1, lossPercent: 8, truckCapacityM3: 4 });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.rawOutputs.volumeWithLossM3).toBeCloseTo(12.42, 12);
    expect(outcome.result.outputs.volumeWithLossM3).toBe(12.42);
    expect(outcome.result.usedInputs).toMatchObject({ length: 10, width: 5, height: 0.23 });
  });

  it("derives rebar mass without copying a JIS unit-mass table", () => {
    const outcome = calculateRebarWeight({ diameterMm: 16, length: 1, lengthUnit: "m", quantity: 1, rounding: { decimalPlaces: 9, mode: "round" } });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.rawOutputs.massPerMetreKg).toBeCloseTo((Math.PI * 0.016 ** 2 * 7850) / 4, 12);
  });

  it("warns on signed reverse drainage grade without judging design suitability", () => {
    const outcome = calculateDrainageSlope({ length: 10, lengthUnit: "m", gradeMode: "percent", gradeValue: -1, referencePoint: "start", referenceElevationM: 10, flowDirection: "start-to-end", intervalCount: 2 });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.outputs.reverseSlopeWarning).toBe(true);
    expect(outcome.result.warnings).toHaveLength(1);
  });

  it("rejects finite extreme slope inputs before they can emit Infinity", () => {
    const percent = calculateSlope({
      mode: "percent-run",
      horizontalDistance: 1_000_000,
      slopePercent: 1e308,
      lengthUnit: "m",
    });
    const rise = calculateSlope({
      mode: "rise-run",
      horizontalDistance: 1,
      rise: 1e307,
      lengthUnit: "m",
    });
    const tinyPercent = calculateSlope({
      mode: "percent-run",
      horizontalDistance: 1,
      slopePercent: 1e-308,
      lengthUnit: "m",
    });
    expect(percent.ok).toBe(false);
    expect(rise.ok).toBe(false);
    expect(tinyPercent.ok).toBe(false);
  });
});
