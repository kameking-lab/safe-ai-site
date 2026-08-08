import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_CALCULATORS,
  QUARANTINED_CONSTRUCTION_CALCULATORS,
  getCalculator,
} from "./registry";
import {
  CALC_CATEGORIES,
  groupCalculatorsByCategory,
  resolveCalcCategory,
} from "./categories";
import { relatedCalculatorsForArticle } from "./related-articles";
import { getCalcSearchEntries } from "./search-source";
import { isPublicConstructionCalculatorSlug } from "@/lib/public-content-policy";

describe("construction-calc public discovery", () => {
  it("公開計算機は既知カテゴリへ一度だけ分類される", () => {
    const knownCategories = new Set(
      CALC_CATEGORIES.map((category) => category.id),
    );
    for (const calculator of CONSTRUCTION_CALCULATORS) {
      expect(knownCategories.has(resolveCalcCategory(calculator))).toBe(true);
      expect(resolveCalcCategory(calculator)).not.toBe("other");
    }

    const groups = groupCalculatorsByCategory(CONSTRUCTION_CALCULATORS);
    expect(groups.every((group) => group.calcs.length > 0)).toBe(true);
    const groupedSlugs = groups.flatMap((group) =>
      group.calcs.map((calculator) => calculator.slug),
    );
    expect([...groupedSlugs].sort()).toEqual(
      CONSTRUCTION_CALCULATORS.map((calculator) => calculator.slug).sort(),
    );
    expect(new Set(groupedSlugs).size).toBe(groupedSlugs.length);
  });

  it("明示カテゴリはキーワード推定より優先される", () => {
    expect(
      resolveCalcCategory({
        slug: "unregistered-example",
        keywords: ["電線"],
        category: "kansan",
      }),
    ).toBe("kansan");
  });

  it("横断検索は公開allowlistだけを解決可能URLへ収載する", () => {
    const entries = getCalcSearchEntries();
    expect(entries).toHaveLength(CONSTRUCTION_CALCULATORS.length);
    for (const calculator of CONSTRUCTION_CALCULATORS) {
      const entry = entries.find(
        (candidate) => candidate.id === `calc-${calculator.slug}`,
      );
      expect(entry, calculator.slug).toBeDefined();
      expect(entry?.url).toBe(`/construction-calc/${calculator.slug}`);
      expect(entry?.keywords).toContain("建設計算");
      expect(getCalculator(calculator.slug)).toBeDefined();
    }
    for (const calculator of QUARANTINED_CONSTRUCTION_CALCULATORS) {
      expect(
        entries.some((entry) => entry.url.endsWith(`/${calculator.slug}`)),
      ).toBe(false);
    }
  });

  it("公開検索語は低リスク換算・数量計算の固有語を保持する", () => {
    const entries = getCalcSearchEntries();
    expect(
      entries.find((entry) => entry.id === "calc-slope-ratio-convert")
        ?.keywords,
    ).toEqual(expect.arrayContaining(["勾配", "換算"]));
    expect(
      entries.find((entry) => entry.id === "calc-rebar-mass")?.keywords,
    ).toContain("鉄筋");
    expect(
      entries.find((entry) => entry.id === "calc-concrete-volume")?.keywords,
    ).toContain("生コン");
  });

  it("法令ページから隔離計算機への逆リンクを生成しない", () => {
    for (const [lawShort, articleNum] of [
      ["安衛則", "第356条"],
      ["安衛則", "第518条"],
      ["安衛則", "第571条"],
      ["クレーン則", "第213条"],
    ] as const) {
      const matches = relatedCalculatorsForArticle(lawShort, articleNum);
      expect(
        matches.every((calculator) =>
          isPublicConstructionCalculatorSlug(calculator.slug),
        ),
      ).toBe(true);
      expect(matches).toEqual([]);
    }
  });

  it("無関係な条文には計算機を関連付けない", () => {
    expect(
      relatedCalculatorsForArticle("安衛則", "第9999条"),
    ).toEqual([]);
  });
});
