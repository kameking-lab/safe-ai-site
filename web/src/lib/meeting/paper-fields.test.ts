import { describe, expect, it } from "vitest";
import { buildDefaultMeetingRecord, normalizeMeetingRecord, type MeetingContractorRow, type MeetingRecord } from "@/lib/meeting/schema";
import {
  MEETING_PAPER_FIELDS,
  MEETING_PAPER_FIELD_ORDER,
  contractorFieldKey,
  deliveryFieldKey,
  emptyMeetingPaperFieldKeys,
  firstEmptyMeetingPaperFieldKey,
  isMeetingPaperFieldKey,
  getMeetingPaperFieldDef,
  nextMeetingPaperFieldKey,
  parseContractorFieldKey,
  parseDeliveryFieldKey,
  setContractorCompanyField,
  setContractorPlannedCountField,
  setContractorRiskField,
  setContractorTagsField,
  type MeetingPaperFieldKey,
} from "./paper-fields";

/**
 * 既定の1行（buildDefaultMeetingRecordの元請1行・搬入出1行）を含まない検証用レコード。
 * overrides.contractors / overrides.deliveries を渡せばそちらが優先される（渡さなければ空配列＝無し）。
 */
function recordWithNoContractors(overrides: Partial<MeetingRecord> = {}): MeetingRecord {
  return { ...buildDefaultMeetingRecord(), contractors: [], deliveries: [], ...overrides };
}

function row(overrides: Partial<MeetingContractorRow> & { id: string }): MeetingContractorRow {
  return {
    type: "元請",
    parentId: null,
    companyName: "",
    workContent: "",
    machines: "",
    qualifications: [],
    plannedCount: "",
    predictedDisasters: [],
    risk: { severity: 1, likelihood: 1, priority: 1 },
    safetyInstructions: "",
    responsibleName: "",
    actualCount: "",
    appendNote: "",
    ...overrides,
  };
}

