import { describe, expect, it } from "vitest";
import { COURT_CASE_ISSUES } from "@/data/court-cases";
import { ISSUE_COLOR } from "./issue-color";

describe("issue-color（判例の争点タグ配色・一覧/詳細で共有）", () => {
  it("争点16分類すべてに色が割り当てられている", () => {
    expect(COURT_CASE_ISSUES.length).toBeGreaterThanOrEqual(16);
    for (const issue of COURT_CASE_ISSUES) {
      expect(ISSUE_COLOR[issue], `${issue} の色`).toBeTruthy();
    }
  });

  it("対応表に分類外のキーが無い（分類変更時にテストで気付ける）", () => {
    expect(Object.keys(ISSUE_COLOR).sort()).toEqual([...COURT_CASE_ISSUES].sort());
  });

  it("見た目が近い赤系の争点同士でも別クラス（刑事責任と解雇・雇止めの誤読防止）", () => {
    expect(ISSUE_COLOR["刑事責任"]).not.toBe(ISSUE_COLOR["解雇・雇止め"]);
  });

  it("生の yellow-* を使わない（サイト共通の「注意色」は amber、raw yellow は色の文法違反）", () => {
    for (const issue of COURT_CASE_ISSUES) {
      expect(ISSUE_COLOR[issue], `${issue} の色`).not.toMatch(/\byellow-/);
    }
  });
});
