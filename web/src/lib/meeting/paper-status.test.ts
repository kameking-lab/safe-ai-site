import { describe, expect, it } from "vitest";
import {
  buildDefaultMeetingRecord,
  emptyContractorRow,
  type MeetingRecord,
} from "@/lib/meeting/schema";
import {
  computeMeetingPaperStatus,
  evaluateMeetingContractorRows,
} from "./paper-status";

function blank(): MeetingRecord {
  return buildDefaultMeetingRecord();
}

function filled(): MeetingRecord {
  const rec = blank();
  rec.siteName = "○○ビル新築工事";
  rec.siteManager = "現場所長";
  rec.supervisor = "主任";
  rec.author = "作成担当";
  rec.weather = "晴れ";
  rec.contractors[0] = {
    ...rec.contractors[0],
    companyName: "元請建設",
    workContent: "鉄骨建方",
    machines: "クレーン",
    plannedCount: "5",
    predictedDisasters: ["開口部からの墜落"],
    risk: { ...rec.contractors[0].risk, reviewed: true },
    safetyInstructions: "親綱を使用し開口部養生を徹底",
    responsibleName: "職長",
  };
  for (const key of Object.keys(rec.coordination) as Array<
    keyof MeetingRecord["coordination"]
  >) {
    rec.coordination[key] = "確認済み・該当なし";
  }
  rec.checklist = rec.checklist.map((category) => ({
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
  return rec;
}

describe("computeMeetingPaperStatus（打合せ書の結論カード状態）", () => {
  it("PF-006: 空の打合せ書は未確認条件を含めて未完成とする", () => {
    const s = computeMeetingPaperStatus(blank());
    expect(s.kind).toBe("incomplete");
    expect(s.tone).toBe("info");
    expect(s.remaining).toBe(5);
    expect(s.missing.map((m) => m.key)).toEqual([
      "site",
      "company",
      "disaster",
      "instruction",
      "conditions",
    ]);
    expect(s.action).toEqual({ href: "#mtg-header", label: "作業所名を記入" });
  });

  it("作業所名のみ記入でも未確認条件を残す", () => {
    const rec = blank();
    rec.siteName = "△△現場";
    const s = computeMeetingPaperStatus(rec);
    expect(s.remaining).toBe(4);
    expect(s.missing.map((m) => m.key)).toEqual([
      "company",
      "disaster",
      "instruction",
      "conditions",
    ]);
    expect(s.action?.href).toBe("#mtg-companies");
    expect(s.action?.label).toBe("協力会社・作業を記入");
  });

  it("会社名だけで作業内容が空なら company はまだ未記入扱い", () => {
    const rec = blank();
    rec.siteName = "△△現場";
    rec.contractors[0] = { ...rec.contractors[0], companyName: "元請建設", workContent: "" };
    const s = computeMeetingPaperStatus(rec);
    expect(s.missing.map((m) => m.key)).toContain("company");
  });

  it("必須4項目が埋まり未保存なら青の『記入完了・未保存』→保存する", () => {
    const s = computeMeetingPaperStatus(filled());
    expect(s.kind).toBe("complete");
    expect(s.tone).toBe("info");
    expect(s.remaining).toBeUndefined();
    expect(s.missing).toEqual([]);
    expect(s.action).toEqual({ href: "#mtg-actions", label: "保存する" });
  });

  it("必須4項目が埋まり saved=false でも未保存（明示）として青", () => {
    const s = computeMeetingPaperStatus(filled(), { saved: false });
    expect(s.kind).toBe("complete");
    expect(s.tone).toBe("info");
    expect(s.title).toBe("記入完了・未保存");
  });

  it("必須4項目が埋まり saved=true なら緑の『保存済み』→保存一覧で確認", () => {
    const s = computeMeetingPaperStatus(filled(), { saved: true });
    expect(s.kind).toBe("saved");
    expect(s.tone).toBe("safe");
    expect(s.title).toBe("保存済み");
    expect(s.remaining).toBeUndefined();
    expect(s.missing).toEqual([]);
    expect(s.action).toEqual({ href: "/safety-diary/list", label: "保存一覧で確認" });
  });

  it("未完成なら saved=true でも保存済みにならない（記入のこりが優先）", () => {
    const s = computeMeetingPaperStatus(blank(), { saved: true });
    expect(s.kind).toBe("incomplete");
    expect(s.tone).toBe("info");
    expect(s.remaining).toBe(5);
  });

  it("予想災害が空白だけの配列は未記入扱い", () => {
    const rec = filled();
    rec.contractors[0] = { ...rec.contractors[0], predictedDisasters: ["", "  "] };
    const s = computeMeetingPaperStatus(rec);
    expect(s.kind).toBe("incomplete");
    expect(s.missing.map((m) => m.key)).toEqual(["disaster"]);
    expect(s.action?.label).toBe("予想災害を記入");
  });

  it("2行目が入力途中なら、1行目が完成していても全体を完了にしない", () => {
    const rec = filled();
    rec.contractors.push({
      ...emptyContractorRow("1次", null, "row-2"),
      companyName: "協力建設",
    });
    const status = computeMeetingPaperStatus(rec, { saved: true });
    expect(status.kind).toBe("incomplete");
    expect(status.incompleteRowCount).toBe(1);
    expect(status.remainingCells).toBe(3);
    expect(status.rows[1]).toMatchObject({
      rowId: "row-2",
      rowNumber: 2,
      active: true,
      complete: false,
      missing: [
        "workContent",
        "predictedDisasters",
        "safetyInstructions",
      ],
    });
  });

  it("空の追加行はactiveにせず、完成済み行の完了状態を壊さない", () => {
    const rec = filled();
    rec.contractors.push(emptyContractorRow("1次", null, "empty-row"));
    const status = computeMeetingPaperStatus(rec);
    expect(status.kind).toBe("complete");
    expect(status.rows[1]).toMatchObject({
      rowId: "empty-row",
      active: false,
      complete: false,
      missing: [],
    });
  });

  it("会社名以外から入力を始めた行もactiveとして必須条件を確認する", () => {
    const rec = filled();
    rec.contractors.push({
      ...emptyContractorRow("1次", null, "work-first"),
      workContent: "足場解体",
    });
    const rows = evaluateMeetingContractorRows(rec.contractors);
    expect(rows[1].active).toBe(true);
    expect(rows[1].missing).toEqual([
      "companyName",
      "predictedDisasters",
      "safetyInstructions",
    ]);
    expect(computeMeetingPaperStatus(rec).kind).toBe("incomplete");
  });

  it("activeな全行の必須条件が揃ったときだけ完了になる", () => {
    const rec = filled();
    rec.contractors.push({
      ...emptyContractorRow("1次", null, "complete-row"),
      companyName: "協力建設",
      workContent: "足場解体",
      machines: "なし",
      plannedCount: "3",
      predictedDisasters: ["部材の落下"],
      risk: {
        ...emptyContractorRow("1次", null, "risk-template").risk,
        reviewed: true,
      },
      safetyInstructions: "立入区画を設け、上下作業を禁止する",
      responsibleName: "協力会社職長",
    });
    const status = computeMeetingPaperStatus(rec);
    expect(status.kind).toBe("complete");
    expect(status.incompleteRowCount).toBe(0);
    expect(status.remainingCells).toBe(0);
    expect(status.rows.filter((row) => row.active).every((row) => row.complete)).toBe(true);
  });
});
