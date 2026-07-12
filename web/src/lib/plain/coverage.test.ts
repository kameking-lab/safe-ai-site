/**
 * coverage.ts の orphans 判定（幽霊エントリ検出）が、原文(fulltext)由来の
 * gap 条を誤って幽霊扱いしないこと、かつ本物の幽霊（コーパスにも全文層にも
 * 無い articleNum）は引き続き検出することを固定する。
 *
 * 背景: 安衛則の全文ギャップ約1,000条を量産部隊が原文(fulltext)照合で
 * 執筆する際、旧ロジック（curated コーパスのみで orphans 判定）だと
 * 正規の gap 条 plain が軒並み「幽霊エントリ」として plain-status-probe.test.ts
 * を赤化させていた（オーナー承認済みの基盤バグ修正。2026-07-13）。
 */
import { describe, expect, it } from "vitest";
import { buildPlainCoverage, hasFulltextArticle } from "./coverage";

const LAW_ID = "347M50002000032"; // 安衛則

describe("hasFulltextArticle", () => {
  it("curated コーパスに無い実在の gap 条（第151条の8）は全文層で真になる", () => {
    // 第151条の8（合図）は curated コーパス（anzen-eisei-kisoku.ts）にも
    // RAG gap-fill（corpus-gaps-fill.ts）にも収録されていない、正真正銘の
    // 全文ギャップ条。旧ロジックではこれが幽霊エントリ扱いされていた。
    expect(hasFulltextArticle(LAW_ID, "第151条の8")).toBe(true);
  });

  it("コーパスにも全文層にも実在しない架空条番号は偽になる（回帰ガード）", () => {
    expect(hasFulltextArticle(LAW_ID, "第99999条の999")).toBe(false);
  });

  it("全文スナップショットを持たない法令では常に偽（有機則等への影響なし）", () => {
    expect(hasFulltextArticle("000X00000000000", "第1条")).toBe(false);
  });
});

describe("buildPlainCoverage の orphans 判定", () => {
  it("安衛則の coverage が生成でき、real な gap 条 plain は orphan に出ない", () => {
    const coverage = buildPlainCoverage();
    const anei = coverage.find((c) => c.lawShort === "安衛則");
    expect(anei).toBeDefined();
    if (!anei) return;
    // 実データ照合: 現行シャードに登録済みの gap 条（curated 非収載）が
    // 誤って orphans に載っていないことを確認する（回帰ガード）。
    for (const num of anei.orphans) {
      expect(
        hasFulltextArticle(anei.egovLawId, num),
        `${num} は全文層に実在するのに orphans に載っている（fix 退行）`
      ).toBe(false);
    }
  });
});
