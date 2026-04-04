import type { AccidentCase } from "@/lib/types/domain";
import { realAccidentCases } from "@/data/mock/real-accident-cases";
import { realAccidentCasesExtra } from "@/data/mock/real-accident-cases-extra";
import { realAccidentCasesExtra2 } from "@/data/mock/real-accident-cases-extra2";
import { realAccidentCasesExtra3 } from "@/data/mock/real-accident-cases-extra3";
import { buildGeneratedAccidentCases } from "@/data/mock/accident-cases-generate";

/**
 * 実データ（厚労省「職場のあんぜんサイト」労働災害事例）を優先し、
 * 生成データで件数を補完する。実データは先頭に配置。
 */
const GENERATED_COUNT = 3600;

let cachedAccidents: AccidentCase[] | null = null;

export function getAccidentCasesDataset(): AccidentCase[] {
  if (!cachedAccidents) {
    const generated = buildGeneratedAccidentCases(GENERATED_COUNT);
    cachedAccidents = [...realAccidentCases, ...realAccidentCasesExtra, ...realAccidentCasesExtra2, ...realAccidentCasesExtra3, ...generated];
  }
  return cachedAccidents;
}

/** @deprecated getAccidentCasesDataset を推奨 */
export const accidentCasesMock = getAccidentCasesDataset();
