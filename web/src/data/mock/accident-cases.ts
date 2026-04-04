import type { AccidentCase } from "@/lib/types/domain";
import { buildGeneratedAccidentCases } from "@/data/mock/accident-cases-generate";

const TARGET_COUNT = 3600;

let cachedAccidents: AccidentCase[] | null = null;

export function getAccidentCasesDataset(): AccidentCase[] {
  if (!cachedAccidents) {
    cachedAccidents = buildGeneratedAccidentCases(TARGET_COUNT);
  }
  return cachedAccidents;
}

/** @deprecated getAccidentCasesDataset を推奨 */
export const accidentCasesMock = getAccidentCasesDataset();
