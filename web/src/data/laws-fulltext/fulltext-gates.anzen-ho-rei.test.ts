/**
 * FT-D5 取込検証ゲート（設計書 §3-4）— 安衛法・安衛令の全文スナップショット層の常設検証。
 * FT-D1（安衛則・fulltext-gates.test.ts）と同一のゲート型を法令ごとに適用する。
 * ここが全緑であることが再取得（改正追従）時のチェックイン必要条件。
 *
 * 安衛令の別表（AppdxTable）は「本体級」だが、設計書 §3-3 により全文取込対象は本則の条文本文のみ。
 * 別表は既存の beppyo 意味索引（src/data/law-navi/beppyo.ts）・anei-beppyo-snapshot が正本であり
 * 二重化しない。本テストは (a) 別表を条ページ化していないこと (b) beppyo の別表ラベルが e-Gov の
 * 実在別表題名に全て対応すること（幽霊別表ゼロ）を機械固定し、法令ナビ表示との矛盾を防ぐ。
 */

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import anzenHo from "./347AC0000000057.json";
import anzenRei from "./347CO0000000318.json";
import type { FulltextLaw } from "../../lib/laws-fulltext/types";
import {
  OFFICIAL_CAPTIONS_RODO_ANZEN_EISEI_HO,
  OFFICIAL_CAPTIONS_ANZEN_EISEI_REI,
} from "../laws/egov-caption-snapshot";
import { allLawArticles } from "../laws/index";
import { LAW_METADATA } from "../laws/law-metadata";
import { BEPPYO_ENTRIES } from "../law-navi/beppyo";
import {
  parseArticleNum,
  normalizeFullwidthAlnum,
  normalizeKanjiNumbers,
} from "../../lib/article-number-normalize";
import {
  resolveFulltextArticle,
  loadFulltextLaw,
} from "../../lib/laws-fulltext/loader";

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

/** ETL の sha256 対象と同一の直列化（articles のみ・fetchedAt/appdxTables を含めない）。 */
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

const strip = (s: string) => s.replace(/[（）]/g, "");

type LawSpec = {
  lawShort: string;
  lawId: string;
  law: FulltextLaw;
  captions: Record<string, string>;
  /** metaKey は LAW_METADATA のキー（lawShort と同一）。 */
  scale: { minBase: number; maxBase: number };
  expectDeleted: boolean;
  expectAppdxCount: number;
};

const LAWS: LawSpec[] = [
  {
    lawShort: "安衛法",
    lawId: "347AC0000000057",
    law: anzenHo as unknown as FulltextLaw,
    captions: OFFICIAL_CAPTIONS_RODO_ANZEN_EISEI_HO,
    scale: { minBase: 100, maxBase: 130 }, // 本則 第1〜123条
    expectDeleted: true, // 第64条=削除
    expectAppdxCount: 24, // 別表第1〜22（＋第4の2・第4の3）
  },
  {
    lawShort: "安衛令",
    lawId: "347CO0000000318",
    law: anzenRei as unknown as FulltextLaw,
    captions: OFFICIAL_CAPTIONS_ANZEN_EISEI_REI,
    scale: { minBase: 25, maxBase: 40 }, // 本則 第1〜27条
    expectDeleted: false,
    expectAppdxCount: 10, // 別表第1〜9（＋第6の2）
  },
];

