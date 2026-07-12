import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { SITE_URL } from "@/lib/seo-metadata";
import { LAW_NAVI_ENTRIES } from "@/lib/law-navi/permalink";
import {
  INDEXABLE_LAW_NAVI_ENTRIES,
  isIndexableLawNaviEntry,
} from "@/lib/law-navi/seo-gate";
import { getAllFulltextNaviEntries } from "@/lib/law-navi/fulltext-navi";

/**
 * FT-D3 SEO ゲート（設計書 §5-3）の XML 層機械固定 ＋ FT-D2 表示統合の反映。
 *
 * 「付加価値ゼロのページが sitemap-laws.xml に載ったら CI が落ちる」を出力の実 XML で固定する。
 * FT-D2 で全文由来ギャップ条が生成集合へ流入したので、収載集合は
 *   curated 収載（INDEXABLE_LAW_NAVI_ENTRIES）∪ 全文由来ギャップのうち付加価値条件を満たす条
 * になる。付加価値ゼロの全文生ミラー条は sitemap 非収載（＝ここで漏れたら CI 落ち）。
 */
describe("sitemap-laws.xml（SEO ゲート: 付加価値条件を満たす条のみ収載）", () => {
  it("全 <loc> が付加価値条件を満たす条へ解決する（生ミラー条の漏れ0＝ゲート成立）", async () => {
    const fulltext = await getAllFulltextNaviEntries();
    const entryByPath = new Map([...LAW_NAVI_ENTRIES, ...fulltext].map((e) => [e.path, e]));

    const res = await GET();
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);

    const leaked: string[] = [];
    for (const loc of locs) {
      const path = loc.replace(SITE_URL, "");
      const entry = entryByPath.get(path);
      // (1) 幽霊URL0: 載る URL は全て生成集合（curated ∪ 全文ギャップ）の実条へ解決する
      expect(entry, `未解決の <loc>: ${loc}`).toBeDefined();
      // (2) 付加価値ゼロの条が載っていたら CI を落とす
      if (entry && !isIndexableLawNaviEntry(entry)) leaked.push(path);
    }
    expect(leaked, `付加価値ゼロなのに収載された条: ${leaked.join(", ")}`).toEqual([]);
  });

  it("収載件数が収載集合（curated収載 ∪ 全文ギャップ収載）と1対1（漏れ・重複なし）", async () => {
    const fulltextIndexable = (await getAllFulltextNaviEntries()).filter(isIndexableLawNaviEntry);
    const expected = [...INDEXABLE_LAW_NAVI_ENTRIES, ...fulltextIndexable];

    const res = await GET();
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const paths = new Set(locs.map((l) => l.replace(SITE_URL, "")));
    expect(paths.size).toBe(locs.length); // 重複なし
    expect(paths.size).toBe(expected.length);
    for (const e of expected) {
      expect(paths.has(e.path), `収載漏れ: ${e.path}`).toBe(true);
    }
  });

  it("既収載 curated 条の後退0: curated 収載集合は全件そのまま収載される（§5-3 末尾）", async () => {
    // FT-D2 で全文ギャップが加わっても、既存 curated 収載は 1 件も落ちない（後退0）。
    const res = await GET();
    const xml = await res.text();
    const paths = new Set(
      [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE_URL, "")),
    );
    for (const e of INDEXABLE_LAW_NAVI_ENTRIES) {
      expect(paths.has(e.path), `curated 収載の後退: ${e.path}`).toBe(true);
    }
  });

  it("全 <loc> が SITE_URL オリジン始まり（S DRY・柱C-3）", async () => {
    const res = await GET();
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const loc of locs) {
      expect(loc.startsWith(`${SITE_URL}/law-navi/`)).toBe(true);
    }
  });

  it("正しい XML（Content-Type application/xml・urlset）を返す", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const xml = await res.text();
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<urlset");
  });
});
