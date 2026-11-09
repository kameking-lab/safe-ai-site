/**
 * CREATE-SIMPLE ver3.2.1「リスクアセスメントシート」の判定（VBA modRASheet.RunRAinRAsheet の移植）。
 * 純粋関数。画面からもテストからも同じ関数を呼ぶ。
 */
import {
  NA,
  acrMax as calcAcrMax,
  concentrationCoeff,
  dermalAbsorption,
  exposureBands,
  flamGasLevel,
  flamLiqLevel,
  flamSolLevel,
  gasesUnderPressureLevel,
  level4,
  level8h,
  oelDermal as calcOelDermal,
  oxGasLevel,
  oxLiqSolLevel,
  selectOel8h,
  selectOelShort,
  selfHeatLevel,
  selfReactLevel,
  toMgPerCm3,
  toPascals,
  unitFor,
  waterReactLevel,
  type PhysicalLevel,
} from "./calc";
import { physicalDescription, healthDescriptions } from "./descriptions";
import type {
  CsAssessmentInput,
  CsAssessmentResult,
  CsComponentResult,
  CsConditions,
  CsPhysicalClass,
  CsPropertyType,
  CsRiskLevel,
  CsSubstance,
  CsTargets,
  CsVolatility,
} from "./types";

const VENTILATION_COEFF = { A: 4, B: 3, C: 1, D: 0.1, E: 0.01, F: 0.001 } as const;
const GLOVE_TYPE_COEFF = { none: 1, noInfo: 1, resistant: 0.2 } as const;
const GLOVE_TRAINING_COEFF = { none: 1, basic: 0.5, thorough: 0.25 } as const;
const FIT_COEFF = { none: 2, sealCheck: 1.5, fitTest: 1 } as const;

const DEFAULT_TARGETS: CsTargets = { inhalation: true, dermal: true, physical: true };

/** STEP3 の回答から係数を求める（modRASheet.ReadDataFromRASheetInSTEP3） */
export function stepThreeCoefficients(conditions: CsConditions, mode: "sheet" | "report") {
  const amountLevel = conditions.amountLevel;
  const sprayCoeff = conditions.spray ? 10 : 1;
  // 液体かつ中量以上の場合だけ塗布面積の係数を使う
  const workingAreaCoeff =
    conditions.productType === 1 && (amountLevel === 1 || amountLevel === 2) ? (conditions.largeArea ? 10 : 1) : 1;
  let ventilationCoeff: number = VENTILATION_COEFF[conditions.ventilation];
  if (ventilationCoeff === 0.1 && !conditions.controlVelocityConfirmed) ventilationCoeff = 0.5;
  if (ventilationCoeff === 0.01 && !conditions.controlVelocityConfirmed) ventilationCoeff = 0.1;
  const gloveType = GLOVE_TYPE_COEFF[conditions.glove];
  const gloveCoeff = gloveType === 0.2 ? gloveType * GLOVE_TRAINING_COEFF[conditions.gloveTraining] : 1;
  let respiratorCoeff = 1;
  if (mode === "report" && conditions.respirator) {
    const factor = conditions.respirator.protectionFactor;
    // ルーズフィット形はフィットテスト不要（modRAReport: 2024/3修正）
    if (factor === 11 || factor === 20 || factor === 25) respiratorCoeff = 1 / factor;
    else respiratorCoeff = (1 / factor) * FIT_COEFF[conditions.respirator.fit];
  }
  return {
    amountLevel,
    sprayCoeff,
    workingAreaCoeff,
    ventilationCoeff,
    workingHours: conditions.workingHours,
    frequencyWeekly: conditions.frequencyType === "weekly",
    frequencyDays: conditions.frequencyDays,
    exposureVariationCoeff: conditions.exposureVariation === "large" ? 6 : 4,
    respiratorCoeff,
    surfaceArea: conditions.contactArea ?? NA,
    gloveCoeff,
    processTemp: conditions.processTemperature ?? 20,
    ignitionRemoved: conditions.ignitionSourceRemoved,
    atmospherePrevented: conditions.explosiveAtmospherePrevented,
    noOrganicNearby: !conditions.organicOrMetalNearby,
    noAirWaterContact: !conditions.airOrWaterContact,
  };
}

