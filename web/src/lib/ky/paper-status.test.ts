import { describe, expect, it } from "vitest";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { computeKyPaperStatus, computeKyPaperSteps } from "./paper-status";

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

describe("computeKyPaperSteps（柱C-9・A2 記入の4段進行ナビ）", () => {
  it("段は基本情報→危険→対策→確認の4段・順序固定", () => {
    const steps = computeKyPaperSteps(blank());
    expect(steps.map((s) => s.key)).toEqual(["basic", "hazard", "reduction", "confirm"]);
    expect(steps.map((s) => s.label)).toEqual(["基本情報", "危険", "対策", "確認"]);
  });

  it("空のKYは全段未完了・先頭(基本情報)だけが current＝いまここ", () => {
    const steps = computeKyPaperSteps(blank());
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(steps.filter((s) => s.current).map((s) => s.key)).toEqual(["basic"]);
  });

  it("全段の remaining 合計＝結論カードの記入のこりN（整合保証）", () => {
    const rec = blank();
    rec.workRows[0] = { ...rec.workRows[0], workDetail: "資材搬入" };
    rec.riskRows[0] = { ...rec.riskRows[0], hazard: "吊荷の落下", reduction: "" };
    const status = computeKyPaperStatus(rec);
    const steps = computeKyPaperSteps(rec);
    const total = steps.reduce((n, s) => n + s.remaining, 0);
    expect(total).toBe(status.remaining);
  });

  it("確認段は行動目標と参加者の2項目＝両方未記入なら remaining 2", () => {
    const confirm = computeKyPaperSteps(blank()).find((s) => s.key === "confirm")!;
    expect(confirm.remaining).toBe(2);
    expect(confirm.done).toBe(false);
  });

  it("作業内容を記入すると基本情報段が done になり current は危険へ移る", () => {
    const rec = blank();
    rec.workRows[0] = { ...rec.workRows[0], workDetail: "3F鉄骨建方" };
    const steps = computeKyPaperSteps(rec);
    expect(steps.find((s) => s.key === "basic")!.done).toBe(true);
    expect(steps.filter((s) => s.current).map((s) => s.key)).toEqual(["hazard"]);
  });

  it("全項目記入で全段 done・current は無し", () => {
    const steps = computeKyPaperSteps(filled());
    expect(steps.every((s) => s.done)).toBe(true);
    expect(steps.some((s) => s.current)).toBe(false);
  });

  it("未記入段のアンカーは最初の未記入欄を指す（タップでその欄へ）", () => {
    const steps = computeKyPaperSteps(blank());
    expect(steps.find((s) => s.key === "basic")!.anchor).toBe("#ky-work");
    expect(steps.find((s) => s.key === "hazard")!.anchor).toBe("#ky-risks");
    expect(steps.find((s) => s.key === "confirm")!.anchor).toBe("#ky-goal");
  });
});
