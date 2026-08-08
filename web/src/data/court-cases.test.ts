import { describe, expect, it } from "vitest";
import * as courtCaseModule from "./court-cases";
import {
  COURT_CASES,
  COURT_CASE_COUNT,
  COURT_CASE_FIELDS,
  COURT_CASE_ISSUES,
  countByIssue,
  getCourtCaseById,
  getQuarantinedCourtCaseCount,
} from "./court-cases";

describe("court-cases 公開allowlistと隔離境界", () => {
  it("未検証候補を公開せず、公開件数を厳密に0件とする", () => {
    expect(COURT_CASES).toEqual([]);
    expect(COURT_CASE_COUNT).toBe(0);
    expect(COURT_CASE_COUNT).toBe(COURT_CASES.length);
  });

  it("既知の旧IDも未知IDも公開取得できない", () => {
    for (const id of [
      "rikujou-jieitai-hachinohe",
      "nihon-shoen-seizo",
      "shibuya-siespa-explosion-criminal",
      "___unknown-court-case___",
    ]) {
      expect(getCourtCaseById(id), id).toBeUndefined();
    }
  });

  it("争点集計は統制語彙を維持するが公開件数を加算しない", () => {
    const counts = countByIssue();
    expect(Object.keys(counts)).toEqual([...COURT_CASE_ISSUES]);
    expect(Object.values(counts).every((count) => count === 0)).toBe(true);
    expect(
      Object.values(counts).reduce((total, count) => total + count, 0),
    ).toBe(0);
  });

  it("争点・分野の統制語彙は空でなく重複しない", () => {
    expect(COURT_CASE_ISSUES.length).toBeGreaterThan(0);
    expect(new Set(COURT_CASE_ISSUES).size).toBe(COURT_CASE_ISSUES.length);
    expect(COURT_CASE_FIELDS.length).toBeGreaterThan(0);
    expect(new Set(COURT_CASE_FIELDS).size).toBe(COURT_CASE_FIELDS.length);
  });

  it("旧候補は削除済みと偽らず、非公開隔離件数が1件以上ある", () => {
    expect(getQuarantinedCourtCaseCount()).toBeGreaterThan(0);
    expect(getQuarantinedCourtCaseCount()).toBeGreaterThan(
      COURT_CASE_COUNT,
    );
  });

  it("隔離配列そのものを公開exportしない", () => {
    expect(Object.keys(courtCaseModule)).not.toContain(
      "quarantinedCourtCases",
    );
    expect(courtCaseModule).not.toHaveProperty("quarantinedCourtCases");
  });

  it("prototype由来や空IDを判例として返さない", () => {
    for (const id of ["", " ", "__proto__", "constructor", "toString"]) {
      expect(getCourtCaseById(id), id).toBeUndefined();
    }
  });

  it("争点集計は呼び出しごとの独立値で、外部変更を次回へ持ち越さない", () => {
    const first = countByIssue();
    const firstIssue = COURT_CASE_ISSUES[0];
    first[firstIssue] = 999;
    const second = countByIssue();
    expect(second[firstIssue]).toBe(0);
    expect(Object.values(second).every((count) => count === 0)).toBe(true);
  });

  it("隔離件数は有限の正整数で、呼び出し間にドリフトしない", () => {
    const first = getQuarantinedCourtCaseCount();
    const second = getQuarantinedCourtCaseCount();
    expect(Number.isSafeInteger(first)).toBe(true);
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(first);
  });

  it("安全判断に必要な主要統制語彙を隔離中も失わない", () => {
    expect(COURT_CASE_ISSUES).toEqual(
      expect.arrayContaining([
        "安全配慮義務",
        "元請・下請責任",
        "業務起因性",
        "刑事責任",
      ]),
    );
    expect(COURT_CASE_FIELDS).toEqual(
      expect.arrayContaining([
        "建設・墜落",
        "製造・造船",
        "じん肺・石綿",
        "過労・メンタル",
      ]),
    );
  });
});
