import subsidiesData from "@/data/subsidies.json";

export type MeasureType = "equipment" | "education" | "health" | "work-reform" | "smoking" | "other";

export const MEASURE_OPTIONS: { key: MeasureType; label: string; description: string }[] = [
  { key: "equipment", label: "設備投資", description: "安全設備・機械・IoTシステム等の導入" },
  { key: "education", label: "教育訓練", description: "特別教育・職長教育・技能講習等" },
  { key: "health", label: "健康・産業保健", description: "産業医委嘱・保健師活動・健診" },
  { key: "work-reform", label: "働き方改革", description: "勤怠管理・労働時間短縮・インターバル導入" },
  { key: "smoking", label: "受動喫煙防止", description: "喫煙室設置・喫煙対策設備" },
  { key: "other", label: "その他", description: "その他の安全衛生投資" },
];

export type IndustryType =
  | "construction"
  | "manufacturing"
  | "transport"
  | "healthcare"
  | "retail"
  | "food"
  | "forestry"
  | "service"
  | "other";

export const INDUSTRY_OPTIONS: { key: IndustryType; label: string }[] = [
  { key: "construction", label: "建設業" },
  { key: "manufacturing", label: "製造業" },
  { key: "transport", label: "運輸業" },
  { key: "healthcare", label: "医療・福祉" },
  { key: "retail", label: "小売業" },
  { key: "food", label: "飲食・食品" },
  { key: "forestry", label: "林業" },
  { key: "service", label: "サービス業" },
  { key: "other", label: "その他" },
];

export interface CalculatorInput {
  industry: IndustryType;
  employees: number;
  annualRevenueManten: number;
  measures: MeasureType[];
  investmentManten: number;
}

interface SubsidyRate {
  maxEmployees: number | null;
  rate: number;
}

interface SubsidyDefinition {
  id: string;
  name: string;
  operator: string;
  url: string;
  sourceNote: string;
  eligibility: {
    maxEmployees: number | null;
    minEmployees: number | null;
    industries: string[];
    conditions: string[];
  };
  measures: string[];
  subsidyRates: SubsidyRate[] | null;
  defaultRate: number;
  maxAmount: number;
  rateNote: string;
  deadline: string;
  requiredDocs: string[];
  applicationNote: string;
}

export interface SubsidyEstimate {
  id: string;
  name: string;
  operator: string;
  url: string;
  sourceNote: string;
  estimatedAmount: number;
  subsidyRate: number;
  maxAmount: number;
  selfBurden: number;
  eligible: boolean;
  ineligibleReasons: string[];
  deadline: string;
  requiredDocs: string[];
  rateNote: string;
  applicationNote: string;
}

function getEffectiveRate(sub: SubsidyDefinition, employees: number): number {
  if (!sub.subsidyRates) return sub.defaultRate;
  for (const tier of sub.subsidyRates) {
    if (tier.maxEmployees === null || employees <= tier.maxEmployees) {
      return tier.rate;
    }
  }
  return sub.defaultRate;
}

function checkEligibility(sub: SubsidyDefinition, input: CalculatorInput): string[] {
  const reasons: string[] = [];
  const { eligibility } = sub;

  if (eligibility.maxEmployees !== null && input.employees > eligibility.maxEmployees) {
    reasons.push(`従業員${eligibility.maxEmployees}人超のため対象外（中小企業向け制度）`);
  }
  if (eligibility.minEmployees !== null && input.employees < eligibility.minEmployees) {
    reasons.push(`従業員${eligibility.minEmployees}人未満のため対象外`);
  }

  const measuresMatch = input.measures.some(
    (m) => sub.measures.includes(m) || m === "other"
  );
  if (!measuresMatch) {
    reasons.push("選択した施策にこの助成金が対応するコースがありません");
  }

  if (
    eligibility.industries.length > 0 &&
    !eligibility.industries.includes("any") &&
    !eligibility.industries.includes(input.industry)
  ) {
    reasons.push("選択した業種は対象外です");
  }

  return reasons;
}

export function calculateSubsidies(input: CalculatorInput): SubsidyEstimate[] {
  const investmentYen = input.investmentManten * 10000;
  const defs = (subsidiesData as { subsidies: SubsidyDefinition[] }).subsidies;

  return defs.map((sub) => {
    const ineligibleReasons = checkEligibility(sub, input);
    const eligible = ineligibleReasons.length === 0;
    const rate = getEffectiveRate(sub, input.employees);
    const estimatedAmount = eligible ? Math.min(rate * investmentYen, sub.maxAmount) : 0;
    const selfBurden = investmentYen - estimatedAmount;

    return {
      id: sub.id,
      name: sub.name,
      operator: sub.operator,
      url: sub.url,
      sourceNote: sub.sourceNote,
      estimatedAmount,
      subsidyRate: rate,
      maxAmount: sub.maxAmount,
      selfBurden,
      eligible,
      ineligibleReasons,
      deadline: sub.deadline,
      requiredDocs: sub.requiredDocs,
      rateNote: sub.rateNote,
      applicationNote: sub.applicationNote,
    };
  });
}

export function formatYen(yen: number): string {
  if (yen >= 10000000) {
    const sen = yen / 10000000;
    return `${sen % 1 === 0 ? sen.toFixed(0) : sen.toFixed(1)}千万円`;
  }
  if (yen >= 10000) return `${Math.round(yen / 10000)}万円`;
  return `${yen.toLocaleString()}円`;
}
