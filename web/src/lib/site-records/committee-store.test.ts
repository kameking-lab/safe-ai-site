import { describe, it, expect } from "vitest";
import {
  defaultAgenda,
  summarizeMinutes,
  minutesToCsv,
  DEFAULT_AGENDA_TOPICS,
  COMMITTEE_TYPE_JA,
  type CommitteeMinutes,
} from "./committee-store";

function make(): CommitteeMinutes {
  const agenda = defaultAgenda();
  agenda[0]!.discussion = "前回の指摘は是正済み";
  agenda[0]!.decision = "完了。継続監視";
  agenda[1]!.decision = "保護具の再徹底";
  return {
    id: "c1",
    date: "2026-07-15",
    startTime: "15:00",
    place: "本社会議室",
    committeeType: "both",
    chair: "総括安全衛生管理者 佐藤",
    secretary: "安全衛生担当 鈴木",
    attendees: "労使委員 計8名",
    agenda,
    remarks: "次月は熱中症対策を重点",
    nextDate: "2026-08-15",
    savedAt: "2026-07-15T06:00:00.000Z",
  };
}

describe("defaultAgenda", () => {
  it("標準議題を生成（付議事項ベース）", () => {
    const a = defaultAgenda();
    expect(a.length).toBe(DEFAULT_AGENDA_TOPICS.length);
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a[0]!.topic).toContain("前回議事録");
    expect(a.every((x) => x.decision === "")).toBe(true);
  });
});

describe("summarizeMinutes", () => {
  it("議題数と決定済み数を集計", () => {
    const s = summarizeMinutes(make());
    expect(s.agendaCount).toBe(DEFAULT_AGENDA_TOPICS.length);
    expect(s.decidedCount).toBe(2);
    expect(COMMITTEE_TYPE_JA[s.committeeType]).toBe("安全衛生委員会");
  });
});

describe("minutesToCsv", () => {
  it("ヘッダー＋議題行を出力し委員会名を和名化", () => {
    const csv = minutesToCsv(make());
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(DEFAULT_AGENDA_TOPICS.length + 1);
    expect(lines[0]).toContain("決定・措置");
    expect(lines[1]).toContain("安全衛生委員会");
    expect(lines[1]).toContain("前回の指摘は是正済み");
  });
});
