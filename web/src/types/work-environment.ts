/**
 * Work Environment Measurement Types
 * Based on: 作業環境測定法, 作業環境測定基準告示, 安衛令第21条
 * Source: JISHA, Ministry of Health, Labour and Welfare
 */

/** The 10 categories of mandatory measurement targets per 安衛令第21条 */
export type MeasurementCategoryId =
  | "dust"          // 粉じん（土石・岩石・鉱物・金属・炭素）
  | "heat-cold"     // 暑熱・寒冷・多湿
  | "noise"         // 騒音
  | "underground"   // 坑内
  | "office-hvac"   // 中央管理方式空調の事務所
  | "radiation"     // 放射線（管理区域）
  | "specific-chem" // 特定化学物質
  | "lead"          // 鉛
  | "oxygen-def"    // 酸素欠乏危険場所
  | "organic-solv"; // 有機溶剤

/** Measurement method: A measurement (area-wide) or B measurement (peak) */
export type MeasurementMethod = "A" | "B" | "A+B" | "personal" | "instrument";

/** Management class (管理区分) per 作業環境測定基準告示 */
export type ManagementClass = 1 | 2 | 3;

/** Measurement frequency */
export type MeasurementFrequency =
  | "semi-monthly"   // 半月以内ごと（暑熱・寒冷・多湿）
  | "monthly"        // 毎月（坑内）
  | "bi-monthly"     // 2ヶ月以内ごと（事務所）
  | "quarterly"      // 3ヶ月以内ごと（特別管理物質）
  | "semi-annually"  // 6ヶ月以内ごと（粉じん・騒音・特化物・有機）
  | "annually";      // 1年以内ごと（鉛）

/** Triggering condition that makes a workplace a mandatory measurement target */
export interface TargetCondition {
  /** Short label */
  label: string;
  /** Detailed description of the condition */
  detail: string;
  /** Keywords to match against user-entered industries/processes */
  keywords: string[];
}

/** One of the 10 mandatory measurement categories */
export interface MeasurementCategory {
  id: MeasurementCategoryId;
  /** Display name */
  name: string;
  /** Legal basis (法的根拠) */
  legalBasis: string;
  /** Measurement method required */
  method: MeasurementMethod;
  /** Required measurement frequency */
  frequency: MeasurementFrequency;
  /** What triggers this category */
  triggerConditions: TargetCondition[];
  /** Relevant substances or parameters */
  targetParameters: string[];
  /** Who may perform measurements (測定士資格) */
  measurer: string;
  /** Reference standard value label */
  standardLabel: string;
  /** Unit of measurement */
  unit: string;
  /** Whether management class (管理区分) judgment applies */
  hasManagementClass: boolean;
  /** Notes / caveats */
  notes?: string;
}

/** Input for management class determination */
export interface ManagementClassInput {
  category: MeasurementCategoryId;
  /** A measurement arithmetic mean (幾何平均) relative to management concentration.
   *  Value = measured / standard. E.g. 0.5 = 50% of standard. */
  aMeasurementRatio: number;
  /** A measurement geometric standard deviation (幾何標準偏差) */
  aGsd?: number;
  /** B measurement value relative to management concentration (測定値/管理濃度) */
  bMeasurementRatio?: number;
  /** Whether category uses B measurement */
  useBMeasurement: boolean;
}

/** Result of management class determination */
export interface ManagementClassResult {
  /** Overall management class (第1〜第3管理区分) */
  managementClass: ManagementClass;
  /** Class from A measurement alone */
  aClass: ManagementClass;
  /** Class from B measurement (if applicable) */
  bClass?: ManagementClass;
  /** Plain-language explanation of the result */
  explanation: string;
  /** Required improvement measures */
  improvementMeasures: ImprovementMeasure[];
  /** Deadline for improvement (if class 2 or 3) */
  deadline?: string;
}

/** Specific improvement measure */
export interface ImprovementMeasure {
  priority: "immediate" | "within-3months" | "maintain";
  title: string;
  detail: string;
}

/** User input for the target-finder tool */
export interface TargetFinderInput {
  /** Industry category */
  industryGroup: string;
  /** List of work processes */
  processes: string[];
  /** Substances handled */
  substances: string[];
  /** Free-text keywords */
  keywords: string;
}

/** One identified measurement target */
export interface IdentifiedTarget {
  category: MeasurementCategory;
  /** Which conditions matched */
  matchedConditions: TargetCondition[];
  /** Confidence / match strength (0-1) */
  matchScore: number;
}
