import { describe, it, expect } from "vitest";
import { formatRelativeTimeJa, isDataTimeStale } from "./relative-time";

const NOW = new Date("2026-07-03T12:00:00+09:00").getTime();
const minutesAgoIso = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe("formatRelativeTimeJa", () => {
  it("1分未満は「たった今」", () => {
    expect(formatRelativeTimeJa(minutesAgoIso(0), NOW)).toBe("たった今");
  });

  it("分単位（1〜59分）", () => {
    expect(formatRelativeTimeJa(minutesAgoIso(5), NOW)).toBe("5分前");
    expect(formatRelativeTimeJa(minutesAgoIso(59), NOW)).toBe("59分前");
  });

  it("時間単位（端数分あり/なし）", () => {
    expect(formatRelativeTimeJa(minutesAgoIso(65), NOW)).toBe("1時間5分前");
    expect(formatRelativeTimeJa(minutesAgoIso(120), NOW)).toBe("2時間前");
  });

  it("24時間以上は日単位", () => {
    expect(formatRelativeTimeJa(minutesAgoIso(60 * 30), NOW)).toBe("1日前");
    expect(formatRelativeTimeJa(minutesAgoIso(60 * 24 * 5), NOW)).toBe("5日前");
  });

  it("未来の時刻・パース不能な文字列は安全側の文言を返す", () => {
    expect(formatRelativeTimeJa(new Date(NOW + 60_000).toISOString(), NOW)).toBe("たった今");
    expect(formatRelativeTimeJa("not-a-date", NOW)).toBe("時刻不明");
  });
});

describe("isDataTimeStale", () => {
  it("2時間以内は stale ではない", () => {
    expect(isDataTimeStale(minutesAgoIso(119), NOW)).toBe(false);
  });

  it("2時間超は stale", () => {
    expect(isDataTimeStale(minutesAgoIso(121), NOW)).toBe(true);
  });

  it("しきい値を明示指定できる", () => {
    expect(isDataTimeStale(minutesAgoIso(30), NOW, 0.25)).toBe(true);
  });

  it("パース不能な時刻は stale 扱い（監視を沈黙させない）", () => {
    expect(isDataTimeStale("garbage", NOW)).toBe(true);
  });
});
