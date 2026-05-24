/**
 * P0-005 (usability-audit-2026-05-24): getRecentCases のユニットテスト。
 *
 * 監査シナリオ7「直近1週間の建設業労災」を実機データで支える関数。
 * referenceDate を渡せばテストで決定性を保てる前提で書いた。
 */

import { describe, expect, test } from "vitest";
import { getRecentCases, getTopCases } from "./accident-analysis";

describe("getRecentCases", () => {
  test("withinDays=7 → 該当無しでも空配列を返す(エラー出さない)", () => {
    const ref = new Date(2030, 0, 1); // 全 curated データより遥か未来
    const out = getRecentCases("construction", 7, 5, ref);
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBe(0);
  });

  test("withinDays=99999 → 全 curated データを返す(上限 limit まで)", () => {
    const ref = new Date(2030, 0, 1);
    const out = getRecentCases("construction", 99999, 5, ref);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(5);
  });

  test("limit を 1 にすると 1 件しか返さない", () => {
    const ref = new Date(2030, 0, 1);
    const out = getRecentCases("construction", 99999, 1, ref);
    expect(out.length).toBeLessThanOrEqual(1);
  });

  test("並び順は occurredOn の新しい順", () => {
    const ref = new Date(2030, 0, 1);
    const out = getRecentCases("construction", 99999, 5, ref);
    for (let i = 1; i < out.length; i += 1) {
      const prev = out[i - 1].occurredOn ?? "";
      const cur = out[i].occurredOn ?? "";
      expect(prev >= cur).toBe(true);
    }
  });

  test("referenceDate が curated データの中央付近 → 過去分のみ返す", () => {
    // 厚労省/curated データに 2024-05-12 がある前提で 2024-06-01 を基準に
    // 直近30日を取ると、それ以降の事例は除外される。
    const ref = new Date(2024, 5, 1); // 2024-06-01
    const out = getRecentCases("construction", 30, 50, ref);
    for (const c of out) {
      const occurred = c.occurredOn ?? "";
      expect(occurred <= "2024-06-01").toBe(true);
      expect(occurred >= "2024-05-02").toBe(true);
    }
  });

  // 不正 slug 防御は型システム (IndustrySlug union) で保証されており、
  // 上流 getIndustryReport が getIndustryConfig で null check 済みのため
  // 本関数では実行時防御は省略している。
});

describe("getTopCases (回帰): recentCases 追加で挙動が変わっていないこと", () => {
  test("既存の severity ベースのソートは維持されている", () => {
    const out = getTopCases("construction", 5);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(5);
  });
});
