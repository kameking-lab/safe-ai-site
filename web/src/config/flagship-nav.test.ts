import { describe, it, expect } from "vitest";
import { FLAGSHIP_FEATURES, getFlagshipById } from "./flagship-nav";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";

describe("FLAGSHIP_FEATURES config", () => {
  it("全 feature が必須フィールドと一意なIDを持ち、公開可能な href だけを出す", () => {
    const ids = FLAGSHIP_FEATURES.map((feature) => feature.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const f of FLAGSHIP_FEATURES) {
      expect(f.id, "id").toBeTruthy();
      expect(f.label, `label of ${f.id}`).toBeTruthy();
      expect(f.href, `href of ${f.id}`).toMatch(/^\//);
      expect(
        isPublicRouteAvailable(f.href),
        `${f.id} の main href ${f.href} が隔離対象`,
      ).toBe(true);
      for (const s of f.subItems) {
        expect(s.href, `subItem href under ${f.id}`).toMatch(/^\//);
        expect(
          isPublicRouteAvailable(s.href),
          `${f.id} の subItem ${s.href} が隔離対象`,
        ).toBe(true);
      }
    }
  });

  it("PF-009: 事故 feature はサイト内検索と公式公表事実を分離して案内する", () => {
    const acc = getFlagshipById("accidents");
    expect(acc).toBeDefined();
    const hrefs = (acc?.subItems ?? []).map((s) => s.href);
    expect(acc?.href).toBe("/accident-news");
    expect(hrefs).toEqual(["/accidents", "/accident-news"]);
    expect(hrefs).not.toContain("/accidents-reports");
    expect(hrefs).not.toContain("/accidents-analytics");
    expect(hrefs).toContain("/accidents");
    expect(isPublicRouteAvailable("/accidents")).toBe(true);
    expect(isPublicRouteAvailable("/accidents/example-id")).toBe(false);
  });

  it("事故 feature の表示文言は未検証件数や停止中の分析機能を宣伝しない", () => {
    const acc = getFlagshipById("accidents");
    expect(acc?.label).not.toBe("重大事故ニュース");
    expect(acc?.label).toBe("重大災害情報");
    const copy = [
      acc?.label,
      acc?.cardTitle,
      acc?.cardDescription,
      ...(acc?.subItems.flatMap((item) => [item.label, item.description]) ?? []),
    ].join(" ");
    expect(copy).toContain("出典");
    expect(copy).toContain("公表事実");
    expect(copy).not.toMatch(/約5,000件|統計ダッシュボード|自動分析レポート/);
    expect(copy).toContain("事故DB検索");
  });
});
