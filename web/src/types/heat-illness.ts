/**
 * Heat illness prevention: domain types.
 *
 * Positioned as workforce-management and engineering-control reference,
 * not medical guidance. Sources are JIS Z 8504 (WBGT measurement),
 * MHLW "Heat Illness Prevention Guidelines for the Workplace" (R5),
 * and the R7 (2025) amendment to the Industrial Safety and Health
 * Regulations Article 612-2 mandating WBGT-driven controls.
 *
 * The WBGT thresholds follow the Japan Sports Association / JSOH
 * occupational classification ("Caution" through "Critical Danger").
 */

export type IndustryId =
  | "construction"
  | "manufacturing"
  | "transport"
  | "agriculture"
  | "cleaning"
  | "security"
  | "kitchen"
  | "warehouse"
  | "forestry"
  | "waste";

export type WorkIntensity =
  /** Sitting, light hand work. ~ <200 W metabolic. */
  | "light"
  /** Standing work, normal walking. ~ 200-300 W. */
  | "moderate"
  /** Sustained physical work, climbing. ~ 300-400 W. */
  | "heavy"
  /** Maximal exertion, carrying heavy loads. ~ >400 W. */
  | "very-heavy";

export type AcclimatizationState =
  /** Worker has been doing the task in heat for >= 7 consecutive days. */
  | "acclimatized"
  /** Returning from absence (>= 4 days off) or first hot day of season. */
  | "non-acclimatized";

export type Environment = "outdoor" | "indoor";

/**
 * Five-level occupational heat-stress classification.
 * Mapped from WBGT and work intensity per the JSOH (Japan Society of
 * Occupational Health) occupational reference values.
 */
export type RiskLevel =
  /** WBGT < 25 — minimal risk under normal exertion. */
  | "safe"
  /** "Caution" — fluid intake actively encouraged. */
  | "caution"
  /** "Warning" — frequent rest, no sustained heavy work. */
  | "warning"
  /** "Severe Warning" — heavy work prohibited; mandatory rest cycles. */
  | "severe-warning"
  /** "Danger" — non-essential outdoor work suspended. */
  | "danger";

export interface WbgtInput {
  /** Dry-bulb air temperature in Celsius. */
  airTempC: number;
  /** Relative humidity, 0–100 (percent). */
  humidity: number;
  /** Globe (black-globe) temperature in Celsius. Required for outdoor; optional indoor. */
  globeTempC?: number;
  /** Wind speed in m/s. Used only when globe temperature is not measured. */
  windSpeedMps?: number;
  /** Solar radiation in W/m^2. Used only when globe temperature is not measured. */
  solarRadiationWm2?: number;
  environment: Environment;
}

export interface WbgtResult {
  /** Computed WBGT in degrees Celsius (rounded to 1 dp). */
  wbgt: number;
  /** Natural wet-bulb temperature estimate, Celsius. */
  naturalWetBulbC: number;
  /** Effective globe temperature actually used in the formula. */
  globeTempUsedC: number;
  /** Which formula path was applied. */
  formula: "outdoor-with-globe" | "indoor-with-globe" | "outdoor-estimated" | "indoor-estimated";
  /** Brief explanation of the calculation path, JIS Z 8504 reference. */
  notes: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  /** WBGT threshold the level was derived from. */
  thresholdC: number;
  /** Headline label in Japanese. */
  label: string;
  /** Color token for UI (Tailwind-compatible). */
  color: "emerald" | "amber" | "orange" | "red" | "rose";
  /** Required action summary, one line. */
  summary: string;
}

export interface Recommendation {
  /** Mandatory rest cycle suggestion ("25 min work / 5 min rest" etc.). */
  workRestRatio: string;
  /** Recommended fluid intake per hour, in milliliters (range). */
  fluidIntakeMlPerHour: string;
  /** Salt intake guidance. */
  saltIntake: string;
  /** Whether the work should be suspended outright. */
  suspendWork: boolean;
  /** Cooling / shading countermeasures. */
  coolingMeasures: string[];
  /** Monitoring requirements (buddy system, vitals). */
  monitoring: string[];
  /** Educational reminders linked to R7 Article 612-2 §3. */
  educationReminders: string[];
}

export interface IndustryHeatRule {
  id: IndustryId;
  label: string;
  /** Short summary of why the industry is heat-illness-prone. */
  riskProfile: string;
  /** Most common work tasks where heat illness is recorded by MHLW. */
  exposureTasks: string[];
  /** Risk factors that elevate baseline WBGT exposure. */
  riskFactors: string[];
  /** Engineering and administrative controls expected at this industry. */
  standardCountermeasures: string[];
  /** Specific R7 (2025) compliance items emphasized for the industry. */
  r7ComplianceFocus: string[];
  /** Article / guideline references. */
  lawReferences: string[];
  /** Cross-link slug into /accidents-reports if applicable. */
  accidentReportSlug?: string;
}

export interface R7ComplianceItem {
  /** Stable id; used as form field key. */
  id: string;
  /** Short label shown in the checklist. */
  title: string;
  /** Article reference, e.g. "安衛則第612条の2 第1項". */
  articleRef: string;
  /** What the workplace must actually do. */
  requirement: string;
  /** Practical evidence the labour inspector typically asks for. */
  evidenceExpected: string[];
  /** R7 amendment effective date for this clause, ISO. */
  effectiveFrom: string;
}