/** 公式 GetRegulationInfoInRAsheet（備考欄の法規制・リスクレベルS） */
export function regulationInfo(substance: CsSubstance, contentPercent: number | null): string[] {
  const reg = substance.regulatory;
  if (!reg) return [];
  const conc = contentPercent ?? 100;
  const g = substance.ghs;
  const skinFlag =
    ["1A", "1B", "1C", "1"].includes(g.skinCorrOrIrrit ?? "") ||
    g.eyeCorrOrIrrit === "1" ||
    ["1", "1A", "1B"].includes(g.respSens ?? "") ||
    ["1", "1A", "1B"].includes(g.skinSens ?? "");
  const parse = (s: string, fallback: number) => {
    if (s.trim() === "") return fallback;
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  };
  const skinCutoff = parse(reg.skinCutoff, 1);
  const specifiedCutoff = parse(reg.specifiedCutoff, 1);
  const organicCutoff = 5;
  const out: string[] = [];
  if (reg.specifiedClass1 === "1" && conc > specifiedCutoff) out.push("特化則（第１類物質）");
  if (reg.specifiedClass2 === "1" && conc > specifiedCutoff) out.push("特化則（第２類物質）");
  if (reg.specifiedClass3 === "1" && conc > specifiedCutoff) out.push("特化則（第３類物質）");
  if (reg.organicClass1 === "1" && conc > organicCutoff) out.push("有機則（第１種有機溶剤）");
  if (reg.organicClass2 === "1" && conc > organicCutoff) out.push("有機則（第２種有機溶剤）");
  if (reg.organicClass3 === "1" && conc > organicCutoff) out.push("有機則（第３種有機溶剤）");
  if (reg.lead === "1") out.push("鉛等");
  if (reg.tetraalkylLead === "1") out.push("四アルキル鉛等");
  if ((reg.skinEffect === "1" || skinFlag) && conc >= skinCutoff && reg.skinEffect !== "0" && reg.skinEffect !== "2") {
    out.push("皮膚等障害化学物質");
  }
  if (reg.carcinogenic === "1") out.push("がん原性物質");
  if (reg.concentrationStandard === "1") out.push("濃度基準値設定物質");
  if (g.skinCorrOrIrrit !== undefined || g.eyeCorrOrIrrit !== undefined || g.skinSens !== undefined) {
    out.push("リスクレベルS");
  }
  return out;
}

/** 蒸気圧のある固体を液体製品で扱う場合の性状・揮発性（RunRAinRAsheet 冒頭） */
function effectiveProperty(
  productType: CsPropertyType,
  propertyType: CsPropertyType | null,
  volatility: CsVolatility | null,
  vaporPressurePa: number,
): { propertyType: CsPropertyType | null; volatility: CsVolatility | null } {
  if (productType === 1 && propertyType === 2 && vaporPressurePa >= 0.5) {
    const v: CsVolatility = vaporPressurePa > 25000 ? 1 : vaporPressurePa >= 500 ? 2 : 3;
    return { propertyType: 1, volatility: v };
  }
  return { propertyType, volatility };
}

const PHYSICAL_ORDER: CsPhysicalClass[] = [
  "explosives",
  "flamGas",
  "aerosol",
  "oxGas",
  "gasesUnderPressure",
  "flamLiq",
  "flamSol",
  "selfReact",
  "pyrLiq",
  "pyrSol",
  "selfHeat",
  "waterReact",
  "oxLiq",
  "oxSol",
  "orgPerox",
  "metCorr",
  "inertExplosives",
];

