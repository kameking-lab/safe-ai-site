import { RESKILLING_RULES } from "@/data/business-funding";

export type TrainingEstimateInput = {
  companySize: "small" | "large";
  method: "classroom" | "elearning";
  hours: number;
  eligibleCostPerPerson: number;
  conditionsConfirmed: boolean;
};

/** コースの対象条件は窓口で別途確認済みという前提の、1人分の経費助成のみ。 */
export function estimateReskillingCost(input: TrainingEstimateInput) {
  if (
    !input.conditionsConfirmed ||
    !Number.isFinite(input.hours) ||
    input.hours < RESKILLING_RULES.minimumHours ||
    !Number.isSafeInteger(input.eligibleCostPerPerson) ||
    input.eligibleCostPerPerson <= 0
  )
    return null;
  const rule = RESKILLING_RULES[input.companySize];
  const tier = input.hours < 100 ? 0 : input.hours < 200 ? 1 : 2;
  const cap = input.method === "elearning" ? rule.elearningCap : rule.classroomCaps[tier];
  const amount = Math.min(Math.floor(input.eligibleCostPerPerson * rule.rate), cap);
  return { rate: rule.rate, cap, amount, remainingCost: input.eligibleCostPerPerson - amount };
}

export function formatYen(yen: number): string {
  return `${yen.toLocaleString("ja-JP")}円`;
}
