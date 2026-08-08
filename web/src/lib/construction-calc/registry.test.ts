import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_CALCULATORS,
  QUARANTINED_CONSTRUCTION_CALCULATORS,
  getCalculator,
} from "./registry";
import {
  calculatorManifest,
  routeByKeywords,
  validateExtraction,
} from "./ai-router";
import { CALC_DISCLAIMER, normalizeValues } from "./schema";
import {
  PUBLIC_CONSTRUCTION_CALCULATOR_SLUGS,
  isPublicConstructionCalculatorSlug,
} from "@/lib/public-content-policy";
import { findEntryByShort } from "@/lib/law-navi/permalink";

const PUBLIC_SLUGS = [...PUBLIC_CONSTRUCTION_CALCULATOR_SLUGS].sort();

describe("construction-calc public registry boundary", () => {
  it("公開集合は中央allowlistと完全一致し、slugは一意", () => {
    const slugs = CONSTRUCTION_CALCULATORS.map((calculator) => calculator.slug);
    expect([...slugs].sort()).toEqual(PUBLIC_SLUGS);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(getCalculator(slug)?.slug).toBe(slug);
      expect(isPublicConstructionCalculatorSlug(slug)).toBe(true);
    }
  });

  it("法令適合・構造・電気・玉掛け等の高リスク旧計算機は取得不能", () => {
    const highRisk = [
      "sling-wire-load",
      "excavation-slope",
      "scaffold-tankan-check",
      "crane-rated-load",
      "formwork-shoring-check",
      "cable-ampacity",
      "wind-load-temporary",
      "earth-pressure-shoring",
      "anchor-pullout",
      "voltage-drop",
    ];
    expect(QUARANTINED_CONSTRUCTION_CALCULATORS.length).toBeGreaterThan(0);
    for (const slug of highRisk) {
      expect(
        QUARANTINED_CONSTRUCTION_CALCULATORS.some(
          (calculator) => calculator.slug === slug,
        ),
      ).toBe(true);
      expect(getCalculator(slug)).toBeUndefined();
      expect(isPublicConstructionCalculatorSlug(slug)).toBe(false);
    }
  });

  it("公開計算機は必要な説明・入力制約・使用例を持つ", () => {
    for (const calculator of CONSTRUCTION_CALCULATORS) {
      expect(calculator.fields.length, calculator.slug).toBeGreaterThan(0);
      expect(calculator.basis.length, calculator.slug).toBeGreaterThan(0);
      expect(calculator.cautions.length, calculator.slug).toBeGreaterThan(0);
      expect(calculator.examples.length, calculator.slug).toBeGreaterThan(0);
      expect(calculator.keywords.length, calculator.slug).toBeGreaterThan(2);
      const fieldIds = calculator.fields.map((field) => field.id);
      expect(new Set(fieldIds).size, calculator.slug).toBe(fieldIds.length);
      for (const field of calculator.fields) {
        if (field.kind === "number") {
          expect(field.min, `${calculator.slug}.${field.id}`).toBeLessThan(
            field.max,
          );
          expect(field.defaultValue).toBeGreaterThanOrEqual(field.min);
          expect(field.defaultValue).toBeLessThanOrEqual(field.max);
        } else {
          expect(field.options.length).toBeGreaterThan(1);
          expect(
            field.options.some(
              (option) => option.value === field.defaultValue,
            ),
          ).toBe(true);
        }
      }
    }
  });

  it("公開計算機の関連リンクは公開集合だけを指す", () => {
    for (const calculator of CONSTRUCTION_CALCULATORS) {
      for (const relatedSlug of calculator.relatedSlugs ?? []) {
        expect(
          getCalculator(relatedSlug),
          `${calculator.slug}から隔離計算機への導線`,
        ).toBeDefined();
        expect(relatedSlug).not.toBe(calculator.slug);
      }
    }
  });

  it("公開中の法令ナビリンクは実在する条文へ解決する", () => {
    const expected = new Map([
      [
        "/law-navi/347M50002000032/356",
        ["安衛則", "第356条"] as const,
      ],
    ]);
    for (const calculator of CONSTRUCTION_CALCULATORS) {
      for (const basis of calculator.basis) {
        if (!basis.lawNaviPath) continue;
        const pin = expected.get(basis.lawNaviPath);
        expect(pin, `${calculator.slug}: ${basis.lawNaviPath}`).toBeDefined();
        expect(findEntryByShort(pin![0], pin![1])?.path).toBe(
          basis.lawNaviPath,
        );
      }
    }
  });

  it("既定値と全使用例で決定論計算が完走する", () => {
    for (const calculator of CONSTRUCTION_CALCULATORS) {
      const defaults = normalizeValues(calculator, {});
      expect(defaults.errors, calculator.slug).toEqual([]);
      const outcome = calculator.compute(defaults.values);
      expect(outcome.headline.length).toBeGreaterThan(0);
      expect(outcome.steps.length).toBeGreaterThan(0);
      expect(outcome.warnings.length).toBeGreaterThan(0);
      for (const example of calculator.examples) {
        const normalized = normalizeValues(calculator, example.values);
        expect(
          normalized.errors,
          `${calculator.slug}: ${example.label}`,
        ).toEqual([]);
        expect(() => calculator.compute(normalized.values)).not.toThrow();
      }
    }
  });

  it("共通免責は概算と有資格者確認を明示する", () => {
    expect(CALC_DISCLAIMER).toContain("概算");
    expect(CALC_DISCLAIMER).toContain("有資格者");
  });
});

