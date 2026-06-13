import { describe, it, expect } from "vitest";
import { isIsoDate, latestIsoDate } from "./lastmod";

describe("isIsoDate", () => {
  it("YYYY-MM-DD のみ true", () => {
    expect(isIsoDate("2026-06-13")).toBe(true);
    expect(isIsoDate("2026-6-13")).toBe(false);
    expect(isIsoDate("2026/06/13")).toBe(false);
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
    expect(isIsoDate(20260613)).toBe(false);
  });
});

describe("latestIsoDate", () => {
  it("有効な日付の最大値を返す", () => {
    expect(latestIsoDate(["2026-01-01", "2026-06-13", "2026-03-15"], "2000-01-01")).toBe(
      "2026-06-13",
    );
  });

  it("null・空文字・不正値は無視する", () => {
    expect(
      latestIsoDate([null, "", "bad", "2026-05-01", undefined], "2000-01-01"),
    ).toBe("2026-05-01");
  });

  it("有効な候補が一つも無ければ fallback を返す", () => {
    expect(latestIsoDate([null, "", "x"], "2026-04-19")).toBe("2026-04-19");
    expect(latestIsoDate([], "2026-04-19")).toBe("2026-04-19");
  });

  it("cap より未来の日付を除外する（将来施行日が lastmod を未来に飛ばすのを防ぐ）", () => {
    // 2027-04-01 は将来施行の法改正日。ビルド日 2026-06-13 を上限に除外され、
    // 過去側の最大値 2026-06-10 が採られる。
    expect(
      latestIsoDate(["2026-06-10", "2027-04-01", "2026-01-01"], "2000-01-01", "2026-06-13"),
    ).toBe("2026-06-10");
  });

  it("cap 以下の候補が無ければ fallback（cap 超過のみのとき）", () => {
    expect(latestIsoDate(["2030-01-01"], "2026-04-19", "2026-06-13")).toBe("2026-04-19");
  });

  it("cap 当日は含む（境界）", () => {
    expect(latestIsoDate(["2026-06-13"], "2000-01-01", "2026-06-13")).toBe("2026-06-13");
  });
});
