import { describe, expect, it } from "vitest";
import { approveMeetingRecord, recordMeetingPrint } from "@/lib/meeting/document-state";
import { buildDefaultMeetingRecord } from "@/lib/meeting/schema";
import { duplicateForNextDay } from "@/lib/meeting/store";

describe("duplicateForNextDay documentControl", () => {
  it("前日の承認・印刷実績を翌日分へ持ち越さない", () => {
    const record = buildDefaultMeetingRecord();
    record.siteName = "匿名テスト現場";
    record.siteManager = "所長";
    record.supervisor = "主任";
    record.author = "作成担当";
    record.weather = "晴れ";
    record.contractors[0] = {
      ...record.contractors[0],
      companyName: "テスト建設",
      workContent: "足場解体",
      machines: "なし",
      plannedCount: "4",
      predictedDisasters: ["部材の落下"],
      risk: { ...record.contractors[0].risk, reviewed: true },
      safetyInstructions: "立入区画を設ける",
      responsibleName: "責任者",
    };
    for (const key of Object.keys(record.coordination) as Array<
      keyof typeof record.coordination
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
    const approved = approveMeetingRecord(record, {
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

    const duplicated = duplicateForNextDay(printed.record);
    expect(duplicated.documentControl).toEqual({
      schemaVersion: 2,
      legacyImported: false,
      approval: null,
      lastPrint: null,
      history: [],
    });
  });
});
