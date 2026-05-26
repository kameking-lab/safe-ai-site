import { describe, expect, it } from "vitest";
import { computeAccidentTrend } from "@/lib/accidents/trend";
import type { AccidentCase } from "@/lib/types/domain";

const mk = (id: string, occurredOn: string, type: string, cat: string): AccidentCase => ({
  id,
  title: id,
  occurredOn,
  type: type as AccidentCase["type"],
  workCategory: cat as AccidentCase["workCategory"],
  severity: "重傷",
  summary: "",
  mainCauses: [],
  preventionPoints: [],
});

const NOW = new Date("2026-05-01T00:00:00Z");
const CASES: AccidentCase[] = [
  mk("a", "2026-04-15", "墜落・転落", "建設業"),
  mk("b", "2026-03-10", "墜落・転落", "建設業"),
  mk("c", "2026-02-01", "はさまれ・巻き込まれ", "製造業"),
  mk("d", "2024-01-01", "転倒", "製造業"), // 期間外
];

describe("computeAccidentTrend", () => {
  it("直近3か月の集計（期間外を除外）", () => {
    const t = computeAccidentTrend(CASES, 3, NOW);
    expect(t.total).toBe(3); // a,b,c（dは期間外）
    expect(t.byType[0].label).toBe("墜落・転落");
    expect(t.byType[0].count).toBe(2);
  });

  it("直近1年では4件全て（dも含む？2024は範囲外）", () => {
    const t = computeAccidentTrend(CASES, 12, NOW);
    expect(t.total).toBe(3); // 2024-01は1年より前
  });

  it("業種別集計", () => {
    const t = computeAccidentTrend(CASES, 6, NOW);
    const constr = t.byIndustry.find((b) => b.label === "建設業");
    expect(constr?.count).toBe(2);
  });

  it("不正な日付は無視", () => {
    const t = computeAccidentTrend([mk("x", "invalid", "転倒", "建設業")], 12, NOW);
    expect(t.total).toBe(0);
  });

  it("periodLabel", () => {
    expect(computeAccidentTrend(CASES, 3, NOW).periodLabel).toBe("直近3か月");
  });
});
