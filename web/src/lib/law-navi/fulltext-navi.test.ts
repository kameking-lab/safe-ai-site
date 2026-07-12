import { describe, expect, it } from "vitest";
import { LAW_NAVI_ENTRIES } from "./permalink";
import {
  adjacentReadingOrder,
  fulltextArtSlug,
  getAllFulltextNaviEntries,
  getFulltextNaviEntries,
  listGapSkipped,
  resolveFulltextNaviEntry,
} from "./fulltext-navi";
import { isIndexableLawNaviEntry } from "./seo-gate";

/**
 * FT-D2 表示統合（設計書 docs/corpus-fulltext-architecture-2026-07-12.md §2-4・§5-2）の機械固定。
 *
 * 全文層（FT-D1・安衛則1,182条）を法令ナビの URL/表示へ橋渡しするとき、
 *   - 既存 curated 717 URL は 1 件も壊さない（追加のみ）
 *   - 全文由来は curated に無い条だけを埋める（dual-exclusion）
 *   - 枝番（多段含む）・削除条を正しく slug 化・収載する
 * を恒久固定する。
 */
const EGOV = "347M50002000032"; // 安衛則

describe("fulltextArtSlug — sortKey 由来の slug（全階層枝番保持）", () => {
  it("基条・単段枝番・多段枝番を機械規則で変換する", () => {
    expect(fulltextArtSlug([46])).toBe("46");
    expect(fulltextArtSlug([577, 2])).toBe("577-2");
    expect(fulltextArtSlug([34, 2, 3])).toBe("34-2-3");
    expect(fulltextArtSlug([34, 2, 6, 2])).toBe("34-2-6-2");
  });
});

describe("getFulltextNaviEntries — 安衛則ギャップ充填（dual-exclusion）", () => {
  it("curated に無い条だけを 1,065 件埋める（116 curated収録 + 1 slug占有 を除外）", async () => {
    const gap = await getFulltextNaviEntries(EGOV);
    expect(gap.length).toBe(1065);
    expect(gap.every((e) => e.origin === "fulltext")).toBe(true);
  });

  it("既存 curated 収録済みの条は充填しない（第577条の2・第612条の2 は curated が正本）", async () => {
    const gap = await getFulltextNaviEntries(EGOV);
    const nums = new Set(gap.map((e) => e.article.articleNum));
    expect(nums.has("第577条の2")).toBe(false);
    expect(nums.has("第612条の2")).toBe(false);
  });

  it("slug 占有された条は充填しない＋listGapSkipped で可視化（黙って欠かさない）", async () => {
    const gap = await getFulltextNaviEntries(EGOV);
    expect(gap.some((e) => e.article.articleNum === "第34条の2")).toBe(false);
    const skipped = await listGapSkipped(EGOV);
    expect(skipped).toEqual([
      { articleNum: "第34条の2", slug: "34-2", heldBy: "第34条の2の7" },
    ]);
  });

  it("従来なかった代表条を充填する（多段枝番 第34条の2の3・削除条 第46条）", async () => {
    const gap = await getFulltextNaviEntries(EGOV);
    const by = new Map(gap.map((e) => [e.article.articleNum, e]));

    const eda = by.get("第34条の2の3");
    expect(eda?.artSlug).toBe("34-2-3");
    expect(eda?.path).toBe(`/law-navi/${EGOV}/34-2-3`);
    expect(eda?.article.articleTitle).toBe("名称等の通知"); // caption の外側全角括弧を除去
    expect(eda?.article.lawShort).toBe("安衛則");
    expect(eda?.article.law).toBe("労働安全衛生規則");
    expect(eda?.article.keywords).toEqual([]);
    expect(eda?.article.itemNumberMap).toBeUndefined();

    const del = by.get("第46条");
    expect(del?.artSlug).toBe("46");
    expect(del?.isDeleted).toBe(true);
    expect(del?.fulltextArticle.isDeleted).toBe(true);
  });

  it("全ギャップ slug が URL 規則（/[0-9]+(-[0-9]+)*/）に適合する", async () => {
    const gap = await getFulltextNaviEntries(EGOV);
    for (const e of gap) {
      expect(e.path).toMatch(/^\/law-navi\/[0-9A-Za-z]+\/[0-9]+(-[0-9]+)*$/);
    }
  });
});

