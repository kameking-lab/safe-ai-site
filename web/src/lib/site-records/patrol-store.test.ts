import { describe, it, expect } from "vitest";
import {
  defaultPatrolChecks,
  summarizePatrol,
  findingsToCsv,
  isFindingOverdue,
  sortOpenFindings,
  collectOpenFindings,
  countOverdueFindings,
  DEFAULT_PATROL_ITEMS,
  type PatrolRecord,
  type OpenFinding,
} from "./patrol-store";

function make(): PatrolRecord {
  const checks = defaultPatrolChecks();
  checks[0]!.result = "ng";
  checks[1]!.result = "ok";
  return {
    id: "p1",
    date: "2026-07-20",
    time: "10:00",
    inspector: "安全 太郎",
    role: "安全管理者",
    area: "3F 躯体工事",
    checks,
    findings: [
      { id: "f1", location: "3F東側開口部", content: "手すり未設置", severity: "high", owner: "○○班", due: "2026-07-21", resolved: false },
      { id: "f2", location: "2F通路", content: "資材が通路に, 整理要", severity: "low", owner: "△△班", due: "2026-07-20", resolved: true },
    ],
    summary: "開口部養生を最優先で是正",
    savedAt: "2026-07-20T01:00:00.000Z",
  };
}

describe("defaultPatrolChecks", () => {
  it("5大災害＋衛生の標準項目を生成し初期は対象外", () => {
    const c = defaultPatrolChecks();
    expect(c.length).toBe(DEFAULT_PATROL_ITEMS.length);
    expect(c.length).toBeGreaterThanOrEqual(10);
    expect(c.every((x) => x.result === "na")).toBe(true);
  });
});

describe("summarizePatrol", () => {
  it("要改善数・指摘数・未是正数を集計", () => {
    const s = summarizePatrol(make());
    expect(s.ngCount).toBe(1);
    expect(s.findingCount).toBe(2);
    expect(s.openCount).toBe(1); // f1 未是正
  });
});

describe("findingsToCsv", () => {
  it("指摘事項をCSV化し危険度・状態を和名化", () => {
    const csv = findingsToCsv(make());
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3); // header + 2 findings
    expect(lines[0]).toContain("危険度");
    expect(lines[1]).toContain("重大");
    expect(lines[1]).toContain("未是正");
    expect(lines[2]).toContain("是正済");
  });

  it("カンマを含む指摘内容はクォートされる", () => {
    const csv = findingsToCsv(make());
    expect(csv).toContain('"資材が通路に, 整理要"');
  });
});

function rec(id: string, date: string, area: string, findings: PatrolRecord["findings"]): PatrolRecord {
  return { id, date, time: "09:00", inspector: "元請 一郎", role: "統括", area, checks: [], findings, summary: "", savedAt: `${date}T00:00:00.000Z` };
}

describe("isFindingOverdue", () => {
  it("期日が今日より前なら超過", () => {
    expect(isFindingOverdue("2026-06-05", "2026-06-09")).toBe(true);
  });
  it("期日が今日以降なら超過でない", () => {
    expect(isFindingOverdue("2026-06-09", "2026-06-09")).toBe(false);
    expect(isFindingOverdue("2026-06-20", "2026-06-09")).toBe(false);
  });
  it("期日未設定は超過扱いしない", () => {
    expect(isFindingOverdue("", "2026-06-09")).toBe(false);
  });
});

describe("collectOpenFindings", () => {
  const records = [
    rec("pa", "2026-05-28", "A棟3F", [
      { id: "fa1", location: "3F東開口部", content: "手すり未設置", severity: "high", owner: "鳶A", due: "2026-05-30", resolved: false },
      { id: "fa2", location: "2F通路", content: "資材", severity: "low", owner: "土工B", due: "2026-05-29", resolved: true }, // 是正済→除外
    ]),
    rec("pb", "2026-06-03", "A棟4F", [
      { id: "fb1", location: "4F分電盤", content: "アース未接続", severity: "high", owner: "電気C", due: "2026-06-07", resolved: false },
      { id: "fb2", location: "4F西", content: "保護メガネ", severity: "low", owner: "塗装D", due: "2026-06-12", resolved: false },
    ]),
  ];

  it("未是正の指摘だけを全記録から集約する（是正済は除外）", () => {
    const open = collectOpenFindings(records, "2026-06-09");
    expect(open.map((o) => o.id)).toEqual(expect.arrayContaining(["fa1", "fb1", "fb2"]));
    expect(open.some((o) => o.id === "fa2")).toBe(false);
    expect(open).toHaveLength(3);
  });

  it("各指摘に巡視日・範囲・記録IDを付与する", () => {
    const open = collectOpenFindings(records, "2026-06-09");
    const fa1 = open.find((o) => o.id === "fa1")!;
    expect(fa1.recordId).toBe("pa");
    expect(fa1.patrolDate).toBe("2026-05-28");
    expect(fa1.area).toBe("A棟3F");
  });

  it("期日超過→重大→期日昇順で並ぶ（致命の未是正が先頭）", () => {
    const open = collectOpenFindings(records, "2026-06-09");
    // fa1(期日05-30超過)・fb1(期日06-07超過) が先頭、fb2(06-12未超過)が末尾
    expect(open[0]!.id).toBe("fa1"); // 超過かつ期日が最も早い
    expect(open[1]!.id).toBe("fb1"); // 超過
    expect(open[2]!.id).toBe("fb2"); // 未超過
    expect(open[0]!.overdue).toBe(true);
    expect(open[2]!.overdue).toBe(false);
  });

  it("countOverdueFindings が期日超過の未是正数を返す", () => {
    const open = collectOpenFindings(records, "2026-06-09");
    expect(countOverdueFindings(open)).toBe(2);
  });
});

describe("sortOpenFindings", () => {
  it("非破壊（元配列を変更しない）", () => {
    const arr: OpenFinding[] = [
      { id: "x", location: "", content: "", severity: "low", owner: "", due: "2026-06-20", resolved: false, recordId: "r", patrolDate: "2026-06-01", area: "", overdue: false },
      { id: "y", location: "", content: "", severity: "high", owner: "", due: "2026-06-05", resolved: false, recordId: "r", patrolDate: "2026-06-01", area: "", overdue: true },
    ];
    const sorted = sortOpenFindings(arr);
    expect(sorted[0]!.id).toBe("y"); // 超過が先
    expect(arr[0]!.id).toBe("x"); // 元配列は不変
  });
});
