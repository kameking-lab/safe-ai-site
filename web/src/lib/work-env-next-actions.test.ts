import { describe, it, expect } from "vitest";
import {
  summarizeMeasurementFrequencies,
  hasManagementClassTarget,
  hasSpecialControlSubstance,
  hasMeaningfulInput,
} from "./work-env-next-actions";
import type { IdentifiedTarget, MeasurementCategory, TargetFinderInput } from "@/types/work-environment";

function cat(over: Partial<MeasurementCategory>): MeasurementCategory {
  return {
    id: "dust",
    name: "粉じん",
    legalBasis: "安衛令第21条第1号",
    method: "A+B",
    frequency: "semi-annually",
    triggerConditions: [],
    targetParameters: [],
    measurer: "作業環境測定士（第2種以上）",
    standardLabel: "管理濃度",
    unit: "mg/m³",
    hasManagementClass: true,
    ...over,
  };
}

function target(c: MeasurementCategory): IdentifiedTarget {
  return { category: c, matchedConditions: [], matchScore: 0.6 };
}

describe("summarizeMeasurementFrequencies", () => {
  it("頻度ごとにカテゴリをまとめ、短い順に並べる", () => {
    const results = [
      target(cat({ id: "lead", name: "鉛", frequency: "annually" })),
      target(cat({ id: "dust", name: "粉じん", frequency: "semi-annually" })),
      target(cat({ id: "heat-cold", name: "暑熱", frequency: "semi-monthly" })),
    ];
    const groups = summarizeMeasurementFrequencies(results);
    expect(groups.map((g) => g.label)).toEqual([
      "半月以内ごと",
      "6ヶ月以内ごと",
      "1年以内ごと",
    ]);
    expect(groups[0].categories).toEqual(["暑熱"]);
  });

  it("同一頻度の複数カテゴリを1行に集約する", () => {
    const results = [
      target(cat({ id: "dust", name: "粉じん", frequency: "semi-annually" })),
      target(cat({ id: "organic-solv", name: "有機溶剤", frequency: "semi-annually" })),
    ];
    const groups = summarizeMeasurementFrequencies(results);
    expect(groups).toHaveLength(1);
    expect(groups[0].categories).toEqual(["粉じん", "有機溶剤"]);
  });

  it("同名カテゴリの重複を除く", () => {
    const results = [
      target(cat({ id: "dust", name: "粉じん", frequency: "semi-annually" })),
      target(cat({ id: "dust", name: "粉じん", frequency: "semi-annually" })),
    ];
    expect(summarizeMeasurementFrequencies(results)[0].categories).toEqual(["粉じん"]);
  });

  it("空配列なら空配列", () => {
    expect(summarizeMeasurementFrequencies([])).toEqual([]);
  });
});

describe("hasManagementClassTarget", () => {
  it("管理区分ありの対象があればtrue", () => {
    expect(hasManagementClassTarget([target(cat({ hasManagementClass: true }))])).toBe(true);
  });
  it("すべて管理区分なしならfalse", () => {
    expect(
      hasManagementClassTarget([target(cat({ id: "noise", hasManagementClass: false }))])
    ).toBe(false);
  });
});

describe("hasSpecialControlSubstance", () => {
  it("特化物が含まれればtrue", () => {
    expect(
      hasSpecialControlSubstance([target(cat({ id: "specific-chem", name: "特定化学物質" }))])
    ).toBe(true);
  });
  it("特化物が無ければfalse", () => {
    expect(hasSpecialControlSubstance([target(cat({ id: "dust" }))])).toBe(false);
  });
});

describe("hasMeaningfulInput", () => {
  const base: TargetFinderInput = { industryGroup: "", processes: [], substances: [], keywords: "" };
  it("業種だけ選んだ状態は入力不足とみなす", () => {
    expect(hasMeaningfulInput({ ...base, industryGroup: "製造業（金属・機械）" })).toBe(false);
  });
  it("工程を1つでも選べば実質入力ありとみなす", () => {
    expect(hasMeaningfulInput({ ...base, processes: ["溶接・溶断"] })).toBe(true);
  });
  it("物質を入力すれば実質入力あり", () => {
    expect(hasMeaningfulInput({ ...base, substances: ["トルエン"] })).toBe(true);
  });
  it("空白だけの物質は入力なし扱い", () => {
    expect(hasMeaningfulInput({ ...base, substances: ["  "] })).toBe(false);
  });
  it("キーワードがあれば入力あり", () => {
    expect(hasMeaningfulInput({ ...base, keywords: "タンク内作業" })).toBe(true);
  });
});
