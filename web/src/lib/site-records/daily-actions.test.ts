import { describe, it, expect } from "vitest";
import {
  buildDailyActions,
  calendarItemsForMonth,
  countBySeverity,
  mergeCheckupTrackerMaps,
  type DailyActionsInput,
} from "./daily-actions";
import { defaultPatrolChecks, type PatrolRecord } from "./patrol-store";
import type { NearMissReport } from "./nearmiss-store";
import type { InspectionSummary } from "./inspection-store";
import type { CommitteeSummary } from "./committee-store";

const TODAY = "2026-06-10";

function emptyInput(): DailyActionsInput {
  return { patrolRecords: [], nearMissReports: [], inspections: [], committees: [], checkupRecords: {} };
}

function patrol(findings: PatrolRecord["findings"]): PatrolRecord {
  return {
    id: "p1",
    date: "2026-06-01",
    time: "10:00",
    inspector: "安全 太郎",
    role: "安全管理者",
    area: "3F 躯体",
    checks: defaultPatrolChecks(),
    findings,
    summary: "",
    savedAt: "2026-06-01T01:00:00.000Z",
  };
}

function nearMiss(over: Partial<NearMissReport>): NearMissReport {
  return {
    id: "n1",
    date: "2026-06-05",
    site: "A棟",
    reporter: "山田",
    type: "墜落・転落",
    location: "2F足場",
    situation: "開口部に近づきヒヤリ",
    cause: "",
    countermeasure: "",
    potential: "high",
    resolved: false,
    savedAt: "2026-06-05T01:00:00.000Z",
    ...over,
  };
}

function inspection(over: Partial<InspectionSummary>): InspectionSummary {
  return {
    id: "i1",
    date: "2026-06-09",
    site: "A棟",
    equipKind: "other",
    equipName: "高速カッター3号",
    ngCount: 1,
    usable: false,
    savedAt: "2026-06-09T01:00:00.000Z",
    ...over,
  } as InspectionSummary;
}

function committee(date: string): CommitteeSummary {
  return { id: `c-${date}`, date, committeeType: "both", place: "会議室", agendaCount: 8, decidedCount: 3, savedAt: `${date}T01:00:00.000Z` };
}

