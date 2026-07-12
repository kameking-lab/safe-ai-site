/**
 * FT-D1 取込検証ゲート（設計書 §3-4）＋枝番ラウンドトリップ＋データ層解決の常設テスト。
 * 全文スナップショット層 web/src/data/laws-fulltext/*.json を機械検証する。
 * ここが全緑であることが再取得（改正追従）時のチェックイン必要条件。
 */

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import anzenFulltext from "./347M50002000032.json";
import type { FulltextLaw } from "../../lib/laws-fulltext/types";
import { OFFICIAL_CAPTIONS_ANZEN_EISEI_KISOKU as CAPTIONS } from "../laws/egov-caption-snapshot";
import { allLawArticles } from "../laws/index";
import { LAW_METADATA } from "../laws/law-metadata";
import {
  parseArticleNum,
  normalizeFullwidthAlnum,
  normalizeKanjiNumbers,
} from "../../lib/article-number-normalize";
import {
  resolveFulltextArticle,
  loadFulltextLaw,
} from "../../lib/laws-fulltext/loader";

const LAW_ID = "347M50002000032";
const law = anzenFulltext as unknown as FulltextLaw;

/** 全階層の枝番を保持する正規化キー（loader.keyOf と同一規約）。 */
function keyOf(articleNum: string): string | null {
  const norm = normalizeKanjiNumbers(normalizeFullwidthAlnum(articleNum));
  const m = /^第?([0-9]+)条((?:の[0-9]+)*)/.exec(norm);
  if (!m) return null;
  const parts = [m[1]];
  if (m[2]) for (const b of m[2].split("の").filter(Boolean)) parts.push(b);
  return parts.join("-");
}

function sortKeyToArticleNum(key: number[]): string {
  const [main, ...branches] = key;
  return `第${main}条${branches.map((x) => `の${x}`).join("")}`;
}

/** ETL の sha256 対象と同一の直列化。 */
function canonicalArticlesJson(l: FulltextLaw): string {
  return JSON.stringify(
    l.articles.map((a) => ({
      articleNum: a.articleNum,
      caption: a.caption,
      isDeleted: a.isDeleted,
      paragraphs: a.paragraphs,
      text: a.text,
      sortKey: a.sortKey,
    })),
  );
}

const byKey = new Map<string, FulltextLaw["articles"][number]>();
for (const a of law.articles) byKey.set(a.sortKey.join("-"), a);

describe("FT-D1 gate 1: 形式（空本文・パース・重複）", () => {
  it("非削除条の本文は空でない", () => {
    const empties = law.articles.filter(
      (a) => !a.isDeleted && a.text.replace(/\s/g, "") === "",
    );
    expect(empties.map((a) => a.articleNum)).toEqual([]);
  });

  it("articleNum は全条パース成功（keyOf が値を返す）", () => {
    const bad = law.articles.filter((a) => keyOf(a.articleNum) === null);
    expect(bad.map((a) => a.articleNum)).toEqual([]);
  });

  it("(lawId, articleNum) の重複ゼロ", () => {
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const a of law.articles) {
      if (seen.has(a.articleNum)) dups.push(a.articleNum);
      seen.add(a.articleNum);
    }
    expect(dups).toEqual([]);
  });

  it("sortKey.join('-') が全条一意（枝番衝突なし）", () => {
    expect(byKey.size).toBe(law.articles.length);
  });
});

describe("FT-D1 gate 2: 連番（欠番は削除条でのみ許容）", () => {
  it("基底条番号 第1条〜最終条に欠番なし", () => {
    const bases = new Set(law.articles.map((a) => a.sortKey[0]));
    const maxBase = Math.max(...bases);
    const missing: number[] = [];
    for (let i = 1; i <= maxBase; i += 1) if (!bases.has(i)) missing.push(i);
    expect(missing).toEqual([]);
  });

  it("sortKey は昇順に整列している", () => {
    const cmp = (a: number[], b: number[]) => {
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n; i += 1) {
        const av = a[i] ?? 0;
        const bv = b[i] ?? 0;
        if (av !== bv) return av - bv;
      }
      return 0;
    };
    for (let i = 1; i < law.articles.length; i += 1) {
      expect(cmp(law.articles[i - 1].sortKey, law.articles[i].sortKey)).toBeLessThan(0);
    }
  });

  it("削除条は isDeleted=true かつ本文が「削除」", () => {
    const deleted = law.articles.filter((a) => a.isDeleted);
    expect(deleted.length).toBeGreaterThan(0);
    for (const a of deleted) expect(a.text.replace(/\s/g, "")).toBe("削除");
  });
});

