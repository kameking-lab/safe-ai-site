import { describe, it, expect } from "vitest";
import {
  countByType,
  openCount,
  nearMissToCsv,
  NEAR_MISS_TYPES,
  type NearMissReport,
} from "./nearmiss-store";

function r(over: Partial<NearMissReport>): NearMissReport {
  return {
    id: Math.random().toString(),
    date: "2026-07-01",
    site: "現場A",
    reporter: "甲",
    type: "墜落・転落",
    location: "3F",
    situation: "脚立がぐらついた",
    cause: "不安定な設置",
    countermeasure: "脚立の点検徹底",
    potential: "high",
    resolved: false,
    savedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

describe("NEAR_MISS_TYPES", () => {
  it("型の選択肢が12種ある", () => {
    expect(NEAR_MISS_TYPES.length).toBe(12);
    expect(NEAR_MISS_TYPES).toContain("はさまれ・巻き込まれ");
  });
});

describe("countByType", () => {
  it("型別件数を多い順に集計", () => {
    const reports = [
      r({ type: "墜落・転落" }),
      r({ type: "墜落・転落" }),
      r({ type: "転倒" }),
    ];
    const c = countByType(reports);
    expect(c[0]).toEqual({ type: "墜落・転落", count: 2 });
    expect(c[1]).toEqual({ type: "転倒", count: 1 });
  });
});

describe("openCount", () => {
  it("未対応(resolved=false)の件数", () => {
    expect(openCount([r({ resolved: false }), r({ resolved: true }), r({ resolved: false })])).toBe(2);
  });
});

describe("nearMissToCsv", () => {
  it("ヘッダー＋行、危険度・状態を和名化", () => {
    const csv = nearMissToCsv([r({ potential: "high", resolved: false }), r({ potential: "low", resolved: true, situation: "段差で,つまずき" })]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("事故の型");
    expect(lines[1]).toContain("重大の可能性");
    expect(lines[1]).toContain("対応中");
    expect(csv).toContain('"段差で,つまずき"');
  });
});
