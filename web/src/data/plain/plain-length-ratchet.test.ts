/**
 * 端的さラチェット(CR2-D4対応): #888 で導入した文字数ゲートは
 * LENGTH_CAP_SINCE=2026-07-12 以降の生成分にしか適用されない
 * (=それ以前の在庫は恒久免除)。免除条数は増えてはいけない・減る方向にしか動かせない。
 *
 * ラチェットが赤くなったら:
 *  - 免除条を新規に増やそうとしていないか(生成日を遡って書き戻していないか)
 *  - 長さ違反が新規に発生していないか
 * を確認する。免除条を分割して長さ違反を解消したときは、この上限を下げていく。
 */
import { describe, expect, it } from "vitest";
import { allPlainArticles } from "./index";

const LENGTH_CAP_SINCE = "2026-07-12";
const MAX_SENTENCE_CHARS = 120;
const MAX_TOTAL_CHARS = 400;

function stripParentheticals(text: string): string {
  return text.replace(/（[^（）]*）|\([^()]*\)/g, "");
}

function violatesLength(text: string): { total: number; longest: number } {
  const stripped = stripParentheticals(text);
  let longest = 0;
  for (const s of stripped.split("。")) {
    if (s.trim().length > longest) longest = s.trim().length;
  }
  return { total: stripped.length, longest };
}

describe("端的さラチェット (CR2-D4)", () => {
  it("LENGTH_CAP_SINCE 未満の生成日で長さ違反となる恒久免除条の総数", () => {
    const grandfathered = allPlainArticles.filter(
      (p) => p.generatedAt < LENGTH_CAP_SINCE
    );
    const exempted = grandfathered.filter((p) => {
      const { total, longest } = violatesLength(p.plainText);
      return total > MAX_TOTAL_CHARS || longest > MAX_SENTENCE_CHARS;
    });

    // 2026-07-13 時点の実測 (fidelity v2 導入直後・79条 → v2-rewrite squad是正で継続低下中)。
    // 増加は禁止・減少のみ許容。免除条を分割して書き直したらここを下げる。
    const RATCHET_MAX = 54;
    expect(
      exempted.length,
      `恒久免除条(長さ違反)がラチェット上限 ${RATCHET_MAX} を超えました (=${exempted.length}件)。` +
        `新しく grandfathered 条を増やそうとしていませんか。免除条の一覧:\n` +
        exempted
          .map((p) => {
            const { total, longest } = violatesLength(p.plainText);
            return `  ${p.egovLawId} ${p.articleNum}: 全体${total}字/最長${longest}字`;
          })
          .join("\n")
    ).toBeLessThanOrEqual(RATCHET_MAX);
  });

  it("最悪 1 文字数(恒久免除条内) が単調に増えていないこと", () => {
    let worst = 0;
    let worstAt = "";
    for (const p of allPlainArticles) {
      if (p.generatedAt >= LENGTH_CAP_SINCE) continue;
      const { longest } = violatesLength(p.plainText);
      if (longest > worst) {
        worst = longest;
        worstAt = `${p.egovLawId} ${p.articleNum}`;
      }
    }
    // 現状の実測=245字 (特化則第28条。施行令第6条=778字はv2-rewrite squadで是正済み)。分割 PR ごとに下げる。
    const WORST_CEIL = 245;
    expect(
      worst,
      `恒久免除条内の最悪1文が上限 ${WORST_CEIL} 字を上回りました (=${worst}字, ${worstAt})。`
    ).toBeLessThanOrEqual(WORST_CEIL);
  });
});
