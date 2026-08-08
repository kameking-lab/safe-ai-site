import { describe, expect, it } from "vitest";
import { buildRiskWeatherOutlook, type OutlookAlertLevel } from "./weather-outlook";

const NOW = new Date("2026-07-23T03:00:00.000Z"); // 2026-07-23 JST

function regions(levels: OutlookAlertLevel[][], dates = ["2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26"]) {
  return levels.map((row, index) => ({
    regionLabel: `region-${index + 1}`,
    days: dates.map((date, dayIndex) => ({ date, alertLevel: row[dayIndex] ?? "none" })),
  }));
}

describe("buildRiskWeatherOutlook", () => {
  it("既定でJSTの明日起点から3日分を返し、今日を重複表示しない", () => {
    const result = buildRiskWeatherOutlook(
      regions([["none", "none", "none", "none"]]),
      { now: NOW },
    );
    expect(result).toHaveLength(3);
    expect(result.map((day) => day.date)).toEqual([
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
    ]);
    expect(result[0]).toMatchObject({ offset: 1, dayLabel: "明日", sourceIndex: 1 });
    expect(result[1].dayLabel).toBe("明後日");
    expect(result[2].dayLabel).toBe("2026-07-26");
  });

  it("derives tomorrow from the actual JST date instead of the array index", () => {
    const input = regions([["none", "advisory", "none", "none"]]);
    const result = buildRiskWeatherOutlook(input, { now: NOW });
    expect(result.map((day) => day.date)).toEqual(["2026-07-24", "2026-07-25", "2026-07-26"]);
    expect(result[0]).toMatchObject({ offset: 1, sourceIndex: 1, level: "advisory" });
  });

  it("matches every region by date when source arrays are misaligned", () => {
    const result = buildRiskWeatherOutlook([
      { regionLabel: "A", days: [{ date: "2026-07-24", alertLevel: "warning" }] },
      { regionLabel: "B", days: [{ date: "2026-07-23", alertLevel: "none" }, { date: "2026-07-24", alertLevel: "advisory" }] },
    ], { now: NOW, days: 1 });
    expect(result[0]).toMatchObject({ warningCount: 1, advisoryCount: 1, worstRegions: ["A"] });
  });

  it("does not present a no-threshold result as a safe declaration", () => {
    const result = buildRiskWeatherOutlook(regions([["none", "none", "none", "none"]]), { now: NOW });
    expect(result[0].tone).toBe("neutral");
    expect(result[0].levelLabel).toContain("独自目安");
    expect(result[0].levelLabel).not.toMatch(/安全|良好/);
    expect(result[0]).toMatchObject({
      level: "none",
      warningCount: 0,
      advisoryCount: 0,
      totalRegions: 1,
    });
  });

  it("returns no stale dates when the feed ends before tomorrow", () => {
    const stale = regions([["none", "warning"]], ["2026-07-21", "2026-07-22"]);
    expect(buildRiskWeatherOutlook(stale, { now: NOW })).toEqual([]);
  });

  it("警報相当が複数地域にあればdangerとして全件を数える", () => {
    const result = buildRiskWeatherOutlook(
      [
        {
          regionLabel: "関東",
          days: [{ date: "2026-07-24", alertLevel: "warning" }],
        },
        {
          regionLabel: "近畿",
          days: [{ date: "2026-07-24", alertLevel: "warning" }],
        },
      ],
      { now: NOW, days: 1 },
    );
    expect(result[0]).toMatchObject({
      tone: "danger",
      level: "warning",
      warningCount: 2,
      advisoryCount: 0,
      worstRegions: ["関東", "近畿"],
    });
  });

  it("注意相当だけならwarningのまま警報へ昇格しない", () => {
    const result = buildRiskWeatherOutlook(
      [
        {
          regionLabel: "北海道",
          days: [{ date: "2026-07-24", alertLevel: "advisory" }],
        },
      ],
      { now: NOW, days: 1 },
    );
    expect(result[0]).toMatchObject({
      tone: "warning",
      level: "advisory",
      warningCount: 0,
      advisoryCount: 1,
      worstRegions: ["北海道"],
    });
  });

  it("警戒と注意が混在する日は最悪レベルと両件数を保持する", () => {
    const result = buildRiskWeatherOutlook(
      [
        {
          regionLabel: "A",
          days: [{ date: "2026-07-24", alertLevel: "warning" }],
        },
        {
          regionLabel: "B",
          days: [{ date: "2026-07-24", alertLevel: "advisory" }],
        },
        {
          regionLabel: "C",
          days: [{ date: "2026-07-24", alertLevel: "advisory" }],
        },
      ],
      { now: NOW, days: 1 },
    );
    expect(result[0]).toMatchObject({
      tone: "danger",
      level: "warning",
      warningCount: 1,
      advisoryCount: 2,
      worstRegions: ["A"],
    });
  });

  it("startOffset=0ではJST当日を含められる", () => {
    const result = buildRiskWeatherOutlook(
      regions([["none", "none", "none", "none"]]),
      { now: NOW, startOffset: 0, days: 2 },
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: "2026-07-23",
      offset: 0,
      sourceIndex: 0,
      dayLabel: "今日",
    });
  });

  it("予報日数が不足する場合は利用できる将来日だけを返す", () => {
    const result = buildRiskWeatherOutlook(
      regions([["none", "none"]], ["2026-07-23", "2026-07-24"]),
      { now: NOW },
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ date: "2026-07-24", offset: 1 });
  });

  it("地域配列が空ならクラッシュせず空配列を返す", () => {
    expect(buildRiskWeatherOutlook([], { now: NOW })).toEqual([]);
  });

  it("最悪レベルの地域名だけを保持し、ラベル欠落時は件数へフォールバックする", () => {
    const withLabels = buildRiskWeatherOutlook(
      [
        {
          regionLabel: "四国",
          days: [{ date: "2026-07-24", alertLevel: "warning" }],
        },
        {
          regionLabel: "九州",
          days: [{ date: "2026-07-24", alertLevel: "warning" }],
        },
        {
          regionLabel: "関東",
          days: [{ date: "2026-07-24", alertLevel: "advisory" }],
        },
      ],
      { now: NOW, days: 1 },
    );
    expect(withLabels[0].worstRegions).toEqual(["四国", "九州"]);
    expect(withLabels[0].worstRegions).not.toContain("関東");

    const withoutLabels = buildRiskWeatherOutlook(
      [{ days: [{ date: "2026-07-24", alertLevel: "warning" }] }],
      { now: NOW, days: 1 },
    );
    expect(withoutLabels[0].warningCount).toBe(1);
    expect(withoutLabels[0].worstRegions).toEqual([]);
  });
});