describe("FT-D1 gate 3: 既存正本との突合", () => {
  it("lawTitle が LAW_METADATA.fullName と一致", () => {
    expect(law.lawTitle).toBe(LAW_METADATA["安衛則"].fullName);
  });

  it("caption が egov-caption-snapshot と一致（*=継承・削除は別扱い）", () => {
    const strip = (s: string) => s.replace(/[（）]/g, "");
    const mismatches: string[] = [];
    for (const [num, val] of Object.entries(CAPTIONS)) {
      const a = byKey.get(keyOf(num) ?? "");
      if (!a) {
        mismatches.push(`${num}: not in fulltext`);
        continue;
      }
      if (val === "削除") {
        if (!a.isDeleted) mismatches.push(`${num}: expected deleted`);
        continue;
      }
      if (val.endsWith("*")) continue; // 見出し継承条はスキップ
      if (strip(a.caption) !== val) {
        mismatches.push(`${num}: ft="${strip(a.caption)}" snap="${val}"`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("curated 安衛則 の全 articleNum が fulltext に存在（curated ⊆ fulltext）", () => {
    const curated = allLawArticles.filter((a) => a.lawShort === "安衛則");
    expect(curated.length).toBeGreaterThan(0);
    const missing = curated
      .map((a) => a.articleNum)
      .filter((num) => !byKey.has(keyOf(num) ?? "__none__"));
    expect(missing).toEqual([]);
  });
});

describe("FT-D1 gate 4: 号突合（itemNumberMap ⊆ fulltext items）", () => {
  it("curated の itemNumberMap キーは全て fulltext の号として存在", () => {
    const curated = allLawArticles.filter((a) => a.lawShort === "安衛則" && a.itemNumberMap);
    const bad: string[] = [];
    for (const a of curated) {
      const ft = byKey.get(keyOf(a.articleNum) ?? "");
      if (!ft) continue;
      const nums = new Set<string>();
      for (const p of ft.paragraphs) for (const it of p.items ?? []) nums.add(it.num);
      for (const key of Object.keys(a.itemNumberMap!)) {
        if (!nums.has(key)) bad.push(`${a.articleNum} 号「${key}」`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("FT-D1 gate 5: 規模アンカー", () => {
  it("最終条は安衛則の期待規模（〜第700条）内", () => {
    const maxBase = Math.max(...law.articles.map((a) => a.sortKey[0]));
    expect(maxBase).toBeGreaterThan(600);
    expect(maxBase).toBeLessThanOrEqual(700);
  });

  it("articleCount が articles 配列長と一致", () => {
    expect(law.articleCount).toBe(law.articles.length);
  });
});

describe("FT-D1 gate 6: 出典アンカー", () => {
  it("source・revisionId・fetchedAt が揃っている", () => {
    expect(law.source).toContain("政府標準利用規約");
    expect(law.revisionId).toMatch(/^\d{8}_/);
    expect(law.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(law.lawId).toBe(LAW_ID);
  });

  it("sha256 が再計算値と一致（改ざん・差分検知アンカー）", () => {
    const recomputed = createHash("sha256").update(canonicalArticlesJson(law)).digest("hex");
    expect(law.sha256).toBe(recomputed);
  });

  it("skipped は捏造ゼロ（取得漏れ無し）", () => {
    expect(law.skipped).toEqual([]);
  });
});

describe("FT-D1 枝番ラウンドトリップ（全条一意）", () => {
  it("articleNum ⇄ sortKey が双方向で一致", () => {
    for (const a of law.articles) {
      expect(sortKeyToArticleNum(a.sortKey)).toBe(a.articleNum);
    }
  });

  it("parseArticleNum が条番号と第1枝番で整合（共有正規化との互換）", () => {
    for (const a of law.articles) {
      const ref = parseArticleNum(a.articleNum);
      expect(ref?.article).toBe(a.sortKey[0]);
      if (a.sortKey.length >= 2) expect(ref?.branch).toBe(a.sortKey[1]);
    }
  });

  it("多段枝番（第34条の2の6の2 等）が個別に保持されている", () => {
    const multi = law.articles.filter((a) => a.sortKey.length >= 3);
    expect(multi.length).toBeGreaterThan(0);
    // 第34条の2 と 第34条の2の3 は別キー
    expect(keyOf("第34条の2")).not.toBe(keyOf("第34条の2の3"));
  });
});

describe("FT-D1 ルビ（黙った変形をしない）", () => {
  it("除去した <Rt> 件数を記録している", () => {
    expect(law.rubyStripped).toBeGreaterThan(0);
  });

  it("本文にルビ読みタグの残骸がない", () => {
    const withTag = law.articles.filter((a) => /[<>]/.test(a.text));
    expect(withTag.map((a) => a.articleNum)).toEqual([]);
  });
});

describe("FT-D1 データ層で解決できる（loader 経由）", () => {
  it("第577条の2（化学物質ばく露低減）が解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "第577条の2");
    expect(a?.articleNum).toBe("第577条の2");
    expect(a?.isDeleted).toBe(false);
    expect(a?.text.length ?? 0).toBeGreaterThan(20);
  });

  it("第61条の2 が解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "第61条の2");
    expect(a?.articleNum).toBe("第61条の2");
  });

  it("第612条の2（熱中症対策・新設）が解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "第612条の2");
    expect(a?.articleNum).toBe("第612条の2");
  });

  it("表記ゆれ（漢数字・第なし）でも解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "五百七十七条の二");
    expect(a?.articleNum).toBe("第577条の2");
  });

  it("削除条（範囲展開）は isDeleted で解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "第440条");
    expect(a?.isDeleted).toBe(true);
  });

  it("未収載法令は null（curated フォールバック側の責務）", async () => {
    expect(await loadFulltextLaw("999XXXXXXXXXXXX")).toBeNull();
    expect(await resolveFulltextArticle("999XXXXXXXXXXXX", "第1条")).toBeNull();
  });
});
