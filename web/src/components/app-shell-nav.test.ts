import { describe, it, expect } from "vitest";
import { NAV_CATEGORIES } from "./app-shell";
import { FLAGSHIP_FEATURES } from "@/config/flagship-nav";

// exp-06 (autonomous-loop 2026-05-30): exp-04/05 で確立した IA 不変条件の回帰ガード。
// サイドバー(NAV_CATEGORIES)が全 flagship 機能を被覆し、ペルソナ群を備えることを保証する。

function sidebarHrefs(): Set<string> {
  return new Set(NAV_CATEGORIES.flatMap((c) => c.items.map((i) => i.href)));
}

describe("サイドバーナビ(NAV_CATEGORIES)のIA不変条件", () => {
  it("全 flagship トップレベル機能がサイドバーから到達可（被覆ギャップ無し）", () => {
    const hrefs = sidebarHrefs();
    const missing = FLAGSHIP_FEATURES.map((f) => f.href).filter((h) => !hrefs.has(h));
    expect(missing, `サイドバー未収録の flagship 機能: ${missing.join(", ")}`).toEqual([]);
  });

  it("「立場から探す」カテゴリが4立場(/for/*)を備える", () => {
    const persona = NAV_CATEGORIES.find((c) => c.label === "立場から探す");
    expect(persona, "「立場から探す」カテゴリが存在しない").toBeDefined();
    const hrefs = (persona?.items ?? []).map((i) => i.href);
    expect(hrefs).toContain("/for/construction");
    expect(hrefs).toContain("/for/solo");
    expect(hrefs).toContain("/for/manager");
    expect(hrefs).toContain("/for/consultant");
  });

  it("全ナビ項目の href が絶対パスで重複 id が無い", () => {
    const ids = NAV_CATEGORIES.flatMap((c) => c.items.map((i) => i.id));
    expect(new Set(ids).size, "重複した nav id がある").toBe(ids.length);
    for (const c of NAV_CATEGORIES) {
      for (const i of c.items) {
        expect(i.href, `href of ${i.id}`).toMatch(/^\//);
      }
    }
  });
});
