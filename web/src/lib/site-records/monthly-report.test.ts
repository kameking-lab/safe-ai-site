import { describe, it, expect } from "vitest";
import { aggregateMonth, recentMonths, type MonthlyInputs } from "./monthly-report";

const inputs: MonthlyInputs = {
  patrol: [
    { id: "p1", date: "2026-07-03", inspector: "A", area: "x", ngCount: 2, findingCount: 3, openCount: 1, savedAt: "" },
    { id: "p2", date: "2026-06-30", inspector: "A", area: "x", ngCount: 0, findingCount: 0, openCount: 0, savedAt: "" },
  ],
  nearmiss: [
    { id: "n1", date: "2026-07-05", site: "", reporter: "", type: "墜落・転落", location: "", situation: "", cause: "", countermeasure: "", potential: "high", resolved: false, savedAt: "" },
    { id: "n2", date: "2026-07-06", site: "", reporter: "", type: "墜落・転落", location: "", situation: "", cause: "", countermeasure: "", potential: "low", resolved: true, savedAt: "" },
  ],
  inspection: [
    { id: "i1", date: "2026-07-02", site: "", equipKind: "forklift", equipName: "", ngCount: 0, usable: false, savedAt: "" },
  ],
  induction: [
    { id: "ed1", date: "2026-07-01", siteName: "", workerName: "", company: "", doneCount: 5, total: 13, savedAt: "" },
    { id: "ed2", date: "2026-07-10", siteName: "", workerName: "", company: "", doneCount: 13, total: 13, savedAt: "" },
  ],
  committee: [
    { id: "c1", date: "2026-07-15", committeeType: "both", place: "", agendaCount: 8, decidedCount: 3, savedAt: "" },
  ],
  heatlog: [
    { id: "h1", date: "2026-07-03", siteName: "", author: "", entryCount: 2, maxWbgt: 28.5, maxRiskLevel: "warning", savedAt: "" },
    { id: "h2", date: "2026-07-04", siteName: "", author: "", entryCount: 1, maxWbgt: 31.2, maxRiskLevel: "danger", savedAt: "" },
  ],
};

describe("aggregateMonth", () => {
  it("当月(2026-07)のみ集計する", () => {
    const r = aggregateMonth("2026-07", inputs);
    expect(r.patrol).toEqual({ count: 1, findings: 3, open: 1 }); // p2は6月で除外
    expect(r.nearMiss.count).toBe(2);
    expect(r.nearMiss.open).toBe(1);
    expect(r.nearMiss.topType).toBe("墜落・転落");
    expect(r.inspection).toEqual({ count: 1, unusable: 1 });
    expect(r.induction.count).toBe(2);
    expect(r.committee).toEqual({ held: true, count: 1 });
    expect(r.heat.days).toBe(2);
    expect(r.heat.maxWbgt).toBe(31.2);
    expect(r.hasAny).toBe(true);
  });

  it("該当データなしの月は hasAny=false", () => {
    const r = aggregateMonth("2025-01", inputs);
    expect(r.hasAny).toBe(false);
    expect(r.heat.maxWbgt).toBeNull();
    expect(r.nearMiss.topType).toBeNull();
  });
});

describe("recentMonths", () => {
  it("当月から過去n月を年跨ぎ含めて返す", () => {
    expect(recentMonths(2026, 2, 4)).toEqual(["2026-02", "2026-01", "2025-12", "2025-11"]);
  });
});
