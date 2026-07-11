/**
 * 現場ことば版の常設CIゲート。
 *
 * レジストリ登録済みの全 plain エントリについて:
 *  1. 条キー (egovLawId, articleNum) が法令ナビの生成集合（＝コーパス実体）に
 *     実在すること（幽霊エントリ 0）
 *  2. 原文ハッシュが現行コーパスと一致するエントリは fidelity 全緑であること
 *     （欠落・改変・捏造・黙った省略があれば CI が落ちる）
 *  3. ハッシュ不一致（＝改正等でコーパス側が更新された stale）は fail させず
 *     警告のみ（改正追従はコーパス更新を止めない）。stale は UI 非表示 ＆
 *     `npm run plain:status` の再生成キューに載る。
 *  4. verified 以外（draft）は UI に出ない前提のため fidelity は検査しない。
 */

import { describe, expect, it } from "vitest";
import { LAW_NAVI_ENTRIES } from "@/lib/law-navi/permalink";
import { checkFidelity } from "@/lib/plain/fidelity";
import { plainSourceHash } from "@/lib/plain/text-hash";
import { allPlainArticles } from "./index";

const CORPUS_BY_KEY = new Map(
  LAW_NAVI_ENTRIES.map((e) => [`${e.egovLawId}|${e.article.articleNum}`, e.article])
);

describe("plain レジストリの整合", () => {
  it("重複キーが無い", () => {
    const seen = new Set<string>();
    for (const p of allPlainArticles) {
      const key = `${p.egovLawId}|${p.articleNum}`;
      expect(seen.has(key), `重複: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("全エントリがコーパス実在条（法令ナビ生成集合）に対応する", () => {
    for (const p of allPlainArticles) {
      expect(
        CORPUS_BY_KEY.has(`${p.egovLawId}|${p.articleNum}`),
        `幽霊エントリ: ${p.egovLawId} ${p.articleNum}（コーパスに無い条）`
      ).toBe(true);
    }
  });
});

describe("fidelity ゲート（fresh な verified エントリは全緑必須）", () => {
  it("ハッシュ一致エントリの fidelity 違反 0", () => {
    let fresh = 0;
    let stale = 0;
    const failures: string[] = [];

    for (const p of allPlainArticles) {
      if (p.checkStatus !== "verified") continue;
      const article = CORPUS_BY_KEY.get(`${p.egovLawId}|${p.articleNum}`);
      if (!article) continue; // 実在性は前段テストで担保
      if (plainSourceHash(article.text) !== p.sourceTextHash) {
        stale++;
        console.warn(
          `[plain:stale] ${p.egovLawId} ${p.articleNum}: 原文が更新済み（UI非表示・要再生成）`
        );
        continue;
      }
      fresh++;
      const violations = checkFidelity(article, p);
      for (const v of violations) {
        failures.push(`${p.egovLawId} ${p.articleNum} [${v.kind}] ${v.message}`);
      }
    }

    expect(fresh, "fresh なエントリが1件も無い（ハッシュ転記ミスの疑い）").toBeGreaterThan(0);
    expect(failures, `fidelity違反 ${failures.length}件:\n${failures.join("\n")}`).toEqual([]);
    if (stale > 0) {
      console.warn(`[plain:stale] 計${stale}条が stale（npm run plain:status で一覧・再生成キュー化）`);
    }
  });
});
