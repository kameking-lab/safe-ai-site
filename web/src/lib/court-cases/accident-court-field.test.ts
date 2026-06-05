import { describe, it, expect } from "vitest";
import {
  courtCaseFieldForAccident,
  courtCasesHrefForAccident,
} from "./accident-court-field";
import { COURT_CASES, COURT_CASE_FIELDS } from "@/data/court-cases";

describe("courtCaseFieldForAccident", () => {
  it("事故の型を最優先で対応付ける（墜落→建設・墜落）", () => {
    // 業種が製造業でも、型(墜落)が優先される
    expect(courtCaseFieldForAccident("墜落", "製造業")).toBe("建設・墜落");
  });

  it("熱中症→熱中症・屋外、有害物質→じん肺・石綿", () => {
    expect(courtCaseFieldForAccident("熱中症", "その他の事業")).toBe("熱中症・屋外");
    expect(courtCaseFieldForAccident("有害物質", "その他の事業")).toBe("じん肺・石綿");
  });

  it("型で決まらなければ業種でフォールバックする（製造業 転倒→製造・造船）", () => {
    expect(courtCaseFieldForAccident("転倒", "製造業")).toBe("製造・造船");
    expect(courtCaseFieldForAccident("転倒", "建設業")).toBe("建設・墜落");
    expect(courtCaseFieldForAccident("転倒", "保健衛生業")).toBe("医療");
  });

  it("妥当な対応が無い型・業種は null（行き止まりリンクを張らない）", () => {
    expect(courtCaseFieldForAccident("転倒", "商業")).toBeNull();
    expect(courtCaseFieldForAccident("交通事故", "運輸交通業")).toBeNull();
  });

  it("返す分野は必ず COURT_CASE_FIELDS に含まれ、かつ裁判例が1件以上存在する", () => {
    const field = courtCaseFieldForAccident("墜落", "建設業");
    expect(field).not.toBeNull();
    expect(COURT_CASE_FIELDS).toContain(field);
    expect(COURT_CASES.some((c) => c.field === field)).toBe(true);
  });

  it("href はフィールドフィルタ付き、非対応は null", () => {
    expect(courtCasesHrefForAccident("熱中症", "建設業")).toBe(
      `/court-cases?field=${encodeURIComponent("熱中症・屋外")}`
    );
    expect(courtCasesHrefForAccident("交通事故", "商業")).toBeNull();
  });
});
