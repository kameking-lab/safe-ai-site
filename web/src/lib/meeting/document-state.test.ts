import { describe, expect, it } from "vitest";
import {
  approveMeetingRecord,
  getMeetingDocumentState,
  meetingContentRevision,
  recordMeetingPrint,
} from "@/lib/meeting/document-state";
import {
  buildDefaultMeetingRecord,
  normalizeMeetingRecord,
  type MeetingRecord,
} from "@/lib/meeting/schema";
import { validateMeetingForApproval } from "@/lib/meeting/readiness";

function completeRecord(): MeetingRecord {
  const record = buildDefaultMeetingRecord({
    idFactory: (() => {
      let index = 0;
      return () => `doc-${index++}`;
    })(),
    now: new Date("2026-07-24T00:00:00.000Z"),
  });
  record.siteName = "匿名テスト現場";
  record.siteManager = "現場所長";
  record.supervisor = "主任";
  record.author = "作成担当";
  record.weather = "晴れ";
  record.contractors[0] = {
    ...record.contractors[0],
    companyName: "テスト建設",
    workContent: "足場解体",
    machines: "なし",
    plannedCount: "5",
    predictedDisasters: ["部材の落下"],
    risk: {
      ...record.contractors[0].risk,
      reviewed: true,
    },
    safetyInstructions: "立入区画を設ける",
    responsibleName: "協力会社責任者",
  };
  for (const key of Object.keys(record.coordination) as Array<
    keyof MeetingRecord["coordination"]
  >) {
    record.coordination[key] = "確認済み・該当なし";
  }
  record.checklist = record.checklist.map((category) => ({
    ...category,
    items: category.items.map((item) => ({
      ...item,
      status: ["general-0", "general-2", "general-3", "general-4"].includes(
        item.key,
      )
        ? "ok"
        : "na",
    })),
  }));
  return record;
}

describe("安全工程打合せ書の承認・印刷状態", () => {
  it("不完全帳票は承認できない", () => {
    const record = buildDefaultMeetingRecord();
    const result = approveMeetingRecord(record, {
      reviewerName: "確認担当",
      approvedAt: "2026-07-24T01:00:00.000Z",
    });
    expect(result).toMatchObject({ ok: false, reason: "incomplete" });
    expect(getMeetingDocumentState(record).approval).toBe("unapproved");
  });

  it("確認者名なしでは承認できない", () => {
    const result = approveMeetingRecord(completeRecord(), {
      reviewerName: "  ",
      approvedAt: "2026-07-24T01:00:00.000Z",
    });
    expect(result).toMatchObject({ ok: false, reason: "reviewer-required" });
  });

  it("PF-006: 34項目を機械的に全NAにした記録は承認できない", () => {
    const record = completeRecord();
    record.checklist = record.checklist.map((category) => ({
      ...category,
      items: category.items.map((item) => ({ ...item, status: "na" })),
    }));
    expect(validateMeetingForApproval(record)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "checklist" }),
      ]),
    );
    expect(
      approveMeetingRecord(record, {
        reviewerName: "確認担当",
        approvedAt: "2026-07-24T01:00:00.000Z",
      }),
    ).toMatchObject({ ok: false, reason: "incomplete" });
  });

  it("完成帳票を承認すると確認者・日時・本文revisionを履歴へ固定する", () => {
    const original = completeRecord();
    const result = approveMeetingRecord(original, {
      reviewerName: "確認担当",
      approvedAt: "2026-07-24T01:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.approval).toBe("approved");
    expect(result.state.canPrint).toBe(true);
    expect(result.record.documentControl.approval).toEqual({
      reviewerName: "確認担当",
      approvedAt: "2026-07-24T01:00:00.000Z",
      contentRevision: meetingContentRevision(original),
    });
    expect(result.record.documentControl.history).toEqual([
      {
        action: "approved",
        at: "2026-07-24T01:00:00.000Z",
        contentRevision: meetingContentRevision(original),
        reviewerName: "確認担当",
      },
    ]);
  });

  it("承認後に本文を変更すると承認をstaleにし、印刷記録を拒否する", () => {
    const approved = approveMeetingRecord(completeRecord(), {
      reviewerName: "確認担当",
      approvedAt: "2026-07-24T01:00:00.000Z",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const edited: MeetingRecord = {
      ...approved.record,
      supervisorComment: "承認後に追記",
    };
    expect(getMeetingDocumentState(edited)).toMatchObject({
      approval: "stale",
      canPrint: false,
    });
    expect(
      recordMeetingPrint(edited, {
        printedAt: "2026-07-24T02:00:00.000Z",
      }),
    ).toMatchObject({ ok: false, reason: "approval-stale" });
  });

  it("未承認・旧形式の記録を印刷済みにはしない", () => {
    const legacy = normalizeMeetingRecord({
      ...completeRecord(),
      documentControl: undefined,
    });
    expect(getMeetingDocumentState(legacy)).toMatchObject({
      approval: "unapproved",
      print: "never",
      legacyImported: true,
      canPrint: false,
    });
    expect(recordMeetingPrint(legacy)).toMatchObject({
      ok: false,
      reason: "not-approved",
    });
  });

  it("現版を承認した後だけ印刷時点を記録し、以後の編集でprintもstaleにする", () => {
    const approved = approveMeetingRecord(completeRecord(), {
      reviewerName: "確認担当",
      approvedAt: "2026-07-24T01:00:00.000Z",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const printed = recordMeetingPrint(approved.record, {
      printedAt: "2026-07-24T02:00:00.000Z",
    });
    expect(printed.ok).toBe(true);
    if (!printed.ok) return;
    expect(printed.state).toMatchObject({
      approval: "approved",
      print: "current",
      canPrint: true,
    });
    expect(printed.record.documentControl.history.map((entry) => entry.action)).toEqual([
      "approved",
      "printed",
    ]);
    expect(
      getMeetingDocumentState({
        ...printed.record,
        weather: "雨",
      }),
    ).toMatchObject({
      approval: "stale",
      print: "stale",
      canPrint: false,
    });
  });

  it("savedAtだけの変更は本文revisionを変えない", () => {
    const record = completeRecord();
    expect(
      meetingContentRevision({
        ...record,
        savedAt: "2099-01-01T00:00:00.000Z",
      }),
    ).toBe(meetingContentRevision(record));
  });
});
