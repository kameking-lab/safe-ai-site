import { describe, it, expect } from "vitest";
import {
  countByType,
  openCount,
  openHighCount,
  priorityRank,
  sortByPriority,
  filterOpenOnly,
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

describe("openHighCount", () => {
  it("未対策×重大 のみ数える", () => {
    const reports = [
      r({ resolved: false, potential: "high" }),
      r({ resolved: false, potential: "low" }),
      r({ resolved: true, potential: "high" }),
      r({ resolved: false, potential: "high" }),
    ];
    expect(openHighCount(reports)).toBe(2);
  });
});

describe("priorityRank", () => {
  it("未対策×重大=0 が最優先、対策済×軽微=3 が最後", () => {
    expect(priorityRank(r({ resolved: false, potential: "high" }))).toBe(0);
    expect(priorityRank(r({ resolved: false, potential: "low" }))).toBe(1);
    expect(priorityRank(r({ resolved: true, potential: "high" }))).toBe(2);
    expect(priorityRank(r({ resolved: true, potential: "low" }))).toBe(3);
  });
});

describe("sortByPriority", () => {
  it("未対策×重大を先頭に、同ランクは日付の新しい順、元配列は不変", () => {
    const input = [
      r({ id: "a", date: "2026-06-08", resolved: true, potential: "low" }),
      r({ id: "b", date: "2026-05-28", resolved: false, potential: "high" }),
      r({ id: "c", date: "2026-06-06", resolved: false, potential: "high" }),
      r({ id: "d", date: "2026-06-07", resolved: true, potential: "low" }),
    ];
    const sorted = sortByPriority(input);
    // 重大×未対策が日付の新しい順で先頭2件
    expect(sorted.map((x) => x.id)).toEqual(["c", "b", "a", "d"]);
    // 元配列は破壊しない
    expect(input.map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("filterOpenOnly", () => {
  it("openOnly=true で未対策のみ、false で全件（コピー）", () => {
    const reports = [r({ resolved: false }), r({ resolved: true }), r({ resolved: false })];
    expect(filterOpenOnly(reports, true)).toHaveLength(2);
    const all = filterOpenOnly(reports, false);
    expect(all).toHaveLength(3);
    expect(all).not.toBe(reports);
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