for (const spec of LAWS) {
  const { law } = spec;
  const byKey = new Map<string, FulltextLaw["articles"][number]>();
  for (const a of law.articles) byKey.set(a.sortKey.join("-"), a);

  describe(`FT-D5 ${spec.lawShort} gate 1: 形式（空本文・パース・重複）`, () => {
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

  describe(`FT-D5 ${spec.lawShort} gate 2: 連番（欠番は削除条でのみ許容）`, () => {
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

    it(`削除条は isDeleted=true かつ本文が「削除」（${spec.lawShort}: 削除条${spec.expectDeleted ? "あり" : "なし"}）`, () => {
      const deleted = law.articles.filter((a) => a.isDeleted);
      if (spec.expectDeleted) {
        expect(deleted.length).toBeGreaterThan(0);
      } else {
        expect(deleted.length).toBe(0);
      }
      for (const a of deleted) expect(a.text.replace(/\s/g, "")).toBe("削除");
    });
  });

  describe(`FT-D5 ${spec.lawShort} gate 3: 既存正本との突合`, () => {
    it("lawTitle が LAW_METADATA.fullName と一致", () => {
      expect(law.lawTitle).toBe(LAW_METADATA[spec.lawShort].fullName);
    });

    it("caption が egov-caption-snapshot と一致（*=継承・削除は別扱い）", () => {
      const mismatches: string[] = [];
      for (const [num, val] of Object.entries(spec.captions)) {
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

    it(`curated ${spec.lawShort} の全 articleNum が fulltext に存在（curated ⊆ fulltext）`, () => {
      const curated = allLawArticles.filter((a) => a.lawShort === spec.lawShort);
      expect(curated.length).toBeGreaterThan(0);
      const missing = curated
        .map((a) => a.articleNum)
        .filter((num) => !byKey.has(keyOf(num) ?? "__none__"));
      expect(missing).toEqual([]);
    });
  });

  describe(`FT-D5 ${spec.lawShort} gate 4: 号突合（itemNumberMap ⊆ fulltext items）`, () => {
    it("curated の itemNumberMap キーは全て fulltext の号として存在", () => {
      const curated = allLawArticles.filter(
        (a) => a.lawShort === spec.lawShort && a.itemNumberMap,
      );
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

  describe(`FT-D5 ${spec.lawShort} gate 5: 規模アンカー`, () => {
    it(`最終条は期待規模（第${spec.scale.minBase}〜${spec.scale.maxBase}条）内`, () => {
      const maxBase = Math.max(...law.articles.map((a) => a.sortKey[0]));
      expect(maxBase).toBeGreaterThanOrEqual(spec.scale.minBase);
      expect(maxBase).toBeLessThanOrEqual(spec.scale.maxBase);
    });

    it("articleCount が articles 配列長と一致", () => {
      expect(law.articleCount).toBe(law.articles.length);
    });
  });

  describe(`FT-D5 ${spec.lawShort} gate 6: 出典アンカー`, () => {
    it("source・revisionId・fetchedAt が揃っている", () => {
      expect(law.source).toContain("政府標準利用規約");
      expect(law.revisionId).toMatch(/^\d{8}_/);
      expect(law.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(law.lawId).toBe(spec.lawId);
    });

    it("sha256 が再計算値と一致（改ざん・差分検知アンカー）", () => {
      const recomputed = createHash("sha256").update(canonicalArticlesJson(law)).digest("hex");
      expect(law.sha256).toBe(recomputed);
    });

    it("skipped は捏造ゼロ（取得漏れ無し）", () => {
      expect(law.skipped).toEqual([]);
    });
  });

  describe(`FT-D5 ${spec.lawShort} 枝番ラウンドトリップ（全条一意）`, () => {
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
  });

  describe(`FT-D5 ${spec.lawShort} ルビ（黙った変形をしない）`, () => {
    it("rubyStripped を非負で記録し、本文にルビ読みタグの残骸がない", () => {
      expect(law.rubyStripped).toBeGreaterThanOrEqual(0);
      const withTag = law.articles.filter((a) => /[<>]/.test(a.text));
      expect(withTag.map((a) => a.articleNum)).toEqual([]);
    });
  });

  describe(`FT-D5 ${spec.lawShort} 別表（§3-3: 本則のみ取込・別表は本文外）`, () => {
    it(`別表題名を ${spec.expectAppdxCount} 件採録している（本文は取込しない）`, () => {
      expect(law.appdxTables?.length).toBe(spec.expectAppdxCount);
    });

    it("別表を条ページ化していない（articleNum に「別表」を含む条がない）", () => {
      const beppyoLike = law.articles.filter((a) => a.articleNum.includes("別表"));
      expect(beppyoLike.map((a) => a.articleNum)).toEqual([]);
    });

    it("beppyo 意味索引の別表ラベルは全て実在別表に対応（幽霊別表ゼロ・法令ナビ表示と非矛盾）", () => {
      const realTables = new Set(
        (law.appdxTables ?? []).map((t) => normalizeKanjiNumbers(t)),
      );
      const entries = BEPPYO_ENTRIES.filter((e) => e.lawShort === spec.lawShort);
      const phantom = entries
        .map((e) => e.label)
        .filter((label) => label !== "別表" && !realTables.has(normalizeKanjiNumbers(label)));
      expect(phantom).toEqual([]);
    });
  });

  describe(`FT-D5 ${spec.lawShort} データ層で解決できる（loader 経由）`, () => {
    it("第1条が解決できる", async () => {
      const a = await resolveFulltextArticle(spec.lawId, "第1条");
      expect(a?.articleNum).toBe("第1条");
      expect(a?.isDeleted).toBe(false);
      expect(a?.text.length ?? 0).toBeGreaterThan(10);
    });

    it("表記ゆれ（漢数字・第なし）でも解決できる", async () => {
      const a = await resolveFulltextArticle(spec.lawId, "一条");
      expect(a?.articleNum).toBe("第1条");
    });
  });
}

describe("FT-D5 安衛法: 従来 curated になかった条が全文で解決できる", () => {
  const LAW_ID = "347AC0000000057";
  it("第64条（削除条）が isDeleted で解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "第64条");
    expect(a?.isDeleted).toBe(true);
    expect(a?.text.replace(/\s/g, "")).toBe("削除");
  });

  it("第62条の2（高年齢者の労働災害防止のための措置）が解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "第62条の2");
    expect(a?.articleNum).toBe("第62条の2");
    expect(a?.text.length ?? 0).toBeGreaterThan(20);
  });

  it("第122条の2（罰則の枝番条）が解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "第122条の2");
    expect(a?.articleNum).toBe("第122条の2");
  });
});

describe("FT-D5 安衛令: 別表参照条が全文で解決できる", () => {
  const LAW_ID = "347CO0000000318";
  it("第21条（作業環境測定を行うべき作業場・別表参照条）が解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "第21条");
    expect(a?.articleNum).toBe("第21条");
    expect(a?.text.length ?? 0).toBeGreaterThan(20);
  });

  it("第18条の5（多段でない枝番条）が解決できる", async () => {
    const a = await resolveFulltextArticle(LAW_ID, "第18条の5");
    expect(a?.articleNum).toBe("第18条の5");
  });

  it("未収載法令は null（curated フォールバック側の責務）", async () => {
    expect(await loadFulltextLaw("999XXXXXXXXXXXX")).toBeNull();
  });
});
