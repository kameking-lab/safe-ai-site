import type {
  KyInstructionRecordState,
  KyInstructionRiskRow,
  KyRiskCandidateSourceKind,
} from "@/lib/types/operations";

export const KY_RISK_SOURCE_LABELS: Record<KyRiskCandidateSourceKind, string> = {
  ai: "AI生成候補",
  rule: "定型ルール候補",
  workflowImport: "別帳票からの未確認候補",
  officialAccident: "公式個票URL付き事故例からの候補",
  curatedAccident: "編集再構成事例からの候補",
  syntheticCase: "synthetic教材例からの候補",
  preliminaryCase: "速報統計ベース想定例からの候補",
};

export function unconfirmedKyCandidateIndexes(
  record: KyInstructionRecordState,
): number[] {
  return record.riskRows.flatMap((row, index) =>
    row.hazard.trim() &&
    row.candidateSource?.requiresHumanReview === true &&
    !row.humanConfirmedAt
      ? [index]
      : [],
  );
}

export function setKyCandidateConfirmation(
  row: KyInstructionRiskRow,
  confirmed: boolean,
  now: Date = new Date(),
): KyInstructionRiskRow {
  if (!row.candidateSource?.requiresHumanReview) return row;
  if (!confirmed) {
    const { humanConfirmedAt: _removed, ...rest } = row;
    return rest;
  }
  return { ...row, humanConfirmedAt: now.toISOString() };
}
