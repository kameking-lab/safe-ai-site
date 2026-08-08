import { describe, expect, it } from "vitest";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import {
  isKyCleanPrintAllowed,
  kyPrintActionLabel,
  validateKyForTransition,
} from "./readiness";
import { kyContentRevision } from "@/lib/ky/revision";

function readyRecord() {
  const record = normalizeKyInstructionRecord({
    createdAt: "2026-07-28T00:00:00.000Z",
    applicableDate: "2026-07-29",
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
      weather: "晴・32℃",
      simultaneousWork: "なし",
      changes: "搬入経路変更",
      newEntrants: "1人・教育確認済み",
      nightWork: "なし",
      chemicals: "なし",
      heatStress: "WBGT確認・30分ごと休憩",
      reviewerName: "確認者A",
      reviewedAt: "2026-07-28T00:10:00.000Z",
    },
  });
  return record;
}

describe("KY authoritative schema and approval gate", () => {
  it("PF-004-KY-SCHEMA-ROUNDTRIP-001: preserves every context field", () => {
    const original = readyRecord();
    const restored = normalizeKyInstructionRecord(
      JSON.parse(JSON.stringify(original)),
    );
    expect(restored.schemaVersion).toBe(2);
    expect(restored.context).toEqual(original.context);
    expect(restored.createdAt).toBe(original.createdAt);
    expect(restored.applicableDate).toBe(original.applicableDate);
  });

  it("PF-004-KY-LEGACY-MIGRATION-003: migrates location/equipment but keeps review pending", () => {
    const migrated = normalizeKyInstructionRecord({
      workRows: [
        {
          workPlace: "北側ヤード",
          machinery: "移動式クレーン",
        },
      ],
    });
    expect(migrated.context.workLocation).toBe("北側ヤード");
    expect(migrated.context.equipment).toBe("移動式クレーン");
    expect(migrated.context.reviewedAt).toBeUndefined();
    expect(validateKyForTransition(migrated).length).toBeGreaterThan(0);
  });

  it("PF-004-KY-WORKFLOW-IMPORT-005: keeps provenance and human-review gate after save/reload", () => {
    const record = readyRecord();
    record.riskRows[0].candidateSource = {
      kind: "workflowImport",
      label: "工程書から取込",
      requiresHumanReview: true,
    };
    const restored = normalizeKyInstructionRecord(
      JSON.parse(JSON.stringify(record)),
    );
    expect(restored.riskRows[0].candidateSource?.kind).toBe("workflowImport");
    expect(validateKyForTransition(restored)).toContainEqual({
      code: "candidate-review",
      label: "AI・取込候補の人手確認",
    });
  });

  it.each([
    ["work", (record: ReturnType<typeof readyRecord>) => (record.workRows[0].workDetail = "")],
    ["location", (record: ReturnType<typeof readyRecord>) => (record.context.workLocation = "")],
    ["hazard", (record: ReturnType<typeof readyRecord>) => (record.riskRows[0].hazard = "")],
    ["control", (record: ReturnType<typeof readyRecord>) => (record.riskRows[0].reduction = "")],
    ["reviewer", (record: ReturnType<typeof readyRecord>) => (record.context.reviewerName = "")],
    ["context-review", (record: ReturnType<typeof readyRecord>) => (record.context.reviewedAt = undefined)],
    ["created-at", (record: ReturnType<typeof readyRecord>) => (record.createdAt = "")],
    ["applicable-date", (record: ReturnType<typeof readyRecord>) => (record.applicableDate = "")],
  ])("PF-005-KY-TRANSITION-MATRIX-001: blocks %s omission", (code, mutate) => {
    const record = readyRecord();
    mutate(record);
    expect(validateKyForTransition(record).map((issue) => issue.code)).toContain(code);
    expect(isKyCleanPrintAllowed(record)).toBe(false);
  });

  it("PF-005-KY-DRAFT-PRINT-005: only current approved complete records allow clean print", () => {
    const record = readyRecord();
    expect(isKyCleanPrintAllowed(record)).toBe(false);
    expect(kyPrintActionLabel(record)).toBe(
      "下書き・未確認版を印刷 / PDF",
    );
    const revision = kyContentRevision(record);
    record.approval = {
      status: "approved",
      submittedRevision: revision,
      approvedRevision: revision,
      history: [
        {
          action: "approve",
          by: "元請確認者",
          at: "2026-07-28T00:20:00.000Z",
          contentRevision: revision,
        },
      ],
    };
    expect(isKyCleanPrintAllowed(record)).toBe(true);
    expect(kyPrintActionLabel(record)).toBe("承認済みを印刷 / PDF");
  });

  it("PF-005-KY-SERVER-BYPASS-006: forged incomplete approval is downgraded", () => {
    const restored = normalizeKyInstructionRecord({
      approval: { status: "approved", history: [] },
    });
    expect(restored.approval?.status).toBe("draft");
  });
});
