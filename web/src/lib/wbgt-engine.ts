/**
 * WBGT (Wet-Bulb Globe Temperature) calculation engine.
 *
 * Implements the JIS Z 8504 / ISO 7243 formulas:
 *   Outdoor (with solar load): WBGT = 0.7 * Tnwb + 0.2 * Tg + 0.1 * Ta
 *   Indoor / no solar load   : WBGT = 0.7 * Tnwb + 0.3 * Tg
 *
 * Tnwb is the natural wet-bulb temperature. When only air temperature
 * and relative humidity are available, we approximate Tnwb using the
 * Stull (2011) one-line formula, which is accurate to ~0.3 K for the
 * range 5 < Ta < 50 deg C and 5 < RH < 99 %.
 *
 * Risk-level thresholds follow the JSOH occupational heat-stress
 * reference values for acclimatized vs. non-acclimatized workers, with
 * work-intensity adjustment. These are the same thresholds cited in the
 * MHLW R7 (2025) "Heat Illness Prevention Manual for the Workplace".
 *
 * This module is intentionally pure (no I/O, no React) so it can be
 * exercised from API routes, SSR, and unit tests alike.
 */

import type {
  AcclimatizationState,
  Recommendation,
  RiskAssessment,
  RiskLevel,
  WbgtInput,
  WbgtResult,
  WorkIntensity,
} from "@/types/heat-illness";

const STULL_C1 = 0.151977;
const STULL_C2 = 8.313659;
const STULL_C3 = 1.676331;
const STULL_C4 = 0.00391838;
const STULL_C5 = 0.023101;
const STULL_C6 = 4.686035;

/**
 * Stull (2011) natural wet-bulb approximation.
 * Returns Celsius. Inputs: dry-bulb Celsius and relative humidity 0-100.
 */
export function estimateNaturalWetBulb(airTempC: number, humidity: number): number {
  if (humidity < 0 || humidity > 100) {
    throw new RangeError("humidity must be between 0 and 100");
  }
  const T = airTempC;
  const RH = humidity;
  const t1 = T * Math.atan(STULL_C1 * Math.sqrt(RH + STULL_C2));
  const t2 = Math.atan(T + RH);
  const t3 = Math.atan(RH - STULL_C3);
  const t4 = STULL_C4 * Math.pow(RH, 1.5) * Math.atan(STULL_C5 * RH);
  return t1 + t2 - t3 + t4 - STULL_C6;
}

/**
 * Approximate globe temperature when no measurement is available.
 * Uses the Liljegren (2008) simplification: Tg ~ Ta + k*S/(wind+1),
 * with k ~ 0.025 for typical outdoor conditions. Indoor environments
 * with negligible solar load fall back to Ta + 1.
 */
function estimateGlobeTemp(
  airTempC: number,
  solarRadiationWm2: number | undefined,
  windSpeedMps: number | undefined,
  environment: "outdoor" | "indoor",
): number {
  if (environment === "indoor") {
    return airTempC + 1;
  }
  const solar = solarRadiationWm2 ?? 600;
  const wind = Math.max(windSpeedMps ?? 1, 0.3);
  return airTempC + 0.025 * (solar / (wind + 1));
}

/**
 * Calculate WBGT.
 *
 * - Outdoor with measured Tg: 0.7*Tnwb + 0.2*Tg + 0.1*Ta
 * - Indoor with measured Tg : 0.7*Tnwb + 0.3*Tg
 * - If Tg not provided, the engine estimates it (clearly flagged in `formula`).
 */
export function calculateWBGT(input: WbgtInput): WbgtResult {
  const { airTempC, humidity, globeTempC, windSpeedMps, solarRadiationWm2, environment } = input;

  if (airTempC < -20 || airTempC > 60) {
    throw new RangeError("airTempC out of supported range (-20 .. 60)");
  }

  const naturalWetBulbC = estimateNaturalWetBulb(airTempC, humidity);

  const haveMeasuredGlobe = typeof globeTempC === "number" && Number.isFinite(globeTempC);
  const globeTempUsedC = haveMeasuredGlobe
    ? (globeTempC as number)
    : estimateGlobeTemp(airTempC, solarRadiationWm2, windSpeedMps, environment);

  let wbgt: number;
  let formula: WbgtResult["formula"];
  let notes: string;

  if (environment === "outdoor") {
    wbgt = 0.7 * naturalWetBulbC + 0.2 * globeTempUsedC + 0.1 * airTempC;
    formula = haveMeasuredGlobe ? "outdoor-with-globe" : "outdoor-estimated";
    notes = haveMeasuredGlobe
      ? "JIS Z 8504 outdoor formula: 0.7 Tnwb + 0.2 Tg + 0.1 Ta"
      : "Outdoor formula with estimated Tg (Liljegren simplification). Measure Tg for compliance.";
  } else {
    wbgt = 0.7 * naturalWetBulbC + 0.3 * globeTempUsedC;
    formula = haveMeasuredGlobe ? "indoor-with-globe" : "indoor-estimated";
    notes = haveMeasuredGlobe
      ? "JIS Z 8504 indoor formula: 0.7 Tnwb + 0.3 Tg"
      : "Indoor formula with estimated Tg (Ta + 1 °C). Use a globe thermometer when feasible.";
  }

  return {
    wbgt: roundTo(wbgt, 1),
    naturalWetBulbC: roundTo(naturalWetBulbC, 1),
    globeTempUsedC: roundTo(globeTempUsedC, 1),
    formula,
    notes,
  };
}

