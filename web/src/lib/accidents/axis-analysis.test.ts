import { describe, expect, it } from "vitest";
import { computeWeekdayDistribution, AXIS_AVAILABILITY } from "@/lib/accidents/axis-analysis";
import type { AccidentCase } from "@/lib/types/domain";

const mk = (id: string, occurredOn: string): AccidentCase => ({
  id, title: id, occurredOn,
  type: "転倒" as AccidentCase["type"],
  workCategory: "建設業" as AccidentCase["workCategory"],
  severity: "重傷", summary: "", mainCauses: [], preventionPoints: [],
});

describe("computeWeekdayDistribution", () => {
  it("曜日別に集計（2026-05-01は金曜）", () => {
    const r = computeWeekdayDistribution([mk("a", "2026-05-01"), mk("b", "2026-05-01"), mk("c", "2026-05-04")]);
    expect(r.total).toBe(3);
    expect(r.buckets[5].label).toBe("金");
    expect(r.buckets[5].count).toBe(2); // 5/1金 ×2
    expect(r.buckets[1].count).toBe(1); // 5/4月 ×1
  });

  it("不正日付は除外", () => {
    const r = computeWeekdayDistribution([mk("x", "invalid")]);
    expect(r.total).toBe(0);
  });

  it("7曜日すべてのバケット", () => {
    expect(computeWeekdayDistribution([]).buckets).toHaveLength(7);
  });
});

describe("AXIS_AVAILABILITY", () => {
  it("曜日のみ集計可、時間帯・経験年数は未集計（創作回避）", () => {
    const m = Object.fromEntries(AXIS_AVAILABILITY.map((a) => [a.key, a.available]));
    expect(m.weekday).toBe(true);
    expect(m.timeofday).toBe(false);
    expect(m.experience).toBe(false);
  });
});
