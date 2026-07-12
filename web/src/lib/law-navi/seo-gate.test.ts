import { describe, expect, it } from "vitest";
import type { LawArticle } from "@/data/laws";
import {
  LAW_NAVI_ENTRIES,
  articleNumToSlug,
  type LawNaviEntry,
} from "@/lib/law-navi/permalink";
import {
  INDEXABLE_LAW_NAVI_ENTRIES,
  assessValueAdd,
  isIndexableLawNaviEntry,
} from "@/lib/law-navi/seo-gate";

/**
 * FT-D3 SEO ゲート（設計書 docs/corpus-fulltext-architecture-2026-07-12.md §5-3）の機械固定。
 *
 * 全文取込で law-navi 条文ページが数千規模へ広がる前に「付加価値ゼロの生ミラー条は
 * index/sitemap に載らない」を CI で恒久固定する防波堤。ここが赤くなる＝付加価値条件の
 * 判定が壊れた or 生ミラー条が収載境界を越えた、の早期検知。
 */

/** fulltext 由来のみ（curated に無い）の合成エントリを作る。参照同一性で必ず非curated。 */
function makeFulltextOnlyEntry(article: Partial<LawArticle>): LawNaviEntry {
  const a: LawArticle = {
    law: "架空テスト法（全文由来のみ）",
    lawShort: "架空テスト法",
    articleNum: "第9999条",
    articleTitle: "",
    text: "テスト条文本文（用語・注釈なし）。",
    keywords: [],
    ...article,
  };
  const artSlug = articleNumToSlug(a.articleNum) ?? "9999";
  return {
    article: a,
    egovLawId: "000TESTLAW0000000",
    artSlug,
    path: `/law-navi/000TESTLAW0000000/${artSlug}`,
  };
}

describe("FT-D3 SEO ゲート: 付加価値条件の判定", () => {
  it("付加価値ゼロの fulltext 由来条は noindex（収載しない）", () => {
    const thin = makeFulltextOnlyEntry({});
    const r = assessValueAdd(thin);
    expect(r.curated).toBe(false);
    expect(r.signals).toEqual([]);
    expect(r.indexable).toBe(false);
    expect(isIndexableLawNaviEntry(thin)).toBe(false);
  });

  it("(c) 号マップ注釈がある fulltext 由来条は index へ自動昇格する", () => {
    const withItemMap = makeFulltextOnlyEntry({ itemNumberMap: { 一: "テスト対象業務" } });
    const r = assessValueAdd(withItemMap);
    expect(r.signals).toContain("itemNumberMap");
    expect(r.indexable).toBe(true);
  });

  it("(c) 用語集にマッチする本文の fulltext 由来条は index へ自動昇格する", () => {
    // 用語集 EXTRA_TERMS に確実に載る語「定期自主検査」を含む本文（現場ことば版・分野・号なし）。
    const withGlossary = makeFulltextOnlyEntry({
      text: "事業者は、定期自主検査を行わなければならない。",
    });
    const r = assessValueAdd(withGlossary);
    expect(r.signals).toContain("glossary");
    expect(r.indexable).toBe(true);
  });

  it("空 itemNumberMap（{}）は付加価値シグナルとして数えない", () => {
    const emptyMap = makeFulltextOnlyEntry({ itemNumberMap: {} });
    expect(assessValueAdd(emptyMap).signals).not.toContain("itemNumberMap");
    expect(isIndexableLawNaviEntry(emptyMap)).toBe(false);
  });
});

describe("FT-D3 SEO ゲート: 既収載 curated の後退防止（§5-3 末尾）", () => {
  it("既存 LAW_NAVI_ENTRIES は全て curated 由来＝全件収載を維持（後退0）", () => {
    // 現状は生成集合＝curated 由来のみ。1件でも indexable=false になったら既収載が後退する。
    const dropped = LAW_NAVI_ENTRIES.filter((e) => !isIndexableLawNaviEntry(e));
    expect(
      dropped.map((e) => `${e.article.lawShort} ${e.article.articleNum}`),
    ).toEqual([]);
    expect(INDEXABLE_LAW_NAVI_ENTRIES.length).toBe(LAW_NAVI_ENTRIES.length);
  });

  it("収載集合は生成集合の部分集合＝幽霊URL0（載る条は全て解決する）", () => {
    const genSet = new Set(LAW_NAVI_ENTRIES);
    for (const e of INDEXABLE_LAW_NAVI_ENTRIES) {
      expect(genSet.has(e)).toBe(true);
    }
  });

  it("付加価値シグナルが空でも curated 由来なら grandfather で収載する", () => {
    // 実データに「シグナル0だが curated 由来」の条が存在すること自体を固定し、
    // grandfather 分岐が実際に効いていること（＝curated 判定が常時 true の飾りでない）を担保。
    const grandfathered = LAW_NAVI_ENTRIES.filter((e) => {
      const r = assessValueAdd(e);
      return r.curated && r.signals.length === 0;
    });
    expect(grandfathered.length).toBeGreaterThan(0);
    for (const e of grandfathered) {
      expect(isIndexableLawNaviEntry(e)).toBe(true);
    }
  });
});

describe("FT-D3 SEO ゲート: 付加価値シグナルが実データで機能している", () => {
  it("生成集合に plain / topics / glossary の各シグナルが実在する（判定が全 true の飾りでない）", () => {
    const has = { plain: false, topics: false, glossary: false, itemNumberMap: false };
    for (const e of LAW_NAVI_ENTRIES) {
      for (const s of assessValueAdd(e).signals) has[s] = true;
    }
    expect(has.plain).toBe(true);
    expect(has.topics).toBe(true);
    expect(has.glossary).toBe(true);
    expect(has.itemNumberMap).toBe(true);
  });
});
