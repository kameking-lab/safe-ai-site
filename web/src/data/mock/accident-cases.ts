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

/**
 * occurredOn は "YYYY年MM月" / "YYYY年MM月DD日" / "YYYY-MM-DD" など揺らぎがあるため、
 * 数字を抽出して年月日のキーに正規化し、新しい順にソートする。
 */
function toSortKey(occurredOn: string | undefined): number {
  if (!occurredOn) return 0;
  const match = occurredOn.match(/(\d{4})\D*(\d{1,2})?\D*(\d{1,2})?/);
  if (!match) return 0;
  const year = Number(match[1] ?? 0);
  const month = Number(match[2] ?? 1);
  const day = Number(match[3] ?? 1);
  return year * 10000 + month * 100 + day;
}

export function getAccidentCasesDataset(): AccidentCase[] {
  if (!cachedAccidents) {
    const merged = [
      ...realAccidentCases,
      ...realAccidentCasesExtra,
      ...realAccidentCasesExtra2,
      ...realAccidentCasesExtra3,
    ];
    // 最新の発生日が先頭に来るよう降順ソート
    merged.sort((a, b) => toSortKey(b.occurredOn) - toSortKey(a.occurredOn));
    cachedAccidents = merged;
  }
  return cachedAccidents;
}

/** @deprecated getAccidentCasesDataset を推奨 */
export const accidentCasesMock = getAccidentCasesDataset();
