import { describe, it, expect } from "vitest";
import { getMonthlySokuhouSummary } from "@/lib/accidents/monthly-sokuhou-summary";

describe("P1-4 月次速報サマリ", () => {
  const s = getMonthlySokuhouSummary(5);

  it("公式速報の期間・出典URLを返す", () => {
    expect(s.sourceUrl).toMatch(/^https?:\/\//);
    // 期間は存在する（ETL稼働中）
    expect(s.sibouPeriod || s.sisyouPeriod).toBeTruthy();
  });

  it("業種別上位は最大5件・total降順・0件除外", () => {
    expect(s.topSibou.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < s.topSibou.length; i++) {
      expect(s.topSibou[i - 1].total >= s.topSibou[i].total).toBe(true);
    }
    for (const r of s.topSibou) expect(r.total).toBeGreaterThan(0);
    for (const r of s.topSisyou) expect(r.total).toBeGreaterThan(0);
  });
});