describe("construction-calc AI discovery boundary", () => {
  it.each([
    ["土量とダンプ台数を換算したい", "soil-volume-conversion"],
    ["1:1.5の勾配を角度に換算したい", "slope-ratio-convert"],
    ["D16鉄筋の質量を計算したい", "rebar-mass"],
    ["生コンの打設量と車両台数を概算したい", "concrete-volume"],
  ])("%s は公開計算機 %s へ到達する", (query, expectedSlug) => {
    expect(routeByKeywords(query)[0]?.slug).toBe(expectedSlug);
  });

  it("高リスク質問から隔離slugを返さない", () => {
    const queries = [
      "玉掛けワイヤの安全荷重を判定したい",
      "掘削面が法令に適合するか判定したい",
      "足場の積載荷重は安全か判定したい",
      "電線の許容電流と電圧降下を判定したい",
    ];
    for (const query of queries) {
      for (const match of routeByKeywords(query)) {
        expect(PUBLIC_SLUGS).toContain(match.slug);
      }
    }
  });

  it("抽出値は公開計算機の範囲・選択肢を満たすものだけ採用する", () => {
    const slope = getCalculator("slope-ratio-convert");
    expect(slope).toBeDefined();
    const valid = validateExtraction(slope!, {
      from: "割",
      ratioN: "1.5",
      angleDeg: 45,
      percentValue: 100,
    });
    expect(valid.values).toMatchObject({
      from: "ratio",
      ratioN: 1.5,
      angleDeg: 45,
      percentValue: 100,
    });
    expect(valid.questions).toEqual([]);

    const invalid = validateExtraction(slope!, {
      from: "法令適合判定",
      ratioN: 0,
      angleDeg: 100,
      percentValue: -1,
    });
    expect(invalid.values).toEqual({});
    expect(invalid.questions.length).toBe(4);
  });

  it("マニフェストは公開slugだけを含み隔離slugを含まない", () => {
    const manifest = calculatorManifest();
    for (const slug of PUBLIC_SLUGS) {
      expect(manifest).toContain(`slug: ${slug}`);
    }
    for (const calculator of QUARANTINED_CONSTRUCTION_CALCULATORS) {
      expect(manifest).not.toContain(`slug: ${calculator.slug}`);
    }
  });
});