function physicalByClass(
  substance: CsSubstance,
  volatility: number,
  k: ReturnType<typeof stepThreeCoefficients>,
): Partial<Record<CsPhysicalClass, PhysicalLevel>> {
  const g = substance.ghs;
  const a = k.amountLevel;
  const out: Partial<Record<CsPhysicalClass, PhysicalLevel>> = {};
  if (g.explosives !== undefined) out.explosives = 4;
  if (g.flamGas !== undefined) out.flamGas = flamGasLevel(g.flamGas, a, k.ignitionRemoved, k.atmospherePrevented);
  if (g.aerosol !== undefined) out.aerosol = flamGasLevel(g.aerosol, a, k.ignitionRemoved, k.atmospherePrevented);
  if (g.oxGas !== undefined) out.oxGas = oxGasLevel(a);
  if (g.gasesUnderPressure !== undefined) out.gasesUnderPressure = gasesUnderPressureLevel(a);
  const fl = flamLiqLevel(g.flamLiq, substance.flashPoint ?? NA, k.processTemp, a, k.ignitionRemoved, k.atmospherePrevented);
  if (fl !== null) out.flamLiq = fl;
  if (g.flamSol !== undefined) out.flamSol = flamSolLevel(g.flamSol, a, k.ignitionRemoved, k.atmospherePrevented, volatility);
  if (g.selfReact !== undefined) out.selfReact = selfReactLevel(g.selfReact, a);
  if (g.pyrLiq !== undefined) out.pyrLiq = 4;
  if (g.pyrSol !== undefined) out.pyrSol = 4;
  if (g.selfHeat !== undefined) out.selfHeat = selfHeatLevel(a, k.noAirWaterContact);
  if (g.waterReact !== undefined) out.waterReact = waterReactLevel(g.waterReact, a, k.ignitionRemoved, k.noAirWaterContact);
  if (g.oxLiq !== undefined) out.oxLiq = oxLiqSolLevel(g.oxLiq, a, k.noOrganicNearby);
  if (g.oxSol !== undefined) out.oxSol = oxLiqSolLevel(g.oxSol, a, k.noOrganicNearby);
  if (g.orgPerox !== undefined) out.orgPerox = selfReactLevel(g.orgPerox, a);
  if (g.metCorr !== undefined) out.metCorr = 2;
  if (g.inertExplosives !== undefined) out.inertExplosives = 4;
  return out;
}

const LEVEL_FROM_NUMBER: Record<number, CsRiskLevel> = { 4: "IV", 3: "III", 2: "II" };

export function riskLevelToNumber(level: CsRiskLevel | null | undefined): number {
  switch (level) {
    case "IV":
      return 4;
    case "III":
      return 3;
    case "II-B":
      return 2.5;
    case "II-A":
    case "II":
      return 2;
    case "I":
      return 1;
    default:
      return 0;
  }
}