/**
 * JSOH thresholds (degrees Celsius). Work-intensity dependent.
 * Order of fields: [caution, warning, severe-warning, danger].
 * Values below `caution` are classified as "safe".
 *
 * Source: JSOH (Japan Society for Occupational Health) "Occupational
 * Exposure Limits 2022 — Heat" Table 2, mirrored in the MHLW manual.
 */
const BASE_THRESHOLDS: Record<WorkIntensity, [number, number, number, number]> = {
  light: [25, 28, 30, 33],
  moderate: [22, 25, 28, 31],
  heavy: [18, 22, 25, 28],
  "very-heavy": [16, 20, 23, 26],
};

/**
 * Non-acclimatized workers face elevated risk at the same WBGT.
 * JSOH guidance is to drop each threshold by ~2 °C in this state.
 */
const NON_ACCLIMATIZATION_OFFSET = -2;

/**
 * Effective JSOH thresholds for the given intensity / acclimatization,
 * ordered [caution, warning, severe-warning, danger]. Exposed so the UI
 * can draw the five-segment risk scale from the same numbers the
 * classifier uses (single source of truth).
 */
export function getRiskThresholds(
  workIntensity: WorkIntensity,
  acclimatization: AcclimatizationState,
): [number, number, number, number] {
  const offset = acclimatization === "non-acclimatized" ? NON_ACCLIMATIZATION_OFFSET : 0;
  return BASE_THRESHOLDS[workIntensity].map((t) => t + offset) as [
    number,
    number,
    number,
    number,
  ];
}

export function determineRiskLevel(
  wbgt: number,
  workIntensity: WorkIntensity,
  acclimatization: AcclimatizationState,
): RiskAssessment {
  const [caution, warning, severe, danger] = getRiskThresholds(
    workIntensity,
    acclimatization,
  );

  if (wbgt >= danger) {
    return {
      level: "danger",
      thresholdC: danger,
      label: "危険",
      color: "rose",
      summary: "原則として作業中止。やむを得ず実施する場合は短時間・連続監視が必須。",
    };
  }
  if (wbgt >= severe) {
    return {
      level: "severe-warning",
      thresholdC: severe,
      label: "厳重警戒",
      color: "red",
      summary: "激しい運動・重作業は中止。頻繁な休憩と冷却・水分補給を強制する。",
    };
  }
  if (wbgt >= warning) {
    return {
      level: "warning",
      thresholdC: warning,
      label: "警戒",
      color: "orange",
      summary: "積極的な休憩と水分・塩分補給を実施。負荷の高い作業は控える。",
    };
  }
  if (wbgt >= caution) {
    return {
      level: "caution",
      thresholdC: caution,
      label: "注意",
      color: "amber",
      summary: "通常の作業は可だが、こまめな水分補給と体調観察を継続する。",
    };
  }
  return {
    level: "safe",
    thresholdC: caution,
    label: "ほぼ安全",
    color: "emerald",
    summary: "通常の安全管理を維持。長時間作業時は引き続き水分補給を促す。",
  };
}

/**
 * Operational guidance per risk level.
 * Aligns with MHLW "Heat Illness Prevention Manual" §3 and the
 * R7 Industrial Safety and Health Regulations Article 612-2 §3
 * education/monitoring requirements.
 */
