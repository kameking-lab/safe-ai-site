import { describe, it, expect } from "vitest";
import {
  summarizeIncident,
  incidentToCsv,
  FORM_TYPE_JA,
  SITUATION_HINTS,
  type IncidentReport,
} from "./incident-report-store";

function make(over: Partial<IncidentReport> = {}): IncidentReport {
  return {
    id: "r1",
    createdDate: "2026-07-10",
    formType: "23",
    bizType: "建設業",
    siteName: "○○新築工事",
    siteAddress: "○○市",
    workerCount: "25",
    victimName: "被災 太郎",
    victimSexAge: "男・34",
    victimJob: "鉄筋工",
    victimExperience: "5年",
    occurredAt: "2026-07-09 10:30",
    place: "3F 開口部",
    injuryName: "右足首骨折",
    absenceDays: "30",
    situation: "3F開口部の養生不備により転落",
    note: "",
    savedAt: "2026-07-10T00:00:00.000Z",
    ...over,
  };
}

describe("summarizeIncident / FORM_TYPE_JA", () => {
  it("サマリーに主要項目が入り、様式名が和名化", () => {
    const s = summarizeIncident(make());
    expect(s.victimName).toBe("被災 太郎");
    expect(FORM_TYPE_JA[s.formType]).toContain("様式第23号");
  });
});

describe("SITUATION_HINTS", () => {
  it("災害発生状況の観点が5つ", () => {
    expect(SITUATION_HINTS).toHaveLength(5);
    expect(SITUATION_HINTS[0]).toContain("どのような場所");
  });
});

describe("incidentToCsv", () => {
  it("ヘッダー＋1行、カンマはクォート", () => {
    const csv = incidentToCsv(make({ situation: "場所A, 作業B中に転落" }));
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("災害発生状況");
    expect(csv).toContain('"場所A, 作業B中に転落"');
  });
});