describe("S1（第一弾・第二弾）: 打合せ用紙フィールドマップ", () => {
  it("13の静的欄が定義され、記入順が一筆書きになっている（循環なし・最後は次欄なし）", () => {
    expect(MEETING_PAPER_FIELD_ORDER).toHaveLength(13);
    const record = recordWithNoContractors();
    const visited: string[] = [];
    let key: MeetingPaperFieldKey | undefined = "meetingDate";
    while (key) {
      expect(visited).not.toContain(key);
      visited.push(key);
      key = nextMeetingPaperFieldKey(key, record);
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

  it("ヘッダー7欄のみ記入済み・各社マトリクス無しなら firstEmpty は次段の安全大会(safetyMeeting)に進む（全13欄は未完）", () => {
    const record = recordWithNoContractors({
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
  it("各社マトリクス無しなら作成担当者(author)の次は安全大会(safetyMeeting)、最終欄は統括安全責任者コメント(supervisorComment)で次欄なし", () => {
    const record = recordWithNoContractors();
    expect(nextMeetingPaperFieldKey("author", record)).toBe("safetyMeeting");
    expect(nextMeetingPaperFieldKey("supervisorComment", record)).toBeUndefined();
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

  it("各社マトリクス無しでヘッダー7欄が全て埋まっていれば firstEmpty は安全大会(safetyMeeting)、その後さらに埋まると順送りされる", () => {
    const headerFilled = recordWithNoContractors({
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

  it("各社マトリクス無しで全13欄が記入済みなら firstEmpty は undefined、emptyKeys は空集合", () => {
    const record = recordWithNoContractors({
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

describe("S1（第三弾）: 各社マトリクス（idキー）のフィールド定義・記入順チェーン", () => {
  it("contractorFieldKey / parseContractorFieldKey が往復する。isMeetingPaperFieldKey は静的欄・各社欄の両方を認識", () => {
    const key = contractorFieldKey("row-1", "workContent");
    expect(key).toBe("contractor.row-1.workContent");
    expect(parseContractorFieldKey(key)).toEqual({ id: "row-1", part: "workContent" });
    expect(parseContractorFieldKey("bogus")).toBeNull();
    expect(parseContractorFieldKey("siteName")).toBeNull();
    expect(isMeetingPaperFieldKey(key)).toBe(true);
    expect(isMeetingPaperFieldKey("contractor.row-1.notAPart")).toBe(false);
  });

  it("getMeetingPaperFieldDef が10部位それぞれ正しいlabel/typeを返す", () => {
    const id = "row-1";
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "company"))).toMatchObject({ label: "業者名・階層", type: "contractorCompany", contractorId: id });
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "workContent"))).toMatchObject({ label: "作業内容", type: "textarea" });
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "machines"))).toMatchObject({ label: "使用機械", type: "text" });
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "qualifications"))).toMatchObject({ label: "必要資格", type: "contractorTags", contractorId: id, tagField: "qualifications" });
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "plannedCount"))).toMatchObject({ label: "予定人員", type: "contractorPlannedCount", contractorId: id });
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "predictedDisasters"))).toMatchObject({ label: "予想災害", type: "contractorTags", contractorId: id, tagField: "predictedDisasters" });
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "risk"))).toMatchObject({ label: "リスク（重大性・可能性）", type: "contractorRisk", contractorId: id });
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "safetyInstructions"))).toMatchObject({ label: "安全衛生指示事項", type: "textarea" });
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "responsibleName"))).toMatchObject({ label: "協力会社責任者", type: "text" });
    expect(getMeetingPaperFieldDef(contractorFieldKey(id, "actualCount"))).toMatchObject({ label: "実績人員（当日）", type: "text" });
  });

  it("get/set は該当行のみをイミュータブルに更新する（他行・元recordは不変）", () => {
    const record = recordWithNoContractors({
      contractors: [row({ id: "a", workContent: "旧作業" }), row({ id: "b", workContent: "他行" })],
    });
    const def = getMeetingPaperFieldDef(contractorFieldKey("a", "workContent"));
    expect(def.get!(record)).toBe("旧作業");
    const patch = def.set!(record, "新しい作業内容");
    expect(patch).toEqual({
      contractors: [
        { ...record.contractors[0], workContent: "新しい作業内容" },
        record.contractors[1],
      ],
    });
    expect(record.contractors[0]!.workContent).toBe("旧作業");
  });

  it("setContractorRiskField は severity/likelihood を更新し優先度を自動再計算する（イミュータブル）", () => {
    const record = recordWithNoContractors({ contractors: [row({ id: "a" })] });
    const patch = setContractorRiskField(record, "a", "severity", 3);
    const updated = patch.contractors!.find((c) => c.id === "a")!;
    expect(updated.risk.severity).toBe(3);
    expect(updated.risk.likelihood).toBe(1);
    expect(updated.risk.priority).toBeGreaterThan(record.contractors[0]!.risk.priority);
    expect(record.contractors[0]!.risk.severity).toBe(1);
  });

  it("setContractorCompanyField は type/companyName をイミュータブルに更新する", () => {
    const record = recordWithNoContractors({ contractors: [row({ id: "a", type: "1次", companyName: "旧社名" })] });
    const patch = setContractorCompanyField(record, "a", { type: "2次", companyName: "新社名" });
    const updated = patch.contractors!.find((c) => c.id === "a")!;
    expect(updated.type).toBe("2次");
    expect(updated.companyName).toBe("新社名");
    expect(record.contractors[0]!.type).toBe("1次");
    expect(record.contractors[0]!.companyName).toBe("旧社名");
  });

  it("setContractorTagsField は qualifications/predictedDisasters をイミュータブルに更新する（該当行のみ）", () => {
    const record = recordWithNoContractors({
      contractors: [row({ id: "a", qualifications: ["旧資格"] }), row({ id: "b", qualifications: ["他行"] })],
    });
    const patch = setContractorTagsField(record, "a", "qualifications", ["旧資格", "新資格"]);
    const updated = patch.contractors!.find((c) => c.id === "a")!;
    expect(updated.qualifications).toEqual(["旧資格", "新資格"]);
    expect(patch.contractors!.find((c) => c.id === "b")!.predictedDisasters).toEqual([]);
    expect(record.contractors[0]!.qualifications).toEqual(["旧資格"]);
  });

  it("setContractorPlannedCountField は plannedCount をイミュータブルに更新する", () => {
    const record = recordWithNoContractors({ contractors: [row({ id: "a", plannedCount: "3" })] });
    const patch = setContractorPlannedCountField(record, "a", "5");
    expect(patch.contractors!.find((c) => c.id === "a")!.plannedCount).toBe("5");
    expect(record.contractors[0]!.plannedCount).toBe("3");
  });

  it("記入順チェーン: author→1行目のcompany→workContent→machines→qualifications→plannedCount→predictedDisasters→risk→safetyInstructions→responsibleName→actualCount→2行目のcompany→…→最終行actualCountの次はsafetyMeeting", () => {
    const record = recordWithNoContractors({ contractors: [row({ id: "a" }), row({ id: "b" })] });
    const expected: MeetingPaperFieldKey[] = [
      "author",
      contractorFieldKey("a", "company"),
      contractorFieldKey("a", "workContent"),
      contractorFieldKey("a", "machines"),
      contractorFieldKey("a", "qualifications"),
      contractorFieldKey("a", "plannedCount"),
      contractorFieldKey("a", "predictedDisasters"),
      contractorFieldKey("a", "risk"),
      contractorFieldKey("a", "safetyInstructions"),
      contractorFieldKey("a", "responsibleName"),
      contractorFieldKey("a", "actualCount"),
      contractorFieldKey("b", "company"),
      contractorFieldKey("b", "workContent"),
      contractorFieldKey("b", "machines"),
      contractorFieldKey("b", "qualifications"),
      contractorFieldKey("b", "plannedCount"),
      contractorFieldKey("b", "predictedDisasters"),
      contractorFieldKey("b", "risk"),
      contractorFieldKey("b", "safetyInstructions"),
      contractorFieldKey("b", "responsibleName"),
      contractorFieldKey("b", "actualCount"),
      "safetyMeeting",
    ];
    let key: MeetingPaperFieldKey | undefined = "author";
    const visited: MeetingPaperFieldKey[] = [];
    for (let i = 0; i < expected.length; i++) {
      visited.push(key!);
      key = nextMeetingPaperFieldKey(key!, record);
    }
    expect(visited).toEqual(expected);
  });

  it("行が1件も無ければ author の次は直接 safetyMeeting（従来どおり）", () => {
    const record = recordWithNoContractors();
    expect(nextMeetingPaperFieldKey("author", record)).toBe("safetyMeeting");
  });

  it("ヘッダー7欄記入済み・各社マトリクス1行未記入なら firstEmpty はその行のcompany欄になる（zoom-to-cellの入口）", () => {
    const record = recordWithNoContractors({
      meetingDate: "2026-07-03",
      workDateYear: "2026",
      workDateMonth: "7",
      workDateDay: "4",
      weather: "晴れ",
      siteName: "現場A",
      siteManager: "所長",
      supervisor: "主任",
      author: "担当",
      contractors: [row({ id: "a" })],
    });
    expect(firstEmptyMeetingPaperFieldKey(record)).toBe(contractorFieldKey("a", "company"));
  });

  it("emptyMeetingPaperFieldKeys は各社マトリクスの未記入欄も集める（riskは常に記入済み扱い）", () => {
    const record = recordWithNoContractors({ contractors: [row({ id: "a" })] });
    const empty = emptyMeetingPaperFieldKeys(record);
    expect(empty.has(contractorFieldKey("a", "company"))).toBe(true);
    expect(empty.has(contractorFieldKey("a", "workContent"))).toBe(true);
    expect(empty.has(contractorFieldKey("a", "machines"))).toBe(true);
    expect(empty.has(contractorFieldKey("a", "qualifications"))).toBe(true);
    expect(empty.has(contractorFieldKey("a", "plannedCount"))).toBe(true);
    expect(empty.has(contractorFieldKey("a", "predictedDisasters"))).toBe(true);
    expect(empty.has(contractorFieldKey("a", "safetyInstructions"))).toBe(true);
    expect(empty.has(contractorFieldKey("a", "responsibleName"))).toBe(true);
    expect(empty.has(contractorFieldKey("a", "actualCount"))).toBe(true);
    expect(empty.has(contractorFieldKey("a", "risk"))).toBe(false);
  });

  it("各社マトリクスの行が全て記入済みなら firstEmpty はそのまま安全大会(safetyMeeting)へ進む", () => {
    const filledRow = row({
      id: "a",
      companyName: "○○建設",
      workContent: "鉄骨建方",
      machines: "クレーン",
      qualifications: ["玉掛け"],
      plannedCount: "5",
      predictedDisasters: ["墜落"],
      safetyInstructions: "親綱使用",
      responsibleName: "現場責任者",
      actualCount: "5",
    });
    const record = recordWithNoContractors({
      meetingDate: "2026-07-03",
      workDateYear: "2026",
      workDateMonth: "7",
      workDateDay: "4",
      weather: "晴れ",
      siteName: "現場A",
      siteManager: "所長",
      supervisor: "主任",
      author: "担当",
      contractors: [filledRow],
    });
    expect(firstEmptyMeetingPaperFieldKey(record)).toBe("safetyMeeting");
  });
});

