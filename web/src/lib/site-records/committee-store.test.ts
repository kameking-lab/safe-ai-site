import { describe, it, expect } from "vitest";
import {
  defaultAgenda,
  summarizeMinutes,
  minutesToCsv,
  carryOverActionItems,
  carryOverFirstAgendaNote,
  buildCarryOverMinutes,
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

describe("carryOverActionItems", () => {
  it("決定文のある議題だけを宿題として整形（担当・期日も併記）", () => {
    const prev = make();
    prev.agenda[1]!.owner = "工務 佐藤";
    prev.agenda[1]!.due = "2026-08-31";
    const text = carryOverActionItems(prev);
    const lines = text.split("\n");
    expect(lines).toHaveLength(2); // decision の入った2件のみ
    expect(text).toContain("保護具の再徹底");
    expect(text).toContain("担当: 工務 佐藤");
    expect(text).toContain("期日: 2026-08-31");
    expect(text.startsWith("□ ")).toBe(true);
  });
  it("決定が無ければ空文字", () => {
    const prev = make();
    prev.agenda.forEach((a) => (a.decision = ""));
    expect(carryOverActionItems(prev)).toBe("");
  });
});

describe("carryOverFirstAgendaNote", () => {
  it("前回日付・委員会名のヘッダーに宿題を続ける", () => {
    const note = carryOverFirstAgendaNote(make());
    expect(note).toContain("前回（2026-07-15 安全衛生委員会）");
    expect(note).toContain("措置状況を確認");
    expect(note).toContain("保護具の再徹底");
  });
  it("宿題が無ければヘッダーのみ", () => {
    const prev = make();
    prev.agenda.forEach((a) => (a.decision = ""));
    const note = carryOverFirstAgendaNote(prev);
    expect(note).not.toContain("\n");
    expect(note).toContain("措置状況を確認");
  });
});

describe("buildCarryOverMinutes", () => {
  it("毎月不変の項目を引き継ぎ、当月分は白紙化する", () => {
    const prev = make();
    const next = buildCarryOverMinutes(prev, defaultAgenda(), "c2", "2026-08-20");
    // 引き継ぐ
    expect(next.id).toBe("c2");
    expect(next.place).toBe(prev.place);
    expect(next.chair).toBe(prev.chair);
    expect(next.secretary).toBe(prev.secretary);
    expect(next.attendees).toBe(prev.attendees);
    expect(next.committeeType).toBe(prev.committeeType);
    expect(next.startTime).toBe(prev.startTime);
    // 開催日は前回の次回開催予定を採用
    expect(next.date).toBe("2026-08-15");
    // 当月分はクリア
    expect(next.remarks).toBe("");
    expect(next.nextDate).toBe("");
    expect(next.savedAt).toBe("");
  });
  it("冒頭の措置状況議題に前回の決定事項を転記する", () => {
    const prev = make();
    const next = buildCarryOverMinutes(prev, defaultAgenda(), "c3", "2026-08-20");
    const first = next.agenda.find((a) => a.topic.includes("前回議事録"));
    expect(first?.discussion).toContain("保護具の再徹底");
    expect(first?.discussion).toContain("前回（2026-07-15");
    // 議題件数は標準のまま
    expect(next.agenda).toHaveLength(DEFAULT_AGENDA_TOPICS.length);
  });
  it("次回開催予定が無ければ today を開催日に使う", () => {
    const prev = make();
    prev.nextDate = "";
    const next = buildCarryOverMinutes(prev, defaultAgenda(), "c4", "2026-08-20");
    expect(next.date).toBe("2026-08-20");
  });
});
