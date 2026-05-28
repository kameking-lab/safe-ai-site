/**
 * P1-1: e-Gov 自動取込データの品質ガード（形式検証）。
 * 取込は構造データのみ・出典明示・推測値禁止 を、コミット済JSONに対して検証する。
 */
import { describe, it, expect } from "vitest";
import { egovLawRevisions, egovRevisionsMeta } from "@/data/law-revisions/egov-revisions-loaded";
import { getEnforcementStatus } from "@/lib/law-revision-status";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

describe("P1-1 e-Gov法改正 自動取込データ品質", () => {
  it("取込件数が1件以上ある", () => {
    expect(egovLawRevisions.length).toBeGreaterThan(0);
    expect(egovRevisionsMeta.total).toBe(egovLawRevisions.length);
  });

  it("各レコードは形式検証を満たす（公布日YMD・e-Gov出典URL・id接頭辞）", () => {
    for (const r of egovLawRevisions) {
      expect(r.id.startsWith("lr-egov-")).toBe(true);
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.publishedAt).toMatch(YMD);
      expect(r.source_url).toMatch(/^https:\/\/laws\.e-gov\.go\.jp\/law\//);
      expect(r.source?.url).toMatch(/^https:\/\/laws\.e-gov\.go\.jp\/law\//);
      // 施行日は空文字 or YMD（推測しない）
      if (r.enforcement_date) expect(r.enforcement_date).toMatch(YMD);
    }
  });

  it("サマリは公式確認への誘導を必ず含む（解釈の断定をしない）", () => {
    for (const r of egovLawRevisions) {
      expect(r.summary).toContain("e-Gov");
    }
  });

  it("施行ステータスが判定できる（e-Gov値 or 日付）", () => {
    for (const r of egovLawRevisions) {
      const s = getEnforcementStatus(r);
      expect(["enforced", "upcoming", "undetermined"]).toContain(s);
    }
  });
});
