/**
 * 厚生労働省 CREATE-SIMPLE ver3.2.1 との一致検証。
 *
 * 期待値の出どころ:
 *   web/scripts/create-simple/oracle.py … 公式ツール CREATE-SIMPLE_ver3.2.1.xlsm の VBA
 *   （modCalc / modRASheet.RunRAinRAsheet / modRAReport の呼吸用保護具補正 / modFunction.CasSearch /
 *   wsRA.Worksheet_Change）を行単位で写したもの。ROUNDDOWN と LOG は Excel 本体の WorksheetFunction を
 *   COM で呼んで計算している（公式ブックは開かず、マクロは実行しない）。
 *   オラクル自体は、公式ブックの「結果一覧」シートに保存されていた計算例（No.1 フルフリルアルコール 90% /
 *   フルフラール 10%、現状・対策後）と全項目一致することを確認してから使っている（下の固定テストも参照）。
 * 設計基準: 「CREATE-SIMPLE の設計基準」（厚生労働省 2025年6月）2章〜7章、図表3〜43。
 */
import { describe, expect, it } from "vitest";
import substancesJson from "@/data/create-simple/substances.json";
import fixture from "@/__fixtures__/create-simple/official-parity-cases.json";
import { assessCreateSimple } from "./assess";
import { CS_DESCRIPTION_TEXT, type CsDescriptionKey } from "./description-text";
import { substanceFromOfficial, type OfficialSubstanceData, type OfficialSubstanceRecord } from "./official";
import type {
  CsAssessmentInput,
  CsComponent,
  CsConditions,
  CsSubstance,
  CsTargets,
  CsVolatility,
} from "./types";

type FixtureComponent =
  | { kind: "official"; cas: string; contentPercent: number; volatilityOverride?: number }
  | { kind: "record"; record: OfficialSubstanceRecord; contentPercent: number; volatilityOverride?: number }
  | { kind: "manual"; substance: CsSubstance; contentPercent: number };

interface ExpectedComponent {
  propertyType: number | null;
  acrMax: number | null;
  oel8h: number | null;
  oelShort: number | null;
  inh8: string;
  inhShort: string;
  ep8: number | null;
  epShort: number | null;
  dermal: string;
  oelDermal: number | null;
  absorption: number | null;
  total: string;
  physical: string;
  byClass: Record<string, number>;
  regulations: string[];
}

interface FixtureCase {
  id: string;
  note: string;
  mode: "sheet" | "report";
  targets: CsTargets;
  conditions: CsConditions;
  components: FixtureComponent[];
  expected: { components: ExpectedComponent[]; health: CsDescriptionKey[]; physicalTexts: CsDescriptionKey[] };
}

const data = substancesJson as unknown as OfficialSubstanceData;
const byCas = new Map(data.substances.map((r) => [r[0], r]));
const cases = (fixture as unknown as { cases: FixtureCase[] }).cases;

function toComponent(c: FixtureComponent, productType: CsConditions["productType"]): CsComponent {
  if (c.kind === "manual") return { substance: c.substance, contentPercent: c.contentPercent };
  const record = c.kind === "official" ? byCas.get(c.cas) : c.record;
  if (!record) throw new Error(`公式物質リストに CAS ${c.kind === "official" ? c.cas : "?"} がない`);
  const substance = substanceFromOfficial(record, productType);
  if (c.volatilityOverride !== undefined) substance.volatility = c.volatilityOverride as CsVolatility;
  return { substance, contentPercent: c.contentPercent };
}

/** 公式の表示（"-"）と実装の skipped を同じものとして比べるための正規化 */
function actualOf(input: CsAssessmentInput) {
  const result = assessCreateSimple(input);
  return {
    components: result.components.map((r) => ({
      propertyType: r.propertyType,
      acrMax: r.acrMax,
      oel8h: r.oel8h,
      oelShort: r.oelShort,
      inh8: r.inhalation.status === "ok" ? r.inhalation.level8h : "-",
      inhShort: r.inhalation.status === "ok" ? (r.inhalation.levelShort ?? "-") : "-",
      ep8: r.inhalation.status === "ok" ? r.inhalation.exposure8h : null,
      epShort: r.inhalation.status === "ok" ? r.inhalation.exposureShort : null,
      dermal: r.dermal.status === "ok" ? r.dermal.level : "-",
      oelDermal: r.dermal.status === "ok" ? r.dermal.oelDermal : null,
      absorption: r.dermal.status === "ok" ? r.dermal.absorption : null,
      total: r.total.status === "ok" ? r.total.level : "-",
      physical: r.physical.status === "ok" ? r.physical.level : "-",
      byClass: r.physical.status === "ok" ? (r.physical.byClass as Record<string, number>) : {},
      regulations: r.regulations,
    })),
    health: result.healthDescriptions,
    physicalTexts: result.physicalDescriptions,
  };
}

function normalizeExpected(e: ExpectedComponent, actualTargets: CsTargets) {
  return {
    ...e,
    // 公式は吸入・経皮のどちらも対象外のとき管理目標濃度・限界値を計算しない
    acrMax: actualTargets.inhalation || actualTargets.dermal ? e.acrMax : null,
    oel8h: actualTargets.inhalation || actualTargets.dermal ? e.oel8h : null,
    oelShort: actualTargets.inhalation || actualTargets.dermal ? e.oelShort : null,
  };
}

