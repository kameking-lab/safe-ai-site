import { describe, expect, it } from "vitest";
import { COURT_CASE_FIELDS } from "@/data/court-cases";
import { FIELD_ICON } from "./case-visual";

describe("case-visual（判例の分野アイコン）", () => {
  it("分野9分類すべてにアイコンが割り当てられている", () => {
    expect(COURT_CASE_FIELDS.length).toBeGreaterThanOrEqual(9);
    for (const field of COURT_CASE_FIELDS) {
      expect(FIELD_ICON[field], `${field} のアイコン`).toBeTruthy();
    }
  });

  it("対応表に分類外のキーが無い（分類変更時にテストで気付ける）", () => {
    expect(Object.keys(FIELD_ICON).sort()).toEqual([...COURT_CASE_FIELDS].sort());
  });
});
