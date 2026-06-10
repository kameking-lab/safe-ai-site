import { describe, expect, it } from "vitest";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { computeKyPaperStatus } from "./paper-status";

function blank(): KyInstructionRecordState {
  return normalizeKyInstructionRecord({});
}

function filled(): KyInstructionRecordState {
  const rec = blank();
  rec.workRows[0] = { ...rec.workRows[0], workDetail: "3F鉄骨建方" };
  rec.riskRows[0] = { ...rec.riskRows[0], hazard: "開口部からの墜落", reduction: "親綱使用" };
  rec.teamGoal = "親綱に掛けてから移動しよう";
  rec.participants[0] = { name: "山田", qualNo: "", preWork: "", onExit: "" };
  return rec;
}

describe("computeKyPaperStatus（KY用紙の結論カード状態）", () => {
  it("空のKYは『記入のこり5』で青（案内）・次は作業内容", () => {
    const s = computeKyPaperStatus(blank());
    expect(s.kind).toBe("incomplete");
    expect(s.tone).toBe("info");
    expect(s.remaining).toBe(5);
    expect(s.missing.map((m) => m.key)).toEqual(["work", "hazard", "reduction", "goal", "participants"]);
    expect(s.action).toEqual({ href: "#ky-work", label: "作業内容を記入" });
  });

  it("危険ゼロのうちは対策を要求しない（hazard と reduction の両方が未記入扱い）", () => {
    const rec = blank();
    rec.workRows[0] = { ...rec.workRows[0], workDetail: "資材搬入" };
    const s = computeKyPaperStatus(rec);
    expect(s.remaining).toBe(4);
    expect(s.action?.href).toBe("#ky-risks");
  });

  it("危険のみ記入で対策が空なら『対策』が残る", () => {
    const rec = blank();
    rec.workRows[0] = { ...rec.workRows[0], workDetail: "資材搬入" };
    rec.riskRows[0] = { ...rec.riskRows[0], hazard: "吊荷の落下", reduction: "" };
    const s = computeKyPaperStatus(rec);
    expect(s.missing.map((m) => m.key)).toEqual(["reduction", "goal", "participants"]);
    expect(s.action?.label).toBe("対策を記入");
  });

  it("必須5項目が埋まると緑の『記入完了』→サイネージへ", () => {
    const s = computeKyPaperStatus(filled());
    expect(s.kind).toBe("complete");
    expect(s.tone).toBe("safe");
    expect(s.remaining).toBeUndefined();
    expect(s.action?.href).toBe("/ky/morning");
  });

  it("提出中は青の『元請の確認待ち』（記入状況より承認フロー優先）", () => {
    const rec = filled();
    rec.approval = { status: "submitted", history: [] };
    const s = computeKyPaperStatus(rec);
    expect(s.kind).toBe("submitted");
    expect(s.tone).toBe("info");
  });

  it("承認済みは緑→サイネージへ", () => {
    const rec = filled();
    rec.approval = { status: "approved", history: [] };
    const s = computeKyPaperStatus(rec);
    expect(s.kind).toBe("approved");
    expect(s.tone).toBe("safe");
    expect(s.action?.href).toBe("/ky/morning");
  });

  it("差し戻しは黄（要対応）＝記入が完了していても修正が次のアクション", () => {
    const rec = filled();
    rec.approval = { status: "rejected", history: [] };
    const s = computeKyPaperStatus(rec);
    expect(s.kind).toBe("rejected");
    expect(s.tone).toBe("warning");
    expect(s.action?.href).toBe("#ky-approval");
  });
});