describe("S1（第五弾）: 搬入出（idキー）のフィールド定義・記入順チェーン", () => {
  it("deliveryFieldKey / parseDeliveryFieldKey が往復する。isMeetingPaperFieldKey は搬入出欄も認識", () => {
    const key = deliveryFieldKey("d-1", "item");
    expect(key).toBe("delivery.d-1.item");
    expect(parseDeliveryFieldKey(key)).toEqual({ id: "d-1", part: "item" });
    expect(parseDeliveryFieldKey("bogus")).toBeNull();
    expect(parseDeliveryFieldKey("siteName")).toBeNull();
    expect(isMeetingPaperFieldKey(key)).toBe(true);
    expect(isMeetingPaperFieldKey("delivery.d-1.notAPart")).toBe(false);
  });

  it("getMeetingPaperFieldDef が3部位それぞれ正しいlabel/typeを返す", () => {
    const id = "d-1";
    expect(getMeetingPaperFieldDef(deliveryFieldKey(id, "item"))).toMatchObject({ label: "搬入出（物）", type: "text" });
    expect(getMeetingPaperFieldDef(deliveryFieldKey(id, "time"))).toMatchObject({ label: "時刻", type: "text" });
    expect(getMeetingPaperFieldDef(deliveryFieldKey(id, "place"))).toMatchObject({ label: "場所", type: "text" });
  });

  it("get/set は該当行のみをイミュータブルに更新する（他行・元recordは不変）", () => {
    const record = recordWithNoContractors({
      deliveries: [
        { id: "a", item: "旧", time: "", place: "" },
        { id: "b", item: "他行", time: "", place: "" },
      ],
    });
    const def = getMeetingPaperFieldDef(deliveryFieldKey("a", "item"));
    expect(def.get!(record)).toBe("旧");
    const patch = def.set!(record, "新しい搬入物");
    expect(patch).toEqual({
      deliveries: [{ ...record.deliveries[0], item: "新しい搬入物" }, record.deliveries[1]],
    });
    expect(record.deliveries[0]!.item).toBe("旧");
  });

  it("記入順チェーン: その他(free)→1行目のitem→time→place→2行目のitem→…→最終行placeの次はsupervisorComment", () => {
    const record = recordWithNoContractors({
      deliveries: [
        { id: "a", item: "", time: "", place: "" },
        { id: "b", item: "", time: "", place: "" },
      ],
    });
    const expected: MeetingPaperFieldKey[] = [
      "free",
      deliveryFieldKey("a", "item"),
      deliveryFieldKey("a", "time"),
      deliveryFieldKey("a", "place"),
      deliveryFieldKey("b", "item"),
      deliveryFieldKey("b", "time"),
      deliveryFieldKey("b", "place"),
      "supervisorComment",
    ];
    let key: MeetingPaperFieldKey | undefined = "free";
    const visited: MeetingPaperFieldKey[] = [];
    for (let i = 0; i < expected.length; i++) {
      visited.push(key!);
      key = nextMeetingPaperFieldKey(key!, record);
    }
    expect(visited).toEqual(expected);
  });

  it("搬入出行が1件も無ければ free の次は直接 supervisorComment（従来どおり）", () => {
    const record = recordWithNoContractors();
    expect(nextMeetingPaperFieldKey("free", record)).toBe("supervisorComment");
  });

  it("明日のイベント5欄記入済み・搬入出1行未記入なら firstEmpty はその行のitem欄になる（zoom-to-cellの入口）", () => {
    const record = recordWithNoContractors({
      meetingDate: "2026-07-03",
      workDateYear: "2026",
      workDateMonth: "7",
      workDateDay: "4",
      weather: "晴れ",
      siteName: "現場A",
      siteManager: "所長",
      supervisor: "主任",
      author: "担当",
      tomorrowEvents: { safetyMeeting: "実施", inspection: "実施", patrol: "実施", tomorrowGoal: "目標", free: "自由記入" },
      deliveries: [{ id: "a", item: "", time: "", place: "" }],
    });
    expect(firstEmptyMeetingPaperFieldKey(record)).toBe(deliveryFieldKey("a", "item"));
  });

  it("emptyMeetingPaperFieldKeys は搬入出の未記入欄も集める", () => {
    const record = recordWithNoContractors({ deliveries: [{ id: "a", item: "", time: "", place: "" }] });
    const empty = emptyMeetingPaperFieldKeys(record);
    expect(empty.has(deliveryFieldKey("a", "item"))).toBe(true);
    expect(empty.has(deliveryFieldKey("a", "time"))).toBe(true);
    expect(empty.has(deliveryFieldKey("a", "place"))).toBe(true);
  });

  it("搬入出行が全て記入済みなら firstEmpty はそのまま統括安全責任者コメント(supervisorComment)へ進む", () => {
    const record = recordWithNoContractors({
      meetingDate: "2026-07-03",
      workDateYear: "2026",
      workDateMonth: "7",
      workDateDay: "4",
      weather: "晴れ",
      siteName: "現場A",
      siteManager: "所長",
      supervisor: "主任",
      author: "担当",
      tomorrowEvents: { safetyMeeting: "実施", inspection: "実施", patrol: "実施", tomorrowGoal: "目標", free: "自由記入" },
      deliveries: [{ id: "a", item: "生コン", time: "9:00", place: "東側ゲート" }],
    });
    expect(firstEmptyMeetingPaperFieldKey(record)).toBe("supervisorComment");
  });
});
