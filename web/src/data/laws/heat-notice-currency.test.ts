/**
 * 熱中症通達コーパスの現行化（2026-06-13 柱1是正）を恒久固定する。
 *
 * 令和3年4月20日 基発0420第3号「職場における熱中症予防基本対策要綱」は、
 * 令和8年3月18日 基発0318第1号「職場における熱中症予防対策のためのガイドライン」
 * により廃止された（出典: 安全衛生情報センター jaish.gr.jp）。
 * チャットボットRAGコーパスの熱中症エントリが旧通達番号のみを現行として
 * 提示する状態へ後退するのを防ぐ。
 */
import { describe, expect, it } from "vitest";
import { corpusGapFillArticles } from "./corpus-gaps-fill";

describe("熱中症通達コーパスの現行化", () => {
  const heatArticles = corpusGapFillArticles.filter(
    (a) => a.law === "熱中症対策通達",
  );

  it("熱中症通達エントリが存在する", () => {
    expect(heatArticles.length).toBeGreaterThan(0);
  });

  it("趣旨エントリが現行通達（基発0318第1号）を提示している", () => {
    const intro = heatArticles.find((a) => a.articleTitle === "趣旨");
    expect(intro, "趣旨エントリ").toBeDefined();
    // 現行のガイドライン通達番号を明示
    expect(intro?.text).toContain("基発0318第1号");
    // 旧通達の廃止関係を明記（旧番号のみの提示への後退を防ぐ）
    expect(intro?.text).toContain("廃止");
  });
});
