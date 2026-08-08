import { describe, expect, it } from "vitest";
import { inspectChemicalNavigationQuery } from "./query-safety";

describe("chemical navigation query safety", () => {
  it.each(["トルエン", "キシレン", "108-88-3", "メチルエチルケトン"])(
    "allows a chemical identity without changing it: %s",
    (query) => {
      expect(inspectChemicalNavigationQuery(query)).toEqual({
        allowed: true,
        normalized: query,
      });
    },
  );

  it.each([
    "audit.person@example.invalid",
    "連絡先は090-1234-5678です",
    "株式会社テスト建設",
    "作業員が倒れて呼吸がありません",
    "山田太郎が使用",
  ])("blocks sensitive text before URL or search: %s", (query) => {
    expect(inspectChemicalNavigationQuery(query)).toEqual({
      allowed: false,
      reason: "sensitive",
    });
  });
});
