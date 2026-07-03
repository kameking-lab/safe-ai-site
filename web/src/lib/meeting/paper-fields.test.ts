import { describe, expect, it } from "vitest";
import { normalizeMeetingRecord } from "@/lib/meeting/schema";
import {
  MEETING_PAPER_FIELDS,
  MEETING_PAPER_FIELD_ORDER,
  emptyMeetingPaperFieldKeys,
  firstEmptyMeetingPaperFieldKey,
  isMeetingPaperFieldKey,
  getMeetingPaperFieldDef,
  nextMeetingPaperFieldKey,
  type MeetingPaperFieldKey,
} from "./paper-fields";

describe("S1（第一弾・第二弾）: 打合せ用紙フィールドマップ", () => {
  it("13の静的欄が定義され、記入順が一筆書きになっている（循環なし・最後は次欄なし）", () => {
    expect(MEETING_PAPER_FIELD_ORDER).toHaveLength(13);
    const visited: string[] = [];
    let key: MeetingPaperFieldKey | undefined = "meetingDate";
    while (key) {
      expect(visited).not.toContain(key);
      visited.push(key);
      key = nextMeetingPaperFieldKey(key);
    }
    expect(visited).toEqual([...MEETING_PAPER_FIELD_ORDER]);
  });

  it("isMeetingPaperFieldKey / getMeetingPaperFieldDef が静的欄を解決する", () => {
    expect(isMeetingPaperFieldKey("siteName")).toBe(true);
    expect(isMeetingPaperFieldKey("bogus")).toBe(false);
    expect(getMeetingPaperFieldDef("siteName").label).toBe("作業所名");
  });

  it("get/set は record を直接書き換えず新しいオブジェクトを返す（イミュータブル）", () => {
    const record = normalizeMeetingRecord({ siteName: "現場A" });
    const def = MEETING_PAPER_FIELDS.siteName;
    const patch = def.set!(record, "現場B");
    expect(patch).toEqual({ siteName: "現場B" });
    expect(record.siteName).toBe("現場A");
  });

  it("全欄未記入なら最初の欄(meetingDate)がfirstEmptyになり、埋まると次へ進む", () => {
    const record = normalizeMeetingRecord({
      meetingDate: "",
      workDateYear: "",
      workDateMonth: "",
      workDateDay: "",
      weather: "",
      temperature: "",
      siteName: "",
      siteManager: "",
      supervisor: "",
      author: "",
    });
    expect(firstEmptyMeetingPaperFieldKey(record)).toBe("meetingDate");
    const filled = { ...record, meetingDate: "2026-07-03", workDateYear: "2026", workDateMonth: "7", workDateDay: "4", weather: "晴れ" };
    expect(firstEmptyMeetingPaperFieldKey(filled)).toBe("siteName");
  });

  it("ヘッダー7欄のみ記入済みなら firstEmpty は次段の安全大会(safetyMeeting)に進む（全13欄は未完）", () => {
    const record = normalizeMeetingRecord({
      meetingDate: "2026-07-03",
      workDateYear: "2026",
      workDateMonth: "7",
      workDateDay: "4",
      weather: "晴れ",
      temperature: "28",
      siteName: "現場A",
      siteManager: "所長",
      supervisor: "主任",
      author: "担当",
    });
    expect(firstEmptyMeetingPaperFieldKey(record)).toBe("safetyMeeting");
    expect(emptyMeetingPaperFieldKeys(record).size).toBe(6);
  });

  it("emptyMeetingPaperFieldKeys は未記入欄のみを集める", () => {
    const record = normalizeMeetingRecord({
      meetingDate: "2026-07-03",
      workDateYear: "2026",
      workDateMonth: "7",
      workDateDay: "4",
      weather: "",
      temperature: "",
      siteName: "現場A",
      siteManager: "",
      supervisor: "",
      author: "",
    });
    const empty = emptyMeetingPaperFieldKeys(record);
    expect(empty.has("weatherTemp")).toBe(true);
    expect(empty.has("siteManager")).toBe(true);
    expect(empty.has("siteName")).toBe(false);
    expect(empty.has("meetingDate")).toBe(false);
  });
});

describe("S1（第二弾）: 明日のイベント5欄＋統括安全責任者コメントの記入順チェーン", () => {
  it("作成担当者(author)の次は安全大会(safetyMeeting)、最終欄は統括安全責任者コメント(supervisorComment)で次欄なし", () => {
    expect(nextMeetingPaperFieldKey("author")).toBe("safetyMeeting");
    expect(nextMeetingPaperFieldKey("supervisorComment")).toBeUndefined();
  });

  it("get/set はネストした tomorrowEvents をイミュータブルに更新する", () => {
    const record = normalizeMeetingRecord({ tomorrowEvents: { safetyMeeting: "旧" } });
    const def = MEETING_PAPER_FIELDS.safetyMeeting;
    const patch = def.set!(record, "新しい安全大会予定");
    expect(patch).toEqual({ tomorrowEvents: { ...record.tomorrowEvents, safetyMeeting: "新しい安全大会予定" } });
    expect(record.tomorrowEvents.safetyMeeting).toBe("旧");
  });

  it("get/set は最上位フィールド supervisorComment もイミュータブルに更新する", () => {
    const record = normalizeMeetingRecord({ supervisorComment: "旧コメント" });
    const def = MEETING_PAPER_FIELDS.supervisorComment;
    expect(def.get!(record)).toBe("旧コメント");
    const patch = def.set!(record, "新コメント");
    expect(patch).toEqual({ supervisorComment: "新コメント" });
    expect(record.supervisorComment).toBe("旧コメント");
  });

  it("ヘッダー7欄が全て埋まっていれば firstEmpty は安全大会(safetyMeeting)、その後さらに埋まると順送りされる", () => {
    const headerFilled = normalizeMeetingRecord({
      meetingDate: "2026-07-03",
      workDateYear: "2026",
      workDateMonth: "7",
      workDateDay: "4",
      weather: "晴れ",
      temperature: "28",
      siteName: "現場A",
      siteManager: "所長",
      supervisor: "主任",
      author: "担当",
    });
    expect(firstEmptyMeetingPaperFieldKey(headerFilled)).toBe("safetyMeeting");
    const withEvents = {
      ...headerFilled,
      tomorrowEvents: { safetyMeeting: "実施", inspection: "実施", patrol: "実施", tomorrowGoal: "目標", free: "" },
    };
    expect(firstEmptyMeetingPaperFieldKey(withEvents)).toBe("free");
  });

  it("全13欄が記入済みなら firstEmpty は undefined、emptyKeys は空集合", () => {
    const record = normalizeMeetingRecord({
      meetingDate: "2026-07-03",
      workDateYear: "2026",
      workDateMonth: "7",
      workDateDay: "4",
      weather: "晴れ",
      temperature: "28",
      siteName: "現場A",
      siteManager: "所長",
      supervisor: "主任",
      author: "担当",
      tomorrowEvents: { safetyMeeting: "実施", inspection: "実施", patrol: "実施", tomorrowGoal: "目標", free: "自由記入" },
      supervisorComment: "コメント",
    });
    expect(firstEmptyMeetingPaperFieldKey(record)).toBeUndefined();
    expect(emptyMeetingPaperFieldKeys(record).size).toBe(0);
  });
});
