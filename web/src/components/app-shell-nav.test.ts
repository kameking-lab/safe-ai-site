import { describe, it, expect } from "vitest";
import {
  getAppShellNavigationCategories,
  NAV_CATEGORIES,
} from "./app-shell-navigation";
import { getMobilePrimaryItems } from "./MobileBottomNav";
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

  it("PCは単一sidebarで主要routeを覆い、モバイルmenuは固定導線と重複しない", () => {
    const requiredDesktop = [
      "/risk",
      "/chatbot",
      "/chemical-ra",
      "/accident-news",
      "/laws",
      "/ky/paper",
      "/education-certification",
      "/training/visual-ky",
      "/signage",
      "/materials/safety-images",
      "/tools/construction-calculators",
      "/services/automation",
      "/safety-ai",
      "/search",
      "/features",
    ];
    const mobileDate = new Date("2026-08-03T00:00:00+09:00");
    const mobilePrimary = new Set(
      [
        ...getMobilePrimaryItems(mobileDate).map((item) => item.href),
        "/search",
      ],
    );
    const hrefs = (position: "desktop" | "mobile") =>
      getAppShellNavigationCategories(position).flatMap((category) =>
        category.items.map((item) => item.href),
      );
    const desktop = hrefs("desktop");
    expect(desktop).toHaveLength(17);
    expect(new Set(desktop).size).toBe(desktop.length);
    expect(desktop).toEqual(expect.arrayContaining(requiredDesktop));
    expect(
      getAppShellNavigationCategories("mobile", mobileDate)
        .flatMap((category) => category.items.map((item) => item.href))
        .filter((href) => mobilePrimary.has(href)),
    ).toEqual([]);
    expect(hrefs("mobile").length).toBeLessThanOrEqual(11);
  });

  it.each([
    ["summer", new Date("2026-08-03T00:00:00+09:00"), "/risk"],
    [
      "winter",
      new Date("2026-12-03T00:00:00+09:00"),
      "/heat-illness-prevention",
    ],
  ])(
    "%s: critical routes remain reachable and only current bottom items are deduplicated",
    (_season, date, alternateSeasonalHref) => {
      const bottom = getMobilePrimaryItems(date).map((item) => item.href);
      const visiblePrimary = [...bottom, "/search"];
      const drawer = getAppShellNavigationCategories("mobile", date).flatMap(
        (category) => category.items.map((item) => item.href),
      );
      const allReachable = new Set([...bottom, ...drawer]);
      const criticalRoutes = [
        "/risk",
        "/heat-illness-prevention",
        "/chatbot",
        "/chemical-ra",
        "/law-search",
        "/laws",
        "/accident-news",
        "/ky/paper",
        "/signage",
        "/training/visual-ky",
        "/education-certification",
        "/tools/construction-calculators",
        "/services/automation",
        "/safety-ai",
        "/features",
      ];

      expect([...allReachable]).toEqual(expect.arrayContaining(criticalRoutes));
      expect(drawer.filter((href) => visiblePrimary.includes(href))).toEqual(
        [],
      );
      expect(drawer).toContain(alternateSeasonalHref);
    },
  );

  it("モバイルの全機能メニューから化学物質RAへ直接到達できる", () => {
    const mobileHrefs = getAppShellNavigationCategories("mobile").flatMap(
      (category) => category.items.map((item) => item.href),
    );
    expect(mobileHrefs).toContain("/chemical-ra");
    expect(mobileHrefs).not.toContain("/features");
    expect(
      getMobilePrimaryItems(new Date("2026-08-03T00:00:00+09:00")).map(
        (item) => item.href,
      ),
    ).toContain("/features");
  });

  it("PC・モバイルのメニューから安全AIの短いLPへ到達できる", () => {
    for (const position of ["desktop", "mobile"] as const) {
      const hrefs = getAppShellNavigationCategories(position).flatMap(
        (category) => category.items.map((item) => item.href),
      );
      expect(hrefs).toContain("/safety-ai");
    }
  });

  it("PC・モバイルの実務メニューは低リスクの新しい建設計算ツールだけを案内する", () => {
    for (const position of ["desktop", "mobile"] as const) {
      const hrefs = getAppShellNavigationCategories(position).flatMap(
        (category) => category.items.map((item) => item.href),
      );
      expect(hrefs).toContain("/tools/construction-calculators");
      expect(hrefs).not.toContain("/construction-calc");
    }
  });
});
