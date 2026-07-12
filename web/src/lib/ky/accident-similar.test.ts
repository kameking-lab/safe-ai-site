import { describe, it, expect } from "vitest";
import {
  findSimilarAccidentCasesForKy,
  accidentCaseToRiskDraft,
  severityToKyScale,
} from "@/lib/ky/accident-similar";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import type { AccidentCase } from "@/lib/types/domain";

function mkCase(over: Partial<AccidentCase>): AccidentCase {
  return {
    id: "t1",
    title: "テスト事例",
    occurredOn: "2024-01-01",
    type: "墜落",
    workCategory: "建設業",
    severity: "重傷",
    summary: "概要",
    mainCauses: [],
    preventionPoints: [],
    ...over,
  };
}

describe("findSimilarAccidentCasesForKy", () => {
  it("区切り文字のない作業語「足場組立」でも墜落系の事例を拾う（型共鳴）", () => {
    const cases: AccidentCase[] = [
      mkCase({ id: "fall", title: "足場からの墜落", type: "墜落", summary: "足場の作業床から墜落した" }),
      mkCase({ id: "unrelated", title: "熱中症で倒れた", type: "熱中症", summary: "炎天下で" }),
    ];
    const hits = findSimilarAccidentCasesForKy("足場組立", cases);
    expect(hits[0]?.case.id).toBe("fall");
    expect(hits.some((h) => h.case.id === "unrelated")).toBe(false);
  });

  it("本文に作業語が無くても型で拾える（フォークリフト→激突され）", () => {
    const cases: AccidentCase[] = [
      mkCase({ id: "hit", title: "構内運搬車にひかれた", type: "激突され", summary: "後退中の車両に" }),
      mkCase({ id: "other", title: "有機溶剤中毒", type: "有害物等との接触", summary: "洗浄作業で" }),
    ];
    const hits = findSimilarAccidentCasesForKy("フォークリフトでの荷役", cases);
    expect(hits[0]?.case.id).toBe("hit");
  });

  it("空・短すぎる入力では空配列", () => {
    expect(findSimilarAccidentCasesForKy("", [mkCase({})])).toEqual([]);
    expect(findSimilarAccidentCasesForKy("あ", [mkCase({})])).toEqual([]);
  });

  it("limit を尊重する", () => {
    const cases = Array.from({ length: 10 }, (_, i) =>
      mkCase({ id: `c${i}`, title: "足場からの墜落", type: "墜落" })
    );
    expect(findSimilarAccidentCasesForKy("足場", cases, { limit: 3 })).toHaveLength(3);
  });

  it("同点は新しい順に並ぶ", () => {
    const cases: AccidentCase[] = [
      mkCase({ id: "old", title: "足場からの墜落", type: "墜落", occurredOn: "2015-01-01" }),
      mkCase({ id: "new", title: "足場からの墜落", type: "墜落", occurredOn: "2024-06-01" }),
    ];
    const hits = findSimilarAccidentCasesForKy("足場", cases);
    expect(hits[0]?.case.id).toBe("new");
  });

  it("実データ統合: 「足場組立」で墜落系の実在事例が上位に提示される（完了条件）", () => {
    const hits = findSimilarAccidentCasesForKy("足場組立", getAccidentCasesDataset());
    expect(hits.length).toBeGreaterThan(0);
    // 上位に墜落・飛来落下いずれかの実在事例が含まれる（KYの危険予知に直結する型）。
    expect(hits.some((h) => h.case.type === "墜落" || h.case.type === "飛来・落下")).toBe(true);
  });
});

describe("accidentCaseToRiskDraft", () => {
  it("事例からKY危険行の下書きを作る（対策は防止ポイント先頭）", () => {
    const draft = accidentCaseToRiskDraft(
      mkCase({ title: "足場からの墜落", type: "墜落", severity: "死亡", preventionPoints: ["親綱・フルハーネスを使用", "手すり先行"] })
    );
    expect(draft.hazard).toContain("墜落");
    expect(draft.hazard).toContain("足場からの墜落");
    expect(draft.reduction).toBe("親綱・フルハーネスを使用");
    expect(draft.severity).toBe(3);
    expect(draft.likelihood).toBe(2);
  });
});

describe("severityToKyScale", () => {
  it("死亡・重傷=3 / 中等傷=2 / 軽傷=1", () => {
    expect(severityToKyScale("死亡")).toBe(3);
    expect(severityToKyScale("重傷")).toBe(3);
    expect(severityToKyScale("中等傷")).toBe(2);
    expect(severityToKyScale("軽傷")).toBe(1);
  });
});