describe("buildDailyActions", () => {
  it("空入力でもカレンダーの今月予定（最大3件）だけはinfoで出る", () => {
    const actions = buildDailyActions(emptyInput(), TODAY);
    expect(actions.every((a) => a.severity === "info" && a.source === "calendar")).toBe(true);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.length).toBeLessThanOrEqual(3);
    expect(actions[0]!.title.startsWith("今月:")).toBe(true);
  });

  it("パトロール期日超過の未是正指摘が最優先（overdue）で先頭に来る", () => {
    const input = emptyInput();
    input.patrolRecords = [
      patrol([
        { id: "f1", location: "3F", content: "手すり未設置", severity: "high", owner: "○○班", due: "2026-06-05", resolved: false },
        { id: "f2", location: "2F", content: "通路に資材", severity: "low", owner: "", due: "2026-06-20", resolved: false },
        { id: "f3", location: "1F", content: "是正済み", severity: "high", owner: "", due: "2026-06-01", resolved: true },
      ]),
    ];
    const actions = buildDailyActions(input, TODAY);
    expect(actions[0]!.severity).toBe("overdue");
    expect(actions[0]!.title).toContain("手すり未設置");
    expect(actions[0]!.due).toBe("2026-06-05");
    // 是正済みは出ない
    expect(actions.some((a) => a.title.includes("是正済み"))).toBe(false);
    // 期日内の未是正は alert
    expect(actions.find((a) => a.title.includes("通路に資材"))!.severity).toBe("alert");
  });

  it("ヒヤリは重大×未対策を個別行・軽微×未対策は1行に集約、対策済みは出ない", () => {
    const input = emptyInput();
    input.nearMissReports = [
      nearMiss({ id: "n1", potential: "high", resolved: false, situation: "開口部でヒヤリ" }),
      nearMiss({ id: "n2", potential: "low", resolved: false }),
      nearMiss({ id: "n3", potential: "low", resolved: false }),
      nearMiss({ id: "n4", potential: "high", resolved: true }),
    ];
    const actions = buildDailyActions(input, TODAY);
    const nm = actions.filter((a) => a.source === "nearmiss");
    expect(nm).toHaveLength(2);
    expect(nm.some((a) => a.title.includes("開口部でヒヤリ"))).toBe(true);
    expect(nm.some((a) => a.title.includes("2件"))).toBe(true);
  });

  it("使用不可の点検記録は機名入りの要対応行になる", () => {
    const input = emptyInput();
    input.inspections = [inspection({}), inspection({ id: "i2", usable: true })];
    const actions = buildDailyActions(input, TODAY);
    const ins = actions.filter((a) => a.source === "inspection");
    expect(ins).toHaveLength(1);
    expect(ins[0]!.title).toContain("高速カッター3号");
    expect(ins[0]!.severity).toBe("alert");
  });

  it("委員会は記録がある事業場でのみ今月未開催を警告し、開催済みなら出さない", () => {
    // 議事録を1件も使っていない → ナグらない
    expect(buildDailyActions(emptyInput(), TODAY).some((a) => a.source === "committee")).toBe(false);
    // 先月までの記録のみ → 今月未開催を警告（実質期限=今月末を期日に持つ）
    const input = emptyInput();
    input.committees = [committee("2026-05-15")];
    const warn = buildDailyActions(input, TODAY).find((a) => a.source === "committee");
    expect(warn).toBeDefined();
    expect(warn!.due).toBe("2026-06-30");
    // 今月開催済み → 出さない
    input.committees = [committee("2026-06-03")];
    expect(buildDailyActions(input, TODAY).some((a) => a.source === "committee")).toBe(false);
  });

  it("健診は期限超過をoverdue・期限間近をalertで昇格し、適正・未知ruleIdは出さない", () => {
    const input = emptyInput();
    input.checkupRecords = {
      "general-periodic": "2025-01-15", // 12ヶ月超過
      "unknown-rule": "2020-01-01", // ルール不在 → 無視
    };
    const actions = buildDailyActions(input, TODAY);
    const hc = actions.filter((a) => a.source === "checkup");
    expect(hc).toHaveLength(1);
    expect(hc[0]!.severity).toBe("overdue");
    expect(hc[0]!.title).toContain("定期健康診断");
    expect(hc[0]!.due).toBe("2026-01-15");

    // 期限間近（2ヶ月前以内）
    input.checkupRecords = { "general-periodic": "2025-07-01" };
    const soon = buildDailyActions(input, TODAY).filter((a) => a.source === "checkup");
    expect(soon).toHaveLength(1);
    expect(soon[0]!.severity).toBe("alert");
    expect(soon[0]!.title).toContain("期限間近");

    // 適正 → 出さない
    input.checkupRecords = { "general-periodic": "2026-05-01" };
    expect(buildDailyActions(input, TODAY).some((a) => a.source === "checkup")).toBe(false);
  });

  it("並びは 期限超過 → 要対応 → 今月の予定、同重大度は期日昇順", () => {
    const input = emptyInput();
    input.patrolRecords = [
      patrol([
        { id: "f1", location: "3F", content: "B", severity: "low", owner: "", due: "2026-06-08", resolved: false },
        { id: "f2", location: "2F", content: "A", severity: "high", owner: "", due: "2026-06-05", resolved: false },
      ]),
    ];
    input.inspections = [inspection({})];
    const actions = buildDailyActions(input, TODAY);
    const ranks = actions.map((a) => (a.severity === "overdue" ? 0 : a.severity === "alert" ? 1 : 2));
    expect([...ranks].sort((x, y) => x - y)).toEqual(ranks);
    // overdue 2件は重大(A)が軽微(B)より先
    expect(actions[0]!.title).toContain("A");
    expect(actions[1]!.title).toContain("B");
  });

  it("同重大度内では危険度高（重大ヒヤリ）が期日付きの軽微指摘より先に来る", () => {
    const input = emptyInput();
    input.patrolRecords = [
      patrol([{ id: "f1", location: "2F", content: "通路に資材", severity: "low", owner: "", due: "2026-06-15", resolved: false }]),
    ];
    input.nearMissReports = [nearMiss({ situation: "転落しかけた" })]; // 重大×未対策・期日なし
    const actions = buildDailyActions(input, TODAY).filter((a) => a.severity === "alert");
    expect(actions[0]!.title).toContain("転落しかけた");
    expect(actions[1]!.title).toContain("通路に資材");
  });
});

describe("mergeCheckupTrackerMaps", () => {
  it("複数プロファイルの同一ruleIdは最新日を採用し、不正値は捨てる", () => {
    const merged = mergeCheckupTrackerMaps([
      { "general-periodic": "2025-04-01", "specific-a": "2026-01-10" },
      { "general-periodic": "2026-02-01" },
      { "specific-a": "" },
    ]);
    expect(merged["general-periodic"]).toBe("2026-02-01");
    expect(merged["specific-a"]).toBe("2026-01-10");
  });
});

describe("calendarItemsForMonth / countBySeverity", () => {
  it("6月の項目を返し、範囲外の月は空", () => {
    expect(calendarItemsForMonth(6).length).toBeGreaterThan(0);
    expect(calendarItemsForMonth(13)).toEqual([]);
  });

  it("重大度別の件数を集計する", () => {
    const input = emptyInput();
    input.inspections = [inspection({})];
    const counts = countBySeverity(buildDailyActions(input, TODAY));
    expect(counts.alert).toBe(1);
    expect(counts.overdue).toBe(0);
    expect(counts.info).toBeGreaterThan(0);
  });
});
