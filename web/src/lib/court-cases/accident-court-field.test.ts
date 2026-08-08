import { describe, expect, it } from "vitest";
import {
  courtCaseFieldForAccident,
  courtCasesHrefForAccident,
} from "./accident-court-field";
import { COURT_CASES } from "@/data/court-cases";

describe("accident to court-case fail-closed boundary", () => {
  it("公開確認済み判例が0件の間は事故型から分野を推定しない", () => {
    expect(COURT_CASES).toEqual([]);
    for (const [type, category] of [
      ["墜落", "建設業"],
      ["熱中症", "その他の事業"],
      ["有害物質", "化学"],
      ["転倒", "製造業"],
    ] as const) {
      expect(courtCaseFieldForAccident(type, category)).toBeNull();
    }
  });

  it("隔離ページへの深いリンクを生成しない", () => {
    expect(courtCasesHrefForAccident("墜落", "建設業")).toBeNull();
    expect(courtCasesHrefForAccident("熱中症", "建設業")).toBeNull();
    expect(courtCasesHrefForAccident("交通事故", "商業")).toBeNull();
  });
});
