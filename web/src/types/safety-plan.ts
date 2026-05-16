/**
 * Annual safety & health plan (年次安全衛生計画) types.
 *
 * Used by the plan generator at /strategy/plan-generator. The data structure
 * matches what a Japanese small-to-medium employer needs for the 衛生委員会
 * audit trail: basic policy → priority goals → measures → monthly schedule →
 * cited laws and MHLW circulars.
 */

export type IndustryId =
  | "construction"
  | "manufacturing"
  | "transportation"
  | "medical"
  | "service"
  | "retail"
  | "food"
  | "wholesale"
  | "warehouse"
  | "office";

export type ScaleId = "small" | "medium" | "large";

export const INDUSTRY_LABELS: Record<IndustryId, string> = {
  construction: "建設業",
  manufacturing: "製造業",
  transportation: "運輸交通業",
  medical: "医療・福祉",
  service: "サービス業",
  retail: "小売業",
  food: "飲食業",
  wholesale: "卸売業",
  warehouse: "倉庫・運送取扱業",
  office: "事務系（情報通信・金融・士業ほか）",
};

export const SCALE_LABELS: Record<ScaleId, string> = {
  small: "小規模（〜49人）",
  medium: "中規模（50〜299人）",
  large: "大規模（300人以上）",
};

export type GoalCategory =
  | "accident-reduction"
  | "health-promotion"
  | "education-coverage"
  | "ra-coverage"
  | "near-miss-reporting"
  | "compliance"
  | "mental-health";

export interface SafetyGoal {
  category: GoalCategory;
  title: string;
  description: string;
  /** 数値目標（例: 度数率 1.0 未満 / ヒヤリハット 200件以上） */
  target: string;
  /** 測定方法・指標 */
  kpi: string;
}

export type MeasureCategory =
  | "education"
  | "ky"
  | "health-check"
  | "inspection"
  | "committee"
  | "ra"
  | "drill"
  | "equipment-check"
  | "industry-specific";

export const MEASURE_LABELS: Record<MeasureCategory, string> = {
  education: "安全衛生教育",
  ky: "危険予知活動（KY）",
  "health-check": "健康診断・健康管理",
  inspection: "職場巡視・点検",
  committee: "安全衛生委員会",
  ra: "リスクアセスメント",
  drill: "訓練",
  "equipment-check": "設備・機械点検",
  "industry-specific": "業種特有事項",
};

export interface SafetyMeasure {
  category: MeasureCategory;
  title: string;
  description: string;
  /** 実施頻度（毎月 / 四半期 / 年1回 など） */
  frequency: string;
  /** 担当（例: 衛生管理者 / 産業医 / 各課長） */
  responsible: string;
  /** 関連条文（任意、例: 安衛法第59条） */
  reference?: string;
}

export interface MonthlyEvent {
  title: string;
  category: MeasureCategory;
  description: string;
  reference?: string;
  /** true=法定義務 / false=推奨・自主 */
  required: boolean;
}

export type MonthIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface MonthlySchedule {
  month: MonthIndex;
  events: MonthlyEvent[];
}

export interface LawReference {
  name: string;
  articles: string[];
  /** 概要（逐語転載しないこと） */
  summary: string;
}

export interface CircularReference {
  /** 通達番号（例: 基発0301第1号） */
  number: string;
  /** 発出日 YYYY-MM-DD */
  date: string;
  title: string;
}

export interface SafetyPlanTemplate {
  id: string;
  industry: IndustryId;
  scale: ScaleId;
  industryLabel: string;
  scaleLabel: string;
  basicPolicy: string;
  goals: SafetyGoal[];
  measures: SafetyMeasure[];
  monthlySchedule: MonthlySchedule[];
  relatedLaws: LawReference[];
  relatedCirculars: CircularReference[];
}

export interface GeneratedPlan {
  id: string;
  generatedAt: string;
  industry: IndustryId;
  scale: ScaleId;
  organizationName: string;
  fiscalYear: number;
  template: SafetyPlanTemplate;
  customGoals: SafetyGoal[];
  notes: string;
}

export interface PlanGeneratorInput {
  industry: IndustryId;
  scale: ScaleId;
  organizationName: string;
  fiscalYear: number;
  focusAreas: MeasureCategory[];
  customGoals: SafetyGoal[];
  notes: string;
}

export const MONTH_LABELS_JA: Record<MonthIndex, string> = {
  1: "1月",
  2: "2月",
  3: "3月",
  4: "4月",
  5: "5月",
  6: "6月",
  7: "7月",
  8: "8月",
  9: "9月",
  10: "10月",
  11: "11月",
  12: "12月",
};
