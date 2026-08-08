import { describe, expect, it } from "vitest";
import {
  DEFAULT_APPROVAL,
  normalizeApproval,
  isKyLocked,
  submitKy,
  approveKy,
  rejectKy,
  recordKyPrint,
} from "@/lib/ky/approval";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import { kyContentRevision } from "@/lib/ky/revision";

const T = new Date("2026-05-25T00:00:00Z");

function readyRecord() {
  return normalizeKyInstructionRecord({
    createdAt: "2026-05-24T00:00:00Z",
    applicableDate: "2026-05-25",
    foremanName: "山田職長",
    workRows: [{ workDetail: "鉄骨建方" }],
    riskRows: [
      {
        hazard: "開口部から墜落",
        reduction: "親綱を設置して使用",
      },
    ],
    context: {
      workLocation: "3階南側",
      equipment: "親綱",
      heavyEquipment: "25tラフター",
      plannedPeopleCount: "6人",
      weather: "晴",
      simultaneousWork: "なし",
      changes: "なし",
      newEntrants: "なし",
      nightWork: "なし",
      chemicals: "なし",
      heatStress: "WBGT確認",
      reviewerName: "確認者A",
      reviewedAt: "2026-05-24T01:00:00Z",
    },
  });
}

function submittedRecord() {
  const record = readyRecord();
  const result = submitKy(record, "山田職長", T);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("test setup failed");
  return { ...record, approval: result.approval };
}

function approvedRecord() {
  const record = submittedRecord();
  const result = approveKy(record, "元請佐藤", T, "問題なし");
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("test setup failed");
  return { ...record, approval: result.approval };
}

describe("KY record-aware approval state transitions", () => {
  it("PF-005: 完全な現版だけを提出しrevisionを固定する", () => {
    const record = readyRecord();
    const result = submitKy(record, "山田職長", T);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.approval.status).toBe("submitted");
    expect(result.approval.submittedRevision).toBe(
      kyContentRevision(record),
    );
    expect(isKyLocked(result.approval)).toBe(true);
  });

  it("PF-005: blank/incomplete recordの提出・承認を拒否する", () => {
    const blank = normalizeKyInstructionRecord({});
    expect(submitKy(blank, "山田", T)).toMatchObject({
      ok: false,
      reason: "incomplete",
    });
    expect(approveKy(blank, "佐藤", T)).toMatchObject({
      ok: false,
      reason: "invalid-state",
    });
  });

  it("PF-005: submitted revisionの現版だけを承認する", () => {
    const submitted = submittedRecord();
    const result = approveKy(submitted, "元請佐藤", T, "問題なし");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.approval.approvedRevision).toBe(
      kyContentRevision(submitted),
    );
    expect(result.approval.history.at(-1)).toMatchObject({
      action: "approve",
      by: "元請佐藤",
      contentRevision: kyContentRevision(submitted),
    });
  });

  it("PF-005: 提出後または承認後の本文変更は再提出・再承認を要求する", () => {
    const submitted = submittedRecord();
    const changedSubmitted = {
      ...submitted,
      workRows: submitted.workRows.map((row, index) =>
        index === 0 ? { ...row, workDetail: "別の高所作業" } : row,
      ),
    };
    expect(approveKy(changedSubmitted, "元請佐藤", T)).toMatchObject({
      ok: false,
      reason: "revision-stale",
    });

    const approved = approvedRecord();
    const changedApproved = {
      ...approved,
      riskRows: approved.riskRows.map((row, index) =>
        index === 0 ? { ...row, reduction: "別の有効な対策" } : row,
      ),
    };
    expect(recordKyPrint(changedApproved, "元請佐藤", T)).toMatchObject({
      ok: false,
      reason: "revision-stale",
    });
  });

  it("承認済み現版だけ印刷revisionを履歴へ保持する", () => {
    const approved = approvedRecord();
    const printed = recordKyPrint(approved, "元請佐藤", T);
    expect(printed.ok).toBe(true);
    if (!printed.ok) return;
    expect(printed.approval.history.at(-1)).toMatchObject({
      action: "print",
      contentRevision: kyContentRevision(approved),
      approvalRevision: kyContentRevision(approved),
    });
    expect(recordKyPrint(readyRecord(), "山田", T)).toMatchObject({
      ok: false,
      reason: "invalid-state",
    });
  });

  it("差し戻しはrevisionを破棄して編集可能に戻す", () => {
    const submitted = submittedRecord();
    const rejected = rejectKy(
      submitted.approval!,
      "元請佐藤",
      T,
      "対策不足",
    );
    expect(rejected.status).toBe("rejected");
    expect(rejected.submittedRevision).toBeUndefined();
    expect(rejected.approvedRevision).toBeUndefined();
    expect(isKyLocked(rejected)).toBe(false);
  });

  it("normalizeApproval は壊れた入力を既定化する", () => {
    expect(normalizeApproval(null)).toEqual(DEFAULT_APPROVAL);
    expect(normalizeApproval({ status: "bogus", history: "x" })).toEqual(
      DEFAULT_APPROVAL,
    );
  });
});
