import { describe, it, expect } from "vitest";
import {
  courtTypeOf,
  decadeOf,
  filterCourtCases,
  computeFacets,
  courtFilterToQuery,
  courtFilterFromParams,
  describeCourtFilter,
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

describe("court-cases URLクエリ ⇄ フィルタ（一覧⇄印刷の引き継ぎ）", () => {
  const getter = (q: string) => {
    const params = new URLSearchParams(q);
    return (k: string) => params.get(k);
  };

  it("courtFilterToQuery: 空の条件は出さない", () => {
    expect(courtFilterToQuery({})).toBe("");
    expect(courtFilterToQuery({ field: "建設・墜落" })).toBe("field=%E5%BB%BA%E8%A8%AD%E3%83%BB%E5%A2%9C%E8%90%BD");
    expect(courtFilterToQuery({ query: "  " })).toBe(""); // 空白のみは無視
  });

  it("round-trip: query→parse→filter が一覧の絞り込みと一致", () => {
    const filter = { field: "建設・墜落" as const, query: "墜落" };
    const q = courtFilterToQuery(filter);
    const parsed = courtFilterFromParams(getter(q));
    expect(parsed.field).toBe("建設・墜落");
    expect(parsed.query).toBe("墜落");
    // 同じ純関数で絞ると同件数（印刷ページが一覧と同じ結果を出せる保証）
    const viaBrowser = filterCourtCases(COURT_CASES, filter);
    const viaPrint = filterCourtCases(COURT_CASES, parsed);
    expect(viaPrint.map((c) => c.id)).toEqual(viaBrowser.map((c) => c.id));
    expect(viaPrint.length).toBeLessThan(COURT_CASES.length);
  });

  it("courtFilterFromParams: 不正値・未知の年代/裁判所は未選択扱い", () => {
    const parsed = courtFilterFromParams(getter("issue=架空&field=でたらめ&court=家裁&decade=1800年代"));
    expect(parsed).toEqual({ query: "", issue: "", field: "", courtType: "", decade: "" });
  });

  it("courtFilterFromParams: 実在する年代・裁判所種別は通す", () => {
    const parsed = courtFilterFromParams(getter("court=最高裁&decade=1970年代"));
    expect(parsed.courtType).toBe("最高裁");
    expect(parsed.decade).toBe("1970年代");
  });

  it("describeCourtFilter: 絞り込みの説明文（未絞り込みは空）", () => {
    expect(describeCourtFilter({})).toEqual([]);
    expect(describeCourtFilter({ field: "建設・墜落", query: "墜落" })).toEqual([
      "分野: 建設・墜落",
      "キーワード: 墜落",
    ]);
  });
});
