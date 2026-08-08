import { describe, expect, it } from "vitest";
import {
  PRACTICAL_ASSET_CATEGORIES,
  PRACTICAL_SAFETY_ASSETS,
} from "./practical-safety-assets";

describe("practical safety asset registry", () => {
  it("優先実務資産を重複なく既存の正規HTMLへ案内する", () => {
    expect(PRACTICAL_SAFETY_ASSETS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(PRACTICAL_SAFETY_ASSETS.map((item) => item.id)).size).toBe(
      PRACTICAL_SAFETY_ASSETS.length,
    );

    for (const item of PRACTICAL_SAFETY_ASSETS) {
      expect(item.href).toMatch(/^\/(?!\/)/);
      expect(item.href).not.toMatch(/\.(pdf|docx?|xlsx?)$/i);
      expect(item.audience.length).toBeGreaterThan(0);
      expect(item.duration.length).toBeGreaterThan(0);
      expect(item.purpose.length).toBeGreaterThan(0);
      expect(item.scope.length).toBeGreaterThan(0);
      expect(item.limitations.length).toBeGreaterThan(0);
      expect(item.sourceStatus).toContain("一次資料");
      expect(item.registryReviewScope).not.toMatch(/本文|法令内容|監修済み/);
    }
  });

  it("未整備をavailableと偽らず、各カテゴリを収録する", () => {
    const categories = new Set(PRACTICAL_SAFETY_ASSETS.map((item) => item.category));
    for (const category of PRACTICAL_ASSET_CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }

    expect(
      PRACTICAL_SAFETY_ASSETS.some((item) =>
        Object.values(item.support).includes("not-available"),
      ),
    ).toBe(true);
  });

  it("外国人労働者向け資産だけが、やさしい日本語を提供中と明示する", () => {
    const available = PRACTICAL_SAFETY_ASSETS.filter(
      (item) => item.support.easyJapanese === "available",
    );
    expect(available.map((item) => item.id)).toEqual(["foreign-workers"]);
  });
});