export function assessCreateSimple(input: CsAssessmentInput): CsAssessmentResult {
  const targets = input.targets ?? DEFAULT_TARGETS;
  const mode = input.mode ?? "sheet";
  const conditions = input.conditions;
  const productType = conditions.productType;
  const k = stepThreeCoefficients(conditions, mode);
  const solutionSolidVpThreshold = mode === "report" ? 5 : 0.5;

  let csLong = 0;
  let csShort = 0;
  let otherLong = 0;
  let otherShort = 0;
  let lastDermal: CsRiskLevel | null = null;
  const physicalTexts: string[] = [];
  const results: CsComponentResult[] = [];

  for (const component of input.components) {
    const s = component.substance;
    const vaporPressurePa = s.vaporPressure ? toPascals(s.vaporPressure.value, s.vaporPressure.unit) : 0;
    const eff = effectiveProperty(productType, s.propertyType, s.volatility, vaporPressurePa);
    const propertyType = eff.propertyType;
    const volatility = eff.volatility;
    const regulations = regulationInfo(s, component.contentPercent);

    const result: CsComponentResult = {
      name: s.name,
      cas: s.cas,
      propertyType,
      volatility,
      unit: propertyType === null ? null : unitFor(propertyType),
      acrMax: null,
      oel8h: null,
      oelShort: null,
      inhalation: { status: "skipped", reason: "not-target" },
      dermal: { status: "skipped", reason: "not-target" },
      total: { status: "skipped", reason: "not-target" },
      physical: { status: "skipped", reason: "not-target" },
      regulations,
    };

    let rcrInh = 0;
    let rcrDermal = 0;
    let riskLong: CsRiskLevel | null = null;
    let riskShort: CsRiskLevel | null = null;
    let riskDermal: CsRiskLevel | null = null;

    let acr = NA;
    let sel8 = NA;
    let selShort = NA;
    if (propertyType !== null && (targets.inhalation || targets.dermal)) {
      acr = calcAcrMax(s.ghs, propertyType);
      sel8 = selectOel8h(propertyType, s.oel, s.oelSource);
      selShort = selectOelShort(propertyType, s.oel, s.oelSource, sel8, acr);
      result.acrMax = acr;
      result.oel8h = sel8 === NA ? null : sel8;
      result.oelShort = selShort === NA ? null : selShort;
    }

    // ---- 吸入
    if (targets.inhalation) {
      if (propertyType === null) {
        result.inhalation = { status: "skipped", reason: "property-type-missing" };
      } else if (propertyType === 3) {
        result.inhalation = { status: "skipped", reason: "gas" };
      } else if (productType === 2 && propertyType === 1) {
        result.inhalation = { status: "skipped", reason: "liquid-in-solid-product" };
      } else if (volatility === null) {
        result.inhalation = { status: "skipped", reason: "volatility-missing" };
      } else {
        let exposure8h: number;
        let exposureShort: number;
        if (productType === 1 && propertyType === 2 && vaporPressurePa < solutionSolidVpThreshold && k.sprayCoeff === 1) {
          // 溶液中の固体（蒸気圧が低い・飛散しやすい作業なし）はばく露をゼロとして扱う（設計基準 3.1・図表11）
          exposure8h = 0;
          exposureShort = 0;
        } else {
          const bands = exposureBands({
            propertyType,
            volatility,
            shortTermEffect: s.ghs.respSens !== undefined,
            concentrationCoeff: concentrationCoeff(component.contentPercent),
            amountLevel: k.amountLevel,
            sprayCoeff: k.sprayCoeff,
            ventilationCoeff: k.ventilationCoeff,
            workingAreaCoeff: k.workingAreaCoeff,
            frequencyWeekly: k.frequencyWeekly,
            frequencyDays: k.frequencyDays,
            workingHours: k.workingHours,
            exposureVariationCoeff: k.exposureVariationCoeff,
            respiratorCoeff: k.respiratorCoeff,
          });
          exposure8h = bands.exposure8h;
          exposureShort = bands.exposureShort;
        }
        const standard = sel8 > 0 ? sel8 : acr;
        rcrInh = exposure8h / standard;
        riskLong = level8h(rcrInh);
        let rcrShort: number | null = null;
        if (selShort !== NA) {
          rcrShort = exposureShort / selShort;
          riskShort = level4(rcrShort);
        }
        result.inhalation = {
          status: "ok",
          unit: unitFor(propertyType),
          exposure8h,
          exposureShort,
          level8h: riskLong,
          levelShort: riskShort,
          rcr8h: rcrInh,
          rcrShort,
        };
      }
    }

    // ---- 経皮吸収
    if (targets.dermal) {
      if (propertyType === null) {
        result.dermal = { status: "skipped", reason: "property-type-missing" };
      } else if (propertyType === 3) {
        result.dermal = { status: "skipped", reason: "gas" };
      } else if (productType === 2 && propertyType === 1) {
        result.dermal = { status: "skipped", reason: "liquid-in-solid-product" };
      } else if (conditions.contactArea === null) {
        result.dermal = { status: "skipped", reason: "contact-area-missing" };
      } else {
        const solubility = s.solubility ? toMgPerCm3(s.solubility.value, s.solubility.unit) : NA;
        if (solubility === null) {
          result.dermal = { status: "skipped", reason: "solubility-unit-unknown" };
        } else {
          const mw = s.molecularWeight ?? NA;
          const absorption = dermalAbsorption(
            mw,
            vaporPressurePa,
            solubility,
            s.logKow ?? NA,
            propertyType,
            k.workingHours,
            k.surfaceArea,
            k.gloveCoeff,
          );
          const oelD = calcOelDermal(sel8, acr, propertyType, mw);
          if (absorption === NA || oelD === null || !(oelD > 0)) {
            result.dermal = { status: "skipped", reason: "dermal-data-missing" };
          } else {
            rcrDermal = absorption / oelD;
            riskDermal = level4(rcrDermal);
            result.dermal = { status: "ok", oelDermal: oelD, absorption, level: riskDermal, rcr: rcrDermal };
          }
        }
      }
    }

    // ---- 合計（吸入＋経皮）
    // 経皮吸収が計算できない（「-」）場合、公式ツールは経皮の比を 0 として合算する
    if (targets.inhalation && targets.dermal) {
      if (result.inhalation.status === "skipped") {
        result.total = { status: "skipped", reason: result.inhalation.reason };
      } else if (result.dermal.status === "skipped" && result.dermal.reason === "contact-area-missing") {
        // 公式ツールは接触面積（Q8）が未回答だと判定を止めるため、合計も出さない
        result.total = { status: "skipped", reason: "contact-area-missing" };
      } else {
        const rcr = rcrInh + rcrDermal;
        result.total = { status: "ok", level: level4(rcr), rcr };
      }
    }

    // 判定結果の文（濃度基準値設定物質とそれ以外を分けて最大値を取る）
    if (regulations.includes("濃度基準値設定物質")) {
      csLong = Math.max(csLong, riskLevelToNumber(riskLong));
      csShort = Math.max(csShort, riskLevelToNumber(riskShort));
    } else {
      otherLong = Math.max(otherLong, riskLevelToNumber(riskLong));
      otherShort = Math.max(otherShort, riskLevelToNumber(riskShort));
    }

    // ---- 危険性（爆発・火災等）
    if (targets.physical) {
      if (productType === 2 && (propertyType === 1 || propertyType === 3)) {
        result.physical = { status: "skipped", reason: "liquid-in-solid-product" };
      } else if (productType === 2 && volatility === null) {
        result.physical = { status: "skipped", reason: "volatility-missing" };
      } else {
        // 揮発性未選択の行は VBA では -9999（0 以外）として扱われる
        const byClass = physicalByClass(s, volatility ?? NA, k);
        let max = 0;
        const descriptions: string[] = [];
        for (const cls of PHYSICAL_ORDER) {
          const lv = byClass[cls];
          if (lv === undefined) continue;
          if (lv > max) max = lv;
          const text = physicalDescription(cls, lv);
          if (text) descriptions.push(text);
        }
        physicalTexts.push(...descriptions);
        result.physical = { status: "ok", level: LEVEL_FROM_NUMBER[max] ?? "I", byClass, descriptions };
      }
    }

    lastDermal = riskDermal;
    results.push(result);
  }

  const skinRelated = results.some((r) =>
    r.regulations.some((x) =>
      ["皮膚等障害化学物質", "特化則（第１類物質）", "特化則（第２類物質）", "特化則（第３類物質）"].includes(x),
    ),
  );

  return {
    components: results,
    healthDescriptions: healthDescriptions({ csLong, csShort, otherLong, otherShort, skinRelated, lastDermal }),
    physicalDescriptions: [...new Set(physicalTexts)],
  };
}
