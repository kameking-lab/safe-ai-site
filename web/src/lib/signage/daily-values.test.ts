import { describe, expect, it } from "vitest";
import {
  DAILY_SLOGANS,
  computeSignageWbgt,
  noAccidentDays,
  pickDailySlogan,
  todayIsoLocal,
} from "@/lib/signage/daily-values";

describe("todayIsoLocal", () => {
  it("yyyy-mm-dd 形式を返す", () => {
    expect(todayIsoLocal(new Date(2026, 6, 3, 15, 0, 0))).toBe("2026-07-03");
  });

  it("月・日を2桁ゼロ埋めする", () => {
    expect(todayIsoLocal(new Date(2026, 0, 5, 0, 0, 0))).toBe("2026-01-05");
  });
});

describe("noAccidentDays", () => {
  it("起点日=今日なら1日目を返す", () => {
    const now = new Date(2026, 6, 3, 9, 0, 0);
    expect(noAccidentDays("2026-07-03", now)).toBe(1);
  });

  it("起点日から10日後なら11を返す（起点日を1日目とする）", () => {
    const now = new Date(2026, 6, 13, 9, 0, 0);
    expect(noAccidentDays("2026-07-03", now)).toBe(11);
  });

  it("不正な日付文字列は null を返す（捏造防止）", () => {
    const now = new Date(2026, 6, 3, 9, 0, 0);
    expect(noAccidentDays("not-a-date", now)).toBeNull();
  });

  it("未来日を起点にした場合は0を返す（マイナス日数を出さない）", () => {
    const now = new Date(2026, 6, 3, 9, 0, 0);
    expect(noAccidentDays("2026-08-01", now)).toBe(0);
  });
});

describe("pickDailySlogan", () => {
  it("DAILY_SLOGANS のいずれかを返す", () => {
    const slogan = pickDailySlogan(new Date(2026, 6, 3));
    expect(DAILY_SLOGANS).toContain(slogan);
  });

  it("同じ日付は常に同じスローガンを返す（決定論的）", () => {
    const a = pickDailySlogan(new Date(2026, 6, 3, 8, 0, 0));
    const b = pickDailySlogan(new Date(2026, 6, 3, 20, 0, 0));
    expect(a).toBe(b);
  });

  it("日付が変われば翌日は内容が変わる", () => {
    const day1 = pickDailySlogan(new Date(2026, 6, 3));
    const day2 = pickDailySlogan(new Date(2026, 6, 4));
    expect(day1).not.toBe(day2);
  });
});

describe("computeSignageWbgt", () => {
  it("湿度が未取得(undefined)なら null を返す（捏造防止）", () => {
    expect(computeSignageWbgt(30, undefined)).toBeNull();
  });

  it("気温・湿度からWBGTとリスク評価を返す", () => {
    const reading = computeSignageWbgt(33, 70);
    expect(reading).not.toBeNull();
    expect(reading!.wbgt).toBeGreaterThan(20);
    expect(reading!.risk.level).toBeDefined();
  });

  it("高温高湿では危険寄りのリスクレベルになる", () => {
    const reading = computeSignageWbgt(38, 80);
    expect(["warning", "severe-warning", "danger"]).toContain(reading!.risk.level);
  });

  it("涼しい気温では安全寄りのリスクレベルになる", () => {
    const reading = computeSignageWbgt(10, 40);
    expect(reading!.risk.level).toBe("safe");
  });
});
