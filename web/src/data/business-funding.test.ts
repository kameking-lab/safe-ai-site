import { describe, expect, it } from "vitest";
import { FUNDING_SCHEMES, fundingDeadlineText } from "./business-funding";

describe("公式確認済みの企業向け制度", () => {
  it.each([
    ["labor-saving", "2026-10-16T16:59:59+09:00", "2026-10-16T17:00:00+09:00"],
    ["digital-ai", "2026-10-30T16:59:59+09:00", "2026-10-30T17:00:00+09:00"],
    ["workplace-improvement", "2026-11-30T23:59:59+09:00", "2026-12-01T00:00:00+09:00"],
    ["reskilling", "2027-03-31T23:59:59+09:00", "2027-04-01T00:00:00+09:00"],
  ])("%sはJSTの期限と同時に終了表示へ切り替わる", (id, before, after) => {
    const scheme = FUNDING_SCHEMES.find((item) => item.id === id)!;
    expect(fundingDeadlineText(scheme, new Date(before))).toBe(scheme.deadline);
    expect(fundingDeadlineText(scheme, new Date(after))).toContain("終了しています");
    expect(fundingDeadlineText(scheme, new Date(after))).toContain("次回・継続の有無は公式で確認");
  });

  it("時計未確認時や地域別期限を全国の受付中と断定しない", () => {
    for (const scheme of FUNDING_SCHEMES)
      expect(fundingDeadlineText(scheme)).not.toMatch(/募集中|現在受付中/);
    const workplace = FUNDING_SCHEMES.find((item) => item.id === "workplace-improvement")!;
    expect(workplace.deadline).toContain("早い方");
    expect(workplace.deadline).toContain("既に終了");
    expect(workplace.excluded).toContain("9月30日");
  });

  it("訓練と設備、建設の法定教育、登録ツールと受託開発を区別する", () => {
    const byId = Object.fromEntries(FUNDING_SCHEMES.map((item) => [item.id, item]));
    expect(byId.reskilling!.excluded).toContain("10時間要件");
    expect(byId.reskilling!.excluded).toContain("法定の特別教育");
    expect(byId["construction-training"]!.conditions.join(" ")).toContain("所定の法定教育も対象");
    expect(byId["construction-training"]!.company).toContain("一人親方は対象外");
    expect(byId["digital-ai"]!.excluded).toContain("スクラッチ開発");
    expect(byId["digital-ai"]!.conditions.join(" ")).toContain("登録は確認できていません");
  });

  it("すべての制度に個別の一次情報と事前手続きがある", () => {
    expect(FUNDING_SCHEMES).toHaveLength(5);
    for (const scheme of FUNDING_SCHEMES) {
      expect(scheme.preparation.length).toBeGreaterThan(10);
      expect(scheme.sources.length).toBeGreaterThan(0);
      for (const source of scheme.sources)
        expect(new URL(source.url).hostname).toMatch(/(^|\.)(mhlw\.go\.jp|smrj\.go\.jp)$/);
    }
  });
});
