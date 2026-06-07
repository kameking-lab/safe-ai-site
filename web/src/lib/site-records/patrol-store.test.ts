import { describe, it, expect } from "vitest";
import {
  defaultPatrolChecks,
  summarizePatrol,
  findingsToCsv,
  DEFAULT_PATROL_ITEMS,
  type PatrolRecord,
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
