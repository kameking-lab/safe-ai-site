import { describe, expect, it } from "vitest";
import {
  isCanonicalAreaId,
  normalizeAreaQuery,
  resolveOfficialAreaQuery,
} from "./official-area-resolver";

describe("official area resolver", () => {
  it.each([
    ["東京", "tokyo-shinjuku"],
    ["東京都", "tokyo-shinjuku"],
    ["とうきょう", "tokyo-shinjuku"],
    ["トウキョウ", "tokyo-shinjuku"],
    ["新宿", "tokyo-shinjuku"],
    ["新宿区", "tokyo-shinjuku"],
    ["大阪", "osaka-osaka"],
    ["札幌", "hokkaido-sapporo"],
    ["名古屋", "aichi-nagoya"],
    ["福岡市", "fukuoka-fukuoka"],
    ["  福岡　市  ", "fukuoka-fukuoka"],
    ["川崎市", "kanagawa-yokohama"],
    ["かわさき", "kanagawa-yokohama"],
    ["ヨコスカ", "kanagawa-yokohama"],
    ["堺市", "osaka-osaka"],
    ["さかい", "osaka-osaka"],
  ])("resolves a unique verified alias: %s", (query, expectedId) => {
    const result = resolveOfficialAreaQuery(query);
    expect(result.exact).toBe(true);
    expect(result.unique?.id).toBe(expectedId);
  });

  it.each([
    ["横浜 港北", "kanagawa-yokohama"],
    ["横浜市港北区", "kanagawa-yokohama"],
    ["ヨコハマシ コウホクク", "kanagawa-yokohama"],
    ["大阪 北区", "osaka-osaka"],
    ["大阪市北区", "osaka-osaka"],
    ["さいたま 大宮", "saitama-saitama"],
    ["さいたま市大宮区", "saitama-saitama"],
    ["札幌 中央区", "hokkaido-sapporo"],
    ["ｻｯﾎﾟﾛｼ ﾁｭｳｵｳｸ", "hokkaido-sapporo"],
    ["福岡 博多", "fukuoka-fukuoka"],
    ["ふくおかし はかたく", "fukuoka-fukuoka"],
    ["名古屋 中区", "aichi-nagoya"],
    ["ナゴヤシ ナカク", "aichi-nagoya"],
  ])("resolves a verified city and ward alias: %s", (query, expectedId) => {
    const result = resolveOfficialAreaQuery(query);
    expect(result.exact).toBe(true);
    expect(result.unique?.id).toBe(expectedId);
    expect(result.candidates).toHaveLength(1);
  });

  it("normalizes full-width, spaces, and katakana without retaining raw input", () => {
    expect(normalizeAreaQuery("　トウキョウ　")).toBe("とうきょう");
    expect(normalizeAreaQuery("福 岡 市")).toBe("福岡市");
  });

  it.each(["中央区", "ちゅうおうく", "北区", "港区"])(
    "does not silently choose the first ambiguous ward: %s",
    (query) => {
      const result = resolveOfficialAreaQuery(query);
      expect(result.exact).toBe(true);
      expect(result.unique).toBeNull();
      expect(result.candidates.length).toBeGreaterThan(1);
    },
  );

  it("does not auto-confirm an unverified municipality suffix", () => {
    const result = resolveOfficialAreaQuery("石川県輪島市");
    expect(result.exact).toBe(false);
    expect(result.unique).toBeNull();
    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "ishikawa-kanazawa",
    ]);
  });

  it("returns suggestions but no Enter-resolvable area for a partial alias", () => {
    const result = resolveOfficialAreaQuery("新宿");
    expect(result.unique?.id).toBe("tokyo-shinjuku");

    const partial = resolveOfficialAreaQuery("新宿く");
    expect(partial.unique).toBeNull();
  });

  it("accepts only existing allowlisted canonical IDs", () => {
    expect(isCanonicalAreaId("tokyo-shinjuku")).toBe(true);
    expect(isCanonicalAreaId("../tokyo-shinjuku")).toBe(false);
    expect(isCanonicalAreaId("35.6938,139.7034")).toBe(false);
    expect(isCanonicalAreaId("東京都 新宿区")).toBe(false);
  });
});