export function getRecommendations(
  risk: RiskLevel,
  workIntensity: WorkIntensity,
): Recommendation {
  const heavy = workIntensity === "heavy" || workIntensity === "very-heavy";

  switch (risk) {
    case "danger":
      return {
        workRestRatio: "原則作業中止。やむを得ず実施する場合は15分作業／45分休憩を上限とする。",
        fluidIntakeMlPerHour: "1000-1500 mL",
        saltIntake: "0.1-0.2 % 食塩水もしくは経口補水液を10-15分毎",
        suspendWork: true,
        coolingMeasures: [
          "冷却ベスト・送風機・ミストファンの併用",
          "屋根・テント等による日射遮断と冷房休憩室の確保",
          "氷嚢・アイスバス（緊急時冷却）の常備",
        ],
        monitoring: [
          "バディ制（2名1組）で相互観察を義務付け",
          "作業前後の体重・体温・血圧を記録",
          "暑熱順化が不十分な作業者は屋内待機",
        ],
        educationReminders: [
          "熱中症の自覚症状と対処手順を当日朝礼で再周知",
          "救急搬送ルート・連絡網を再確認",
        ],
      };
    case "severe-warning":
      return {
        workRestRatio: heavy
          ? "20分作業／40分休憩。重作業は中止または機械化代替を検討。"
          : "30分作業／30分休憩。連続作業は1時間を超えない。",
        fluidIntakeMlPerHour: "700-1000 mL",
        saltIntake: "0.1-0.2 % 食塩水を作業中常時携行",
        suspendWork: false,
        coolingMeasures: [
          "屋外作業は日射遮断を必須化（テント・遮光ネット）",
          "送風機・スポットクーラーで気流を確保",
          "クールベスト・首掛けファン等の個人用冷却具を配付",
        ],
        monitoring: [
          "30分毎の体調確認（バディ制）",
          "新規・復帰作業者は屋内補助業務に配置転換を検討",
        ],
        educationReminders: [
          "WBGT実測値とリスクレベルを掲示・サイネージで全員に共有",
          "緊急時の冷却（アイスバス・冷水シャワー）手順を再確認",
        ],
      };
    case "warning":
      return {
        workRestRatio: heavy
          ? "30分作業／15分休憩"
          : "45分作業／15分休憩",
        fluidIntakeMlPerHour: "500-700 mL",
        saltIntake: "0.1 % 食塩水または塩分タブレットを休憩毎",
        suspendWork: false,
        coolingMeasures: [
          "日陰・冷房休憩スペースを20分毎に利用",
          "作業エリアに大型扇風機・スポットクーラーを設置",
        ],
        monitoring: [
          "1時間毎の体調確認",
          "前日からの体調不良者・寝不足者は配置を見直し",
        ],
        educationReminders: [
          "初期症状（めまい・吐き気・けいれん）の周知",
          "水分補給は喉が渇く前に行うことを徹底",
        ],
      };
    case "caution":
      return {
        workRestRatio: "通常作業可。1時間毎に短い休憩と水分補給を挿入。",
        fluidIntakeMlPerHour: "300-500 mL",
        saltIntake: "汗をかいた場合は塩分タブレットを併用",
        suspendWork: false,
        coolingMeasures: [
          "屋外作業はつばの広い帽子・通気性の良い服装を徹底",
          "冷たい飲料を作業現場近くに常備",
        ],
        monitoring: [
          "新規・復帰作業者の体調を重点観察",
          "WBGT値・気温を朝礼で共有",
        ],
        educationReminders: [
          "熱中症は屋内・夜間でも発症することを周知",
          "個人の体調差に応じた水分・休憩の自己管理を奨励",
        ],
      };
    case "safe":
    default:
      return {
        workRestRatio: "通常の作業時間で可。",
        fluidIntakeMlPerHour: "200-300 mL",
        saltIntake: "通常の食事で十分",
        suspendWork: false,
        coolingMeasures: [
          "WBGT測定の継続（気象急変に備える）",
          "飲料水を常時利用可能にする",
        ],
        monitoring: ["通常の安全管理を継続"],
        educationReminders: [
          "暑熱順化期間（7日間）を意識した段階的な負荷増を計画",
        ],
      };
  }
}

/**
 * One-shot helper combining the calculation, risk classification and
 * recommendations into a single result object.
 */
export interface FullAssessment {
  wbgt: WbgtResult;
  risk: RiskAssessment;
  recommendation: Recommendation;
}

export function assess(
  input: WbgtInput,
  workIntensity: WorkIntensity,
  acclimatization: AcclimatizationState,
): FullAssessment {
  const wbgt = calculateWBGT(input);
  const risk = determineRiskLevel(wbgt.wbgt, workIntensity, acclimatization);
  const recommendation = getRecommendations(risk.level, workIntensity);
  return { wbgt, risk, recommendation };
}

function roundTo(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}
