import type { MergedChemical } from "@/lib/mhlw-chemicals";

/** 詳細画面は濃度・分類データの収録物質だけを扱う。CASがあるだけでは開かない。 */
export function hasChemicalDetail(chemical: MergedChemical): boolean {
  return Boolean(chemical.cas && chemical.details?.limits);
}
