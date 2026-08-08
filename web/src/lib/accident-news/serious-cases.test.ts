import { describe, it, expect } from "vitest";
import {
  filterSeriousCases,
  filterSeriousCasesPage,
  getSeriousCaseFilters,
  getSeriousCaseById,
  findSimilarSeriousCases,
  getGeneralMeasures,
  SERIOUS_CASES_META,
} from "@/lib/accident-news/serious-cases";

describe("P0-1 重大災害事例ブラウザ（匿名・データセット出典）", () => {
  it("メタは公式データセットURL・対象年・生成日時・追跡限界を持つ", () => {
    expect(SERIOUS_CASES_META.total).toBeGreaterThan(0);
    expect(SERIOUS_CASES_META.sourceUrl).toBe(
      "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.html",
    );
    expect(SERIOUS_CASES_META.years).toEqual([2019, 2020, 2021, 2022, 2023]);
    expect(SERIOUS_CASES_META.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(SERIOUS_CASES_META.traceability).toBe("dataset-only");
  });

  it("フィルタ選択肢（業種/事故型/年）を件数付きで返す", () => {
    const f = getSeriousCaseFilters();
    expect(f.industries.length).toBeGreaterThan(0);
    expect(f.types.length).toBeGreaterThan(0);
    expect(f.years.length).toBeGreaterThan(0);
    // 件数降順
    for (let i = 1; i < f.types.length; i++) {
      expect(f.types[i - 1].count >= f.types[i].count).toBe(true);
    }
  });

  it("事例には会社名・発注者・氏名のフィールドが無い（匿名性）", () => {
    const cases = filterSeriousCases({ limit: 5 });
    expect(cases.length).toBeGreaterThan(0);
    for (const c of cases) {
      const keys = Object.keys(c);
      expect(keys).not.toContain("company");
      expect(keys).not.toContain("companyName");
      expect(keys).not.toContain("client");
      expect(keys).not.toContain("orderer");
      expect(keys).not.toContain("victimName");
      expect(keys).not.toContain("name");
    }
  });

  it("各事例に同種頻度（事故型・業種の総数）が付く", () => {
    const cases = filterSeriousCases({ limit: 10 });
    for (const c of cases) {
      expect(c.sameTypeTotal).toBeGreaterThanOrEqual(0);
      expect(c.sameIndustryTotal).toBeGreaterThanOrEqual(0);
    }
  });

  it("業種・年で絞り込める", () => {
    const f = getSeriousCaseFilters();
    const ind = f.industries[0].value;
    const cases = filterSeriousCases({ industry: ind, limit: 50 });
    for (const c of cases) expect(c.industry).toBe(ind);
  });

  it("新しい順（年降順）に並ぶ", () => {
    const cases = filterSeriousCases({ limit: 30 });
    for (let i = 1; i < cases.length; i++) {
      expect(cases[i - 1].year >= cases[i].year).toBe(true);
    }
  });

  it("SSRページングでも総件数を保持し、隣接ページを重複させない", () => {
    const first = filterSeriousCasesPage({ limit: 30, offset: 0 });
    const second = filterSeriousCasesPage({ limit: 30, offset: 30 });
    expect(first.total).toBe(SERIOUS_CASES_META.total);
    expect(first.cases).toHaveLength(30);
    expect(second.cases).toHaveLength(30);
    const firstIds = new Set(first.cases.map((item) => item.id));
    expect(second.cases.some((item) => firstIds.has(item.id))).toBe(false);
  });
});

describe("P2-2 類似事例サジェスト・補助", () => {
  it("getSeriousCaseById で取得でき、findSimilarが同種を返す", () => {
    const seed = filterSeriousCases({ limit: 1 })[0];
    expect(seed).toBeTruthy();
    const byId = getSeriousCaseById(seed.id);
    expect(byId?.id).toBe(seed.id);
    const similar = findSimilarSeriousCases(seed, 6);
    expect(similar.length).toBeGreaterThan(0);
    // seed自身は含まない
    expect(similar.every((c) => c.id !== seed.id)).toBe(true);
    // 型・業種・起因物分類のいずれかが一致（スコア0は除外される設計）
    expect(
      similar.every(
        (c) => c.type === seed.type || c.industry === seed.industry || c.cause === seed.cause,
      ),
    ).toBe(true);
  });

  it("getGeneralMeasures は事故型ごとの一般原則、不明時は汎用文", () => {
    expect(getGeneralMeasures("墜落")).toMatch(/フルハーネス|親綱|手すり/);
    expect(getGeneralMeasures("はさまれ")).toMatch(/ロックアウト|立入禁止|起動/);
    expect(getGeneralMeasures(null)).toMatch(/リスクアセスメント/);
  });

  it("getSeriousCaseById は存在しないIDでnull", () => {
    expect(getSeriousCaseById("nonexistent-id-xyz")).toBeNull();
  });
});