describe("CREATE-SIMPLE ver3.2.1 との一致（公式 VBA の移植オラクル＋Excel 本体の丸め）", () => {
  it(`検証ケースが十分にある（${cases.length} ケース）`, () => {
    expect(cases.length).toBeGreaterThanOrEqual(2000);
    const componentResults = cases.reduce((n, c) => n + c.components.length, 0);
    expect(componentResults).toBeGreaterThanOrEqual(3000);
  });

  it("全ケースで公式と同じ結果になる（不一致 0 件）", () => {
    const mismatches: string[] = [];
    for (const c of cases) {
      const input: CsAssessmentInput = {
        conditions: c.conditions,
        components: c.components.map((x) => toComponent(x, c.conditions.productType)),
        targets: c.targets,
        mode: c.mode,
      };
      const actual = actualOf(input);
      const expected = {
        components: c.expected.components.map((e) => normalizeExpected(e, c.targets)),
        health: c.expected.health.map((k) => CS_DESCRIPTION_TEXT[k]),
        physicalTexts: c.expected.physicalTexts.map((k) => CS_DESCRIPTION_TEXT[k]),
      };
      try {
        expect(actual).toEqual(expected);
      } catch {
        mismatches.push(`${c.id} ${c.note}\n  expected=${JSON.stringify(expected.components)}\n  actual  =${JSON.stringify(actual.components)}`);
      }
    }
    expect(mismatches.slice(0, 5).join("\n")).toBe("");
    expect(mismatches.length).toBe(0);
  });
});

describe("公式ブックに保存されていた計算例（結果一覧シート No.1）と完全一致", () => {
  // 公式の表示値: 吸入8h 0.005～0.05 ppm / 0.003～0.03 ppm、短時間 0.2 / 0.12 ppm、経皮ばく露限界値 6.015 / 5.892 mg/day、
  // 経皮吸収量 3610 / 278 mg/day（対策後 180 / 13.9）、リスクレベル Ⅱ-A・Ⅱ・Ⅳ・Ⅳ・Ⅱ（対策後 フルフラールは経皮Ⅲ・合計Ⅲ）
  const conditions: CsConditions = {
    productType: 1,
    amountLevel: 3,
    spray: false,
    largeArea: false,
    ventilation: "E",
    controlVelocityConfirmed: true,
    workingHours: 4,
    frequencyType: "weekly",
    frequencyDays: 3,
    exposureVariation: "small",
    contactArea: 480,
    glove: "noInfo",
    gloveTraining: "none",
    processTemperature: null,
    ignitionSourceRemoved: false,
    explosiveAtmospherePrevented: false,
    organicOrMetalNearby: false,
    airOrWaterContact: false,
  };
  const components = (): CsComponent[] => [
    { substance: substanceFromOfficial(byCas.get("98-00-0")!, 1), contentPercent: 90 },
    { substance: substanceFromOfficial(byCas.get("98-01-1")!, 1), contentPercent: 10 },
  ];

  it("現状", () => {
    const r = assessCreateSimple({ conditions, components: components() });
    const [fa, ff] = r.components;
    expect(fa.oel8h).toBe(0.2);
    expect(String(fa.oelShort)).toBe("0.6000000000000001"); // 公式表示は「0.6 ppm」（VBA の文字列化で15桁）
    expect(fa.inhalation).toMatchObject({ status: "ok", exposure8h: 0.05, exposureShort: 0.2, level8h: "II-A", levelShort: "II" });
    expect(ff.inhalation).toMatchObject({ status: "ok", exposure8h: 0.03, exposureShort: 0.12, level8h: "II-A", levelShort: "II" });
    expect(fa.dermal).toMatchObject({ status: "ok", oelDermal: 6.015, absorption: 3610, level: "IV" });
    expect(ff.dermal).toMatchObject({ status: "ok", oelDermal: 5.892, absorption: 278, level: "IV" });
    expect(fa.total).toMatchObject({ level: "IV" });
    expect(ff.total).toMatchObject({ level: "IV" });
    expect(fa.physical).toMatchObject({ level: "II" });
    expect(ff.physical).toMatchObject({ level: "II" });
    expect(r.healthDescriptions[0]).toBe(CS_DESCRIPTION_TEXT.inhalationRiskDescriptionConcentrationStandard2A);
    expect(r.healthDescriptions[1]).toBe(CS_DESCRIPTION_TEXT.inhalationRiskDescriptionConcentrationStandardShortTerm2A);
    expect(r.physicalDescriptions).toEqual([CS_DESCRIPTION_TEXT.flamLiqRiskDescription2]);
  });

  it("対策後（耐透過性手袋＋十分な教育）", () => {
    const r = assessCreateSimple({
      conditions: { ...conditions, glove: "resistant", gloveTraining: "thorough" },
      components: components(),
    });
    const [fa, ff] = r.components;
    expect(fa.dermal).toMatchObject({ absorption: 180, level: "IV" });
    expect(ff.dermal).toMatchObject({ absorption: 13.9, level: "III" });
    expect(fa.total).toMatchObject({ level: "IV" });
    expect(ff.total).toMatchObject({ level: "III" });
  });
});
