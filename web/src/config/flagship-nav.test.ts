import { describe, it, expect } from "vitest";
import { FLAGSHIP_FEATURES, getFlagshipById } from "./flagship-nav";

describe("FLAGSHIP_FEATURES config", () => {
  it("全 feature が必須フィールドを持ち href が空でない", () => {
    for (const f of FLAGSHIP_FEATURES) {
      expect(f.id, "id").toBeTruthy();
      expect(f.label, `label of ${f.id}`).toBeTruthy();
      expect(f.href, `href of ${f.id}`).toMatch(/^\//);
      for (const s of f.subItems) {
        expect(s.href, `subItem href under ${f.id}`).toMatch(/^\//);
      }
    }
  });

  it("事故 feature が4つの事故系ツール全てへ導線を持つ（命名と到達性の整合）", () => {
    const acc = getFlagshipById("accidents");
    expect(acc).toBeDefined();
    const hrefs = (acc?.subItems ?? []).map((s) => s.href);
    expect(hrefs).toContain("/accidents");
    expect(hrefs).toContain("/accidents-reports");
    expect(hrefs).toContain("/accidents-analytics");
    // exp-03: 以前は欠落していた重大災害事例(/accident-news)を主要機能ナビに追加済みであること
    expect(hrefs).toContain("/accident-news");
  });

  it("事故 feature のラベルが実体(事故DB)と矛盾しない（旧『重大事故ニュース』へ戻らない）", () => {
    const acc = getFlagshipById("accidents");
    expect(acc?.label).not.toBe("重大事故ニュース");
    expect(acc?.label).toContain("事故");
  });
});
