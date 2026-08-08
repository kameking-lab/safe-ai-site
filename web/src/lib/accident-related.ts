import type { AccidentType } from "@/lib/types/domain";

export type AccidentRelated = {
  /** Empty while a worker has not confirmed the task conditions. */
  template: string;
  /** Product categories are withheld until suitability is reviewed. */
  categories: string[];
  /** Accident type alone is not sufficient to select applicable articles. */
  articles: string[];
  rationale: string;
  withholdPpeProducts: true;
};

const WITHHELD: AccidentRelated = {
  template: "",
  categories: [],
  articles: [],
  rationale:
    "事故類型だけでは、作業高さ・設備・電圧・物質・濃度・換気・取扱説明書・適用除外を確認できません。保護具、法令、KYへの転記は保留し、現場条件と一次資料を人が確認してください。",
  withholdPpeProducts: true,
};

/**
 * Fail-closed boundary for accident-derived recommendations.
 *
 * An accident label is useful as a search term, but it cannot determine a
 * legal duty, PPE compatibility, training requirement, or KY control.
 */
export function getAccidentRelated(_type: AccidentType): AccidentRelated {
  return WITHHELD;
}

export function shouldWithholdAccidentPpeProducts(
  _type: AccidentType,
): boolean {
  return true;
}
