import { describe, expect, it } from "vitest";
import {
  setKyCandidateConfirmation,
  unconfirmedKyCandidateIndexes,
} from "@/lib/ky/risk-source";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";

describe("KY candidate source and human confirmation", () => {
  it("AI・事故候補だけを人手確認待ちとして数える", () => {
    const record = normalizeKyInstructionRecord({});
    record.riskRows[0] = {
      ...record.riskRows[0],
      hazard: "AI候補",
      candidateSource: {
        kind: "ai",
        label: "AI生成候補",
        requiresHumanReview: true,
      },
    };
    record.riskRows[1] = {
      ...record.riskRows[1],
      hazard: "利用者が直接入力",
    };
    expect(unconfirmedKyCandidateIndexes(record)).toEqual([0]);
  });

  it("確認時刻を保持し、確認取消しで時刻を除く", () => {
    const record = normalizeKyInstructionRecord({});
    const row = {
      ...record.riskRows[0],
      candidateSource: {
        kind: "officialAccident" as const,
        label: "公式個票URL付き事故例からの候補",
        requiresHumanReview: true as const,
      },
    };
    const confirmed = setKyCandidateConfirmation(
      row,
      true,
      new Date("2026-07-24T03:00:00.000Z"),
    );
    expect(confirmed.humanConfirmedAt).toBe("2026-07-24T03:00:00.000Z");
    expect(setKyCandidateConfirmation(confirmed, false).humanConfirmedAt).toBeUndefined();
  });
});
