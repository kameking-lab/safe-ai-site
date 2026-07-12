import { describe, it, expect } from "vitest";
import { formworkShoringCheckCalculator, SHORING_LIMITS } from "./formwork-shoring-check";
import { normalizeValues } from "../schema";

/**
 * 型枠支保工チェックの数値固定テスト。
 * 期待値は安衛則第242条の条文値から独立に確認。境界値（高さ3.5m・水平つなぎ2m・
 * 継ぎ2/3本・ボルト4個）を固定する。
 */
const run = (raw: Record<string, unknown>) => {
  const { values, errors } = normalizeValues(formworkShoringCheckCalculator, raw);
  expect(errors).toEqual([]);
  return formworkShoringCheckCalculator.compute(values);
};

describe("formwork-shoring-check: パイプサポート", () => {
  it("継ぎ1本・高さ3m・つなぎ2m → 適合", () => {
    const out = run({ supportType: "pipe", height: 3, jointCount: 1, boltCount: 4, tieInterval: 2 });
    expect(out.tone).toBe("safe");
    expect(out.headline).toBe("基準適合");
  });

  it("境界: 3本継ぎは不適合（3本以上継がない）", () => {
    const out = run({ supportType: "pipe", height: 3, jointCount: 3, boltCount: 4, tieInterval: 2 });
    expect(out.tone).toBe("danger");
    expect(out.items.find((i) => i.label.includes("継ぎ本数"))?.tone).toBe("danger");
  });

  it("境界: 2本継ぎは可（限度2本）", () => {
    const out = run({ supportType: "pipe", height: 3, jointCount: 2, boltCount: 4, tieInterval: 2 });
    expect(out.items.find((i) => i.label.includes("継ぎ本数"))?.tone).toBe("safe");
  });

  it("継ぐのにボルト3個 → 不適合（4以上必要）", () => {
    const out = run({ supportType: "pipe", height: 3, jointCount: 2, boltCount: 3, tieInterval: 2 });
    expect(out.tone).toBe("danger");
    expect(out.items.find((i) => i.label.includes("ボルト"))?.tone).toBe("danger");
  });

  it("境界: 高さ3.5mちょうどは水平つなぎ条件に該当せず（3.5m超で発生）", () => {
    const out = run({ supportType: "pipe", height: 3.5, jointCount: 1, boltCount: 4, tieInterval: 5 });
    // 3.5m超ではないので tieInterval が大きくても水平つなぎのdanger は出ない
    expect(out.tone).toBe("safe");
  });

  it("高さ3.6m・水平つなぎ2.5m → 不適合（2m以内が必要）", () => {
    const out = run({ supportType: "pipe", height: 3.6, jointCount: 1, boltCount: 4, tieInterval: 2.5 });
    expect(out.tone).toBe("danger");
    expect(out.items.find((i) => i.label.includes("水平つなぎ"))?.tone).toBe("danger");
  });

  it("高さ4m・水平つなぎ2mちょうど → 適合", () => {
    const out = run({ supportType: "pipe", height: 4, jointCount: 1, boltCount: 4, tieInterval: 2 });
    expect(out.tone).toBe("safe");
  });
});

describe("formwork-shoring-check: 鋼管（単管）支柱", () => {
  it("水平つなぎ2m → 適合 / 2.5m → 不適合", () => {
    expect(run({ supportType: "steel_pipe", height: 4, jointCount: 1, boltCount: 4, tieInterval: 2 }).tone).toBe("safe");
    expect(run({ supportType: "steel_pipe", height: 4, jointCount: 1, boltCount: 4, tieInterval: 2.5 }).tone).toBe("danger");
  });
});

describe("formwork-shoring-check: 定数", () => {
  it("条文由来の限度値", () => {
    expect(SHORING_LIMITS.pipeMaxJoints).toBe(2);
    expect(SHORING_LIMITS.pipeJointMinBolts).toBe(4);
    expect(SHORING_LIMITS.pipeTieRequiredOverHeightM).toBe(3.5);
    expect(SHORING_LIMITS.pipeTieIntervalMaxM).toBe(2);
  });
  it("常に作業主任者選任の注意を含む", () => {
    const out = run({ supportType: "pipe", height: 3, jointCount: 1, boltCount: 4, tieInterval: 2 });
    expect(out.warnings.join("\n")).toContain("作業主任者");
  });
});
