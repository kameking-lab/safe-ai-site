import { describe, expect, it } from "vitest";
import {
  calendarMonthKey,
  countCalendarRemaining,
  pruneDoneMap,
  toggleLabel,
} from "./calendar-progress";

describe("calendar-progress 純関数", () => {
  it("calendarMonthKey は YYYY-MM（月はゼロ詰め）", () => {
    expect(calendarMonthKey(new Date(2026, 5, 11))).toBe("2026-06");
    expect(calendarMonthKey(new Date(2026, 11, 1))).toBe("2026-12");
  });

  it("toggleLabel は追加と解除をトグルし、元配列を変更しない", () => {
    const base = ["全国安全週間の準備"];
    const added = toggleLabel(base, "熱中症対策の開始");
    expect(added).toEqual(["全国安全週間の準備", "熱中症対策の開始"]);
    const removed = toggleLabel(added, "全国安全週間の準備");
    expect(removed).toEqual(["熱中症対策の開始"]);
    expect(base).toEqual(["全国安全週間の準備"]);
  });

  it("countCalendarRemaining は未消し込みの件数（消し込み済みに無関係なラベルがあっても壊れない）", () => {
    const labels = ["a", "b", "c"];
    expect(countCalendarRemaining(labels, [])).toBe(3);
    expect(countCalendarRemaining(labels, ["b", "先月の項目"])).toBe(2);
    expect(countCalendarRemaining(labels, ["a", "b", "c"])).toBe(0);
  });

  it("pruneDoneMap は月キー降順で直近 keep 件だけ残す", () => {
    const map = {
      "2025-06": ["x"],
      "2026-05": ["y"],
      "2026-06": ["z"],
    };
    expect(Object.keys(pruneDoneMap(map, 2)).sort()).toEqual(["2026-05", "2026-06"]);
    // 既定値では12か月分まで保持される
    expect(Object.keys(pruneDoneMap(map)).length).toBe(3);
  });
});
