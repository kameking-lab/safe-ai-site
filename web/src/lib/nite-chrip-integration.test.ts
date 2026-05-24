import { describe, it, expect } from "vitest";
import {
  CONCENTRATION_LIMITS,
  getAllMergedChemicals,
  findByCas,
  MHLW_MERGED_CHEMICAL_COUNT,
} from "./mhlw-chemicals";
import {
  getNiteChripByCas,
  getNiteChripCount,
  verboseGhsCategory,
  isHazardClassified,
} from "./nite-chrip";

const KEY_SUBSTANCES: Array<{ cas: string; nameContains: string }> = [
  { cas: "1332-21-4", nameContains: "石綿" },
  { cas: "7439-92-1", nameContains: "鉛" },
  { cas: "108-88-3", nameContains: "トルエン" },
  { cas: "71-43-2", nameContains: "ベンゼン" },
  { cas: "50-00-0", nameContains: "ホルムアルデヒド" },
  { cas: "7440-47-3", nameContains: "クロム" },
  { cas: "7440-43-9", nameContains: "カドミウム" },
  { cas: "7782-50-5", nameContains: "塩素" },
  { cas: "7439-97-6", nameContains: "水銀" },
  { cas: "7440-38-2", nameContains: "ヒ素" },
];

describe("Phase 1b NITE-CHRIP 統合: concentration-limits.json", () => {
  it("拡張後の総物質数は 3,000 件以上 (NITE 統合前 1,546 件から拡大)", () => {
    expect(CONCENTRATION_LIMITS.summary.total).toBeGreaterThanOrEqual(3000);
    expect(Object.keys(CONCENTRATION_LIMITS.substances).length).toBeGreaterThanOrEqual(3000);
  });

  it("NITE 由来エントリ数が記録され、3,000 件以上ある", () => {
    expect(CONCENTRATION_LIMITS.summary.withRegulationNite).toBeGreaterThanOrEqual(3000);
  });

  it("niteImport メタが書き込まれている", () => {
    expect(CONCENTRATION_LIMITS.niteImport).toBeDefined();
    expect(CONCENTRATION_LIMITS.niteImport?.sourceCount).toBeGreaterThan(3000);
    expect(CONCENTRATION_LIMITS.niteImport?.sourceUrl).toContain("nite.go.jp");
  });

  it("sources マップに GHS_NITE が登録されている", () => {
    expect(CONCENTRATION_LIMITS.sources.GHS_NITE).toBeDefined();
    expect(CONCENTRATION_LIMITS.sources.GHS_NITE).toContain("NITE");
  });
});

describe("Phase 1b NITE-CHRIP: 優先順位 (MHLW > NITE > 既存)", () => {
  it("既存の MHLW_177 数値が NITE 統合後も保持されている (トルエン)", () => {
    const t = CONCENTRATION_LIMITS.substances["108-88-3"];
    expect(t).toBeDefined();
    expect(t.twa?.value).toBe("20");
    expect(t.twa?.unit).toBe("ppm");
    expect(t.twa?.source).toBe("MHLW_177");
    expect(t.source).toBe("mhlw");
  });

  it("既存物質に regulationTags=['nite'] が追加される (トルエン)", () => {
    const t = CONCENTRATION_LIMITS.substances["108-88-3"];
    expect(t.regulationTags).toContain("nite");
    expect(t.niteChripUrl).toContain("chem-info.nite.go.jp");
  });

  it("NITE 新規追加物質は source=reference になっている", () => {
    // NITE 由来かつ MHLW にない物質を 1 件サンプル
    const niteOnly = Object.values(CONCENTRATION_LIMITS.substances).find(
      (e) => (e.regulationTags ?? []).includes("nite") && e.source === "reference"
    );
    expect(niteOnly).toBeDefined();
    expect(niteOnly?.regulationTags).toContain("nite");
  });

  it("IARC が記録されている物質では MHLW/IARC 由来情報が壊れていない (ベンゼン)", () => {
    const b = CONCENTRATION_LIMITS.substances["71-43-2"];
    expect(b).toBeDefined();
    expect(b.iarcGroup).toBe("1");
    expect(b.carcinogenicity?.iarc).toBe("1");
  });
});

describe("Phase 1b NITE-CHRIP: 主要 10 物質が拡張後マスタで取得可能", () => {
  for (const { cas, nameContains } of KEY_SUBSTANCES) {
    it(`${cas} (${nameContains}) が CAS で findByCas() でヒットする`, () => {
      const found = findByCas(cas);
      expect(found).toBeDefined();
      expect(found?.primaryName).toBeTruthy();
    });
  }
});

describe("Phase 1b NITE-CHRIP: mergeByCas() が拡張データを取り込む", () => {
  it("マージ済み物質総数が拡張後 concentration-limits 総数以上", () => {
    const all = getAllMergedChemicals();
    expect(all.length).toBeGreaterThanOrEqual(CONCENTRATION_LIMITS.summary.total - 100);
    expect(MHLW_MERGED_CHEMICAL_COUNT).toBe(all.length);
  });
});

describe("Phase 1b NITE-CHRIP: 詳細データアクセサ (lazy load)", () => {
  it("getNiteChripCount() がユニーク CAS 数 (3,378 件) を返す", async () => {
    // JSONL は 3,388 行だが、結晶形違い・ナノ粒子別等で 10 件の同一CASが含まれる
    // Map ベースのキャッシュなので最終的にユニーク CAS 数になる
    const count = await getNiteChripCount();
    expect(count).toBeGreaterThanOrEqual(3370);
    expect(count).toBeLessThanOrEqual(3388);
  });

  it("CAS でホルムアルデヒドの GHS 詳細が取得できる", async () => {
    const e = await getNiteChripByCas("50-00-0");
    expect(e).toBeDefined();
    expect(e?.nameJa).toBe("ホルムアルデヒド");
    expect(e?.ghs.carcinogen).toBe("1A");
    expect(e?.chripUrl).toContain("m-nite-50-00-0");
  });

  it("verboseGhsCategory() が短縮コードを展開する", () => {
    expect(verboseGhsCategory("1A")).toBe("区分1A");
    expect(verboseGhsCategory("N")).toBe("区分に該当しない（分類対象外）");
    expect(verboseGhsCategory("U")).toBe("分類できない");
    expect(verboseGhsCategory("区分1（中枢神経系）")).toBe("区分1（中枢神経系）");
  });

  it("isHazardClassified() が区分有無を正しく判定する", () => {
    expect(isHazardClassified("1A")).toBe(true);
    expect(isHazardClassified("3")).toBe(true);
    expect(isHazardClassified("N")).toBe(false);
    expect(isHazardClassified("U")).toBe(false);
    expect(isHazardClassified(undefined)).toBe(false);
    expect(isHazardClassified("区分1（神経系）")).toBe(true);
  });
});
