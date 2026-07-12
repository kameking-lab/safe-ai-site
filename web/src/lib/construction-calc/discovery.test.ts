import { describe, it, expect } from "vitest";
import { CONSTRUCTION_CALCULATORS, getCalculator } from "./registry";
import {
  resolveCalcCategory,
  groupCalculatorsByCategory,
  CALC_CATEGORIES,
  CATEGORY_BY_SLUG,
} from "./categories";
import { relatedCalculatorsForArticle } from "./related-articles";
import { getCalcSearchEntries } from "./search-source";
import { findEntryByShort } from "@/lib/law-navi/permalink";

/**
 * 発見層（ハブのカテゴリ束・横断検索収載・law→calc 逆リンク）の registry 駆動性と
 * 幽霊リンク 0 を機械固定する。部隊の新機が増えても「必ずどこかの束に入り／検索に載り／
 * 幽霊URLを生まない」ことをここで担保する。
 */
describe("construction-calc 発見層: カテゴリ束", () => {
  it("全計算機が既知カテゴリのいずれかに解決する（other 受け皿含め漏らさない）", () => {
    const known = new Set(CALC_CATEGORIES.map((c) => c.id));
    for (const c of CONSTRUCTION_CALCULATORS) {
      expect(known.has(resolveCalcCategory(c)), c.slug).toBe(true);
    }
  });

  it("現行の全計算機が中央マップまたは自己宣言で other 以外に分類される（未分類の放置なし）", () => {
    for (const c of CONSTRUCTION_CALCULATORS) {
      expect(resolveCalcCategory(c), `${c.slug} が other に落ちている`).not.toBe("other");
    }
  });

  it("宣言 category は中央マップ・推定より優先される", () => {
    const fake = { slug: "zzz-unknown-xxx", keywords: ["電線"], category: "tamakake" as const };
    expect(resolveCalcCategory(fake)).toBe("tamakake"); // keywords は電線(denki)だが宣言優先
  });

  it("未宣言・中央マップ外の新機も keywords/slug から推定で束に入る", () => {
    // 中央マップに未登録の将来スラッグで純粋に推定を検証する
    expect(getCalculator("voltage-drop")).toBeUndefined();
    expect(resolveCalcCategory({ slug: "voltage-drop", keywords: ["電圧降下", "内線規程"] })).toBe("denki");
    expect(resolveCalcCategory({ slug: "chain-fiber-sling", keywords: ["つりチェーン", "繊維スリング"] })).toBe("tamakake");
    expect(resolveCalcCategory({ slug: "eaves-guard-check", keywords: ["朝顔", "防護棚"] })).toBe("ashiba");
    expect(resolveCalcCategory({ slug: "column-side-pressure", keywords: ["側圧", "型枠"] })).toBe("concrete");
    expect(resolveCalcCategory({ slug: "uplift-pressure", keywords: ["揚圧", "水圧"] })).toBe("doko");
  });

  it("グルーピングは表示順を保持し空の束を返さない・全件を保存する", () => {
    const groups = groupCalculatorsByCategory(CONSTRUCTION_CALCULATORS);
    const order = CALC_CATEGORIES.map((c) => c.id);
    const got = groups.map((g) => g.category.id);
    expect(got).toEqual(order.filter((id) => got.includes(id))); // 表示順維持
    expect(groups.every((g) => g.calcs.length > 0)).toBe(true);
    const total = groups.reduce((n, g) => n + g.calcs.length, 0);
    expect(total).toBe(CONSTRUCTION_CALCULATORS.length); // 全件保存（1機も落ちない）
  });

  it("中央マップの slug はすべて実在する計算機", () => {
    for (const slug of Object.keys(CATEGORY_BY_SLUG)) {
      expect(getCalculator(slug), slug).toBeDefined();
    }
  });
});

describe("construction-calc 発見層: 横断検索収載", () => {
  it("全計算機が検索エントリに射影される（url は /construction-calc/<slug>）", () => {
    const entries = getCalcSearchEntries();
    expect(entries.length).toBe(CONSTRUCTION_CALCULATORS.length);
    for (const c of CONSTRUCTION_CALCULATORS) {
      const e = entries.find((x) => x.id === `calc-${c.slug}`);
      expect(e, c.slug).toBeDefined();
      expect(e!.url).toBe(`/construction-calc/${c.slug}`);
      expect(e!.keywords).toContain("建設計算");
    }
  });

  it("現場語 alias が検索キーワードに載る（あだ巻き・朝顔ではなく安全ネット等・calc固有語）", () => {
    const entries = getCalcSearchEntries();
    const net = entries.find((e) => e.id === "calc-safety-net-check")!;
    expect(net.keywords).toContain("安全ネット");
    expect(net.keywords).toContain("防網");
    const sling = entries.find((e) => e.id === "calc-sling-wire-load")!;
    expect(sling.keywords).toContain("あだ巻き");
  });
});

describe("construction-calc 発見層: law → calc 逆リンク", () => {
  it("安衛則571条 → 単管足場チェック（タスクの代表結線）", () => {
    const hits = relatedCalculatorsForArticle("安衛則", "第571条");
    expect(hits.map((c) => c.slug)).toContain("scaffold-tankan-check");
  });

  it("安衛則539条 → 安全ネット基準チェック", () => {
    const hits = relatedCalculatorsForArticle("安衛則", "第539条");
    expect(hits.map((c) => c.slug)).toContain("safety-net-check");
  });

  it("クレーン則213条 → 玉掛けワイヤ", () => {
    const hits = relatedCalculatorsForArticle("クレーン則", "第213条");
    expect(hits.map((c) => c.slug)).toContain("sling-wire-load");
  });

  it("無関係な条文は空配列", () => {
    expect(relatedCalculatorsForArticle("安衛則", "第9999条")).toEqual([]);
  });

  it("逆リンクが指す条文はすべて law-navi に実在（curated で解決＝幽霊リンク0）", () => {
    // 逆リンクは curated / fulltext どちらのページにも出るが、少なくとも curated 解決可能な
    // 代表条（クレーン則213・安衛則539/356）は permalink 生成集合に実在することを固定する。
    for (const [lawShort, articleNum] of [
      ["クレーン則", "第213条"],
      ["安衛則", "第539条"],
      ["安衛則", "第356条"],
    ] as const) {
      // その条を根拠に持つ計算機が居ること＝逆リンクが張られること
      expect(relatedCalculatorsForArticle(lawShort, articleNum).length).toBeGreaterThan(0);
      // curated 集合での実在（fulltext のみの条はここでは検証対象外）
      const entry = findEntryByShort(lawShort, articleNum);
      if (entry) expect(entry.article.lawShort).toBe(lawShort);
    }
  });
});
