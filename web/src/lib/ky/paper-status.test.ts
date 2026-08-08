import { describe, expect, it } from "vitest";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { computeKyPaperStatus, computeKyPaperSteps } from "./paper-status";
import { submitKy, approveKy } from "@/lib/ky/approval";

function blank(): KyInstructionRecordState {
  return normalizeKyInstructionRecord({});
}

function filled(): KyInstructionRecordState {
  const rec = blank();
  rec.workRows[0] = { ...rec.workRows[0], workDetail: "3F鉄骨建方" };
  rec.riskRows[0] = { ...rec.riskRows[0], hazard: "開口部からの墜落", reduction: "親綱使用" };
  rec.teamGoal = "親綱に掛けてから移動しよう";
  rec.participants[0] = { name: "山田", qualNo: "", preWork: "", onExit: "" };
  rec.createdAt = "2026-07-28T00:00:00.000Z";
  rec.applicableDate = "2026-07-29";
  rec.context = {
    workLocation: "3階南側",
    equipment: "親綱",
    heavyEquipment: "なし",
    plannedPeopleCount: "1人",
    weather: "晴",
    simultaneousWork: "なし",
    changes: "なし",
    newEntrants: "なし",
    nightWork: "なし",
    chemicals: "なし",
    heatStress: "WBGT確認",
    reviewerName: "確認者A",
    reviewedAt: "2026-07-28T00:10:00.000Z",
  };
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

  it("全必須項目と人手確認が揃うと『承認準備完了』", () => {
    const s = computeKyPaperStatus(filled());
    expect(s.kind).toBe("ready-for-approval");
    expect(s.tone).toBe("safe");
    expect(s.remaining).toBeUndefined();
    expect(s.action?.href).toBe("#ky-approval");
  });

  it("PF-005: 従来の5項目だけでは人手確認が必要で完了扱いしない", () => {
    const rec = blank();
    rec.workRows[0] = { ...rec.workRows[0], workDetail: "3F鉄骨建方" };
    rec.riskRows[0] = {
      ...rec.riskRows[0],
      hazard: "開口部からの墜落",
      reduction: "親綱使用",
    };
    rec.teamGoal = "親綱に掛けてから移動しよう";
    rec.participants[0] = { name: "山田", qualNo: "", preWork: "", onExit: "" };
    expect(computeKyPaperStatus(rec).kind).toBe("human-review-required");
  });

  it("提出中は青の『元請の確認待ち』（記入状況より承認フロー優先）", () => {
    const rec = filled();
    const submitted = submitKy(rec, "山田");
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    rec.approval = submitted.approval;
    const s = computeKyPaperStatus(rec);
    expect(s.kind).toBe("submitted");
    expect(s.tone).toBe("info");
  });

  it("承認済みは緑→サイネージへ", () => {
    const rec = filled();
    const submitted = submitKy(rec, "山田");
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    rec.approval = submitted.approval;
    const approved = approveKy(rec, "元請確認者");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    rec.approval = approved.approval;
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

describe("computeKyPaperSteps（記入から保存・印刷までの5段進行ナビ）", () => {
  it("作業条件→危険→対策→人が確認→保存・印刷の5段・順序固定", () => {
    const steps = computeKyPaperSteps(blank());
    expect(steps.map((s) => s.key)).toEqual([
      "conditions",
      "hazard",
      "reduction",
      "human-review",
      "output",
    ]);
    expect(steps.map((s) => s.label)).toEqual([
      "作業条件",
      "危険",
      "対策",
      "人が確認",
      "保存・印刷",
    ]);
  });

  it("空のKYは全段未完了・先頭の作業条件だけがcurrent", () => {
    const steps = computeKyPaperSteps(blank());
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(steps.filter((s) => s.current).map((s) => s.key)).toEqual(["conditions"]);
  });

  it("入力4段のremaining合計は結論カードと一致し、出力段を別に保留する", () => {
    const rec = blank();
    rec.workRows[0] = { ...rec.workRows[0], workDetail: "資材搬入" };
    rec.riskRows[0] = { ...rec.riskRows[0], hazard: "吊荷の落下", reduction: "" };
    const status = computeKyPaperStatus(rec);
    const steps = computeKyPaperSteps(rec);
    const total = steps
      .filter((step) => step.key !== "output")
      .reduce((n, s) => n + s.remaining, 0);
    expect(total).toBe(status.remaining);
    expect(steps.find((step) => step.key === "output")?.remaining).toBe(1);
  });

  it("人が確認段は行動目標と参加者の2項目を要求する", () => {
    const confirm = computeKyPaperSteps(blank()).find((s) => s.key === "human-review")!;
    expect(confirm.remaining).toBe(2);
    expect(confirm.done).toBe(false);
  });

  it("作業内容を記入すると作業条件がdoneになりcurrentは危険へ移る", () => {
    const rec = blank();
    rec.workRows[0] = { ...rec.workRows[0], workDetail: "3F鉄骨建方" };
    const steps = computeKyPaperSteps(rec);
    expect(steps.find((s) => s.key === "conditions")!.done).toBe(true);
    expect(steps.filter((s) => s.current).map((s) => s.key)).toEqual(["hazard"]);
  });

  it("入力完了後は保存・印刷がcurrentになり、承認後に全段doneになる", () => {
    const rec = filled();
    let steps = computeKyPaperSteps(rec);
    expect(steps.slice(0, 4).every((s) => s.done)).toBe(true);
    expect(steps.find((s) => s.key === "output")?.current).toBe(true);
    const submitted = submitKy(rec, "山田");
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    rec.approval = submitted.approval;
    const approved = approveKy(rec, "元請確認者");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    rec.approval = approved.approval;
    steps = computeKyPaperSteps(rec);
    expect(steps.every((s) => s.done)).toBe(true);
    expect(steps.some((s) => s.current)).toBe(false);
  });

  it("未記入段のアンカーは最初の未記入欄を指す（タップでその欄へ）", () => {
    const steps = computeKyPaperSteps(blank());
    expect(steps.find((s) => s.key === "conditions")!.anchor).toBe("#ky-work");
    expect(steps.find((s) => s.key === "hazard")!.anchor).toBe("#ky-risks");
    expect(steps.find((s) => s.key === "human-review")!.anchor).toBe("#ky-goal");
    expect(steps.find((s) => s.key === "output")!.anchor).toBe("#ky-approval");
  });
});
