import { describe, it, expect } from "vitest";
import { computeFitScale } from "@/lib/signage/use-fit-to-screen";

describe("P0-1 サイネージ fit-to-screen scale計算", () => {
  it("コンテンツが領域より高い場合は縮小（高さ基準）", () => {
    // 1920x1080領域に 1920x2427 のコンテンツ → 1080/2427≈0.445
    const s = computeFitScale({ contentW: 1920, contentH: 2427, availW: 1920, availH: 1080 });
    expect(s).toBeCloseTo(1080 / 2427, 3);
  });

  it("横長で幅が制約になる場合は幅基準", () => {
    const s = computeFitScale({ contentW: 3000, contentH: 1000, availW: 1500, availH: 1000 });
    expect(s).toBeCloseTo(0.5, 3);
  });

  it("コンテンツが小さい大画面では拡大（max上限まで）", () => {
    const s = computeFitScale({ contentW: 1000, contentH: 800, availW: 3840, availH: 2160, max: 2 });
    // min(3.84, 2.7)=2.7 だが max=2 で頭打ち
    expect(s).toBe(2);
  });

  it("下限 min を下回らない", () => {
    const s = computeFitScale({ contentW: 1000, contentH: 10000, availW: 375, availH: 600, min: 0.3 });
    expect(s).toBe(0.3);
  });

  it("不正値は1を返す（安全側）", () => {
    expect(computeFitScale({ contentW: 0, contentH: 100, availW: 100, availH: 100 })).toBe(1);
    expect(computeFitScale({ contentW: 100, contentH: 100, availW: 0, availH: 100 })).toBe(1);
  });

  it("ちょうど収まる場合は1付近", () => {
    const s = computeFitScale({ contentW: 1080, contentH: 1900, availW: 1080, availH: 1920 });
    expect(s).toBeGreaterThanOrEqual(1);
  });
});
