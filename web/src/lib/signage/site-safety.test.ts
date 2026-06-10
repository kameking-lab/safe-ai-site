import { describe, expect, it } from "vitest";
import type { DailyAction } from "@/lib/site-records/daily-actions";
import { selectSignageSiteSafety } from "./site-safety";

function action(partial: Partial<DailyAction> & Pick<DailyAction, "id" | "source" | "severity">): DailyAction {
  return {
    sourceLabel: "テスト",
    title: `タイトル ${partial.id}`,
    href: "/site-records",
    ...partial,
  };
}

describe("selectSignageSiteSafety", () => {
  it("現場レベルのソース（patrol/nearmiss/inspection/committee）のみ残す", () => {
    const all: DailyAction[] = [
      action({ id: "a", source: "patrol", severity: "overdue" }),
      action({ id: "b", source: "checkup", severity: "overdue" }),
      action({ id: "c", source: "nearmiss", severity: "alert" }),
      action({ id: "d", source: "inspection", severity: "alert" }),
      action({ id: "e", source: "committee", severity: "alert" }),
      action({ id: "f", source: "calendar", severity: "info" }),
    ];
    const result = selectSignageSiteSafety(all);
    expect(result.actions.map((a) => a.id)).toEqual(["a", "c", "d", "e"]);
  });

  it("健診（個人の健康情報）はサイネージに掲示しない", () => {
    const all: DailyAction[] = [
      action({ id: "hc", source: "checkup", severity: "overdue", title: "健診の期限超過: 雇入時健診" }),
    ];
    expect(selectSignageSiteSafety(all).actions).toEqual([]);
  });

  it("info（カレンダー参考情報）は要対応でないため除外する", () => {
    const all: DailyAction[] = [
      action({ id: "cal", source: "calendar", severity: "info" }),
      action({ id: "p", source: "patrol", severity: "alert" }),
    ];
    expect(selectSignageSiteSafety(all).actions.map((a) => a.id)).toEqual(["p"]);
  });

  it("buildDailyActions の並び順を変えない", () => {
    const all: DailyAction[] = [
      action({ id: "1", source: "patrol", severity: "overdue", hazardHigh: true }),
      action({ id: "2", source: "nearmiss", severity: "alert", hazardHigh: true }),
      action({ id: "3", source: "inspection", severity: "alert" }),
      action({ id: "4", source: "committee", severity: "alert", due: "2026-06-30" }),
    ];
    expect(selectSignageSiteSafety(all).actions.map((a) => a.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("overdue / alert を数える", () => {
    const all: DailyAction[] = [
      action({ id: "1", source: "patrol", severity: "overdue" }),
      action({ id: "2", source: "patrol", severity: "overdue" }),
      action({ id: "3", source: "nearmiss", severity: "alert" }),
    ];
    const result = selectSignageSiteSafety(all);
    expect(result.overdueCount).toBe(2);
    expect(result.alertCount).toBe(1);
  });

  it("空入力では空サマリ", () => {
    const result = selectSignageSiteSafety([]);
    expect(result.actions).toEqual([]);
    expect(result.overdueCount).toBe(0);
    expect(result.alertCount).toBe(0);
  });
});
