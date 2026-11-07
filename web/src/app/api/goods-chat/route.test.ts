import { describe, expect, it } from "vitest";
import { matchGoodsCategories } from "./route";

describe("matchGoodsCategories", () => {
  it("maps a concrete work description to multiple relevant categories", () => {
    const matches = matchGoodsCategories(
      "屋内で有機溶剤を使う塗装作業。薬液の飛沫と換気不足が心配です。",
    );

    expect(matches.map((match) => match.id)).toEqual(
      expect.arrayContaining([
        "respiratory",
        "chemical-gloves",
        "eye-face-protection",
      ]),
    );
  });

  it("keeps the output short even when many risks are entered", () => {
    const matches = matchGoodsCategories(
      "高所の屋外で機械を点検し、騒音、粉じん、薬液、酸欠、重機の通行もある。",
    );

    expect(matches.length).toBeLessThanOrEqual(4);
  });

  it("returns no guessed category for an abstract request", () => {
    expect(matchGoodsCategories("保護具について相談したい")).toEqual([]);
  });
});
