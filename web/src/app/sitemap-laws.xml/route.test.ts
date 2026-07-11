import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { SITE_URL } from "@/lib/seo-metadata";
import { LAW_NAVI_ENTRIES } from "@/lib/law-navi/permalink";
import {
  INDEXABLE_LAW_NAVI_ENTRIES,
  isIndexableLawNaviEntry,
} from "@/lib/law-navi/seo-gate";

/**
 * FT-D3 SEO ゲート（設計書 §5-3）の XML 層機械固定。
 *
 * 「付加価値ゼロのページが sitemap-laws.xml に載ったら CI が落ちる」を出力の実 XML で固定する。
 * seo-gate.test.ts が判定ロジックそのものを固定するのに対し、本テストは sitemap-laws.xml/route.ts
 * が確かに INDEXABLE_LAW_NAVI_ENTRIES を正本にしていること（生ミラー条を出力に漏らさないこと）を守る。
 */
describe("sitemap-laws.xml（FT-D3 SEO ゲート: 付加価値条件を満たす条のみ収載）", () => {
  const entryByPath = new Map(LAW_NAVI_ENTRIES.map((e) => [e.path, e]));

  it("全 <loc> が付加価値条件を満たす条へ解決する（生ミラー条の漏れ0＝ゲート成立）", async () => {
    const res = await GET();
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);

    const leaked: string[] = [];
    for (const loc of locs) {
      const path = loc.replace(SITE_URL, "");
      const entry = entryByPath.get(path);
      // (1) 幽霊URL0: 載る URL は全て生成集合の実条へ解決する
      expect(entry, `未解決の <loc>: ${loc}`).toBeDefined();
      // (2) 付加価値ゼロの条が載っていたら CI を落とす
      if (entry && !isIndexableLawNaviEntry(entry)) leaked.push(path);
    }
    expect(leaked, `付加価値ゼロなのに収載された条: ${leaked.join(", ")}`).toEqual([]);
  });

  it("収載件数が収載集合 INDEXABLE_LAW_NAVI_ENTRIES と1対1（漏れ・重複なし）", async () => {
    const res = await GET();
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const paths = new Set(locs.map((l) => l.replace(SITE_URL, "")));
    expect(paths.size).toBe(locs.length); // 重複なし
    expect(paths.size).toBe(INDEXABLE_LAW_NAVI_ENTRIES.length);
    for (const e of INDEXABLE_LAW_NAVI_ENTRIES) {
      expect(paths.has(e.path), `収載漏れ: ${e.path}`).toBe(true);
    }
  });

  it("既収載 curated 条の後退0: 現状の生成集合は全件収載される（§5-3 末尾）", async () => {
    // 現状 LAW_NAVI_ENTRIES は全て curated 由来のため、収載件数は生成集合と一致するはず。
    // 全文由来のみの生ミラー条が将来流入したときに限りここが差分を持つ。
    const res = await GET();
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
    expect(locs.length).toBe(LAW_NAVI_ENTRIES.length);
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
