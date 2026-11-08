/**
 * 公式「判定結果」欄の文を組み立てる（modRASheet.RunRAinRAsheet の末尾と modCalc の各危険性関数）。
 */
import { CS_DESCRIPTION_TEXT as T } from "./description-text";
import type { CsPhysicalClass, CsRiskLevel } from "./types";

type Level = 1 | 2 | 3 | 4;

export function physicalDescription(cls: CsPhysicalClass, level: Level): string {
  switch (cls) {
    case "explosives":
      return T.explosivesRiskDescription4;
    case "gasesUnderPressure":
      return T.gasesUnderPressureRiskDescription;
    case "pyrLiq":
      return T.pyrLiqRiskDescription;
    case "pyrSol":
      return T.pyrSolRiskDescription;
    case "metCorr":
      return T.metCorrRiskDescription;
    case "inertExplosives":
      return T.inertExplosivesRiskDescription;
    // エアゾールは Excel ツールでは可燃性ガスの関数で判定されるため、文も可燃性ガスのもの
    case "aerosol":
    case "flamGas":
      return T[`flamGasRiskDescription${level}`];
    case "oxGas":
      return T[`oxGasRiskDescription${level}`];
    case "flamLiq":
      return T[`flamLiqRiskDescription${level}`];
    case "flamSol":
      return T[`flamSolRiskDescription${level}`];
    case "selfReact":
      return T[`selfReactRiskDescription${level}`];
    case "selfHeat":
      return T[`selfHeatRiskDescription${level}`];
    case "waterReact":
      return T[`waterReactRiskDescription${level}`];
    case "oxLiq":
      return T[`oxLiqRiskDescription${level}`];
    case "oxSol":
      return T[`oxSolRiskDescription${level}`];
    case "orgPerox":
      return T[`orgPeroxRiskDescription${level}`];
  }
}

export interface HealthDescriptionInput {
  /** 濃度基準値設定物質の長時間・短時間の最大リスク（4, 3, 2.5, 2, 1, 0） */
  csLong: number;
  csShort: number;
  otherLong: number;
  otherShort: number;
  /** 皮膚等障害化学物質・特化則の物質を含む */
  skinRelated: boolean;
  /** 最後の成分の経皮吸収リスクレベル（公式ツールの実装どおり） */
  lastDermal: CsRiskLevel | null;
}

export function healthDescriptions(input: HealthDescriptionInput): string[] {
  const out: string[] = [];
  const csLong: Record<number, string> = {
    4: T.inhalationRiskDescriptionConcentrationStandard4,
    3: T.inhalationRiskDescriptionConcentrationStandard3,
    2.5: T.inhalationRiskDescriptionConcentrationStandard2B,
    2: T.inhalationRiskDescriptionConcentrationStandard2A,
    1: T.inhalationRiskDescriptionConcentrationStandard1,
  };
  const csShort: Record<number, string> = {
    4: T.inhalationRiskDescriptionConcentrationStandardShortTerm4,
    3: T.inhalationRiskDescriptionConcentrationStandardShortTerm3,
    2: T.inhalationRiskDescriptionConcentrationStandardShortTerm2A,
    1: T.inhalationRiskDescriptionConcentrationStandardShortTerm1,
  };
  const otherLong: Record<number, string> = {
    4: T.inhalationRiskDescription4,
    3: T.inhalationRiskDescription3,
    2.5: T.inhalationRiskDescription2B,
    2: T.inhalationRiskDescription2A,
    1: T.inhalationRiskDescription1,
  };
  const otherShort: Record<number, string> = {
    4: T.inhalationRiskDescriptionShortTerm4,
    3: T.inhalationRiskDescriptionShortTerm3,
    2: T.inhalationRiskDescriptionShortTerm2A,
    1: T.inhalationRiskDescription1ShortTerm1,
  };
  const push = (text: string | undefined) => {
    if (text && !out.includes(text)) out.push(text);
  };
  push(csLong[input.csLong]);
  push(csShort[input.csShort]);
  push(otherLong[input.otherLong]);
  push(otherShort[input.otherShort]);
  if (input.skinRelated) {
    push(T.skinRiskDescription);
  } else {
    const dermal: Partial<Record<CsRiskLevel, string>> = {
      IV: T.dermalRiskDescription4,
      III: T.dermalRiskDescription3,
      II: T.dermalRiskDescription2,
      I: T.dermalRiskDescription1,
    };
    if (input.lastDermal) push(dermal[input.lastDermal]);
  }
  return out;
}