describe("既存 URL 不変（追加のみ・§5-2）", () => {
  it("生成集合 LAW_NAVI_ENTRIES は 717 件のまま（permalink 側は不変）", () => {
    expect(LAW_NAVI_ENTRIES.length).toBe(717);
  });

  it("ギャップ slug は既存 (egovLawId, artSlug) と 1 件も衝突しない", async () => {
    const existing = new Set(LAW_NAVI_ENTRIES.map((e) => `${e.egovLawId}/${e.artSlug}`));
    const all = await getAllFulltextNaviEntries();
    const collisions = all.filter((e) => existing.has(`${e.egovLawId}/${e.artSlug}`));
    expect(collisions.map((e) => e.path)).toEqual([]);
  });

  it("ギャップ内でも (egovLawId, artSlug) は一意（slug 衝突ゼロ）", async () => {
    const all = await getAllFulltextNaviEntries();
    const seen = new Set<string>();
    for (const e of all) {
      const key = `${e.egovLawId}/${e.artSlug}`;
      expect(seen.has(key), `重複 slug: ${key}`).toBe(false);
      seen.add(key);
    }
  });
});

describe("resolveFulltextNaviEntry — slug からの解決", () => {
  it("ギャップ条を解決し、curated 収録済み条・存在しない slug は undefined", async () => {
    expect((await resolveFulltextNaviEntry(EGOV, "34-2-3"))?.article.articleNum).toBe("第34条の2の3");
    expect((await resolveFulltextNaviEntry(EGOV, "46"))?.isDeleted).toBe(true);
    // 第577条の2 は curated が正本＝ギャップに無い（ページ側は curated 解決が先）
    expect(await resolveFulltextNaviEntry(EGOV, "577-2")).toBeUndefined();
    // 存在しない
    expect(await resolveFulltextNaviEntry(EGOV, "99999")).toBeUndefined();
    // 全文非対応法令
    expect(await resolveFulltextNaviEntry("000NONE", "1")).toBeUndefined();
  });
});

describe("adjacentReadingOrder — 実条連続の前後ナビ", () => {
  it("多段枝番条の前後が実条で並ぶ（第34条の2の2 → 第34条の2の3 → 第34条の2の4）", async () => {
    const { prev, next } = await adjacentReadingOrder(EGOV, "第34条の2の3");
    expect(prev?.articleNum).toBe("第34条の2の2");
    expect(next?.articleNum).toBe("第34条の2の4");
    // 着地先は実在ページ（curated か 全文ギャップ）
    expect(prev?.path).toMatch(/^\/law-navi\//);
    expect(next?.path).toMatch(/^\/law-navi\//);
  });

  it("端の条は前 or 次が undefined（第1条・最終条）", async () => {
    const first = await adjacentReadingOrder(EGOV, "第1条");
    expect(first.prev).toBeUndefined();
    const last = await adjacentReadingOrder(EGOV, "第682条");
    expect(last.next).toBeUndefined();
  });
});

describe("SEO ゲート接続（FT-D3）: 付加価値による index/noindex 内訳", () => {
  it("付加価値ゼロの全文生ミラー条は noindex（indexable=false）が存在する", async () => {
    const gap = await getAllFulltextNaviEntries();
    const noindex = gap.filter((e) => !isIndexableLawNaviEntry(e));
    const indexable = gap.filter((e) => isIndexableLawNaviEntry(e));
    // 生ミラー（付加価値ゼロ）が確かに noindex になる条が存在する＝ゲートが効いている
    expect(noindex.length).toBeGreaterThan(0);
    // 内訳の健全性: 合計は全ギャップ数
    expect(noindex.length + indexable.length).toBe(gap.length);
  });
});
