import { describe, expect, it } from "vitest";
import substancesJson from "@/data/create-simple/substances.json";
import { assessCreateSimple } from "./assess";
import { excelRoundDown, roundDownSignificant, vbCInt } from "./excel";
import { planImprovements, suggestImprovements, summarize } from "./improvements";
import {
  substanceFromOfficial,
  volatilityAtProcessTemperature,
  volatilityFromBoilingPoint,
  type OfficialSubstanceData,
} from "./official";
import { CS_CSV_HEADER, loadRecords, parseRecords, recordsToCsv, saveRecord, deleteRecord } from "./records";
import { buildSearchIndex, searchSubstances } from "./search";
import type { CsConditions } from "./types";

const data = substancesJson as unknown as OfficialSubstanceData;
const byCas = new Map(data.substances.map((r) => [r[0], r]));

describe("Excel ROUNDDOWN の再現（Excel 本体で確認した値）", () => {
  it.each([
    [0.049999999999999996, 4, 0.05],
    [434.99999999999994, 0, 435],
    [56.99999999999999, 0, 57],
    [0.29999999999999993, 2, 0.3],
    [2.9999999999999996, 0, 3],
    [1 / 3, 2, 0.33],
    [0.12345678901234566, 16, 0.123456789012346],
    [0.0499999999999, 4, 0.0499],
    [999.9999999999999, 0, 1000],
  ])("ROUNDDOWN(%s, %s) = %s", (x, d, expected) => {
    expect(excelRoundDown(x, d)).toBe(expected);
  });

  it("有効数字3桁・4桁の切り捨て", () => {
    expect(roundDownSignificant(3615.9, 2)).toBe(3610);
    expect(roundDownSignificant(6.01569, 3)).toBe(6.015);
    expect(roundDownSignificant(0.0123456, 2)).toBe(0.0123);
  });

  it("VBA CInt は偶数丸め", () => {
    expect(vbCInt(49.5)).toBe(50);
    expect(vbCInt(50.5)).toBe(50);
    expect(vbCInt(148.5)).toBe(148);
    expect(vbCInt(149.5)).toBe(150);
    expect(Math.abs(vbCInt(-0.5))).toBe(0);
  });
});

describe("揮発性の判定", () => {
  it("沸点（室温）", () => {
    expect(volatilityFromBoilingPoint(49.4)).toBe(1);
    expect(volatilityFromBoilingPoint(49.5)).toBe(2);
    expect(volatilityFromBoilingPoint(149.5)).toBe(3);
    expect(volatilityFromBoilingPoint(150)).toBe(3);
  });
  it("作業温度が室温以外（設計基準 3.1 のケース①②）", () => {
    // 沸点200℃の物質: 20℃では低揮発性、50℃では中揮発性、100℃では高揮発性
    expect(volatilityAtProcessTemperature(200, 20)).toBe(3);
    expect(volatilityAtProcessTemperature(200, 50)).toBe(2);
    expect(volatilityAtProcessTemperature(200, 100)).toBe(1);
  });
});

const baseConditions: CsConditions = {
  productType: 1,
  amountLevel: 2,
  spray: false,
  largeArea: false,
  ventilation: "B",
  controlVelocityConfirmed: false,
  workingHours: 8,
  frequencyType: "weekly",
  frequencyDays: 5,
  exposureVariation: "small",
  contactArea: 480,
  glove: "none",
  gloveTraining: "none",
  processTemperature: null,
  ignitionSourceRemoved: false,
  explosiveAtmospherePrevented: false,
  organicOrMetalNearby: true,
  airOrWaterContact: true,
};

describe("下げる対策の再計算", () => {
  it("トルエン・中量・全体換気: 局所排気や手袋で下がる対策が出る", () => {
    const toluene = substanceFromOfficial(byCas.get("108-88-3")!, 1);
    const input = { conditions: baseConditions, components: [{ substance: toluene, contentPercent: 100 }] };
    const before = summarize(assessCreateSimple(input));
    const list = suggestImprovements(input);
    expect(list.length).toBeGreaterThan(0);
    for (const item of list) {
      expect(item.changes.length).toBeGreaterThan(0);
      // 提案に従って再評価した結果が、表示している after と同じ
      expect(summarize(assessCreateSimple({ ...input, conditions: item.conditions, mode: item.mode }))).toEqual(item.after);
      expect(item.before).toEqual(before);
    }
    expect(list.some((i) => i.category === "ventilation")).toBe(true);
    // 引火性液体 区分2・中量: どちらか一方だけではⅣのまま、両方行うとⅢ
    expect(list.some((i) => i.id === "ignition")).toBe(false);
    expect(list.find((i) => i.id === "ignition-and-atmosphere")?.changes).toEqual([{ route: "physical", from: "IV", to: "III" }]);
    const plan = planImprovements(input);
    expect(plan).not.toBeNull();
    expect(plan!.steps.length).toBeGreaterThanOrEqual(2);
    expect(summarize(assessCreateSimple({ ...input, conditions: plan!.conditions }))).toEqual(plan!.after);
  });
});

describe("記録と CSV", () => {
  it("保存・読み込み・削除・CSV", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    const acetone = substanceFromOfficial(byCas.get("67-64-1")!, 1);
    const saved = saveRecord({ title: "洗浄作業, 第1工場", conditions: baseConditions, components: [{ substance: acetone, contentPercent: 100 }] }, storage);
    expect(loadRecords(storage)).toHaveLength(1);
    const csv = recordsToCsv(loadRecords(storage));
    const lines = csv.split("\r\n");
    expect(lines[0].split(",")).toHaveLength(CS_CSV_HEADER.length);
    expect(lines[1]).toContain('"洗浄作業, 第1工場"');
    expect(lines[1]).toContain("アセトン");
    deleteRecord(saved.id, storage);
    expect(loadRecords(storage)).toHaveLength(0);
    expect(parseRecords("{broken")).toEqual([]);
  });
});

describe("物質検索", () => {
  const index = buildSearchIndex(data.substances);
  it("CAS番号（ハイフンあり・なし）", () => {
    expect(searchSubstances(index, "108-88-3")[0][0]).toBe("108-88-3");
    expect(searchSubstances(index, "108883")[0][0]).toBe("108-88-3");
  });
  it("名前（ひらがな・全角半角の違いを吸収）", () => {
    expect(searchSubstances(index, "トルエン")[0][1]).toBe("トルエン");
    expect(searchSubstances(index, "とるえん")[0][1]).toBe("トルエン");
    expect(searchSubstances(index, "2-プロパノール").length).toBeGreaterThan(0);
  });
});
