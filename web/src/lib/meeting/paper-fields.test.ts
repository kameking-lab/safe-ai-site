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

describe("S1（第一弾）: 打合せ用紙フィールドマップ", () => {
  it("7の静的欄が定義され、記入順が一筆書きになっている（循環なし・最後は次欄なし）", () => {
    expect(MEETING_PAPER_FIELD_ORDER).toHaveLength(7);
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

  it("全欄記入済みなら firstEmpty は undefined、emptyKeys は空集合", () => {
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
    expect(firstEmptyMeetingPaperFieldKey(record)).toBeUndefined();
    expect(emptyMeetingPaperFieldKeys(record).size).toBe(0);
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
