import type { AccidentCase } from "@/lib/types/domain";
import { realAccidentCases } from "@/data/mock/real-accident-cases";
import { realAccidentCasesExtra } from "@/data/mock/real-accident-cases-extra";
import { realAccidentCasesExtra2 } from "@/data/mock/real-accident-cases-extra2";
import { realAccidentCasesExtra3 } from "@/data/mock/real-accident-cases-extra3";

/**
 * 実データ（厚労省「職場のあんぜんサイト」労働災害事例）のみ収録。
 * 自動生成データは削除済み。
 */
let cachedAccidents: AccidentCase[] | null = null;

export function getAccidentCasesDataset(): AccidentCase[] {
  if (!cachedAccidents) {
    cachedAccidents = [
      ...realAccidentCases,
      ...realAccidentCasesExtra,
      ...realAccidentCasesExtra2,
      ...realAccidentCasesExtra3,
    ];
  }
  return cachedAccidents;
}

/** @deprecated getAccidentCasesDataset を推奨 */
export const accidentCasesMock = getAccidentCasesDataset();
