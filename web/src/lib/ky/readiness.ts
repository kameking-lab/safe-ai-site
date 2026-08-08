import type { KyInstructionRecordState } from "@/lib/types/operations";
import { kyContentRevision } from "@/lib/ky/revision";

export type KyReadinessIssue = {
  code:
    | "work"
    | "location"
    | "hazard"
    | "control"
    | "reviewer"
    | "candidate-review"
    | "context-review"
    | "created-at"
    | "applicable-date";
  label: string;
};

const CONTEXT_FIELDS: Array<
  [keyof KyInstructionRecordState["context"], string]
> = [
  ["workLocation", "作業場所"],
  ["equipment", "使用設備"],
  ["heavyEquipment", "重機"],
  ["plannedPeopleCount", "作業人数"],
  ["weather", "天候"],
  ["simultaneousWork", "同時作業"],
  ["changes", "変更点"],
  ["newEntrants", "新規入場者"],
  ["nightWork", "夜間作業"],
  ["chemicals", "化学物質"],
  ["heatStress", "熱中症条件"],
];

export function validateKyForTransition(
  record: KyInstructionRecordState,
): KyReadinessIssue[] {
  const issues: KyReadinessIssue[] = [];
  if (!record.workRows.some((row) => row.workDetail.trim())) {
    issues.push({ code: "work", label: "作業内容" });
  }
  if (!record.context.workLocation.trim()) {
    issues.push({ code: "location", label: "作業場所" });
  }
  const activeHazards = record.riskRows.filter((row) => row.hazard.trim());
  if (activeHazards.length === 0) {
    issues.push({ code: "hazard", label: "主要危険源" });
  }
  if (activeHazards.some((row) => !row.reduction.trim())) {
    issues.push({ code: "control", label: "各危険源の対策" });
  }
  if (!record.context.reviewerName.trim()) {
    issues.push({ code: "reviewer", label: "確認者" });
  }
  if (
    record.riskRows.some(
      (row) => row.candidateSource && !row.humanConfirmedAt,
    )
  ) {
    issues.push({
      code: "candidate-review",
      label: "AI・取込候補の人手確認",
    });
  }
  const unresolvedContext = CONTEXT_FIELDS.filter(([key]) => {
    const value = record.context[key];
    return typeof value !== "string" || !value.trim();
  });
  if (unresolvedContext.length > 0 || !record.context.reviewedAt) {
    issues.push({
      code: "context-review",
      label:
        unresolvedContext.length > 0
          ? `未確認条件（${unresolvedContext.map(([, label]) => label).join("・")}）`
          : "現場条件の人手確認",
    });
  }
  if (
    !record.createdAt ||
    !Number.isFinite(Date.parse(record.createdAt))
  ) {
    issues.push({ code: "created-at", label: "作成日時" });
  }
  if (
    !record.applicableDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.applicableDate)
  ) {
    issues.push({ code: "applicable-date", label: "適用日" });
  }
  return issues;
}

export function isKyReadyForApproval(
  record: KyInstructionRecordState,
): boolean {
  return validateKyForTransition(record).length === 0;
}

export function isKyCleanPrintAllowed(
  record: KyInstructionRecordState,
): boolean {
  return (
    record.approval?.status === "approved" &&
    record.approval.approvedRevision === kyContentRevision(record) &&
    isKyReadyForApproval(record)
  );
}

export function kyPrintActionLabel(
  record: KyInstructionRecordState,
): "承認済みを印刷 / PDF" | "下書き・未確認版を印刷 / PDF" {
  return isKyCleanPrintAllowed(record)
    ? "承認済みを印刷 / PDF"
    : "下書き・未確認版を印刷 / PDF";
}
