import { describe, it, expect } from "vitest";
import {
  courtTypeOf,
  decadeOf,
  filterCourtCases,
  computeFacets,
} from "./search";
import { COURT_CASES } from "@/data/court-cases";

describe("court-cases search 基盤（フェーズB）", () => {
  it("courtTypeOf: 裁判所名から種別を導出", () => {
    expect(courtTypeOf("最高裁 第二小法廷")).toBe("最高裁");
    expect(courtTypeOf("東京高裁")).toBe("高裁");
    expect(courtTypeOf("さいたま地裁")).toBe("地裁");
    expect(courtTypeOf("横浜地裁川崎支部")).toBe("地裁");
    expect(courtTypeOf("労働委員会")).toBe("その他");
  });

  it("decadeOf: 年代ラベルを導出", () => {
    expect(decadeOf("2000-03-24")).toBe("2000年代");
    expect(decadeOf("1975-02-25")).toBe("1970年代");
    expect(decadeOf("2016-07-08")).toBe("2010年代");
    expect(decadeOf("xxxx")).toBe("不明");
  });

  it("filterCourtCases: 争点・分野・裁判所種別・年代・自由ワードのAND", () => {
    // 最高裁のみ
    const sup = filterCourtCases(COURT_CASES, { courtType: "最高裁" });
    expect(sup.length).toBeGreaterThan(0);
    expect(sup.every((c) => courtTypeOf(c.court) === "最高裁")).toBe(true);
    // 分野=過労・メンタル
    const mental = filterCourtCases(COURT_CASES, { field: "過労・メンタル" });
    expect(mental.every((c) => c.field === "過労・メンタル")).toBe(true);
    // 自由ワード
    const pawahara = filterCourtCases(COURT_CASES, { query: "パワーハラスメント" });
    expect(pawahara.length).toBeGreaterThan(0);
    // 該当なしの組合せは空
    expect(filterCourtCases(COURT_CASES, { query: "___存在しない語___" })).toHaveLength(0);
  });

  it("filterCourtCases: 日付降順で返る", () => {
    const all = filterCourtCases(COURT_CASES, {});
    expect(all.length).toBe(COURT_CASES.length);
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].date >= all[i].date).toBe(true);
    }
  });

  it("computeFacets: カテゴリ別件数の合計が整合", () => {
    const f = computeFacets(COURT_CASES);
    const fieldSum = f.fields.reduce((s, x) => s + x.count, 0);
    expect(fieldSum).toBe(COURT_CASES.length); // field は1件1分野
    const courtSum = f.courtTypes.reduce((s, x) => s + x.count, 0);
    expect(courtSum).toBe(COURT_CASES.length);
    const issueSum = f.issues.reduce((s, x) => s + x.count, 0);
    const issueTotal = COURT_CASES.reduce((s, c) => s + c.issues.length, 0);
    expect(issueSum).toBe(issueTotal); // issue は複数可
  });
});
